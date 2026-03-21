const BASE_WEIGHTS = {
  ingredientSafety: 0.30,
  environmentalImpact: 0.25,
  brandEthics: 0.20,
  healthImpact: 0.15,
  packaging: 0.10,
};

/**
 * Compute the overall score, skipping any category that is null (insufficient data).
 * Remaining weights are redistributed proportionally.
 */
export function computeScore({ ingredientSafety, environmentalImpact, brandEthics, healthImpact, packaging }) {
  const values = { ingredientSafety, environmentalImpact, brandEthics, healthImpact, packaging };

  // Filter to only categories with valid scores
  const active = Object.entries(values).filter(([, v]) => v != null);

  if (active.length === 0) return null;

  // Sum of weights for active categories
  const totalWeight = active.reduce((sum, [key]) => sum + BASE_WEIGHTS[key], 0);

  // Compute weighted average with redistributed weights
  const score = active.reduce((sum, [key, val]) => {
    const normalizedWeight = BASE_WEIGHTS[key] / totalWeight;
    return sum + val * normalizedWeight;
  }, 0);

  return Math.round(score);
}

export function getScoreTier(score) {
  if (score >= 80) return { label: "High Bounty", color: "gold", emoji: "⭐" };
  if (score >= 50) return { label: "Moderate", color: "yellow", emoji: "🤠" };
  return { label: "Low Bounty", color: "rust", emoji: "💀" };
}

export function getTierStyles(score) {
  if (score >= 80) return { bg: "bg-gold-100", text: "text-gold-700", ring: "stroke-gold-500" };
  if (score >= 50) return { bg: "bg-yellow-100", text: "text-yellow-700", ring: "stroke-yellow-500" };
  return { bg: "bg-rust-100", text: "text-rust-600", ring: "stroke-rust-500" };
}

/**
 * Build human-readable reasoning for each breakdown category
 * based on the actual data that produced the scores.
 */
const INSUFFICIENT_DATA = "Excluded from total score — not enough verified data available for this category.";

export function buildBreakdownReasons({ ingredientResults, brandProfile, breakdown }) {
  const reasons = {};
  const total = ingredientResults.length || 0;
  const highConf = ingredientResults.filter((i) => i.confidence !== "low");
  const safe = highConf.filter((i) => i.flag === "safe").length;
  const moderate = highConf.filter((i) => i.flag === "moderate").length;
  const harmful = highConf.filter((i) => i.flag === "harmful").length;
  const avgScore = highConf.length > 0
    ? Math.round(highConf.reduce((s, i) => s + (i.score || 50), 0) / highConf.length)
    : null;

  // Ingredient Safety
  if (breakdown.ingredient_safety == null) {
    reasons.ingredient_safety = INSUFFICIENT_DATA + ` Only ${highConf.length} of ${total} ingredients had enough data to assess.`;
  } else {
    const ingParts = [];
    ingParts.push(`Averaged safety score of ${avgScore}/100 across ${highConf.length} verified ingredient${highConf.length !== 1 ? "s" : ""}.`);
    if (safe > 0) ingParts.push(`${safe} rated safe.`);
    if (moderate > 0) ingParts.push(`${moderate} rated moderate concern.`);
    if (harmful > 0) ingParts.push(`${harmful} flagged as harmful.`);
    const worstIngredients = highConf
      .filter((i) => i.flag === "harmful")
      .slice(0, 3)
      .map((i) => i.name);
    if (worstIngredients.length > 0) {
      ingParts.push(`Key concerns: ${worstIngredients.join(", ")}.`);
    }
    const lowCount = total - highConf.length;
    if (lowCount > 0) {
      ingParts.push(`${lowCount} ingredient${lowCount !== 1 ? "s" : ""} excluded due to insufficient data.`);
    }
    reasons.ingredient_safety = ingParts.join(" ");
  }

  // Environmental Impact
  if (breakdown.environmental_impact == null) {
    reasons.environmental_impact = INSUFFICIENT_DATA + " Environmental impact is derived from ingredient data, which was not reliable enough.";
  } else {
    const envScore = breakdown.environmental_impact;
    const safeRatio = highConf.length > 0 ? Math.round((safe / highConf.length) * 100) : 0;
    reasons.environmental_impact =
      `Score derived from ingredient safety ratio (${safeRatio}% safe ingredients). ` +
      (envScore >= 70
        ? "Most ingredients have low environmental concern."
        : envScore >= 40
          ? "Some ingredients raise environmental concerns due to sourcing or processing impact."
          : "Multiple ingredients have significant environmental impact from production or disposal.");
  }

  // Brand Ethics
  if (breakdown.brand_ethics == null) {
    reasons.brand_ethics = INSUFFICIENT_DATA + " Could not find verified sustainability information for this brand.";
  } else {
    const certs = brandProfile?.certifications || [];
    const ethicsScore = brandProfile?.overallEthicsScore || 50;
    const ethicsParts = [`Brand ethics score: ${ethicsScore}/100.`];
    if (certs.length > 0) {
      ethicsParts.push(`Certifications: ${certs.join(", ")}.`);
    } else {
      ethicsParts.push("No major sustainability certifications found.");
    }
    if (brandProfile?.laborPractices && brandProfile.laborPractices !== "Unknown" && brandProfile.laborPractices !== "No data available") {
      ethicsParts.push(`Labor practices: ${brandProfile.laborPractices}.`);
    }
    reasons.brand_ethics = ethicsParts.join(" ");
  }

  // Health Impact
  if (breakdown.health_impact == null) {
    reasons.health_impact = INSUFFICIENT_DATA + " Health impact is derived from ingredient data, which was not reliable enough.";
  } else {
    const healthScore = breakdown.health_impact;
    reasons.health_impact =
      `Derived from ingredient safety analysis (avg score ${avgScore}/100, adjusted for health weighting). ` +
      (healthScore >= 70
        ? "Ingredients are generally recognized as safe for consumption."
        : healthScore >= 40
          ? "Some ingredients may have mild health concerns for sensitive individuals."
          : "Several ingredients are associated with potential health risks.");
  }

  // Packaging
  if (breakdown.packaging == null) {
    reasons.packaging = INSUFFICIENT_DATA + " No verified brand sustainability data available to assess packaging practices.";
  } else {
    const hasReport = brandProfile?.carbonReport;
    reasons.packaging = hasReport
      ? "Brand publishes a carbon/sustainability report, suggesting awareness of packaging impact. Score: 65/100."
      : "No public carbon or sustainability report found for this brand. Default score: 40/100. Publishing environmental reports would improve this rating.";
  }

  return reasons;
}

export function getFlagStyles(flag) {
  switch (flag) {
    case "safe": return { bg: "bg-safe-100", text: "text-safe-800", icon: "check" };
    case "moderate": return { bg: "bg-yellow-100", text: "text-yellow-800", icon: "warning" };
    case "harmful": return { bg: "bg-rust-100", text: "text-rust-700", icon: "close" };
    default: return { bg: "bg-gray-100", text: "text-gray-800", icon: "help" };
  }
}
