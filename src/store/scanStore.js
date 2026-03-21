import { create } from "zustand";
import { analyzeProductImage, analyzeProduct } from "../lib/gemini";
import { computeScore } from "../lib/score";
import { saveScan, getScan } from "../lib/history";

export const useScanStore = create((set) => ({
  // State
  status: "idle", // idle | scanning | analyzing | done | error
  error: null,
  imageData: null,
  product: null,
  ingredientResults: [],
  brandProfile: null,
  score: null,
  breakdown: null,
  alternatives: [],

  reset: () =>
    set({
      status: "idle",
      error: null,
      imageData: null,
      product: null,
      ingredientResults: [],
      brandProfile: null,
      score: null,
      breakdown: null,
      alternatives: [],
    }),

  loadFromHistory: (id) => {
    const scan = getScan(id);
    if (!scan) return;
    set({
      status: "done",
      error: null,
      imageData: null,
      product: { product_name: scan.product_name, brand: scan.brand, ingredients: [] },
      ingredientResults: scan.ingredientResults || [],
      brandProfile: scan.brandProfile || null,
      score: scan.score,
      breakdown: scan.breakdown,
      alternatives: scan.alternatives || [],
    });
  },

  scan: async (imageBase64, mimeType) => {
    set({ status: "scanning", error: null, imageData: imageBase64 });

    try {
      // Step 1: Extract product info from image (API call 1)
      const product = await analyzeProductImage(imageBase64, mimeType);
      set({ product, status: "analyzing" });

      // Step 2: Single API call for brand + ingredients + alternatives (API call 2)
      const analysis = await analyzeProduct(product.brand, product.ingredients);

      const brandProfile = analysis.brand_profile || {
        certifications: [],
        carbonReport: false,
        laborPractices: "Unknown",
        overallEthicsScore: 50,
      };

      const ingredientResults = analysis.ingredients || [];
      const alternatives = analysis.alternatives || [];

      set({ brandProfile, ingredientResults, alternatives });

      // Step 3: Compute score
      const safeCount = ingredientResults.filter((i) => i.flag === "safe").length;
      const totalIngredients = ingredientResults.length || 1;
      const avgIngredientScore =
        ingredientResults.reduce((sum, i) => sum + (i.score || 50), 0) / totalIngredients;

      const breakdown = {
        ingredient_safety: Math.round(avgIngredientScore),
        environmental_impact: Math.round((safeCount / totalIngredients) * 70 + 15),
        brand_ethics: brandProfile.overallEthicsScore || 50,
        health_impact: Math.round(avgIngredientScore * 0.9 + 10),
        packaging: brandProfile.carbonReport ? 65 : 40,
      };

      const score = computeScore({
        ingredientSafety: breakdown.ingredient_safety,
        environmentalImpact: breakdown.environmental_impact,
        brandEthics: breakdown.brand_ethics,
        healthImpact: breakdown.health_impact,
        packaging: breakdown.packaging,
      });

      set({ score, breakdown, status: "done" });

      // Step 4: Save to history
      saveScan({
        product_name: product.product_name,
        brand: product.brand,
        image_thumbnail: imageBase64.slice(0, 500),
        score,
        score_tier: score >= 80 ? "excellent" : score >= 50 ? "moderate" : "poor",
        breakdown,
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
