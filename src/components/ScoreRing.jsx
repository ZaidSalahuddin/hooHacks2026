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

  // 8-pointed star polygon centered at size/2, outer radius matches ring outer edge
  const starOuter = size / 2 + 2;
  const starInner = size / 2 - strokeWidth - 4;
  const cx = size / 2;
  const cy = size / 2;
  const starPoints = Array.from({ length: 16 }, (_, i) => {
    const angle = (i * Math.PI) / 8 - Math.PI / 2;
    const r = i % 2 === 0 ? starOuter : starInner;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Sheriff star background */}
      <svg width={size + 8} height={size + 8} className="absolute" style={{ top: -4, left: -4 }}>
        <polygon points={starPoints.split(" ").map(p => {
          const [x, y] = p.split(",").map(Number);
          return `${x + 4},${y + 4}`;
        }).join(" ")} className="fill-gold-200/60 stroke-gold-400" strokeWidth={1} />
      </svg>
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
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-4xl font-bold">{animatedScore}</span>
        <span className={`text-sm font-semibold ${styles.text}`}>{tier.label}</span>
      </div>
    </div>
  );
}
