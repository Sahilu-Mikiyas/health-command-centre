import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/* ------------------------------- style tokens ------------------------------- */

export const inputClass =
  "w-full rounded-2xl border border-black/10 bg-[#F5F5F7] px-3 py-2.5 text-xs font-bold text-black placeholder:text-[#86868B] placeholder:font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-60";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-2xl bg-black px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-1.5 rounded-2xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-[#1D1D1F] transition-all hover:bg-[#F5F5F7] disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer";

/** Same look as `apple-card` but without the hover lift (for large working surfaces). */
export const surfaceClass =
  "rounded-3xl border border-black/[0.07] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.04),0_1px_3px_rgba(0,0,0,0.02)]";

/* --------------------------------- layout --------------------------------- */

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
        {label}
      </span>
      {children}
      {hint ? <span className="text-[10px] font-semibold text-[#86868B]">{hint}</span> : null}
    </label>
  );
}

export function SectionCard({
  title,
  icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl border border-black/5 bg-white p-4 sm:p-5", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-black">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  detail,
  action,
}: {
  icon?: ReactNode;
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-black/10 bg-[#FAFAFC] px-6 py-10 text-center">
      {icon ? <div className="text-[#86868B]">{icon}</div> : null}
      <p className="text-sm font-bold text-black">{title}</p>
      {detail ? <p className="max-w-sm text-xs font-medium text-[#86868B]">{detail}</p> : null}
      {action}
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-[#F5F5F7]" />
      ))}
    </div>
  );
}

/* --------------------------------- badges --------------------------------- */

export type StageGroup = "0" | "I" | "II" | "III" | "IV" | "Unstaged";

export const STAGE_GROUPS: StageGroup[] = ["0", "I", "II", "III", "IV", "Unstaged"];

export function stageGroup(stage: string | null | undefined): StageGroup {
  const s = (stage ?? "").trim().toUpperCase();
  if (!s) return "Unstaged";
  if (s.startsWith("IV")) return "IV";
  if (s.startsWith("III")) return "III";
  if (s.startsWith("II")) return "II";
  if (s.startsWith("I")) return "I";
  if (s.startsWith("0")) return "0";
  return "Unstaged";
}

/** Sequential single-hue ramp (light → dark) for stage severity. */
export const STAGE_COLORS: Record<StageGroup, string> = {
  "0": "#C7DDF7",
  I: "#8DB9EE",
  II: "#4F8FDB",
  III: "#2463B4",
  IV: "#0B3A75",
  Unstaged: "#D2D2D7",
};

export function StageBadge({ stage, className }: { stage: string | null | undefined; className?: string }) {
  const group = stageGroup(stage);
  if (group === "Unstaged") {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border border-dashed border-black/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#86868B]",
          className,
        )}
      >
        Unstaged
      </span>
    );
  }
  const dark = group === "III" || group === "IV" || group === "II";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider",
        className,
      )}
      style={{ backgroundColor: STAGE_COLORS[group], color: dark ? "#FFFFFF" : "#0B3A75" }}
    >
      Stage {stage}
    </span>
  );
}

export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "crit" | "ai" | "info";
  className?: string;
}) {
  const toneClass = {
    neutral: "bg-[#F5F5F7] text-[#1D1D1F] border border-black/5",
    ok: "badge-ok",
    warn: "badge-warn",
    crit: "badge-crit",
    ai: "badge-ai",
    info: "bg-[#E8F1FC] text-[#0B57B4] border border-[#C5DAF5]",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------- helpers --------------------------------- */

export function ageFrom(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function daysFromNow(value: string | null | undefined): number | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 86_400_000);
}

export function relativeDays(value: string | null | undefined): string {
  const d = daysFromNow(value);
  if (d === null) return "";
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d === -1) return "yesterday";
  return d > 0 ? `in ${d} d` : `${-d} d ago`;
}

/** Today's date as YYYY-MM-DD in local time. */
export function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function sexLabel(sex: string | null | undefined): string {
  const s = (sex ?? "").toLowerCase();
  if (s.startsWith("f")) return "Female";
  if (s.startsWith("m")) return "Male";
  return sex || "—";
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Invalidates every cache that oncology writes touch. */
export function useInvalidateOncology() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["oncology"] }),
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
      queryClient.invalidateQueries({ queryKey: ["events"] }),
    ]);
}
