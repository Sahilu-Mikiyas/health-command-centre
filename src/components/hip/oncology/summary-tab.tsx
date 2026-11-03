import {
  AlertTriangle,
  CalendarClock,
  ClipboardList,
  Dna,
  FlaskConical,
  HeartPulse,
  Stethoscope,
  Syringe,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { isCancerCode, regimenById, type OncologyChart } from "@/lib/hip/oncology";
import { cn } from "@/lib/utils";

import {
  ageFrom,
  Chip,
  EmptyState,
  fmtDate,
  fmtDateTime,
  relativeDays,
  SectionCard,
  sexLabel,
  StageBadge,
} from "./shared";

type TimelineItem = {
  id: string;
  at: string;
  kind: "cycle" | "board" | "staging";
  title: string;
  detail?: string | null;
  by?: string | null;
};

export function buildTimeline(chart: OncologyChart): TimelineItem[] {
  const items: TimelineItem[] = [];
  for (const c of chart.cyclesGiven) {
    const regimen = regimenById(c.regimenId);
    items.push({
      id: `cycle-${c.regimenId}-${c.cycle}`,
      at: c.at,
      kind: "cycle",
      title: `${regimen?.name ?? c.regimenId} — cycle ${c.cycle}${regimen ? ` of ${regimen.cycles}` : ""}`,
      detail: chart.orders
        .filter((o) => o.code?.startsWith(`CHEMO:${c.regimenId}:C${c.cycle}:`) && o.status !== "cancelled")
        .map((o) => o.name)
        .join(" · "),
    });
  }
  for (const n of chart.notes) {
    if (n.note_type === "tumour_board") {
      items.push({
        id: n.id,
        at: n.signed_at ?? n.created_at,
        kind: "board",
        title: "Tumour board decision",
        detail: n.plan,
        by: n.author_label,
      });
    } else if (n.note_type === "oncology_staging") {
      items.push({
        id: n.id,
        at: n.signed_at ?? n.created_at,
        kind: "staging",
        title: "Staging recorded",
        detail: n.assessment,
        by: n.author_label,
      });
    }
  }
  return items.sort((a, b) => b.at.localeCompare(a.at));
}

const KIND_STYLE: Record<TimelineItem["kind"], { icon: ReactNode; ring: string; label: string }> = {
  cycle: { icon: <Syringe className="size-3.5" />, ring: "bg-[#E8F1FC] text-[#0B57B4]", label: "Chemo" },
  board: { icon: <Users className="size-3.5" />, ring: "bg-[#F5E8FF] text-[#8922C7]", label: "MDT" },
  staging: { icon: <Dna className="size-3.5" />, ring: "bg-[#F5F5F7] text-black", label: "Staging" },
};

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#F5F5F7] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">{label}</p>
      <p className="numeric truncate text-sm font-extrabold text-black">{value}</p>
    </div>
  );
}

