import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, FileCheck, ShieldCheck, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { generateExecutiveReport } from "@/lib/hip/pdf-engine";
import { bedSummaryQuery, departmentsQuery } from "@/lib/hip/queries";

import { AppShell } from "@/components/hip/app-shell";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill, type OpStatus } from "@/components/hip/status-pill";
import { fetchAll } from "@/lib/hip/paginate";

export const Route = createFileRoute("/_authenticated/executive")({
  head: () => ({
    meta: [
      { title: "Executive Cockpit & CEO | Furii Health" },
      {
        name: "description",
        content:
          "Commercial CEO & Medical Director cockpit: hospital-wide financial KPIs, bed occupancy, clinical mortality metrics & departmental strategic performance.",
      },
    ],
  }),
  component: ExecutiveWorkspace,
});

function ExecutiveWorkspace() {
  return (
    <RouteGuard route="/executive">
      <ExecutiveContent />
    </RouteGuard>
  );
}

type InvoiceKpiRow = {
  status: string;
  subtotal: number;
  insurance_covered: number;
  patient_due: number;
  paid_amount: number;
  encounters: { department_id: string | null } | null;
};

type EncounterKpiRow = {
  department_id: string | null;
  started_at: string;
  ended_at: string | null;
};

const EXCLUDED_INVOICE_STATUSES = new Set(["draft", "void", "cancelled"]);

/** Hospital-wide KPIs computed from live tables (invoices, encounters, patients, appointments, notes). */
const executiveKpisQuery = queryOptions({
  queryKey: ["executive", "kpis"],
  queryFn: async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [invoices, encounters, patients, appointments, notes, signedNotes] = await Promise.all([
      fetchAll((from, to) =>
        supabase
          .from("invoices")
          .select(
            "status,subtotal,insurance_covered,patient_due,paid_amount,encounters(department_id)",
          )
          .order("id")
          .range(from, to),
      ),
      fetchAll((from, to) =>
        supabase
          .from("encounters")
          .select("department_id,started_at,ended_at")
          .order("id")
          .range(from, to),
      ),
      supabase.from("patients").select("id", { count: "exact", head: true }),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", todayStart.toISOString())
        .lt("scheduled_at", tomorrowStart.toISOString()),
      supabase.from("clinical_notes").select("id", { count: "exact", head: true }),
      supabase
        .from("clinical_notes")
        .select("id", { count: "exact", head: true })
        .not("signed_at", "is", null),
    ]);
    if (invoices.error) throw new Error(invoices.error.message);
    if (encounters.error) throw new Error(encounters.error.message);

    const invoiceRows = ((invoices.data ?? []) as unknown as InvoiceKpiRow[]).filter(
      (row) => !EXCLUDED_INVOICE_STATUSES.has(row.status),
    );
    const encounterRows = (encounters.data ?? []) as EncounterKpiRow[];
    const sum = (values: number[]) => values.reduce((acc, value) => acc + Number(value || 0), 0);

    const billed = sum(invoiceRows.map((row) => row.subtotal));
    const collected = sum(invoiceRows.map((row) => row.paid_amount));
    const insuranceCovered = sum(invoiceRows.map((row) => row.insurance_covered));
    const outstanding = sum(
      invoiceRows.map((row) =>
        Math.max(Number(row.patient_due || 0) - Number(row.paid_amount || 0), 0),
      ),
    );

    const now = Date.now();
    const open = encounterRows.filter((row) => !row.ended_at);
    const closed = encounterRows.filter((row) => row.ended_at);
    const encountersToday = encounterRows.filter(
      (row) => new Date(row.started_at).getTime() >= todayStart.getTime(),
    ).length;
    const avgOpenMinutes =
      open.length > 0
        ? Math.round(
            sum(open.map((row) => (now - new Date(row.started_at).getTime()) / 60000)) /
              open.length,
          )
        : null;
    const avgLosHours =
      closed.length > 0
        ? sum(
            closed.map(
              (row) =>
                (new Date(row.ended_at as string).getTime() - new Date(row.started_at).getTime()) /
                3600000,
            ),
          ) / closed.length
        : null;

    const byDepartment = new Map<string, { open: number; today: number; revenue: number }>();
    const dept = (id: string | null) => {
      const key = id ?? "none";
      if (!byDepartment.has(key)) byDepartment.set(key, { open: 0, today: 0, revenue: 0 });
      return byDepartment.get(key)!;
    };
    for (const row of encounterRows) {
      if (!row.ended_at) dept(row.department_id).open += 1;
      if (new Date(row.started_at).getTime() >= todayStart.getTime())
        dept(row.department_id).today += 1;
    }
    for (const row of invoiceRows) {
      dept(row.encounters?.department_id ?? null).revenue += Number(row.subtotal || 0);
    }

    const totalNotes = notes.count ?? 0;
    return {
      billed,
      collected,
      insuranceCovered,
      outstanding,
      invoiceCount: invoiceRows.length,
      patientsRegistered: patients.count ?? 0,
      appointmentsToday: appointments.count ?? 0,
      encountersToday,
      openEncounters: open.length,
      avgOpenMinutes,
      avgLosHours,
      notesSignedPct:
        totalNotes > 0 ? Math.round(((signedNotes.count ?? 0) / totalNotes) * 100) : null,
      totalNotes,
      byDepartment,
    };
  },
});

