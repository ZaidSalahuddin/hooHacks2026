function clampNumber(value, fallback = 0, min = 0, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map(asString).filter(Boolean);
}

function toBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

export function extractJSON(text) {
  if (typeof text !== "string") {
    throw new Error("Model response was not text");
  }

  const cleaned = text.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const startObj = cleaned.indexOf("{");
    const startArr = cleaned.indexOf("[");
    let start = -1;
    let open;
    let close;

    if (startObj === -1 && startArr === -1) {
      throw new Error("No JSON found in response");
    }

    if (startArr === -1 || (startObj !== -1 && startObj < startArr)) {
      start = startObj;
      open = "{";
      close = "}";
    } else {
      start = startArr;
      open = "[";
      close = "]";
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === open) depth++;
      if (ch === close) depth--;
      if (depth === 0) {
        return JSON.parse(cleaned.slice(start, i + 1));
      }
    }

    throw new Error("Could not parse JSON from response");
  }
}

export function normalizeExtractedProduct(data) {
  return {
    product_name: asString(data?.product_name),
    brand: asString(data?.brand),
    ingredients: asStringArray(data?.ingredients),
  };
}

export function normalizeProductCandidatesResult(data) {
  const products = Array.isArray(data?.products) ? data.products : [];

  return {
    product_count: Math.max(0, Math.round(clampNumber(data?.product_count, products.length, 0, 20))),
    products: products.map((product) => ({
      product_name: asString(product?.product_name),
      distinctive_features: asStringArray(product?.distinctive_features),
      confidence: clampNumber(product?.confidence, 0, 0, 100),
    })).filter((product) => product.product_name),
  };
}

export function normalizeBrandDetectionResult(data) {
  const brands = Array.isArray(data?.brands) ? data.brands : [];

  return {
    brands: brands.map((brand) => ({
      brand: asString(brand?.brand),
      confidence: clampNumber(brand?.confidence, 0, 0, 100),
      evidence: asString(brand?.evidence),
    })).filter((brand) => brand.brand),
  };
}

export function normalizeIngredientDetectionResult(data) {
  return {
    ingredients: asStringArray(data?.ingredients),
    confidence: clampNumber(data?.confidence, 0, 0, 100),
    readability: ["clear", "partial", "unreadable"].includes(asString(data?.readability).toLowerCase())
      ? asString(data?.readability).toLowerCase()
      : "unreadable",
  };
}

export function normalizeValidationResult(data) {
  return {
    valid: toBoolean(data?.valid, false),
    confidence: clampNumber(data?.confidence, 0, 0, 100),
    reason: asString(data?.reason),
    issues: asStringArray(data?.issues),
    normalized_product_name: asString(data?.normalized_product_name),
    normalized_brand: asString(data?.normalized_brand),
  };
}

export function normalizeBrandValidationResult(data) {
  return {
    valid: toBoolean(data?.valid, false),
    confidence: clampNumber(data?.confidence, 0, 0, 100),
    reason: asString(data?.reason),
    issues: asStringArray(data?.issues),
    normalized_brand: asString(data?.normalized_brand),
    normalized_product_name: asString(data?.normalized_product_name),
  };
}

export function normalizeIngredientValidationResult(data) {
  return {
    valid: toBoolean(data?.valid, false),
    confidence: clampNumber(data?.confidence, 0, 0, 100),
    reason: asString(data?.reason),
    issues: asStringArray(data?.issues),
    normalized_ingredients: asStringArray(data?.normalized_ingredients),
  };
}

export function normalizeClassificationResult(data) {
  return {
    hasBrandLabel: toBoolean(data?.hasBrandLabel, true),
    hasIngredientList: toBoolean(data?.hasIngredientList, true),
    confidence: clampNumber(data?.confidence, 50, 0, 100),
  };
}

export function normalizeBrandProfileResult(data) {
  return {
    certifications: asStringArray(data?.certifications),
    carbonReport: toBoolean(data?.carbonReport, false),
    laborPractices: asString(data?.laborPractices) || "Unknown",
    overallEthicsScore: clampNumber(data?.overallEthicsScore, 50, 0, 100),
  };
}

export function normalizeIngredientAnalysisResult(data) {
  const ingredients = Array.isArray(data?.ingredients) ? data.ingredients : [];
  const alternatives = Array.isArray(data?.alternatives) ? data.alternatives : [];

  return {
    ingredients: ingredients.map((ingredient) => ({
      name: asString(ingredient?.name),
      flag: ["safe", "moderate", "harmful"].includes(asString(ingredient?.flag).toLowerCase())
        ? asString(ingredient?.flag).toLowerCase()
        : "moderate",
      reason: asString(ingredient?.reason),
      score: clampNumber(ingredient?.score, 50, 0, 100),
    })),
    alternatives: alternatives.map((alternative) => ({
      name: asString(alternative?.name),
      brand: asString(alternative?.brand),
      score: clampNumber(alternative?.score, 50, 0, 100),
      improvements: asStringArray(alternative?.improvements),
    })),
  };
}

export function normalizeAnalysisResult(data) {
  const brandProfile = data?.brand_profile || {};
  const ingredients = Array.isArray(data?.ingredients) ? data.ingredients : [];
  const alternatives = Array.isArray(data?.alternatives) ? data.alternatives : [];

  return {
    brand_profile: {
      certifications: asStringArray(brandProfile.certifications),
      carbonReport: toBoolean(brandProfile.carbonReport, false),
      laborPractices: asString(brandProfile.laborPractices) || "Unknown",
      overallEthicsScore: clampNumber(brandProfile.overallEthicsScore, 50, 0, 100),
    },
    ingredients: ingredients.map((ingredient) => ({
      name: asString(ingredient?.name),
      flag: ["safe", "moderate", "harmful"].includes(asString(ingredient?.flag).toLowerCase())
        ? asString(ingredient?.flag).toLowerCase()
        : "moderate",
      reason: asString(ingredient?.reason),
      score: clampNumber(ingredient?.score, 50, 0, 100),
    })),
    alternatives: alternatives.map((alternative) => ({
      name: asString(alternative?.name),
      brand: asString(alternative?.brand),
      score: clampNumber(alternative?.score, 50, 0, 100),
      improvements: asStringArray(alternative?.improvements),
    })),
  };
}
