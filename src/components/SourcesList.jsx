import { useState } from "react";

function LinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function SourceLink({ url, title, domain }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-2 p-2.5 rounded-lg bg-cream-100 hover:bg-cream-200 transition-colors group"
    >
      <LinkIcon />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-green-800 group-hover:text-green-900 truncate">
          {title}
        </p>
        <p className="text-xs text-green-500 truncate">{domain || url}</p>
      </div>
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

export default function SourcesList({ groundingSources, brandProfile, ingredientResults, alternatives }) {
  const [expanded, setExpanded] = useState(false);

  // Collect all unique sources
  const allSources = [];
  const seen = new Set();

  function addSource(url, title, category) {
    if (!url || seen.has(url)) return;
    seen.add(url);
    let domain;
    try {
      domain = new URL(url).hostname.replace("www.", "");
    } catch {
      domain = url;
    }
    allSources.push({ url, title: title || domain, domain, category });
  }

  // Grounding sources from Gemini search
  (groundingSources || []).forEach((s) => addSource(s.url, s.title, "Search"));

  // Brand profile sources
  (brandProfile?.source_urls || []).forEach((s) =>
    addSource(s.url, s.title, "Brand Ethics")
  );

  // Ingredient sources
  (ingredientResults || []).forEach((ing) => {
    if (ing.source_url) {
      addSource(ing.source_url, `${ing.name} — ${ing.source_name || "Source"}`, "Ingredients");
    }
  });

  // Alternative sources
  (alternatives || []).forEach((alt) => {
    if (alt.source_url) {
      addSource(alt.source_url, `${alt.name} (${alt.brand})`, "Alternatives");
    }
  });

  if (allSources.length === 0) return null;

  const visibleSources = expanded ? allSources : allSources.slice(0, 4);

  // Group by category
  const categories = [...new Set(allSources.map((s) => s.category))];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg text-green-900">Sources</h3>
        <span className="text-xs text-green-500">{allSources.length} reference{allSources.length !== 1 ? "s" : ""}</span>
      </div>

      {expanded ? (
        // Grouped view when expanded
        <div className="space-y-4">
          {categories.map((cat) => {
            const catSources = allSources.filter((s) => s.category === cat);
            return (
              <div key={cat}>
                <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1.5">{cat}</p>
                <div className="space-y-1.5">
                  {catSources.map((s, i) => (
                    <SourceLink key={i} {...s} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Compact view
        <div className="space-y-1.5">
          {visibleSources.map((s, i) => (
            <SourceLink key={i} {...s} />
          ))}
        </div>
      )}

      {allSources.length > 4 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full text-center text-sm font-medium text-green-600 hover:text-green-800 py-1.5 transition-colors cursor-pointer"
        >
          {expanded ? "Show less" : `Show all ${allSources.length} sources`}
        </button>
      )}
    </div>
  );
}
