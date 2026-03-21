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

export function getFlagStyles(flag) {
  switch (flag) {
    case "safe": return { bg: "bg-green-100", text: "text-green-800", icon: "check" };
    case "moderate": return { bg: "bg-yellow-100", text: "text-yellow-800", icon: "warning" };
    case "harmful": return { bg: "bg-red-100", text: "text-red-800", icon: "close" };
    default: return { bg: "bg-gray-100", text: "text-gray-800", icon: "help" };
  }
}
