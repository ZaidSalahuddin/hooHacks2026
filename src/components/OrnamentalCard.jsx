// Corner scroll flourish — rotated for each corner
function Corner({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`absolute w-6 h-6 text-gold-500 pointer-events-none ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer L-bracket */}
      <path
        d="M 20 3 L 5 3 Q 3 3 3 5 L 3 20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Inner curl */}
      <path
        d="M 20 3 Q 17 3 17 6 Q 17 8 19 8"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      <path
        d="M 3 20 Q 3 17 6 17 Q 8 17 8 19"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
        fill="none"
        opacity="0.6"
      />
      {/* Diamond pip at the corner */}
      <rect
        x="5.5"
        y="5.5"
        width="3"
        height="3"
        transform="rotate(45 7 7)"
        fill="currentColor"
        opacity="0.5"
      />
    </svg>
  );
}

export default function OrnamentalCard({ children, className = "" }) {
  return (
    <div className={`relative p-5 rounded-xl bg-cream-50/85 border border-gold-300/60 shadow-sm ${className}`}>
      <Corner className="top-0 left-0" />
      <Corner className="top-0 right-0 -scale-x-100" />
      <Corner className="bottom-0 left-0 -scale-y-100" />
      <Corner className="bottom-0 right-0 scale-x-[-1] scale-y-[-1]" />
      {children}
    </div>
  );
}
