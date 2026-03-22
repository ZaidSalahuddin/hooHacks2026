import { getTierStyles, getScoreTier } from "../lib/score";

export default function AlternativesList({ alternatives, currentScore }) {
  if (!alternatives || alternatives.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-display text-lg text-green-900">Greener Pastures</h3>
      <div className="space-y-2">
        {[...alternatives].sort((a, b) => b.score - a.score).map((alt, i) => {
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
                      <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-gold-100 text-gold-800">
                        {imp}
                      </span>
                    ))}
                  </div>
                )}
                {alt.source_url && (
                  <a
                    href={alt.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-green-500 hover:text-green-700 mt-1 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Source
                  </a>
                )}
              </div>
              <div className="text-gold-600 font-semibold text-sm shrink-0">
                +{alt.score - currentScore}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
