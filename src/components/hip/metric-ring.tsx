import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Tone = "accent" | "ok" | "warn" | "crit";

const strokeMap: Record<Tone, string> = {
  accent: "stroke-accent",
  ok: "stroke-ok",
  warn: "stroke-warn",
  crit: "stroke-crit",
};

/** Radial gauge that animates from 0 to its value on mount and on change. */
export function MetricRing({
  value,
  max = 100,
  label,
  caption,
  tone = "accent",
  size = 96,
  thickness = 6,
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

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={thickness}
          className="stroke-border"
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
      <div className="absolute flex flex-col items-center leading-none">
        <span className="numeric text-xl font-semibold">{label ?? Math.round(value)}</span>
        {caption ? (
          <span className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">
            {caption}
          </span>
        ) : null}
      </div>
    </div>
  );
}
