import { cn } from "@/lib/utils";

export type OpStatus = "healthy" | "busy" | "critical" | "offline";

const toneMap: Record<OpStatus, { dot: string; text: string; ring: string }> = {
  healthy: { dot: "bg-ok", text: "text-ok", ring: "ring-ok/30" },
  busy: { dot: "bg-warn", text: "text-warn", ring: "ring-warn/30" },
  critical: { dot: "bg-crit", text: "text-crit", ring: "ring-crit/30" },
  offline: { dot: "bg-muted-foreground", text: "text-muted-foreground", ring: "ring-border" },
};

export function StatusDot({ status, pulse = true }: { status: OpStatus; pulse?: boolean }) {
  return (
    <span className="relative inline-flex size-2.5 items-center justify-center">
      <span
        className={cn(
          "absolute inline-flex size-2.5 rounded-full",
          toneMap[status].dot,
          pulse && status !== "offline" && "animate-status-pulse",
        )}
      />
      <span className={cn("inline-flex size-1.5 rounded-full", toneMap[status].dot)} />
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
        "inline-flex items-center gap-2 rounded-full bg-surface-raised px-2.5 py-1 text-xs font-medium ring-1",
        toneMap[status].text,
        toneMap[status].ring,
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
