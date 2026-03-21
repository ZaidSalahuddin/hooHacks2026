const QUALITY_CONFIG = {
  high: {
    bg: "bg-green-50",
    border: "border-green-200",
    icon: "\u2705",
    label: "High confidence",
    description: "Results are backed by authoritative sources",
  },
  medium: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    icon: "\u26A0\uFE0F",
    label: "Partial confidence",
    description: "Some data points could not be fully verified",
  },
  low: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "\u2757",
    label: "Low confidence",
    description: "Limited data available — scores may be approximate",
  },
};

export default function DataQualityBanner({ dataQuality }) {
  if (!dataQuality) return null;

  const config = QUALITY_CONFIG[dataQuality.overall] || QUALITY_CONFIG.medium;

  return (
    <div className={`p-4 rounded-xl border ${config.bg} ${config.border}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-base">{config.icon}</span>
        <span className="font-semibold text-sm text-green-900">{config.label}</span>
      </div>
      <p className="text-xs text-green-700 mb-2">{config.description}</p>

      {dataQuality.warnings?.length > 0 && (
        <ul className="space-y-1">
          {dataQuality.warnings.map((w, i) => (
            <li key={i} className="text-xs text-green-600 flex items-start gap-1.5">
              <span className="shrink-0 mt-0.5">-</span>
              <span>{w.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