export function SummaryTab({
  chart,
  onGoToStaging,
}: {
  chart: OncologyChart;
  onGoToStaging: () => void;
}) {
  const { patient, staging } = chart;
  const cancerConditions = chart.conditions.filter((c) => isCancerCode(c.icd10));
  const timeline = buildTimeline(chart);
  const now = new Date().toISOString();
  const upcoming = chart.appointments.filter(
    (a) => a.scheduled_at >= now && a.status !== "cancelled" && a.status !== "no_show",
  );
  const markers = staging ? Object.entries(staging.biomarkers ?? {}).filter(([, v]) => v) : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Fact label="Age" value={`${ageFrom(patient.date_of_birth) ?? "—"} y`} />
        <Fact label="Sex" value={sexLabel(patient.sex)} />
        <Fact
          label="eGFR"
          value={
            patient.egfr !== null ? (
              <span className={patient.egfr < 60 ? "text-[#B86200]" : ""}>
                {patient.egfr} <span className="text-[10px] text-[#86868B]">mL/min</span>
              </span>
            ) : (
              <span className="text-[#86868B]">Not recorded</span>
            )
          }
        />
        <Fact label="Blood group" value={patient.blood_group ?? "—"} />
      </div>

      <SectionCard
        title="Diagnosis & staging"
        icon={<Stethoscope className="size-3.5" />}
        action={
          <button
            type="button"
            onClick={onGoToStaging}
            className="cursor-pointer text-[11px] font-bold text-[#0071E3] hover:underline"
          >
            {staging ? "Restage" : "Stage now"}
          </button>
        }
      >
        {staging ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-extrabold text-black">
                {staging.primarySite}
                <span className="ml-1.5 text-sm font-bold text-[#86868B]">{staging.icd10}</span>
              </p>
              <StageBadge stage={staging.stage} />
              <Chip tone={staging.intent === "palliative" ? "ai" : "ok"} className="capitalize">
                {staging.intent}
              </Chip>
            </div>
            <p className="text-xs font-semibold text-[#1D1D1F]">{staging.histology || "Histology not recorded"}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Fact label="TNM" value={`${staging.t} ${staging.n} ${staging.m}`} />
              <Fact label="Stage" value={staging.stage} />
              <Fact label="Grade" value={staging.grade || "—"} />
              <Fact label="ECOG" value={staging.ecog} />
              <Fact label="Diagnosed" value={fmtDate(staging.diagnosedOn)} />
            </div>
            {markers.length ? (
              <div className="flex flex-wrap gap-1.5">
                {markers.map(([k, v]) => (
                  <Chip key={k} tone="info">
                    <span className="font-black">{k}</span> {v}
                  </Chip>
                ))}
              </div>
            ) : (
              <p className="text-[11px] font-semibold text-[#86868B]">No biomarkers recorded.</p>
            )}
          </div>
        ) : cancerConditions.length ? (
          <div className="space-y-2">
            {cancerConditions.map((c) => (
              <p key={c.id} className="text-sm font-bold text-black">
                {c.name} <span className="text-[#86868B]">· {c.icd10}</span>
              </p>
            ))}
            <p className="text-xs font-semibold text-[#B86200]">
              Diagnosis coded but not yet staged — TNM staging required before treatment planning.
            </p>
          </div>
        ) : (
          <EmptyState
            title="No cancer diagnosis recorded"
            detail="Record the primary site, histology and TNM stage to add this patient to the registry."
            action={
              <button
                type="button"
                onClick={onGoToStaging}
                className="mt-1 cursor-pointer text-xs font-bold text-[#0071E3] hover:underline"
              >
                Open staging form →
              </button>
            }
          />
        )}
        {chart.cumulativeDoxorubicinMgM2 !== null ? (
          <p className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-[#86868B]">
            <HeartPulse className="size-3.5" />
            Cumulative doxorubicin{" "}
            <span
              className={cn(
                "numeric font-extrabold",
                chart.cumulativeDoxorubicinMgM2 > 400 ? "text-[#D70015]" : "text-black",
              )}
            >
              {chart.cumulativeDoxorubicinMgM2} mg/m²
            </span>{" "}
            of 450 lifetime limit
          </p>
        ) : null}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Allergies" icon={<AlertTriangle className="size-3.5" />}>
          {chart.allergies.length ? (
            <ul className="space-y-1.5">
              {chart.allergies.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-2xl bg-[#F5F5F7] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-black">{a.substance}</p>
                    {a.reaction ? (
                      <p className="truncate text-[11px] font-medium text-[#86868B]">{a.reaction}</p>
                    ) : null}
                  </div>
                  <Chip
                    tone={
                      /severe|anaphyl|life/i.test(a.severity)
                        ? "crit"
                        : /moderate/i.test(a.severity)
                          ? "warn"
                          : "neutral"
                    }
                    className="capitalize"
                  >
                    {a.severity}
                  </Chip>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs font-semibold text-[#86868B]">No known allergies recorded.</p>
          )}
        </SectionCard>

        <SectionCard title="Upcoming appointments" icon={<CalendarClock className="size-3.5" />}>
          {upcoming.length ? (
            <ul className="space-y-1.5">
              {upcoming.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-2xl bg-[#F5F5F7] px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-black">{a.reason ?? "Appointment"}</p>
                    <p className="text-[11px] font-medium text-[#86868B]">{fmtDateTime(a.scheduled_at)}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-[#86868B]">
                    {relativeDays(a.scheduled_at)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs font-semibold text-[#86868B]">No upcoming appointments booked.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Treatment timeline" icon={<ClipboardList className="size-3.5" />}>
        {timeline.length ? (
          <ol className="relative space-y-4 pl-1">
            {timeline.map((item, i) => {
              const style = KIND_STYLE[item.kind];
              return (
                <li key={item.id} className="relative flex gap-3">
                  {i < timeline.length - 1 ? (
                    <span className="absolute left-[13px] top-7 h-[calc(100%-4px)] w-px bg-black/10" aria-hidden />
                  ) : null}
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", style.ring)}>
                    {style.icon}
                  </span>
                  <div className="min-w-0 flex-1 pb-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <p className="text-xs font-bold text-black">{item.title}</p>
                      <p className="text-[10px] font-semibold text-[#86868B]">{fmtDate(item.at)}</p>
                    </div>
                    {item.detail ? (
                      <p className="mt-0.5 line-clamp-2 text-[11px] font-medium text-[#1D1D1F]">{item.detail}</p>
                    ) : null}
                    {item.by ? <p className="text-[10px] font-semibold text-[#86868B]">{item.by}</p> : null}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <EmptyState
            icon={<FlaskConical className="size-5" />}
            title="No oncology events yet"
            detail="Staging, tumour-board decisions and chemotherapy cycles will appear here."
          />
        )}
      </SectionCard>
    </div>
  );
}
