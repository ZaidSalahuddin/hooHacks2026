import {
  analyzeProduct,
  identifyBrands,
  identifyIngredients,
  validateBrand,
  validateIngredients,
} from "./gemini";
import { computeScore } from "./score";

function buildValidationError(reason, issues = []) {
  const issueText = issues.length > 0 ? ` Issues: ${issues.join("; ")}` : "";
  return new Error(`${reason}${issueText}`);
}

export async function runScanPipeline(imageBase64, mimeType = "image/jpeg") {
  const [brandDetection, ingredientDetection] = await Promise.all([
    identifyBrands(imageBase64, mimeType),
    identifyIngredients(imageBase64, mimeType).catch(() => ({
      ingredients: [],
      confidence: 0,
      readability: "unreadable",
    })),
  ]);

  const detectedBrand = brandDetection.brands[0]?.brand || "";
  if (!detectedBrand) {
    throw new Error("We could not identify a clear brand from this image. Please retake the photo with the front label visible.");
  }

  const brandCandidate = {
    product_name: "",
    brand: detectedBrand,
    ingredients: ingredientDetection.ingredients,
  };

  const brandValidation = await validateBrand(brandCandidate, imageBase64, mimeType);
  if (!brandValidation.valid) {
    throw buildValidationError(
      brandValidation.reason || "The detected brand could not be validated.",
      brandValidation.issues
    );
  }

  const validatedProduct = {
    product_name: brandValidation.normalized_product_name || "Unknown Product",
    brand: brandValidation.normalized_brand || detectedBrand,
    ingredients: ingredientDetection.ingredients,
  };

  if (validatedProduct.ingredients.length === 0) {
    throw new Error("We could not read a usable ingredient list from this image. Please retake the photo with the ingredients panel visible.");
  }

  const ingredientValidation = await validateIngredients(validatedProduct, imageBase64, mimeType);
  if (!ingredientValidation.valid) {
    throw buildValidationError(
      ingredientValidation.reason || "The ingredient list could not be validated.",
      ingredientValidation.issues
    );
  }

  const fullyValidatedProduct = {
    product_name: validatedProduct.product_name,
    brand: validatedProduct.brand,
    ingredients: ingredientValidation.normalized_ingredients.length > 0
      ? ingredientValidation.normalized_ingredients
      : validatedProduct.ingredients,
  };

  const analysis = await analyzeProduct(fullyValidatedProduct.brand, fullyValidatedProduct.ingredients);

  const brandProfile = analysis.brand_profile || {
    certifications: [],
    carbonReport: false,
    laborPractices: "Unknown",
    overallEthicsScore: 50,
  };

  const ingredientResults = analysis.ingredients || [];
  const alternatives = analysis.alternatives || [];

  const safeCount = ingredientResults.filter((ingredient) => ingredient.flag === "safe").length;
  const totalIngredients = ingredientResults.length || 1;
  const avgIngredientScore =
    ingredientResults.reduce((sum, ingredient) => sum + (ingredient.score || 50), 0) / totalIngredients;

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

  return {
    product: fullyValidatedProduct,
    brandProfile,
    ingredientResults,
    alternatives,
    breakdown,
    score,
  };
}
