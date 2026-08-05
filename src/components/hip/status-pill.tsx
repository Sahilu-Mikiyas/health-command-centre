import { cn } from "@/lib/utils";

export type OpStatus = "healthy" | "busy" | "critical" | "offline" | "info" | "ai";

const toneMap: Record<OpStatus, { pill: string; dot: string }> = {
  healthy: {
    pill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]",
    dot: "bg-emerald-400",
  },
  busy: {
    pill: "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]",
    dot: "bg-amber-400",
  },
  critical: {
    pill: "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    dot: "bg-rose-400",
  },
  offline: {
    pill: "bg-slate-800 text-slate-400 border-slate-700",
    dot: "bg-slate-500",
  },
  info: {
    pill: "bg-sky-500/10 text-sky-400 border-sky-500/30 shadow-[0_0_15px_rgba(56,189,248,0.2)]",
    dot: "bg-sky-400",
  },
  ai: {
    pill: "bg-purple-500/15 text-purple-300 border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.25)]",
    dot: "bg-purple-400",
  },
};

export function StatusDot({ status, pulse = true }: { status: OpStatus; pulse?: boolean }) {
  return (
    <span className="relative inline-flex size-2 items-center justify-center">
      {pulse && status !== "offline" ? (
        <span className={cn("absolute inline-flex size-3 rounded-full opacity-75 animate-ping", toneMap[status]?.dot)} />
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
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md",
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
