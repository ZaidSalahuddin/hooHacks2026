/**
 * Validate and sanitize Gemini's analysis response.
 * Clamps scores, flags low-confidence data, and removes suspect entries.
 */

const VALID_FLAGS = new Set(["safe", "moderate", "harmful"]);
const VALID_CONFIDENCE = new Set(["high", "medium", "low"]);

function clamp(val, min, max) {
  const n = Number(val);
  if (isNaN(n)) return null;
  return Math.max(min, Math.min(max, Math.round(n)));
}

/**
 * Validate and clean ingredient results from Gemini.
 * - Clamps scores to 0-100
 * - Normalizes flags
 * - Forces low-confidence items to score 50
 * - Marks items missing sources as low confidence
 */
export function validateIngredientResults(ingredients) {
  if (!Array.isArray(ingredients)) return [];

  return ingredients.map((ing) => {
    const cleaned = { ...ing };

    // Normalize flag
    if (!VALID_FLAGS.has(cleaned.flag)) {
      cleaned.flag = "moderate";
      cleaned.confidence = "low";
    }

    // Normalize confidence
    if (!VALID_CONFIDENCE.has(cleaned.confidence)) {
      // Infer confidence from whether a source was provided
      cleaned.confidence = cleaned.source_url ? "medium" : "low";
    }

    // If no source URL, downgrade confidence
    if (!cleaned.source_url && cleaned.confidence === "high") {
      cleaned.confidence = "medium";
    }

    // Clamp score
    cleaned.score = clamp(cleaned.score, 0, 100);

    // Low confidence → neutral score to avoid random numbers
    if (cleaned.confidence === "low" && cleaned.score !== null) {
      cleaned.score = 50;
    }

    // Must have a reason
    if (!cleaned.reason || cleaned.reason.trim().length < 5) {
      cleaned.reason = "Insufficient data available for assessment";
      cleaned.confidence = "low";
      cleaned.score = 50;
    }

    return cleaned;
  });
}

/**
 * Validate brand profile from Gemini.
 * - Clamps ethics score
 * - Flags missing data as low confidence
 */
export function validateBrandProfile(profile) {
  if (!profile) {
    return {
      certifications: [],
      carbonReport: false,
      laborPractices: "No data available",
      overallEthicsScore: 50,
      confidence: "low",
      confidence_reason: "No brand sustainability data found",
      source_urls: [],
    };
  }

  const cleaned = { ...profile };

  // Clamp ethics score
  cleaned.overallEthicsScore = clamp(cleaned.overallEthicsScore, 0, 100) ?? 50;

  // Normalize confidence
  if (!VALID_CONFIDENCE.has(cleaned.confidence)) {
    // Infer: if no sources and no certifications found, it's low confidence
    const hasSources = cleaned.source_urls?.length > 0;
    const hasCerts = cleaned.certifications?.length > 0;
    cleaned.confidence = hasSources || hasCerts ? "medium" : "low";
  }

  // If no source URLs, downgrade high to medium
  if ((!cleaned.source_urls || cleaned.source_urls.length === 0) && cleaned.confidence === "high") {
    cleaned.confidence = "medium";
  }

  // Low confidence → neutral score
  if (cleaned.confidence === "low") {
    cleaned.overallEthicsScore = 50;
    cleaned.laborPractices = cleaned.laborPractices || "No data available";
  }

  // Ensure arrays exist
  cleaned.certifications = Array.isArray(cleaned.certifications) ? cleaned.certifications : [];
  cleaned.source_urls = Array.isArray(cleaned.source_urls) ? cleaned.source_urls : [];

  return cleaned;
}

/**
 * Validate alternatives from Gemini.
 * - Removes alternatives with no name
 * - Clamps scores
 */
export function validateAlternatives(alternatives) {
  if (!Array.isArray(alternatives)) return [];

  return alternatives
    .filter((alt) => alt.name && alt.name.trim().length > 0)
    .map((alt) => ({
      ...alt,
      score: clamp(alt.score, 0, 100) ?? 50,
    }));
}

/**
 * Compute a data quality summary for the entire scan.
 * Returns an object with overall confidence and specific warnings.
 */
export function assessDataQuality(ingredientResults, brandProfile) {
  const warnings = [];

  // Check ingredient confidence
  const lowConfIngredients = ingredientResults.filter((i) => i.confidence === "low");
  const totalIngredients = ingredientResults.length || 1;
  const lowConfRatio = lowConfIngredients.length / totalIngredients;

  if (lowConfRatio > 0.5) {
    warnings.push({
      type: "ingredients",
      message: `${lowConfIngredients.length} of ${ingredientResults.length} ingredients have low confidence scores — limited data was available`,
    });
  }

  // Check brand confidence
  if (brandProfile?.confidence === "low") {
    warnings.push({
      type: "brand",
      message: "Brand sustainability data could not be verified — ethics score defaulted to 50/100",
    });
  }

  // Check for ingredients all at the same score (sign of Gemini guessing)
  const uniqueScores = new Set(ingredientResults.map((i) => i.score));
  if (ingredientResults.length > 3 && uniqueScores.size === 1) {
    warnings.push({
      type: "ingredients",
      message: "All ingredients received the same score — results may not be individually assessed",
    });
  }

  // Overall confidence
  let overall = "high";
  if (warnings.length > 0) overall = "medium";
  if (lowConfRatio > 0.5 || brandProfile?.confidence === "low") overall = "low";

  return { overall, warnings };
}
