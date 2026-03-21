import { create } from "zustand";
import { analyzeProductImage, analyzeProduct } from "../lib/gemini";
import { computeScore, buildBreakdownReasons } from "../lib/score";
import { saveScan, getScan } from "../lib/history";
import { getCachedProduct, cacheProduct } from "../lib/productCache";
import { lookupProduct, validateNutrition, validateIngredients } from "../lib/openFoodFacts";

export const useScanStore = create((set) => ({
  // State
  status: "idle", // idle | scanning | analyzing | done | error
  error: null,
  imageData: null,
  product: null,
  nutritionFacts: null,
  nutritionSource: null, // "gemini" | "validated" | "open_food_facts"
  validationWarnings: [],
  ingredientResults: [],
  brandProfile: null,
  score: null,
  breakdown: null,
  breakdownReasons: null,
  alternatives: [],

  reset: () =>
    set({
      status: "idle",
      error: null,
      imageData: null,
      product: null,
      nutritionFacts: null,
      nutritionSource: null,
      validationWarnings: [],
      ingredientResults: [],
      brandProfile: null,
      score: null,
      breakdown: null,
      breakdownReasons: null,
      alternatives: [],
    }),

  loadFromHistory: (id) => {
    const scan = getScan(id);
    if (!scan) return;
    const ingredientResults = scan.ingredientResults || [];
    const brandProfile = scan.brandProfile || null;
    const breakdown = scan.breakdown;
    set({
      status: "done",
      error: null,
      imageData: null,
      product: { product_name: scan.product_name, brand: scan.brand, ingredients: [] },
      nutritionFacts: scan.nutritionFacts || null,
      ingredientResults,
      brandProfile,
      score: scan.score,
      breakdown,
      breakdownReasons: scan.breakdownReasons || buildBreakdownReasons({ ingredientResults, brandProfile, breakdown }),
      alternatives: scan.alternatives || [],
    });
  },

  scan: async (imageBase64, mimeType) => {
    set({ status: "scanning", error: null, imageData: imageBase64 });

    try {
      // Step 1: Extract product info from image
      const product = await analyzeProductImage(imageBase64, mimeType);
      console.log("[EcoScan] Vision API response:", JSON.stringify(product, null, 2));
      let nutritionFacts = product.nutrition_facts || null;
      set({ product, nutritionFacts, status: "analyzing" });

      // Step 2: Check shared cache for this product
      const cached = await getCachedProduct(product.product_name, product.brand);

      let brandProfile, ingredientResults, alternatives, breakdown, score, breakdownReasons;
      let nutritionSource = "gemini";
      const allWarnings = [];

      if (cached) {
        // Use cached results — same score across all clients
        brandProfile = cached.brandProfile;
        ingredientResults = cached.ingredientResults;
        alternatives = cached.alternatives;
        breakdown = cached.breakdown;
        score = cached.score;
        nutritionFacts = cached.nutritionFacts || nutritionFacts;
        nutritionSource = cached.nutritionSource || "cached";
        breakdownReasons = cached.breakdownReasons || buildBreakdownReasons({ ingredientResults, brandProfile, breakdown });

        set({
          brandProfile, ingredientResults, alternatives, score, breakdown, breakdownReasons,
          nutritionFacts, nutritionSource, validationWarnings: [],
          status: "done",
        });
      } else {
        // Step 3: Fresh analysis via Gemini
        const analysis = await analyzeProduct(product.brand, product.ingredients);

        brandProfile = analysis.brand_profile || {
          certifications: [],
          carbonReport: false,
          laborPractices: "Unknown",
          overallEthicsScore: 50,
        };

        ingredientResults = analysis.ingredients || [];
        alternatives = analysis.alternatives || [];

        set({ brandProfile, ingredientResults, alternatives });

        // Step 4: Validate against Open Food Facts
        const offProduct = await lookupProduct(product.product_name, product.brand);

        if (offProduct) {
          console.log("[EcoScan] Open Food Facts match found:", offProduct.product_name, offProduct.brands);

          // Validate nutrition
          const nutritionResult = validateNutrition(nutritionFacts, offProduct);
          nutritionFacts = nutritionResult.nutrition;
          nutritionSource = nutritionResult.source;
          allWarnings.push(...nutritionResult.warnings);

          // Validate ingredients
          const ingredientResult = validateIngredients(product.ingredients, offProduct);
          allWarnings.push(...ingredientResult.warnings);

          set({ nutritionFacts, nutritionSource });
        } else {
          console.log("[EcoScan] No Open Food Facts match — using Gemini data as-is");
        }

        if (allWarnings.length > 0) {
          console.log("[EcoScan] Validation warnings:", allWarnings);
        }
        set({ validationWarnings: allWarnings });

        // Step 5: Compute score
        const safeCount = ingredientResults.filter((i) => i.flag === "safe").length;
        const totalIngredients = ingredientResults.length || 1;
        const avgIngredientScore =
          ingredientResults.reduce((sum, i) => sum + (i.score || 50), 0) / totalIngredients;

        breakdown = {
          ingredient_safety: Math.round(avgIngredientScore),
          environmental_impact: Math.round((safeCount / totalIngredients) * 70 + 15),
          brand_ethics: brandProfile.overallEthicsScore || 50,
          health_impact: Math.round(avgIngredientScore * 0.9 + 10),
          packaging: brandProfile.carbonReport ? 65 : 40,
        };

        score = computeScore({
          ingredientSafety: breakdown.ingredient_safety,
          environmentalImpact: breakdown.environmental_impact,
          brandEthics: breakdown.brand_ethics,
          healthImpact: breakdown.health_impact,
          packaging: breakdown.packaging,
        });

        breakdownReasons = buildBreakdownReasons({ ingredientResults, brandProfile, breakdown });

        set({ score, breakdown, breakdownReasons, status: "done" });

        // Step 6: Save to shared cache so other clients get the same score
        await cacheProduct(product.product_name, product.brand, {
          score,
          score_tier: score >= 80 ? "excellent" : score >= 50 ? "moderate" : "poor",
          breakdown,
          breakdownReasons,
          nutritionFacts,
          nutritionSource,
          ingredientResults,
          brandProfile,
          alternatives,
        });
      }

      // Step 7: Save to local history
      saveScan({
        product_name: product.product_name,
        brand: product.brand,
        image_thumbnail: imageBase64.slice(0, 500),
        score,
        score_tier: score >= 80 ? "excellent" : score >= 50 ? "moderate" : "poor",
        breakdown,
        breakdownReasons,
        nutritionFacts,
        nutritionSource,
        ingredientResults,
        brandProfile,
        flagged_ingredients: ingredientResults.filter((i) => i.flag !== "safe"),
        alternatives,
      });
    } catch (err) {
      set({ status: "error", error: err.message || "Something went wrong" });
    }
  },
}));
