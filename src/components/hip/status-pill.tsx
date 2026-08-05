import { cn } from "@/lib/utils";

export type OpStatus = "healthy" | "busy" | "critical" | "offline" | "info" | "ai";

const toneMap: Record<OpStatus, { pill: string; dot: string }> = {
  healthy: {
    pill: "badge-ok",
    dot: "bg-[#34C759]",
  },
  busy: {
    pill: "badge-warn",
    dot: "bg-[#FF9500]",
  },
  critical: {
    pill: "badge-crit",
    dot: "bg-[#FF3B30]",
  },
  offline: {
    pill: "bg-[#E8E8ED] text-[#86868B] border border-black/5",
    dot: "bg-[#86868B]",
  },
  info: {
    pill: "badge-info",
    dot: "bg-[#0071E3]",
  },
  ai: {
    pill: "badge-ai",
    dot: "bg-[#AF52DE]",
  },
};

export function StatusDot({ status, pulse = true }: { status: OpStatus; pulse?: boolean }) {
  return (
    <span className="relative inline-flex size-2 items-center justify-center">
      {pulse && status !== "offline" ? (
        <span className={cn("absolute inline-flex size-3 rounded-full opacity-60 animate-ping", toneMap[status]?.dot)} />
      ) : null}
      <span className={cn("inline-flex size-2 rounded-full", toneMap[status]?.dot)} />
    </span>
  );
}

export function StatusPill({
  status,
  label,
  className,
}: {
  status: OpStatus;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider shadow-2xs",
        toneMap[status]?.pill ?? toneMap.info.pill,
        className,
      )}
    >
      <StatusDot status={status} />
      {label}
    </span>
  );
}

export function statusFromRatio(ratio: number): OpStatus {
  if (ratio >= 0.9) return "critical";
  if (ratio >= 0.75) return "busy";
  return "healthy";
}
