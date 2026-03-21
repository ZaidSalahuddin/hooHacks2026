import { useState } from "react";
import { getFlagStyles } from "../lib/score";

const FLAG_CONFIG = {
  safe: { icon: "✅", border: "border-l-safe-500", bg: "bg-safe-50" },
  moderate: { icon: "⚠️", border: "border-l-yellow-500", bg: "bg-yellow-50" },
  harmful: { icon: "❌", border: "border-l-rust-500", bg: "bg-rust-50" },
};

const PILL_STYLES = {
  safe: {
    active: "bg-safe-600 text-white ring-2 ring-safe-600 ring-offset-1",
    inactive: "bg-safe-100 text-safe-800 hover:bg-safe-200",
  },
  moderate: {
    active: "bg-yellow-500 text-white ring-2 ring-yellow-500 ring-offset-1",
    inactive: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  },
  harmful: {
    active: "bg-rust-600 text-white ring-2 ring-rust-600 ring-offset-1",
    inactive: "bg-rust-100 text-rust-800 hover:bg-rust-200",
  },
};

export default function IngredientList({ ingredients }) {
  const [activeFilter, setActiveFilter] = useState(null);

  if (!ingredients || ingredients.length === 0) return null;

  const counts = { safe: 0, moderate: 0, harmful: 0 };
  ingredients.forEach((ing) => {
    if (counts[ing.flag] !== undefined) counts[ing.flag]++;
  });

  const filtered = activeFilter
    ? ingredients.filter((ing) => ing.flag === activeFilter)
    : ingredients;

  const toggleFilter = (flag) => {
    setActiveFilter((prev) => (prev === flag ? null : flag));
  };

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg text-green-900">Ingredient Ledger</h3>

      {/* Clickable filter pills */}
      <div className="flex gap-2 flex-wrap">
        {counts.safe > 0 && (
          <button
            onClick={() => toggleFilter("safe")}
            className={`text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-all ${
              activeFilter === "safe" ? PILL_STYLES.safe.active : PILL_STYLES.safe.inactive
            }`}
          >
            {counts.safe} Safe
          </button>
        )}
        {counts.moderate > 0 && (
          <button
            onClick={() => toggleFilter("moderate")}
            className={`text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-all ${
              activeFilter === "moderate" ? PILL_STYLES.moderate.active : PILL_STYLES.moderate.inactive
            }`}
          >
            {counts.moderate} Moderate
          </button>
        )}
        {counts.harmful > 0 && (
          <button
            onClick={() => toggleFilter("harmful")}
            className={`text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-all ${
              activeFilter === "harmful" ? PILL_STYLES.harmful.active : PILL_STYLES.harmful.inactive
            }`}
          >
            {counts.harmful} Harmful
          </button>
        )}
        {activeFilter && (
          <button
            onClick={() => setActiveFilter(null)}
            className="text-xs text-green-500 hover:text-green-700 px-2 py-1 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Ingredient cards */}
      <div className="space-y-2">
        {filtered.map((ing, i) => {
          const styles = getFlagStyles(ing.flag);
          const config = FLAG_CONFIG[ing.flag] || { icon: "?", border: "border-l-gray-400", bg: "bg-gray-50" };

          return (
            <div
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${config.border} ${config.bg}`}
            >
              <span className="text-lg shrink-0">{config.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-green-900">{ing.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${styles.bg} ${styles.text} font-medium capitalize`}>
                    {ing.flag}
                  </span>
                  {ing.score != null && (
                    <span className="text-xs text-green-500 ml-auto">{ing.score}/100</span>
                  )}
                </div>
                <p className="text-sm text-green-700 mt-0.5">{ing.reason}</p>
                {ing.source_url && (
                  <a
                    href={ing.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-gold-600 hover:text-gold-800 mt-1 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    {ing.source_name || "Source"}
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