const etb = (value: number) => `${Math.round(value).toLocaleString("en-US")} ETB`;

function formatDuration(hours: number | null): string {
  if (hours === null) return "—";
  if (hours >= 24) return `${(hours / 24).toFixed(1)} Days`;
  if (hours >= 1) return `${hours.toFixed(1)} Hours`;
  return `${Math.round(hours * 60)} Mins`;
}

function BenchmarkTag() {
  return (
    <span
      className="absolute right-4 top-4 rounded-full border border-black/10 bg-[#E8E8ED] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#515154]"
      title="Industry benchmark — not computed from hospital data"
    >
      Benchmark
    </span>
  );
}

function KpiTile({
  label,
  value,
  hint,
  tone = "default",
  benchmark = false,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  tone?: "default" | "ok" | "warn" | "crit";
  benchmark?: boolean;
}) {
  return (
    <Panel className="relative min-w-0">
      {benchmark ? <BenchmarkTag /> : null}
      <Stat label={label} value={value} hint={hint} tone={tone} />
    </Panel>
  );
}

function ExecutiveContent() {
  const kpis = useQuery(executiveKpisQuery);
  const beds = useQuery(bedSummaryQuery);
  const departments = useQuery(departmentsQuery);

  const k = kpis.data;
  const occupancyPct =
    beds.data && beds.data.total > 0
      ? Math.round((beds.data.occupied / beds.data.total) * 100)
      : null;
  const loading = "…";

  const downloadReport = () => {
    if (!k) return;
    generateExecutiveReport({
      period: `To date · generated ${new Date().toLocaleDateString()}`,
      totalRevenue: etb(k.billed),
      totalPatients: k.patientsRegistered.toLocaleString("en-US"),
      avgLOS: formatDuration(k.avgLosHours),
      bedOccupancy:
        occupancyPct === null
          ? "—"
          : `${occupancyPct}% (${beds.data?.occupied}/${beds.data?.total})`,
      infectionRate: "Not tracked",
      metrics: [
        { kpi: "Revenue Collected", value: etb(k.collected), change: "—" },
        { kpi: "Outstanding Patient Balance", value: etb(k.outstanding), change: "—" },
        { kpi: "Insurance Covered", value: etb(k.insuranceCovered), change: "—" },
        { kpi: "Encounters Today", value: `${k.encountersToday}`, change: "—" },
        { kpi: "Open Encounters", value: `${k.openEncounters}`, change: "—" },
        { kpi: "Appointments Today", value: `${k.appointmentsToday}`, change: "—" },
        {
          kpi: "SOAP Notes Signed",
          value: k.notesSignedPct === null ? "—" : `${k.notesSignedPct}% of ${k.totalNotes}`,
          change: "—",
        },
      ],
      generatedBy: "CEO",
    });
  };

  return (
    <AppShell
      title="Chief Executive Officer & Medical Director Cockpit"
      subtitle="Enterprise healthcare analytics · Hospital revenue KPIs · Inpatient bed occupancy · Clinical safety governance"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!k}
            onClick={downloadReport}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="size-4" /> Download Executive Report PDF
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5F1FF] border border-[#B8DAFF] px-3.5 py-1 text-xs font-bold text-[#0066CC]">
            <TrendingUp className="size-3.5" />{" "}
            {k ? `${k.openEncounters} patients in care now` : "Loading live KPIs…"}
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Executive High-Level KPIs */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-black uppercase tracking-wider text-black">
            Executive High-Level KPIs
          </h2>
          <button
            type="button"
            disabled={!k}
            onClick={downloadReport}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="Download PDF"
          >
            <Download className="size-3" /> Download PDF
          </button>
        </div>
        {kpis.isError ? (
          <p className="rounded-2xl border border-[#F9BDBD] bg-[#FDE8E7] p-4 text-xs font-semibold text-[#D70015]">
            Could not load KPIs: {kpis.error.message}
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            label="Revenue Billed"
            value={k ? etb(k.billed) : loading}
            hint={k ? `${k.invoiceCount} invoices to date` : "Loading…"}
            tone="ok"
          />
          <KpiTile
            label="Revenue Collected"
            value={k ? etb(k.collected) : loading}
            hint={k ? `${etb(k.insuranceCovered)} insurance covered` : "Loading…"}
            tone="ok"
          />
          <KpiTile
            label="Outstanding Patient Balance"
            value={k ? etb(k.outstanding) : loading}
            hint="Patient share not yet paid"
            tone={k && k.outstanding > 0 ? "warn" : "ok"}
          />
          <KpiTile
            label="Bed Occupancy"
            value={occupancyPct === null ? loading : `${occupancyPct}%`}
            hint={
              beds.data ? `${beds.data.occupied} / ${beds.data.total} beds occupied` : "Loading…"
            }
            tone={
              occupancyPct !== null && occupancyPct >= 90
                ? "crit"
                : occupancyPct !== null && occupancyPct >= 75
                  ? "warn"
                  : "ok"
            }
          />
          <KpiTile
            label="Encounters Today"
            value={k ? k.encountersToday : loading}
            hint={k ? `${k.openEncounters} open encounters` : "Loading…"}
          />
          <KpiTile
            label="Appointments Today"
            value={k ? k.appointmentsToday : loading}
            hint="Scheduled for today"
          />
          <KpiTile
            label="Patients Registered"
            value={k ? k.patientsRegistered.toLocaleString("en-US") : loading}
            hint="Master patient index"
          />
          <KpiTile
            label="Average Length of Stay (ALOS)"
            value={k ? formatDuration(k.avgLosHours) : loading}
            hint={
              k?.avgOpenMinutes !== null && k?.avgOpenMinutes !== undefined
                ? `Open encounters: avg ${formatDuration(k.avgOpenMinutes / 60)} in care`
                : "Closed encounters only"
            }
          />
          <KpiTile
            label="30-Day Readmission Rate"
            value="2.1%"
            hint="Industry target < 5.0% · not computed"
            tone="ok"
            benchmark
          />
          <KpiTile
            label="Patient Satisfaction Score"
            value="96.4 / 100"
            hint="Press Ganey reference · not computed"
            tone="ok"
            benchmark
          />
        </div>

        {/* Strategic Operational Performance Grid */}
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          {/* Departmental KPI Overview */}
          <Panel
            title="Departmental Performance Matrix"
            subtitle="Live status, patient flow & billed revenue by department"
          >
            {departments.isLoading ? (
              <p className="text-xs font-semibold text-[#86868B]">Loading departments…</p>
            ) : (departments.data ?? []).length === 0 ? (
              <p className="text-xs font-semibold text-[#86868B]">No departments configured</p>
            ) : (
              <div className="space-y-3 text-xs font-semibold">
                {(departments.data ?? []).map((d) => {
                  const stats = k?.byDepartment.get(d.id);
                  return (
                    <div
                      key={d.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#F5F5F7] p-4"
                    >
                      <div>
                        <h4 className="font-black text-black text-sm">
                          {d.name} <span className="text-[#86868B]">({d.code})</span>
                        </h4>
                        <p className="text-xs text-[#86868B] mt-0.5">
                          {k
                            ? `${stats?.open ?? 0} open encounters · ${stats?.today ?? 0} today`
                            : "Loading flow…"}
                          {d.location ? ` · ${d.location}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-black text-sm block numeric">
                          {k ? etb(stats?.revenue ?? 0) : loading}
                        </span>
                        <StatusPill
                          status={d.status as OpStatus}
                          label={d.status.charAt(0).toUpperCase() + d.status.slice(1)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* Clinical Quality & Governance */}
          <Panel title="Clinical Quality & Governance" subtitle="Safety metrics & audit compliance">
            <div className="space-y-4 text-xs font-semibold text-[#1D1D1F]">
              <div className="relative rounded-2xl border border-[#B6ECC3] bg-[#E8F8EC] p-4 space-y-1">
                <BenchmarkTag />
                <span className="font-bold text-[#1D8A39] flex items-center gap-1.5">
                  <ShieldCheck className="size-4" /> Hospital-Acquired Infection Rate
                </span>
                <p className="text-[#1D8A39] text-[11px]">
                  Target 0.0% — HAI surveillance is not yet captured in the system.
                </p>
              </div>

              <div className="rounded-2xl border border-black/5 bg-[#FAFAFC] p-4 space-y-1">
                <span className="font-bold text-black flex items-center gap-1.5">
                  <FileCheck className="size-4" /> Medical Audit Compliance
                </span>
                <p className="text-[#86868B] text-[11px]">
                  {!k
                    ? "Loading…"
                    : k.notesSignedPct === null
                      ? "No clinical notes recorded yet."
                      : `${k.notesSignedPct}% of ${k.totalNotes} SOAP notes digitally signed and time-stamped.`}
                </p>
              </div>

              <Link
                to="/command-centre"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                Open Real-Time Hospital Command Centre →
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
