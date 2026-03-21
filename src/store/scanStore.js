import { create } from "zustand";
import { analyzeProductImage, analyzeProduct } from "../lib/gemini";
import { computeScore, buildBreakdownReasons } from "../lib/score";
import { saveScan, getScan } from "../lib/history";
import { getCachedProduct, cacheProduct } from "../lib/productCache";
import { lookupProduct, validateNutrition, validateIngredients } from "../lib/openFoodFacts";
import { validateIngredientResults, validateBrandProfile, validateAlternatives, assessDataQuality } from "../lib/validate";

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
  groundingSources: [],
  dataQuality: null,
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
      groundingSources: [],
      dataQuality: null,
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
      groundingSources: scan.groundingSources || [],
      dataQuality: scan.dataQuality || assessDataQuality(ingredientResults, brandProfile),
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

      let brandProfile, ingredientResults, alternatives, breakdown, score, breakdownReasons, dataQuality;
      let groundingSources = [];
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
        groundingSources = cached.groundingSources || [];
        dataQuality = cached.dataQuality || assessDataQuality(ingredientResults, brandProfile);

        set({
          brandProfile, ingredientResults, alternatives, score, breakdown, breakdownReasons,
          groundingSources, dataQuality, nutritionFacts, nutritionSource, validationWarnings: [],
          status: "done",
        });
      } else {
        // Step 3: Fresh analysis via Gemini
        const analysis = await analyzeProduct(product.brand, product.ingredients);

        // Validate all Gemini results before using them
        brandProfile = validateBrandProfile(analysis.brand_profile);
        ingredientResults = validateIngredientResults(analysis.ingredients);
        alternatives = validateAlternatives(analysis.alternatives);
        groundingSources = analysis._groundingSources || [];

        set({ brandProfile, ingredientResults, alternatives, groundingSources });

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

        // Step 5: Compute score — exclude low-confidence categories
        const totalIngredients = ingredientResults.length || 0;
        const highConfIngredients = ingredientResults.filter((i) => i.confidence !== "low");
        const lowConfRatio = totalIngredients > 0
          ? ingredientResults.filter((i) => i.confidence === "low").length / totalIngredients
          : 1;

        // Ingredient safety: exclude if most ingredients are low confidence
        let ingredientSafetyScore = null;
        if (highConfIngredients.length > 0 && lowConfRatio <= 0.5) {
          const avgScore = highConfIngredients.reduce((sum, i) => sum + (i.score || 50), 0) / highConfIngredients.length;
          ingredientSafetyScore = Math.round(avgScore);
        }

        // Environmental impact: derived from ingredients, exclude if ingredients are unreliable
        let envScore = null;
        if (ingredientSafetyScore != null) {
          const safeCount = highConfIngredients.filter((i) => i.flag === "safe").length;
          envScore = Math.round((safeCount / highConfIngredients.length) * 70 + 15);
        }

        // Brand ethics: exclude if low confidence
        const brandEthicsScore = brandProfile.confidence !== "low"
          ? (brandProfile.overallEthicsScore || 50)
          : null;

        // Health impact: derived from ingredients
        const healthScore = ingredientSafetyScore != null
          ? Math.round(ingredientSafetyScore * 0.9 + 10)
          : null;

        // Packaging: exclude if brand data is low confidence (carbon report unknown)
        const packagingScore = brandProfile.confidence !== "low"
          ? (brandProfile.carbonReport ? 65 : 40)
          : null;

        breakdown = {
          ingredient_safety: ingredientSafetyScore,
          environmental_impact: envScore,
          brand_ethics: brandEthicsScore,
          health_impact: healthScore,
          packaging: packagingScore,
        };

        score = computeScore({
          ingredientSafety: breakdown.ingredient_safety,
          environmentalImpact: breakdown.environmental_impact,
          brandEthics: breakdown.brand_ethics,
          healthImpact: breakdown.health_impact,
          packaging: breakdown.packaging,
        });

        breakdownReasons = buildBreakdownReasons({ ingredientResults, brandProfile, breakdown });

        // Step 6: Assess data quality
        const dataQuality = assessDataQuality(ingredientResults, brandProfile);
        console.log("[EcoScan] Data quality:", dataQuality);

        set({ score, breakdown, breakdownReasons, dataQuality, status: "done" });

        // Step 7: Save to shared cache so other clients get the same score
        await cacheProduct(product.product_name, product.brand, {
          score,
          score_tier: score >= 80 ? "excellent" : score >= 50 ? "moderate" : "poor",
          breakdown,
          breakdownReasons,
          groundingSources,
          dataQuality,
          nutritionFacts,
          nutritionSource,
          ingredientResults,
          brandProfile,
          alternatives,
        });
      }

      // Step 8: Save to local history
      saveScan({
        product_name: product.product_name,
        brand: product.brand,
        image_thumbnail: imageBase64.slice(0, 500),
        score,
        score_tier: score >= 80 ? "excellent" : score >= 50 ? "moderate" : "poor",
        breakdown,
        breakdownReasons,
        groundingSources,
        dataQuality,
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
