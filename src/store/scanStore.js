import { create } from "zustand";
import { runScanPipeline } from "../lib/scanPipeline";
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
      set({ status: "analyzing" });
      const { product, brandProfile, ingredientResults, alternatives, breakdown, score } =
        await runScanPipeline(imageBase64, mimeType);

      set({ product, brandProfile, ingredientResults, alternatives, breakdown, score, status: "done" });

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
