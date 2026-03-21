import { useState } from "react";

const CATEGORIES = [
  { key: "ingredient_safety", label: "Ingredients", baseWeight: 0.30 },
  { key: "environmental_impact", label: "Environment", baseWeight: 0.25 },
  { key: "brand_ethics", label: "Brand Ethics", baseWeight: 0.20 },
  { key: "health_impact", label: "Health", baseWeight: 0.15 },
  { key: "packaging", label: "Packaging", baseWeight: 0.10 },
];

function getBarColor(value) {
  if (value >= 80) return "bg-gold-500";
  if (value >= 50) return "bg-yellow-500";
  return "bg-rust-500";
}

function getTierLabel(value) {
  if (value >= 80) return { text: "Excellent", style: "text-gold-600" };
  if (value >= 50) return { text: "Moderate", style: "text-yellow-600" };
  return { text: "Low Bounty", style: "text-rust-600" };
}

export default function BreakdownChart({ breakdown, reasons }) {
  const [expandedKey, setExpandedKey] = useState(null);

  if (!breakdown) return null;

  const toggle = (key) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  // Compute redistributed weights for display
  const activeWeight = CATEGORIES.reduce(
    (sum, c) => sum + (breakdown[c.key] != null ? c.baseWeight : 0), 0
  );
  const excludedCount = CATEGORIES.filter((c) => breakdown[c.key] == null).length;

  return (
    <div className="space-y-2">
      <h3 className="font-display text-lg text-green-900">Bounty Report</h3>
      <p className="text-xs text-green-500 mb-1">Tap a category to read the deputy's notes</p>

      {excludedCount > 0 && (
        <p className="text-xs text-amber-600 mb-1">
          {excludedCount} categor{excludedCount === 1 ? "y" : "ies"} excluded due to insufficient data — weights redistributed
        </p>
      )}

      {CATEGORIES.map(({ key, label, baseWeight }) => {
        const value = breakdown[key];
        const isExcluded = value == null;
        const isExpanded = expandedKey === key;
        const reason = reasons?.[key];

        // Show redistributed weight for active categories
        const displayWeight = isExcluded
          ? "excluded"
          : `${Math.round((baseWeight / activeWeight) * 100)}%`;

        if (isExcluded) {
          return (
            <div key={key}>
              <button
                onClick={() => toggle(key)}
                className="w-full text-left cursor-pointer opacity-60"
              >
                <div className="space-y-1">
                  <div className="flex justify-between text-sm items-center">
                    <span className="font-medium flex items-center gap-1.5">
                      {label}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                        Insufficient data
                      </span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </span>
                    <span className="text-xs text-gray-400">Not scored</span>
                  </div>
                  <div className="h-2.5 bg-cream-200 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gray-300 w-full opacity-30" />
                  </div>
                </div>
              </button>

              {isExpanded && reason && (
                <div className="mt-2 ml-1 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800 leading-relaxed">{reason}</p>
                </div>
              )}
            </div>
          );
        }

        const tier = getTierLabel(value);

        return (
          <div key={key}>
            <button
              onClick={() => toggle(key)}
              className="w-full text-left cursor-pointer"
            >
              <div className="space-y-1">
                <div className="flex justify-between text-sm items-center">
                  <span className="font-medium flex items-center gap-1.5">
                    {label} <span className="text-green-600">({displayWeight})</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`w-3.5 h-3.5 text-green-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${tier.style}`}>{tier.text}</span>
                    <span className="font-semibold">{value}/100</span>
                  </div>
                </div>
                <div className="h-2.5 bg-cream-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getBarColor(value)}`}
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            </button>

            {isExpanded && reason && (
              <div className="mt-2 ml-1 p-3 rounded-lg bg-cream-100 border border-green-200">
                <p className="text-sm text-green-800 leading-relaxed">{reason}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
