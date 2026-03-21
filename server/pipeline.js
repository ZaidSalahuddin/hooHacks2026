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

const DEFAULT_BRAND_PROFILE = {
  certifications: [],
  carbonReport: false,
  laborPractices: 'Unknown',
  overallEthicsScore: 50,
};

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

function computeBreakdown(brandProfile, ingredientResults) {
  const safeCount = ingredientResults.filter((i) => i.flag === 'safe').length;
  const total = ingredientResults.length || 1;
  const avgScore = ingredientResults.reduce((sum, i) => sum + (i.score || 50), 0) / total;
  return {
    ingredient_safety: Math.round(avgScore),
    environmental_impact: Math.round((safeCount / total) * 70 + 15),
    brand_ethics: brandProfile.overallEthicsScore || 50,
    health_impact: Math.round(avgScore * 0.9 + 10),
    packaging: brandProfile.carbonReport ? 65 : 40,
  };
}

export async function runScanPipeline(imageBase64, mimeType = 'image/jpeg') {
  // Phase 1: Product count validation + image classification (parallel)
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

  // Phase 2: All brands + shared ingredient detection (parallel, routed by classification)
  log('Phase 2', `Starting brand ID (${hasBrandLabel}) + ingredient parsing (${hasIngredientList}) (parallel)`);
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

  // Take up to 3 detected brands for multi-product support
  const detectedBrands = brandDetection.brands.slice(0, 3);
  log('Phase 2', 'Done', { brands: detectedBrands.map((b) => b.brand), ingredientCount: ingredientDetection.ingredients.length });

  if (detectedBrands.length === 0) {
    throw new Error('We could not identify a clear brand from this image. Please retake the photo with the front label visible.');
  }

  const hasIngredients = ingredientDetection.ingredients.length > 0;

  // Phase 3: Validate all brands in parallel + validate ingredients once
  log('Phase 3', `Validating ${detectedBrands.length} brand(s) + ingredients (parallel)`);
  const brandCandidates = detectedBrands.map((b) => ({
    product_name: '',
    brand: b.brand,
    ingredients: ingredientDetection.ingredients,
  }));

  const [brandValidations, ingredientValidationResult] = await Promise.all([
    Promise.all(
      brandCandidates.map((candidate) =>
        runAgent(
          validateBrandAgent,
          `Candidate product JSON: ${JSON.stringify(candidate)}`,
          imageBase64,
          mimeType
        ).then((text) => parse(normalizeBrandValidationResult, text))
          .catch(() => ({ valid: false, confidence: 0, reason: 'Validation failed', issues: [], normalized_brand: candidate.brand, normalized_product_name: '' }))
      )
    ),

    hasIngredients
      ? runAgent(
          validateIngredientsAgent,
          `Candidate product JSON: ${JSON.stringify(brandCandidates[0])}`,
          imageBase64,
          mimeType
        ).then((text) => parse(normalizeIngredientValidationResult, text))
          .catch(() => ({ valid: true, confidence: 0, reason: '', issues: [], normalized_ingredients: [] }))
      : Promise.resolve({ valid: true, confidence: 0, reason: 'No ingredients in image', issues: [], normalized_ingredients: [] }),
  ]);

  // Filter to only valid brands
  const validatedBrands = detectedBrands
    .map((b, i) => ({ brand: b, validation: brandValidations[i] }))
    .filter((pair) => pair.validation.valid);

  log('Phase 3', 'Done', {
    validBrands: validatedBrands.map((p) => p.validation.normalized_brand),
    ingredientValid: ingredientValidationResult.valid,
  });

  if (validatedBrands.length === 0) {
    const firstReason = brandValidations[0]?.reason || 'The detected brand could not be validated.';
    throw buildValidationError(firstReason, brandValidations[0]?.issues || []);
  }

  // Only enforce ingredient validation failure if we actually detected ingredients
  if (hasIngredients && !ingredientValidationResult.valid) {
    throw buildValidationError(
      ingredientValidationResult.reason || 'The ingredient list could not be validated.',
      ingredientValidationResult.issues
    );
  }

  const finalIngredients =
    ingredientValidationResult.normalized_ingredients.length > 0
      ? ingredientValidationResult.normalized_ingredients
      : ingredientDetection.ingredients;

  // Phase 4: Research all brands in parallel + analyze shared ingredients once
  log('Phase 4', `Researching ${validatedBrands.length} brand(s) + ingredient analysis (parallel)`);
  const [brandProfiles, ingredientAnalysis] = await Promise.all([
    Promise.all(
      validatedBrands.map((pair) =>
        runAgent(researchBrandAgent, `Research the brand: "${pair.validation.normalized_brand || pair.brand.brand}"`)
          .then((text) => parse(normalizeBrandProfileResult, text))
          .catch(() => ({ ...DEFAULT_BRAND_PROFILE }))
      )
    ),

    finalIngredients.length > 0
      ? runAgent(
          analyzeIngredientsAgent,
          `Brand: "${validatedBrands[0].validation.normalized_brand || validatedBrands[0].brand.brand}"\nIngredients: ${finalIngredients.join(', ')}`
        ).then((text) => parse(normalizeIngredientAnalysisResult, text))
          .catch(() => ({ ingredients: [], alternatives: [] }))
      : Promise.resolve({ ingredients: [], alternatives: [] }),
  ]);

  const ingredientResults = ingredientAnalysis.ingredients || [];
  const alternatives = ingredientAnalysis.alternatives || [];

  log('Phase 4', 'Done', {
    brandProfiles: brandProfiles.map((p) => p.overallEthicsScore),
    analyzedIngredients: ingredientResults.length,
  });

  // Phase 5: Score calculation for each validated product
  const products = validatedBrands.map((pair, i) => {
    const brandProfile = brandProfiles[i];
    const breakdown = computeBreakdown(brandProfile, ingredientResults);
    const score = computeScore({
      ingredientSafety: breakdown.ingredient_safety,
      environmentalImpact: breakdown.environmental_impact,
      brandEthics: breakdown.brand_ethics,
      healthImpact: breakdown.health_impact,
      packaging: breakdown.packaging,
    });

    log('Phase 5', `Score for ${pair.validation.normalized_brand || pair.brand.brand}`, { score, breakdown });

    return {
      product: {
        product_name: pair.validation.normalized_product_name || 'Unknown Product',
        brand: pair.validation.normalized_brand || pair.brand.brand,
        ingredients: finalIngredients,
      },
      brandProfile,
      ingredientResults,
      alternatives,
      breakdown,
      score,
    };
  });

  return { products };
}
