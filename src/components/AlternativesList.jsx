import { getTierStyles, getScoreTier } from "../lib/score";

export default function AlternativesList({ alternatives, currentScore }) {
  if (!alternatives || alternatives.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-lg text-green-900">Better Alternatives</h3>
      <div className="space-y-2">
        {alternatives.map((alt, i) => {
          const styles = getTierStyles(alt.score);
          const tier = getScoreTier(alt.score);
          return (
            <div key={i} className="p-4 rounded-xl bg-cream-100 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg ${styles.bg} ${styles.text}`}>
                {alt.score}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{alt.name}</div>
                <div className="text-sm text-green-600">{alt.brand}</div>
                {alt.improvements && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {alt.improvements.slice(0, 3).map((imp, j) => (
                      <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        {imp}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-green-500 font-semibold text-sm shrink-0">
                +{alt.score - currentScore}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
