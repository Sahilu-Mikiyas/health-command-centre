import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Tone = "accent" | "ok" | "warn" | "crit";

const strokeMap: Record<Tone, string> = {
  accent: "stroke-black",
  ok: "stroke-[#34C759]",
  warn: "stroke-[#FF9500]",
  crit: "stroke-[#FF3B30]",
};

/** Radial gauge that animates from 0 to its value on mount and on change. */
export function MetricRing({
  value,
  max = 100,
  label,
  caption,
  tone = "accent",
  size = 76,
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
    <div className={cn("inline-flex items-center gap-2.5 min-w-0 max-w-full", className)}>
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
        <div className="absolute flex flex-col items-center justify-center leading-none text-center px-1">
          <span className="numeric text-base font-black text-black">{percentText}</span>
        </div>
      </div>
      {label || caption ? (
        <div className="flex flex-col justify-center min-w-0 flex-1">
          {label ? <span className="text-xs font-black uppercase tracking-wider text-black truncate">{label}</span> : null}
          {caption ? <span className="text-[11px] font-semibold text-[#86868B] truncate mt-0.5">{caption}</span> : null}
        </div>
      ) : null}
    </div>
  );
}
