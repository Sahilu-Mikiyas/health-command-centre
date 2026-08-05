import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Tone = "accent" | "ok" | "warn" | "crit";

const strokeMap: Record<Tone, string> = {
  accent: "stroke-black",
  ok: "stroke-[#34C759]",
  warn: "stroke-[#FF9500]",
  crit: "stroke-[#FF3B30]",
};

/** Radial gauge — percentage shown inside, label shown below. Zero overlap guaranteed. */
export function MetricRing({
  value,
  max = 100,
  label,
  caption,
  tone = "accent",
  size = 80,
  thickness = 7,
  className,
}: {
  value: number;
  max?: number;
  label?: string;
  caption?: string;
  tone?: Tone;
  size?: number;
  thickness?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(1, max === 0 ? 0 : shown / max));
  const percentText = `${Math.round(pct * 100)}%`;

  return (
    <div className={cn("inline-flex flex-col items-center gap-1.5", className)}>
      <div className="relative grid place-items-center shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            className="stroke-black/10"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            className={cn(strokeMap[tone], "transition-[stroke-dashoffset] duration-1000 ease-out")}
          />
        </svg>
        <span className="absolute numeric text-lg font-black text-black">{percentText}</span>
      </div>
      {label ? (
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B] text-center">{label}</span>
      ) : null}
      {caption ? (
        <span className="text-[10px] font-semibold text-[#86868B] text-center">{caption}</span>
      ) : null}
    </div>
  );
}
