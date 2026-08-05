import { cn } from "@/lib/utils";

export type OpStatus = "healthy" | "busy" | "critical" | "offline" | "info" | "ai";

const toneMap: Record<OpStatus, { pill: string; dot: string }> = {
  healthy: {
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs",
    dot: "bg-emerald-500",
  },
  busy: {
    pill: "bg-amber-50 text-amber-700 border-amber-200 shadow-2xs",
    dot: "bg-amber-500",
  },
  critical: {
    pill: "bg-rose-50 text-rose-700 border-rose-200 shadow-2xs",
    dot: "bg-rose-500",
  },
  offline: {
    pill: "bg-slate-100 text-slate-600 border-slate-200 shadow-2xs",
    dot: "bg-slate-400",
  },
  info: {
    pill: "bg-sky-50 text-sky-700 border-sky-200 shadow-2xs",
    dot: "bg-sky-500",
  },
  ai: {
    pill: "bg-purple-50 text-purple-700 border-purple-200 shadow-2xs",
    dot: "bg-purple-500",
  },
};

export function StatusDot({ status, pulse = true }: { status: OpStatus; pulse?: boolean }) {
  return (
    <span className="relative inline-flex size-2 items-center justify-center">
      {pulse && status !== "offline" ? (
        <span className={cn("absolute inline-flex size-3 rounded-full opacity-75 animate-ping", toneMap[status].dot)} />
      ) : null}
      <span className={cn("inline-flex size-2 rounded-full", toneMap[status].dot)} />
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
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
