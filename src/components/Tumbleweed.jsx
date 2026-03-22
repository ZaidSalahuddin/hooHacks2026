import { useEffect, useState } from "react";

const MESSAGES = [
  "Trackin' down the product...",
  "Checkin' the ingredient ledger...",
  "Askin' the deputy for leads...",
  "Rifflin' through wanted posters...",
  "Consultin' the frontier almanac...",
  "Sendin' a wire to headquarters...",
  "Roundin' up the evidence...",
  "Followin' the trail of clues...",
  "Interrogatin' the label...",
  "Cross-checkin' with the marshal...",
];

const ANALYZING_MESSAGES = [
  "Weighin' the evidence...",
  "Calculating the bounty...",
  "Tallyin' up the score...",
  "Countin' the offenses...",
  "Filing the deputy's report...",
  "Consultin' the sustainability code...",
  "Measuring the environmental damage...",
  "Assessing brand ethics...",
  "Running the bounty formula...",
  "Preparing the verdict...",
];

export default function Tumbleweed({ status }) {
  const [msgIndex, setMsgIndex] = useState(0);

  const messages = status === "analyzing" ? ANALYZING_MESSAGES : MESSAGES;

  useEffect(() => {
    setMsgIndex(0);
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [status, messages.length]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Tumbleweed image */}
      <div className="relative w-24 h-24">
        <img
          src="/tumbleweed.png"
          alt="tumbleweed"
          className="w-24 h-24 object-contain animate-spin"
          style={{ animationDuration: "1.8s", animationTimingFunction: "linear" }}
        />
        {/* Dust shadow beneath */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-2 bg-green-950/20 rounded-full blur-sm" />
      </div>

      {/* Cycling message */}
      <p
        key={msgIndex}
        className="text-white font-medium text-sm text-center px-4 animate-pulse"
        style={{ animationDuration: "2s" }}
      >
        {messages[msgIndex]}
      </p>
    </div>
  );
}
