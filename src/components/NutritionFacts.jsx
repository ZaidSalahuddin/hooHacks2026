const NUTRIENT_ROWS = [
  { key: "total_fat_g", label: "Total Fat", unit: "g", indent: false, dv: 78 },
  { key: "saturated_fat_g", label: "Saturated Fat", unit: "g", indent: true, dv: 20 },
  { key: "trans_fat_g", label: "Trans Fat", unit: "g", indent: true, dv: null },
  { key: "cholesterol_mg", label: "Cholesterol", unit: "mg", indent: false, dv: 300 },
  { key: "sodium_mg", label: "Sodium", unit: "mg", indent: false, dv: 2300 },
  { key: "total_carbohydrates_g", label: "Total Carbohydrates", unit: "g", indent: false, dv: 275 },
  { key: "dietary_fiber_g", label: "Dietary Fiber", unit: "g", indent: true, dv: 28 },
  { key: "total_sugars_g", label: "Total Sugars", unit: "g", indent: true, dv: null },
  { key: "added_sugars_g", label: "Added Sugars", unit: "g", indent: true, dv: 50 },
  { key: "protein_g", label: "Protein", unit: "g", indent: false, dv: 50 },
];

function toNum(val) {
  if (val == null) return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

function getDvColor(percent) {
  if (percent <= 5) return "text-green-600 bg-green-100";
  if (percent <= 20) return "text-yellow-700 bg-yellow-100";
  return "text-red-700 bg-red-100";
}

function getDvBarColor(percent) {
  if (percent <= 5) return "bg-green-500";
  if (percent <= 20) return "bg-yellow-500";
  return "bg-red-500";
}

const SOURCE_LABELS = {
  gemini: { label: "AI-extracted", style: "bg-blue-100 text-blue-700" },
  validated: { label: "Verified via Open Food Facts", style: "bg-green-100 text-green-700" },
  open_food_facts: { label: "Open Food Facts", style: "bg-green-100 text-green-700" },
  cached: { label: "Cached", style: "bg-gray-100 text-gray-600" },
};

export default function NutritionFacts({ nutrition, source }) {
  if (!nutrition) return null;

  const sourceInfo = SOURCE_LABELS[source] || SOURCE_LABELS.gemini;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-green-900">Nutrition Facts</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sourceInfo.style}`}>
          {sourceInfo.label}
        </span>
      </div>

      {nutrition.serving_size && (
        <p className="text-sm text-green-700">
          Serving Size: <span className="font-medium">{nutrition.serving_size}</span>
        </p>
      )}

      {/* Calories */}
      {toNum(nutrition.calories) != null && (
        <div className="flex items-baseline justify-between py-2 border-b-4 border-green-900">
          <span className="text-2xl font-bold text-green-900">Calories</span>
          <span className="text-3xl font-bold text-green-900">{toNum(nutrition.calories)}</span>
        </div>
      )}

      {/* % Daily Value header */}
      <div className="text-right text-xs font-semibold text-green-600 pr-1">% Daily Value*</div>

      {/* Nutrient rows */}
      <div className="divide-y divide-green-200">
        {NUTRIENT_ROWS.map(({ key, label, unit, indent, dv }) => {
          const value = toNum(nutrition[key]);
          if (value == null) return null;

          const dvPercent = dv ? Math.round((value / dv) * 100) : null;

          return (
            <div key={key} className="py-2">
              <div className="flex items-center justify-between">
                <span className={`text-sm ${indent ? "pl-4 text-green-700" : "font-semibold text-green-900"}`}>
                  {label} <span className="font-normal text-green-600">{value}{unit}</span>
                </span>
                {dvPercent != null && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getDvColor(dvPercent)}`}>
                    {dvPercent}%
                  </span>
                )}
              </div>
              {dvPercent != null && (
                <div className="mt-1 h-1.5 rounded-full bg-green-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getDvBarColor(dvPercent)}`}
                    style={{ width: `${Math.min(dvPercent, 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vitamins & Minerals */}
      {nutrition.vitamins_minerals?.length > 0 && (
        <div className="pt-2 border-t-4 border-green-900 space-y-1.5">
          {nutrition.vitamins_minerals.map((vm, i) => {
            const dvp = toNum(vm.daily_value_percent) || 0;
            return (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="text-sm text-green-800">{vm.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getDvColor(dvp)}`}>
                  {dvp}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-green-500 pt-2">
        * Percent Daily Values are based on a 2,000 calorie diet.
        <span className="ml-1">
          Colors indicate: <span className="text-green-600 font-medium">low (5% or less)</span>,{" "}
          <span className="text-yellow-600 font-medium">moderate (6-20%)</span>,{" "}
          <span className="text-red-600 font-medium">high (over 20%)</span> of daily value.
        </span>
      </p>
    </div>
  );
}
