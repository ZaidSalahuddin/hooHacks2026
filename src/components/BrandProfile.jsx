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
      <h3 className="font-semibold text-lg text-green-900">Brand Profile: {brand}</h3>

      <div className="flex flex-wrap gap-2">
        {profile.certifications && profile.certifications.length > 0 ? (
          profile.certifications.map((cert, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium"
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
    </div>
  );
}
