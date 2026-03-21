import { useEffect, useState } from "react";
import { getTierStyles, getScoreTier } from "../lib/score";

export default function ScoreRing({ score, size = 160 }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const tier = getScoreTier(score);
  const styles = getTierStyles(score);

  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (animatedScore / 100) * circumference;

  useEffect(() => {
    let frame;
    let start;
    const duration = 1200;

    const animate = (timestamp) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const pct = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - pct, 3);
      setAnimatedScore(Math.round(eased * score));
      if (pct < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  // 8-pointed sheriff star behind the ring
  const starOuter = size / 2 + 2;
  const starInner = size / 2 - strokeWidth - 4;
  const cx = size / 2;
  const cy = size / 2;
  const starPoints = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * Math.PI) / 8 - Math.PI / 2;
    const r = i % 2 === 0 ? starOuter : starInner;
    return `${cx + r * Math.cos(angle) + 4},${cy + r * Math.sin(angle) + 4}`;
  }).join(" ");

  const filledStars = Math.round(score / 20); // 0–5 stars based on score

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-cream-200"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className={`${styles.ring} transition-all duration-300`}
          />
        </svg>
        {/* Sheriff star rendered on top of the ring */}
        <svg width={size + 8} height={size + 8} className="absolute pointer-events-none" style={{ top: -4, left: -4 }}>
          <polygon points={starPoints} className="fill-gold-200/40 stroke-gold-400" strokeWidth={1.5} />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-display text-4xl font-bold">{animatedScore}</span>
          <span className={`text-sm font-semibold ${styles.text}`}>{tier.label}</span>
        </div>
      </div>

      {/* Bounty stars — more stars = higher sustainability */}
      <div className="flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <svg key={i} xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${i < filledStars ? "text-gold-500" : "text-cream-300"}`} viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    </div>
  );
}
