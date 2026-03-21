import {
  extractJSON,
  normalizeClassificationResult,
  normalizeBrandDetectionResult,
  normalizeBrandProfileResult,
  normalizeBrandValidationResult,
  normalizeIngredientAnalysisResult,
  normalizeIngredientDetectionResult,
  normalizeIngredientValidationResult,
  normalizeProductCandidatesResult,
} from '../src/lib/geminiUtils.js';
import { computeScore } from '../src/lib/score.js';
import { runAgent } from './runAgent.js';
import {
  analyzeIngredientsAgent,
  classifyImageContentAgent,
  identifyBrandsAgent,
  identifyDistinctProductsAgent,
  identifyIngredientsAgent,
  researchBrandAgent,
  validateBrandAgent,
  validateIngredientsAgent,
} from './agents.js';

function buildValidationError(reason, issues = []) {
  const issueText = issues.length > 0 ? ` Issues: ${issues.join('; ')}` : '';
  return new Error(`${reason}${issueText}`);
}

function parse(normalizer, text) {
  return normalizer(extractJSON(text));
}

function log(phase, message, data) {
  const dataStr = data !== undefined ? ` → ${JSON.stringify(data)}` : '';
  console.log(`[Pipeline] ${phase}: ${message}${dataStr}`);
}

export async function runScanPipeline(imageBase64, mimeType = 'image/jpeg') {
  log('Phase 1', 'Starting product count + classification (parallel)');

  const [productCountResult, classificationResult] = await Promise.all([
    runAgent(identifyDistinctProductsAgent, 'Analyze the provided image.', imageBase64, mimeType)
      .then((text) => parse(normalizeProductCandidatesResult, text))
      .catch(() => ({ product_count: 1, products: [] })),

    runAgent(classifyImageContentAgent, 'Analyze the provided image.', imageBase64, mimeType)
      .then((text) => parse(normalizeClassificationResult, text))
      .catch(() => ({ hasBrandLabel: true, hasIngredientList: true, confidence: 0 })),
  ]);

  log('Phase 1', 'Done', { product_count: productCountResult.product_count, ...classificationResult });

  if (productCountResult.product_count === 0) {
    throw new Error('No packaged products detected in this image. Please retake the photo with a product clearly visible.');
  }

  const { hasBrandLabel, hasIngredientList } = classificationResult;

  if (!hasBrandLabel && !hasIngredientList) {
    throw new Error('This image does not appear to show product packaging. Please retake with the product label visible.');
  }

  log('Phase 2', `Starting brand ID (${hasBrandLabel}) + ingredient parsing (${hasIngredientList}) (parallel)`);

  // Phase 2: Brand identification + ingredient parsing (parallel, routed by classification)
  const [brandDetection, ingredientDetection] = await Promise.all([
    hasBrandLabel
      ? runAgent(identifyBrandsAgent, 'Analyze the provided image.', imageBase64, mimeType)
          .then((text) => parse(normalizeBrandDetectionResult, text))
      : Promise.resolve({ brands: [] }),

    hasIngredientList
      ? runAgent(identifyIngredientsAgent, 'Analyze the provided image.', imageBase64, mimeType)
          .then((text) => parse(normalizeIngredientDetectionResult, text))
          .catch(() => ({ ingredients: [], confidence: 0, readability: 'unreadable' }))
      : Promise.resolve({ ingredients: [], confidence: 0, readability: 'unreadable' }),
  ]);

  const detectedBrand = brandDetection.brands[0]?.brand || '';
  log('Phase 2', 'Done', { brand: detectedBrand, ingredientCount: ingredientDetection.ingredients.length, readability: ingredientDetection.readability });

  if (!detectedBrand) {
    throw new Error('We could not identify a clear brand from this image. Please retake the photo with the front label visible.');
  }

  const brandCandidate = {
    product_name: '',
    brand: detectedBrand,
    ingredients: ingredientDetection.ingredients,
  };

  log('Phase 3', 'Starting brand validation + ingredient validation (parallel)');

  // Phase 3: Brand validation + ingredient validation (parallel)
  const hasIngredients = ingredientDetection.ingredients.length > 0;
  const [brandValidation, ingredientValidationResult] = await Promise.all([
    runAgent(
      validateBrandAgent,
      `Candidate product JSON: ${JSON.stringify(brandCandidate)}`,
      imageBase64,
      mimeType
    ).then((text) => parse(normalizeBrandValidationResult, text)),

    hasIngredients
      ? runAgent(
          validateIngredientsAgent,
          `Candidate product JSON: ${JSON.stringify(brandCandidate)}`,
          imageBase64,
          mimeType
        ).then((text) => parse(normalizeIngredientValidationResult, text))
      : Promise.resolve({ valid: true, confidence: 0, reason: 'No ingredients in image', issues: [], normalized_ingredients: [] }),
  ]);

  log('Phase 3', 'Done', { brandValid: brandValidation.valid, ingredientValid: ingredientValidationResult.valid });

  if (!brandValidation.valid) {
    throw buildValidationError(
      brandValidation.reason || 'The detected brand could not be validated.',
      brandValidation.issues
    );
  }

  // Only fail on ingredient validation if we actually detected ingredients
  if (hasIngredients && !ingredientValidationResult.valid) {
    throw buildValidationError(
      ingredientValidationResult.reason || 'The ingredient list could not be validated.',
      ingredientValidationResult.issues
    );
  }

  const fullyValidatedProduct = {
    product_name: brandValidation.normalized_product_name || 'Unknown Product',
    brand: brandValidation.normalized_brand || detectedBrand,
    ingredients:
      ingredientValidationResult.normalized_ingredients.length > 0
        ? ingredientValidationResult.normalized_ingredients
        : ingredientDetection.ingredients,
  };

  log('Phase 4', `Starting brand research + ingredient analysis (parallel) — ${fullyValidatedProduct.ingredients.length} ingredients`);

  // Phase 4: Brand research + ingredient analysis (parallel, no image needed)
  const [brandProfile, ingredientAnalysis] = await Promise.all([
    runAgent(researchBrandAgent, `Research the brand: "${fullyValidatedProduct.brand}"`)
      .then((text) => parse(normalizeBrandProfileResult, text))
      .catch(() => ({
        certifications: [],
        carbonReport: false,
        laborPractices: 'Unknown',
        overallEthicsScore: 50,
      })),

    fullyValidatedProduct.ingredients.length > 0
      ? runAgent(
          analyzeIngredientsAgent,
          `Brand: "${fullyValidatedProduct.brand}"\nIngredients: ${fullyValidatedProduct.ingredients.join(', ')}`
        ).then((text) => parse(normalizeIngredientAnalysisResult, text))
      : Promise.resolve({ ingredients: [], alternatives: [] }),
  ]);

  log('Phase 4', 'Done', { ethicsScore: brandProfile.overallEthicsScore, analyzedIngredients: ingredientAnalysis.ingredients.length });

  const ingredientResults = ingredientAnalysis.ingredients || [];
  const alternatives = ingredientAnalysis.alternatives || [];

  // Phase 5: Score calculation
  const safeCount = ingredientResults.filter((i) => i.flag === 'safe').length;
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

  log('Phase 5', 'Score calculated', { score, breakdown });

  return {
    product: fullyValidatedProduct,
    brandProfile,
    ingredientResults,
    alternatives,
    breakdown,
    score,
  };
}
