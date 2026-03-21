import { getFlagStyles } from "../lib/score";

const FLAG_ICONS = {
  safe: "\u2705",
  moderate: "\u26A0\uFE0F",
  harmful: "\u274C",
};

export default function IngredientList({ ingredients }) {
  if (!ingredients || ingredients.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-lg text-green-900">Ingredient Analysis</h3>
      <div className="space-y-1.5">
        {ingredients.map((ing, i) => {
          const styles = getFlagStyles(ing.flag);
          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-cream-100">
              <span className="text-lg shrink-0">{FLAG_ICONS[ing.flag] || "?"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{ing.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${styles.bg} ${styles.text} font-medium capitalize`}>
                    {ing.flag}
                  </span>
                </div>
                <p className="text-sm text-green-700 mt-0.5">{ing.reason}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
