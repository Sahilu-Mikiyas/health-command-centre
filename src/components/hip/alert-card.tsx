import { AlertTriangle, ChevronDown, Info, Siren } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AlertSeverity = "info" | "warning" | "critical";

const config: Record<AlertSeverity, { icon: typeof Info; ring: string; text: string }> = {
  info: { icon: Info, ring: "border-accent/40", text: "text-accent" },
  warning: { icon: AlertTriangle, ring: "border-warn/40", text: "text-warn" },
  critical: { icon: Siren, ring: "border-crit/50", text: "text-crit" },
};

/** Real alerts, not notifications: each one expands into evidence and an action. */
export function AlertCard({
  severity,
  title,
  meta,
  children,
  action,
}: {
  severity: AlertSeverity;
  title: string;
  meta?: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { icon: Icon, ring, text } = config[severity];

  return (
    <div className={cn("rounded-lg border bg-surface", ring)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <Icon className={cn("size-4 shrink-0", text)} />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{title}</span>
        {meta ? <span className="numeric text-xs text-muted-foreground">{meta}</span> : null}
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div className="animate-rise space-y-3 border-t border-border px-3 py-3 text-xs text-muted-foreground">
          {children}
          {action}
        </div>
      ) : null}
    </div>
  );
}
