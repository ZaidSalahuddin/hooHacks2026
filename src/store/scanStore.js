import { create } from "zustand";
import { buildBreakdownReasons } from "../lib/score";
import { saveScan, getScan } from "../lib/history";

export const useScanStore = create((set) => ({
  status: "idle", // idle | scanning | analyzing | done | error
  error: null,
  imageData: null,
  scanResults: [], // array of { product, brandProfile, ingredientResults, alternatives, breakdown, breakdownReasons, score, nutritionFacts }

  reset: () =>
    set({ status: "idle", error: null, imageData: null, scanResults: [] }),

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
      scanResults: [
        {
          product: { product_name: scan.product_name, brand: scan.brand, ingredients: [] },
          ingredientResults,
          brandProfile,
          score: scan.score,
          breakdown,
          breakdownReasons:
            scan.breakdownReasons ||
            buildBreakdownReasons({ ingredientResults, brandProfile, breakdown }),
          alternatives: scan.alternatives || [],
          nutritionFacts: scan.nutritionFacts || null,
        },
      ],
    });
  },

  scan: async (imageBase64, mimeType) => {
    set({ status: "scanning", error: null, imageData: imageBase64 });

    try {
      set({ status: "analyzing" });
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Scan failed. Please try again.");
      }
      const { products } = await response.json();

      // Compute breakdownReasons client-side for each product
      const enrichedProducts = products.map((p) => ({
        ...p,
        breakdownReasons: buildBreakdownReasons({
          ingredientResults: p.ingredientResults,
          brandProfile: p.brandProfile,
          breakdown: p.breakdown,
        }),
      }));

      set({ scanResults: enrichedProducts, status: "done" });

      // Save primary product to history
      const primary = enrichedProducts[0];
      if (primary) {
        saveScan({
          product_name: primary.product.product_name,
          brand: primary.product.brand,
          image_thumbnail: imageBase64.slice(0, 500),
          score: primary.score,
          score_tier:
            primary.score >= 80 ? "excellent" : primary.score >= 50 ? "moderate" : "poor",
          breakdown: primary.breakdown,
          breakdownReasons: primary.breakdownReasons,
          ingredientResults: primary.ingredientResults,
          brandProfile: primary.brandProfile,
          flagged_ingredients: primary.ingredientResults.filter((i) => i.flag !== "safe"),
          alternatives: primary.alternatives,
          nutritionFacts: primary.nutritionFacts || null,
        });
      }
    } catch (err) {
      set({ status: "error", error: err.message || "Something went wrong" });
    }
  },
}));
