const CERT_LABELS = {
  "B Corp": "B Corp",
  "Fair Trade": "Fair Trade",
  "Organic": "Organic",
  "Cruelty-Free": "Cruelty-Free",
  "Rainforest Alliance": "Rainforest Alliance",
};

export default function BrandProfile({ profile, brand }) {
  if (!profile) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg text-green-900">Marshal's Report: {brand}</h3>
        {profile.confidence === "low" && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">
            Low confidence
          </span>
        )}
      </div>

      {profile.confidence === "low" && profile.confidence_reason && (
        <p className="text-xs text-red-400 italic">{profile.confidence_reason}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {profile.certifications && profile.certifications.length > 0 ? (
          profile.certifications.map((cert, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full bg-gold-100 text-gold-800 text-sm font-medium border border-gold-300"
            >
              {CERT_LABELS[cert] || cert}
            </span>
          ))
        ) : (
          <span className="px-3 py-1 rounded-full bg-cream-200 text-green-700 text-sm">
            No certifications found
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="p-3 rounded-xl bg-cream-100">
          <div className="text-green-600 mb-1">Carbon Report</div>
          <div className="font-semibold">{profile.carbonReport ? "Available" : "Not found"}</div>
        </div>
        <div className="p-3 rounded-xl bg-cream-100">
          <div className="text-green-600 mb-1">Ethics Score</div>
          <div className="font-semibold">{profile.overallEthicsScore}/100</div>
        </div>
      </div>

      {profile.laborPractices && (
        <div className="p-3 rounded-xl bg-cream-100 text-sm">
          <div className="text-green-600 mb-1">Labor Practices</div>
          <p>{profile.laborPractices}</p>
        </div>
      )}

      {profile.source_urls?.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {profile.source_urls.map((src, i) => (
            <a
              key={i}
              href={src.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-gold-600 hover:text-gold-800 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {src.title || "Source"}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
