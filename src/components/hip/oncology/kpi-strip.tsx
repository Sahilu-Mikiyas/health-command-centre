import { Activity, CalendarClock, Syringe, Users } from "lucide-react";
import type { ReactNode } from "react";

import type { OncologyListRow } from "@/lib/hip/oncology";

import { daysFromNow, STAGE_COLORS, STAGE_GROUPS, stageGroup, type StageGroup } from "./shared";

const ACTIVE_CHEMO_DAYS = 35;

export function computeKpis(rows: OncologyListRow[]) {
  const onChemo = rows.filter((r) => {
    const d = daysFromNow(r.lastCycleAt);
    return d !== null && d >= -ACTIVE_CHEMO_DAYS;
  }).length;
  const boardPending = rows.filter((r) => r.tumourBoardPending).length;
  const dueSoon = rows.filter((r) => {
    const d = daysFromNow(r.nextAppointment);
    return d !== null && d >= 0 && d <= 7;
  }).length;
  const stages = Object.fromEntries(STAGE_GROUPS.map((g) => [g, 0])) as Record<StageGroup, number>;
  for (const r of rows) stages[stageGroup(r.staging?.stage)] += 1;
  return { total: rows.length, onChemo, boardPending, dueSoon, stages };
}

function Kpi({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="apple-card flex min-w-0 items-start gap-3 p-4 sm:p-5">
      <div
        className={
          tone === "warn"
            ? "grid size-9 shrink-0 place-items-center rounded-2xl bg-[#FFF4E5] text-[#B86200]"
            : "grid size-9 shrink-0 place-items-center rounded-2xl bg-[#F5F5F7] text-black"
        }
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[#86868B]">
          {label}
        </p>
        <p className="numeric text-2xl font-extrabold leading-tight tracking-tight text-black sm:text-3xl">
          {value}
        </p>
        <p className="truncate text-[11px] font-semibold text-[#86868B]">{hint}</p>
      </div>
    </div>
  );
}

export function KpiStrip({ rows, loading }: { rows: OncologyListRow[]; loading: boolean }) {
  const k = computeKpis(rows);
  const dash = loading ? "…" : null;
  const staged = STAGE_GROUPS.filter((g) => k.stages[g] > 0);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Kpi
        icon={<Users className="size-4" />}
        label="Active cancer patients"
        value={dash ?? k.total}
        hint="ICD-10 C00–D09 registry"
      />
      <Kpi
        icon={<Syringe className="size-4" />}
        label="On active chemotherapy"
        value={dash ?? k.onChemo}
        hint={`Cycle given ≤ ${ACTIVE_CHEMO_DAYS} days`}
      />
      <Kpi
        icon={<Activity className="size-4" />}
        label="Awaiting tumour board"
        value={dash ?? k.boardPending}
        hint="Staged, no MDT decision"
        tone={k.boardPending ? "warn" : "default"}
      />
      <Kpi
        icon={<CalendarClock className="size-4" />}
        label="Cycles due ≤ 7 days"
        value={dash ?? k.dueSoon}
        hint="Booked next appointments"
      />
      <div className="apple-card flex min-w-0 flex-col justify-between gap-2 p-4 sm:col-span-2 sm:p-5 xl:col-span-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">
          Stage distribution
        </p>
        {k.total === 0 ? (
          <p className="text-xs font-semibold text-[#86868B]">{loading ? "Loading…" : "No patients"}</p>
        ) : (
          <>
            <div
              className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
              role="img"
              aria-label={staged.map((g) => `${g === "Unstaged" ? g : `Stage ${g}`}: ${k.stages[g]}`).join(", ")}
            >
              {staged.map((g) => (
                <div
                  key={g}
                  title={`${g === "Unstaged" ? "Unstaged" : `Stage ${g}`}: ${k.stages[g]}`}
                  style={{ flexGrow: k.stages[g], backgroundColor: STAGE_COLORS[g] }}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-2.5 gap-y-1">
              {staged.map((g) => (
                <span key={g} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1D1D1F]">
                  <span className="size-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[g] }} />
                  {g === "Unstaged" ? "Unstaged" : g}
                  <span className="numeric text-[#86868B]">{k.stages[g]}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
