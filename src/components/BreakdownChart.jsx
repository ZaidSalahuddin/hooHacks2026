import { useState } from "react";

const CATEGORIES = [
  { key: "ingredient_safety", label: "Ingredients", weight: "30%" },
  { key: "environmental_impact", label: "Environment", weight: "25%" },
  { key: "brand_ethics", label: "Brand Ethics", weight: "20%" },
  { key: "health_impact", label: "Health", weight: "15%" },
  { key: "packaging", label: "Packaging", weight: "10%" },
];

function getBarColor(value) {
  if (value >= 80) return "bg-green-500";
  if (value >= 50) return "bg-yellow-500";
  return "bg-red-500";
}

function getTierLabel(value) {
  if (value >= 80) return { text: "Excellent", style: "text-green-600" };
  if (value >= 50) return { text: "Moderate", style: "text-yellow-600" };
  return { text: "Poor", style: "text-red-600" };
}

export default function BreakdownChart({ breakdown, reasons }) {
  const [expandedKey, setExpandedKey] = useState(null);

  if (!breakdown) return null;

  const toggle = (key) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg text-green-900">Score Breakdown</h3>
      <p className="text-xs text-green-500 mb-1">Tap a category to see why it received its score</p>
      {CATEGORIES.map(({ key, label, weight }) => {
        const value = breakdown[key] || 0;
        const isExpanded = expandedKey === key;
        const reason = reasons?.[key];
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
                    {label} <span className="text-green-600">({weight})</span>
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

            {/* Expandable reasoning */}
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
