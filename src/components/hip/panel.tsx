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
    <section className={cn("rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-2xl shadow-xl transition-all duration-200 flex flex-col overflow-hidden hover:border-white/15", className)}>
      {title ? (
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-6 py-4 bg-slate-900/40">
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-indigo-400">
              {title}
            </h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-400 font-medium">{subtitle}</p> : null}
          </div>
          {action}
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
    default: "text-white",
    ok: "text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]",
    warn: "text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]",
    crit: "text-rose-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.4)]",
  }[tone];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{label}</span>
      <span className={cn("numeric text-3xl font-black tracking-tight leading-none", toneClass)}>{value}</span>
      {hint ? <span className="text-xs font-semibold text-slate-400 mt-1">{hint}</span> : null}
    </div>
  );
}
