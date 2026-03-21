const SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const FIELDS = [
  "product_name",
  "brands",
  "ingredients_text",
  "nutriments",
  "nutriscore_grade",
  "ecoscore_grade",
  "nova_group",
].join(",");

/**
 * Search Open Food Facts for a product by name and brand.
 * Returns the best match or null.
 */
export async function lookupProduct(productName, brand) {
  const query = `${productName} ${brand}`.trim();
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: "3",
    fields: FIELDS,
  });

  try {
    const res = await fetch(`${SEARCH_URL}?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    const products = data.products || [];
    if (products.length === 0) return null;

    // Pick the best match — prefer one whose brand matches
    const brandLower = brand.toLowerCase();
    const match =
      products.find((p) => (p.brands || "").toLowerCase().includes(brandLower)) ||
      products[0];

    return match;
  } catch (err) {
    console.warn("[EcoScan] Open Food Facts lookup failed:", err.message);
    return null;
  }
}

/**
 * Convert Open Food Facts nutriments (per 100g/ml) to our nutrition_facts schema (per serving).
 * Uses _serving values when available, falls back to _100g.
 */
export function extractNutrition(off) {
  const n = off.nutriments || {};

  function val(key) {
    // Prefer per-serving, fall back to per-100g
    const v = n[`${key}_serving`] ?? n[`${key}_100g`] ?? n[key] ?? null;
    if (v == null) return null;
    return Math.round(Number(v) * 10) / 10;
  }

  // Sodium in OFF is in grams, we need mg
  function sodiumMg() {
    const g = n["sodium_serving"] ?? n["sodium_100g"] ?? n["sodium"] ?? null;
    if (g == null) return null;
    return Math.round(Number(g) * 1000);
  }

  return {
    calories: val("energy-kcal"),
    total_fat_g: val("fat"),
    saturated_fat_g: val("saturated-fat"),
    trans_fat_g: val("trans-fat"),
    cholesterol_mg: val("cholesterol"),
    sodium_mg: sodiumMg(),
    total_carbohydrates_g: val("carbohydrates"),
    dietary_fiber_g: val("fiber"),
    total_sugars_g: val("sugars"),
    added_sugars_g: val("added-sugars"),
    protein_g: val("proteins"),
  };
}

/**
 * Validate Gemini's nutrition data against Open Food Facts.
 * Returns an object with validated nutrition and any warnings.
 */
export function validateNutrition(geminiNutrition, offProduct) {
  const offNutrition = extractNutrition(offProduct);
  const warnings = [];

  if (!geminiNutrition) {
    return { nutrition: offNutrition, warnings: ["Nutrition facts not detected in image — using Open Food Facts data"], source: "open_food_facts" };
  }

  const TOLERANCE = 0.30; // 30% tolerance
  const merged = { ...geminiNutrition };

  const checks = [
    { key: "calories", label: "Calories" },
    { key: "total_fat_g", label: "Total Fat" },
    { key: "sodium_mg", label: "Sodium" },
    { key: "total_carbohydrates_g", label: "Total Carbs" },
    { key: "total_sugars_g", label: "Total Sugars" },
    { key: "protein_g", label: "Protein" },
  ];

  for (const { key, label } of checks) {
    const gemVal = Number(geminiNutrition[key]);
    const offVal = Number(offNutrition[key]);

    if (isNaN(offVal) || offVal == null) continue;

    if (isNaN(gemVal) || gemVal == null) {
      // Gemini missed it — fill from OFF
      merged[key] = offVal;
      warnings.push(`${label}: filled from Open Food Facts (${offVal})`);
      continue;
    }

    // Check deviation
    const max = Math.max(Math.abs(gemVal), Math.abs(offVal), 1);
    const deviation = Math.abs(gemVal - offVal) / max;

    if (deviation > TOLERANCE) {
      // OFF is authoritative — override Gemini
      merged[key] = offVal;
      warnings.push(`${label}: corrected from ${gemVal} to ${offVal} (Open Food Facts)`);
    }
  }

  // Fill any nulls in Gemini data with OFF data
  for (const [key, offVal] of Object.entries(offNutrition)) {
    if (offVal != null && (merged[key] == null || merged[key] === undefined)) {
      merged[key] = offVal;
    }
  }

  // Sanity check: added sugars cannot exceed total sugars
  const totalSugars = Number(merged.total_sugars_g);
  const addedSugars = Number(merged.added_sugars_g);
  if (!isNaN(totalSugars) && !isNaN(addedSugars) && addedSugars > totalSugars) {
    merged.added_sugars_g = totalSugars;
    warnings.push(`Added Sugars: capped from ${addedSugars}g to ${totalSugars}g (cannot exceed Total Sugars)`);
  }

  // Sanity check: saturated fat cannot exceed total fat
  const totalFat = Number(merged.total_fat_g);
  const satFat = Number(merged.saturated_fat_g);
  if (!isNaN(totalFat) && !isNaN(satFat) && satFat > totalFat) {
    merged.saturated_fat_g = totalFat;
    warnings.push(`Saturated Fat: capped from ${satFat}g to ${totalFat}g (cannot exceed Total Fat)`);
  }

  // Sanity check: dietary fiber cannot exceed total carbs
  const totalCarbs = Number(merged.total_carbohydrates_g);
  const fiber = Number(merged.dietary_fiber_g);
  if (!isNaN(totalCarbs) && !isNaN(fiber) && fiber > totalCarbs) {
    merged.dietary_fiber_g = totalCarbs;
    warnings.push(`Dietary Fiber: capped from ${fiber}g to ${totalCarbs}g (cannot exceed Total Carbs)`);
  }

  return {
    nutrition: merged,
    warnings,
    source: warnings.length > 0 ? "validated" : "gemini",
  };
}

/**
 * Validate Gemini's ingredients against Open Food Facts ingredients list.
 * Returns warnings if there are major discrepancies.
 */
export function validateIngredients(geminiIngredients, offProduct) {
  const warnings = [];
  const offText = offProduct.ingredients_text || "";

  if (!offText) return { warnings };

  // Parse OFF ingredients into a simple list
  const offIngredients = offText
    .toLowerCase()
    .split(/,\s*/)
    .map((s) => s.replace(/\(.*?\)/g, "").trim())
    .filter(Boolean);

  if (geminiIngredients.length === 0 && offIngredients.length > 0) {
    warnings.push(`Gemini returned no ingredients — Open Food Facts lists ${offIngredients.length}`);
  } else if (Math.abs(geminiIngredients.length - offIngredients.length) > offIngredients.length * 0.5) {
    warnings.push(
      `Ingredient count mismatch: Gemini found ${geminiIngredients.length}, Open Food Facts lists ${offIngredients.length}`
    );
  }

  return { warnings, offIngredients };
}
