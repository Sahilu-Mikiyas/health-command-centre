import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("apple-card flex flex-col overflow-hidden", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-black/5 px-6 py-4 bg-[#FAFAFC] min-w-0">
          <div className="min-w-0 flex-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-black truncate">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-xs text-[#86868B] font-medium truncate">{subtitle}</p> : null}
          </div>
          <div className="shrink-0">{action}</div>
        </header>
      ) : null}
      <div className={cn("flex-1 p-6", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "ok" | "warn" | "crit";
}) {
  const toneClass = {
    default: "text-black",
    ok: "text-[#34C759]",
    warn: "text-[#FF9500]",
    crit: "text-[#FF3B30]",
  }[tone];

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[#86868B]">{label}</span>
      <span className={cn("numeric text-3xl font-extrabold tracking-tight leading-none", toneClass)}>{value}</span>
      {hint ? <span className="text-xs font-semibold text-[#86868B] mt-1">{hint}</span> : null}
    </div>
  );
}
