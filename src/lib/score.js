export function computeScore({ ingredientSafety, environmentalImpact, brandEthics, healthImpact, packaging }) {
  return Math.round(
    ingredientSafety    * 0.30 +
    environmentalImpact * 0.25 +
    brandEthics         * 0.20 +
    healthImpact        * 0.15 +
    packaging           * 0.10
  );
}

export function getScoreTier(score) {
  if (score >= 80) return { label: "Excellent", color: "green", emoji: "green" };
  if (score >= 50) return { label: "Moderate", color: "yellow", emoji: "yellow" };
  return { label: "Poor", color: "red", emoji: "red" };
}

export function getTierStyles(score) {
  if (score >= 80) return { bg: "bg-green-100", text: "text-green-800", ring: "stroke-green-500" };
  if (score >= 50) return { bg: "bg-yellow-100", text: "text-yellow-800", ring: "stroke-yellow-500" };
  return { bg: "bg-red-100", text: "text-red-800", ring: "stroke-red-500" };
}

/**
 * Build human-readable reasoning for each breakdown category
 * based on the actual data that produced the scores.
 */
export function buildBreakdownReasons({ ingredientResults, brandProfile, breakdown }) {
  const reasons = {};
  const total = ingredientResults.length || 0;
  const safe = ingredientResults.filter((i) => i.flag === "safe").length;
  const moderate = ingredientResults.filter((i) => i.flag === "moderate").length;
  const harmful = ingredientResults.filter((i) => i.flag === "harmful").length;
  const avgScore = total > 0
    ? Math.round(ingredientResults.reduce((s, i) => s + (i.score || 50), 0) / total)
    : 50;

  // Ingredient Safety
  const ingParts = [];
  ingParts.push(`Averaged safety score of ${avgScore}/100 across ${total} ingredient${total !== 1 ? "s" : ""}.`);
  if (safe > 0) ingParts.push(`${safe} rated safe.`);
  if (moderate > 0) ingParts.push(`${moderate} rated moderate concern.`);
  if (harmful > 0) ingParts.push(`${harmful} flagged as harmful.`);
  const worstIngredients = ingredientResults
    .filter((i) => i.flag === "harmful")
    .slice(0, 3)
    .map((i) => i.name);
  if (worstIngredients.length > 0) {
    ingParts.push(`Key concerns: ${worstIngredients.join(", ")}.`);
  }
  reasons.ingredient_safety = ingParts.join(" ");

  // Environmental Impact
  const envScore = breakdown.environmental_impact;
  const safeRatio = total > 0 ? Math.round((safe / total) * 100) : 0;
  reasons.environmental_impact =
    `Score derived from ingredient safety ratio (${safeRatio}% safe ingredients). ` +
    (envScore >= 70
      ? "Most ingredients have low environmental concern."
      : envScore >= 40
        ? "Some ingredients raise environmental concerns due to sourcing or processing impact."
        : "Multiple ingredients have significant environmental impact from production or disposal.");

  // Brand Ethics
  const certs = brandProfile?.certifications || [];
  const ethicsScore = brandProfile?.overallEthicsScore || 50;
  const ethicsParts = [`Brand ethics score: ${ethicsScore}/100.`];
  if (certs.length > 0) {
    ethicsParts.push(`Certifications: ${certs.join(", ")}.`);
  } else {
    ethicsParts.push("No major sustainability certifications found.");
  }
  if (brandProfile?.laborPractices && brandProfile.laborPractices !== "Unknown") {
    ethicsParts.push(`Labor practices: ${brandProfile.laborPractices}.`);
  }
  reasons.brand_ethics = ethicsParts.join(" ");

  // Health Impact
  const healthScore = breakdown.health_impact;
  reasons.health_impact =
    `Derived from ingredient safety analysis (avg score ${avgScore}/100, adjusted for health weighting). ` +
    (healthScore >= 70
      ? "Ingredients are generally recognized as safe for consumption."
      : healthScore >= 40
        ? "Some ingredients may have mild health concerns for sensitive individuals."
        : "Several ingredients are associated with potential health risks.");

  // Packaging
  const hasReport = brandProfile?.carbonReport;
  reasons.packaging = hasReport
    ? "Brand publishes a carbon/sustainability report, suggesting awareness of packaging impact. Score: 65/100."
    : "No public carbon or sustainability report found for this brand. Default score: 40/100. Publishing environmental reports would improve this rating.";

  return reasons;
}

export function getFlagStyles(flag) {
  switch (flag) {
    case "safe": return { bg: "bg-green-100", text: "text-green-800", icon: "check" };
    case "moderate": return { bg: "bg-yellow-100", text: "text-yellow-800", icon: "warning" };
    case "harmful": return { bg: "bg-red-100", text: "text-red-800", icon: "close" };
    default: return { bg: "bg-gray-100", text: "text-gray-800", icon: "help" };
  }
}
