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

export default function BreakdownChart({ breakdown }) {
  if (!breakdown) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg text-green-900">Score Breakdown</h3>
      {CATEGORIES.map(({ key, label, weight }) => {
        const value = breakdown[key] || 0;
        return (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{label} <span className="text-green-600">({weight})</span></span>
              <span className="font-semibold">{value}/100</span>
            </div>
            <div className="h-2.5 bg-cream-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getBarColor(value)}`}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
