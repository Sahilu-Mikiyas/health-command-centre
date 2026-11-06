import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ClipboardList,
  Dna,
  ExternalLink,
  FlaskConical,
  RefreshCw,
  Stethoscope,
  Syringe,
  Users,
} from "lucide-react";

import { oncologyChartQuery, regimenById } from "@/lib/hip/oncology";
import { cn } from "@/lib/utils";

import { ChemoPlanner } from "./chemo-planner";
import { LabsTab } from "./labs-tab";
import {
  ageFrom,
  Chip,
  EmptyState,
  errorMessage,
  secondaryButtonClass,
  sexLabel,
  SkeletonRows,
  StageBadge,
  surfaceClass,
} from "./shared";
import { StagingTab } from "./staging-tab";
import { SummaryTab } from "./summary-tab";
import { TumourBoardTab } from "./tumour-board-tab";
import { useChartViewLog } from "@/hooks/use-chart-view-log";

export type ChartTab = "summary" | "staging" | "chemo" | "labs" | "board";

const TABS: { id: ChartTab; label: string; icon: typeof Stethoscope }[] = [
  { id: "summary", label: "Summary", icon: ClipboardList },
  { id: "staging", label: "Staging", icon: Dna },
  { id: "chemo", label: "Chemotherapy planner", icon: Syringe },
  { id: "labs", label: "Labs & markers", icon: FlaskConical },
  { id: "board", label: "Tumour board", icon: Users },
];

export function PatientChart({
  patientId,
  tab,
  onTabChange,
}: {
  patientId: string | null;
  tab: ChartTab;
  onTabChange: (tab: ChartTab) => void;
}) {
  const {
    data: chart,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    ...oncologyChartQuery(patientId ?? ""),
    enabled: Boolean(patientId),
  });
  useChartViewLog(patientId, "oncology chart");

  if (!patientId) {
    return (
      <section className={cn(surfaceClass, "p-6")}>
        <EmptyState
          icon={<Stethoscope className="size-6" />}
          title="Select a patient"
          detail="Choose a patient from the cancer registry, or add an existing patient to start staging."
        />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className={cn(surfaceClass, "space-y-4 p-6")}>
        <div className="h-8 w-1/2 animate-pulse rounded-xl bg-[#F5F5F7]" />
        <SkeletonRows rows={5} />
      </section>
    );
  }

  if (error || !chart) {
    return (
      <section className={cn(surfaceClass, "p-6")}>
        <EmptyState
          title="Could not load the oncology chart"
          detail={error ? errorMessage(error) : "Patient not found."}
          action={
            <button
              type="button"
              onClick={() => void refetch()}
              className={cn(secondaryButtonClass, "mt-2")}
            >
              <RefreshCw className="size-3.5" /> Retry
            </button>
          }
        />
      </section>
    );
  }

  const { patient, staging } = chart;
  const lastCycle = chart.cyclesGiven[chart.cyclesGiven.length - 1];
  const lastRegimen = lastCycle ? regimenById(lastCycle.regimenId) : undefined;
  const boardCount = chart.notes.filter((n) => n.note_type === "tumour_board").length;

  return (
    <section className={cn(surfaceClass, "flex min-w-0 flex-col overflow-hidden")}>
      <header className="border-b border-black/5 bg-[#FAFAFC] px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-extrabold tracking-tight text-black">
                {patient.full_name}
              </h2>
              <StageBadge stage={staging?.stage} />
              {isFetching ? <RefreshCw className="size-3.5 animate-spin text-[#86868B]" /> : null}
            </div>
            <p className="text-xs font-semibold text-[#86868B]">
              <span className="numeric">{patient.mrn}</span> ·{" "}
              {ageFrom(patient.date_of_birth) ?? "—"} y · {sexLabel(patient.sex)}
              {staging
                ? ` · ${staging.primarySite} (${staging.icd10}) · ${staging.t}${staging.n}${staging.m}`
                : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {lastCycle ? (
                <Chip tone="info">
                  {lastRegimen?.id ?? lastCycle.regimenId} · C{lastCycle.cycle}
                  {lastRegimen ? `/${lastRegimen.cycles}` : ""}
                </Chip>
              ) : null}
              {staging && !boardCount ? <Chip tone="warn">Tumour board pending</Chip> : null}
              {chart.allergies.length ? (
                <Chip tone="crit">
                  {chart.allergies.length} allerg{chart.allergies.length === 1 ? "y" : "ies"}
                </Chip>
              ) : (
                <Chip>NKDA</Chip>
              )}
            </div>
          </div>
          <Link
            to="/patients/$patientId"
            params={{ patientId: patient.id }}
            className={cn(secondaryButtonClass, "shrink-0")}
          >
            Full record <ExternalLink className="size-3" />
          </Link>
        </div>

        <nav
          className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1"
          role="tablist"
          aria-label="Oncology chart"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => onTabChange(t.id)}
              className={cn(
                "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-2xl px-3.5 py-2 text-xs font-bold transition-all",
                tab === t.id
                  ? "bg-black text-white shadow-md"
                  : "border border-black/5 bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]",
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 bg-[#FBFBFD] p-3 sm:p-5" role="tabpanel">
        {tab === "summary" ? (
          <SummaryTab chart={chart} onGoToStaging={() => onTabChange("staging")} />
        ) : null}
        {tab === "staging" ? (
          <StagingTab
            key={`${patient.id}:${chart.notes.find((n) => n.note_type === "oncology_staging")?.id ?? "new"}`}
            chart={chart}
            onSaved={() => onTabChange("summary")}
          />
        ) : null}
        {tab === "chemo" ? <ChemoPlanner key={patient.id} chart={chart} /> : null}
        {tab === "labs" ? <LabsTab chart={chart} /> : null}
        {tab === "board" ? <TumourBoardTab key={patient.id} chart={chart} /> : null}
      </div>
    </section>
  );
}
