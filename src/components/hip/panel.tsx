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
    <section className={cn("rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur-xl shadow-xs transition-all duration-200 flex flex-col overflow-hidden", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-600 font-medium">{subtitle}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={cn("flex-1 p-5", bodyClassName)}>{children}</div>
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
    default: "text-slate-900",
    ok: "text-emerald-600",
    warn: "text-amber-600",
    crit: "text-rose-600",
  }[tone];

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className={cn("numeric text-3xl font-extrabold tracking-tight leading-none", toneClass)}>{value}</span>
      {hint ? <span className="text-xs font-medium text-slate-500 mt-1">{hint}</span> : null}
    </div>
  );
}
