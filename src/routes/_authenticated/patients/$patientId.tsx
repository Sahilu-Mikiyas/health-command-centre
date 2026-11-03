import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  Heart,
  Loader2,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  User,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";

import { AppShell } from "@/components/hip/app-shell";
import { Panel } from "@/components/hip/panel";
import { StatusPill, type OpStatus } from "@/components/hip/status-pill";
import { Timeline } from "@/components/hip/timeline";
import { notesQuery, ordersQuery, type NoteRow, type OrderRow } from "@/lib/hip/clinical-queries";
import { patientRecordQuery } from "@/lib/hip/queries";
import { STAGE_LABELS } from "@/lib/hip/workflow";

export const Route = createFileRoute("/_authenticated/patients/$patientId")({
  head: () => ({
    meta: [
      { title: "Executive Patient CV | Furii Health" },
      {
        name: "description",
        content: "Living Patient Record presented in an executive CV profile format.",
      },
    ],
  }),
  component: PatientRecordCV,
});

const BACK_LINK_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold text-black hover:bg-[#F5F5F7] shadow-2xs transition-all";

function ageFrom(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function sexLabel(sex: string | null | undefined): string {
  const s = (sex ?? "").toLowerCase();
  if (s === "female" || s === "f") return "Female";
  if (s === "male" || s === "m") return "Male";
  return "Sex not recorded";
}

function news2Status(score: number | null | undefined): {
  status: OpStatus;
  label: string;
  tone: string;
} {
  if (score === null || score === undefined) {
    return { status: "offline", label: "No NEWS2 recorded", tone: "text-[#86868B]" };
  }
  if (score >= 7)
    return { status: "critical", label: "High Clinical Risk", tone: "text-[#FF3B30]" };
  if (score >= 5) return { status: "critical", label: "Medium-High Risk", tone: "text-[#FF3B30]" };
  if (score >= 1) return { status: "busy", label: "Low-Medium Risk", tone: "text-[#FF9500]" };
  return { status: "healthy", label: "Low Risk Clinical Status", tone: "text-[#34C759]" };
}

const ORDER_CATEGORY_LABEL: Record<OrderRow["category"], string> = {
  laboratory: "Laboratory",
  imaging: "Imaging",
  medication: "Prescription",
  procedure: "Procedure",
};

function orderStatusClass(status: OrderRow["status"]): string {
  switch (status) {
    case "completed":
    case "resulted":
      return "bg-[#E8F8EC] text-[#1D8A39] border-[#B6ECC3]";
    case "cancelled":
      return "bg-[#E8E8ED] text-[#86868B] border-black/10";
    case "in_progress":
      return "bg-[#E5F1FF] text-[#0066CC] border-[#B8DAFF]";
    default:
      return "bg-[#FFF4E5] text-[#B86200] border-[#FFE0B2]";
  }
}

function severityClass(severity: string): string {
  const s = severity.toLowerCase();
  if (s === "severe" || s === "life-threatening" || s === "anaphylaxis") {
    return "text-[#D70015] border-[#F9BDBD]";
  }
  if (s === "mild") return "text-[#1D8A39] border-[#B6ECC3]";
  return "text-[#B86200] border-[#FFE0B2]";
}

function conditionStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "active") return "bg-[#FFF4E5] text-[#B86200] border-[#FFE0B2]";
  if (s === "resolved" || s === "managed" || s === "controlled") {
    return "bg-[#E8F8EC] text-[#1D8A39] border-[#B6ECC3]";
  }
  return "bg-[#E8E8ED] text-[#515154] border-black/10";
}

function titleCase(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold text-[#86868B]">{children}</p>;
}

function PatientRecordCV() {
  const { patientId } = Route.useParams();
  const record = useQuery(patientRecordQuery(patientId));
  const orders = useQuery(ordersQuery(patientId));
  const notes = useQuery(notesQuery(patientId));

  if (record.isLoading) {
    return (
      <AppShell title="Patient Record" subtitle="Loading profile…">
        <div className="mx-auto max-w-7xl">
          <div className="apple-card flex items-center justify-center gap-3 p-16 text-sm font-semibold text-[#86868B]">
            <Loader2 className="size-5 animate-spin" /> Loading patient record…
          </div>
        </div>
      </AppShell>
    );
  }

  const patient = record.data?.patient;

  if (record.isError || !patient) {
    return (
      <AppShell title="Patient not found" subtitle="Living Patient Record">
        <div className="mx-auto max-w-7xl">
          <div className="apple-card flex flex-col items-center gap-4 p-16 text-center">
            <AlertTriangle className="size-8 text-[#FF9500]" />
            <h1 className="text-2xl font-black tracking-tight text-black">Patient not found</h1>
            <p className="text-sm font-semibold text-[#86868B]">
              {record.isError
                ? `The record could not be loaded: ${record.error.message}`
                : "No patient exists with this identifier."}
            </p>
            <Link to="/patients" className={BACK_LINK_CLASS}>
              <ArrowLeft className="size-3.5" /> Back to Patient Index
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const allergies = record.data?.allergies ?? [];
  const conditions = record.data?.conditions ?? [];
  const encounters = record.data?.encounters ?? [];
  const latestVitals = record.data?.vitals?.[0];
  const signedNotes: NoteRow[] = (notes.data ?? []).filter((note) => note.signed_at);
  const orderList = orders.data ?? [];

  const age = ageFrom(patient.date_of_birth);
  const egfr = patient.egfr === null || patient.egfr === undefined ? null : Number(patient.egfr);
  const renalGuard = egfr !== null && egfr < 60;
  const news2 = news2Status(latestVitals?.news2);
  const activeConditions = conditions.filter((c) => c.status.toLowerCase() === "active");
  const currentEncounter = encounters.find((e) => !e.ended_at);
  const latestClinician = signedNotes[0]?.author_label ?? orderList[0]?.requested_by_label ?? null;

  const summaryParts: string[] = [];
  if (currentEncounter) {
    summaryParts.push(
      `Currently in an open encounter (${STAGE_LABELS[currentEncounter.stage] ?? titleCase(currentEncounter.stage)}, ` +
        `${currentEncounter.priority} priority)${currentEncounter.chief_complaint ? ` presenting with ${currentEncounter.chief_complaint}` : ""}.`,
    );
  } else if (encounters.length > 0) {
    summaryParts.push(
      `No open encounter; ${encounters.length} previous encounter${encounters.length === 1 ? "" : "s"} on record.`,
    );
  } else {
    summaryParts.push("No encounters recorded yet.");
  }
  if (activeConditions.length > 0) {
    summaryParts.push(`Active problems: ${activeConditions.map((c) => c.name).join(", ")}.`);
  }
  if (allergies.length > 0) {
    summaryParts.push(`Documented allergies: ${allergies.map((a) => a.substance).join(", ")}.`);
  }
  if (renalGuard)
    summaryParts.push(`Reduced renal function (eGFR ${egfr}) — renal dosing applies.`);

  return (
    <AppShell
      title={patient.full_name}
      subtitle={`MRN: ${patient.mrn} · Living Patient Record CV`}
      actions={
        <Link to="/patients" className={BACK_LINK_CLASS}>
          <ArrowLeft className="size-3.5" /> Back to Index
        </Link>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Apple Executive CV Hero Card */}
        <div className="apple-card relative overflow-hidden p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-6">
              <div className="relative grid size-24 shrink-0 place-items-center rounded-3xl bg-black text-4xl font-black text-white shadow-lg">
                {patient.full_name.charAt(0)}
                <span
                  className={`absolute -bottom-1 -right-1 size-5 rounded-full border-2 border-white shadow-xs ${
                    currentEncounter ? "bg-[#34C759]" : "bg-[#86868B]"
                  }`}
                />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black tracking-tight text-black">
                    {patient.full_name}
                  </h1>
                  <span className="rounded-full bg-[#E8E8ED] border border-black/10 px-3 py-1 text-xs font-bold text-black">
                    MRN: {patient.mrn}
                  </span>
                  <StatusPill
                    status={news2.status}
                    label={
                      latestVitals?.news2 !== null && latestVitals?.news2 !== undefined
                        ? `NEWS2 ${latestVitals.news2}`
                        : "No triage score"
                    }
                  />
                </div>

                <p className="text-sm font-semibold text-[#1D1D1F] flex flex-wrap items-center gap-3">
                  <span>
                    {sexLabel(patient.sex)} · Born {patient.date_of_birth}
                    {age !== null ? ` (Age ${age})` : ""}
                  </span>
                  <span className="text-[#86868B]">•</span>
                  <span className="text-black font-bold">
                    Blood Group: {patient.blood_group ?? "Not recorded"}
                  </span>
                  {latestClinician ? (
                    <>
                      <span className="text-[#86868B]">•</span>
                      <span>Last clinician: {latestClinician}</span>
                    </>
                  ) : null}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {patient.insurance_provider ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3 py-1 text-xs font-bold text-[#1D8A39]">
                      <ShieldCheck className="size-3.5" /> Insured: {patient.insurance_provider}
                      {patient.insurance_number ? ` · ${patient.insurance_number}` : ""}
                      {patient.insurance_coverage_pct !== null
                        ? ` · ${patient.insurance_coverage_pct}% cover`
                        : ""}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8E8ED] border border-black/10 px-3 py-1 text-xs font-bold text-[#515154]">
                      <ShieldCheck className="size-3.5" /> Self-pay · No insurance on file
                    </span>
                  )}
                  {renalGuard ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5E8FF] border border-[#E4BEFF] px-3 py-1 text-xs font-bold text-[#8922C7]">
                      <Zap className="size-3.5" /> eGFR: {egfr} mL/min (Renal Guard Active)
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 md:flex-col md:items-end">
              <Link
                to="/doctor"
                className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all scale-105"
              >
                <Stethoscope className="size-4" /> Open Doctor Workspace
              </Link>
              <Link
                to="/pharmacy"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#F5F5F7] px-5 py-2.5 text-xs font-bold text-black hover:bg-white transition-all shadow-2xs"
              >
                <Pill className="size-4 text-[#8922C7]" /> Dispense In AI Pharmacy
              </Link>
            </div>
          </div>
        </div>

        {/* Telemetry Vitals Ribbon Bar (Apple Watch Style) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="apple-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B]">
              <span>NEWS2 Score</span>
              <Activity className="size-4 text-black" />
            </div>
            <p className="mt-3 text-4xl font-black text-black numeric">
              {latestVitals?.news2 ?? "—"}
            </p>
            <p className={`mt-1 text-xs font-bold ${news2.tone}`}>{news2.label}</p>
          </div>

          <div className="apple-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B]">
              <span>Blood Pressure</span>
              <Heart className="size-4 text-[#FF3B30]" />
            </div>
            <p className="mt-3 text-4xl font-black text-black numeric">
              {latestVitals?.systolic
                ? `${latestVitals.systolic}/${latestVitals.diastolic ?? "—"}`
                : "—"}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#86868B]">mmHg</p>
          </div>

          <div className="apple-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B]">
              <span>Oxygen SpO₂</span>
              <Activity className="size-4 text-black" />
            </div>
            <p className="mt-3 text-4xl font-black text-black numeric">
              {latestVitals?.spo2 ? `${latestVitals.spo2}%` : "—"}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#86868B]">
              {latestVitals?.temperature_c
                ? `Temp ${latestVitals.temperature_c} °C`
                : "Peripheral saturation"}
            </p>
          </div>

          <div className="apple-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B]">
              <span>Heart Rate</span>
              <Activity className="size-4 text-[#FF9500]" />
            </div>
            <p className="mt-3 text-4xl font-black text-black numeric">
              {latestVitals?.heart_rate ? `${latestVitals.heart_rate} bpm` : "—"}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#86868B]">
              {latestVitals
                ? `Recorded ${new Date(latestVitals.recorded_at).toLocaleString()}`
                : "No vitals recorded"}
            </p>
          </div>

          <div className="apple-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B]">
              <span>eGFR Clearance</span>
              <Zap className="size-4 text-[#8922C7]" />
            </div>
            <p
              className={`mt-3 text-4xl font-black numeric ${renalGuard ? "text-[#8922C7]" : "text-black"}`}
            >
              {egfr ?? "—"}
            </p>
            <p
              className={`mt-1 text-xs font-bold ${renalGuard ? "text-[#FF9500]" : "text-[#86868B]"}`}
            >
              {egfr === null
                ? "Not recorded"
                : renalGuard
                  ? "Kidney Dose Warning"
                  : "mL/min · Normal range"}
            </p>
          </div>
        </div>

        {/* Main CV Sections Layout */}
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Panel
              title="Executive Medical Summary"
              subtitle="Core history & active clinical overview"
            >
              <div className="space-y-5">
                <p className="text-sm leading-relaxed text-[#1D1D1F] font-semibold">
                  {summaryParts.join(" ")}
                </p>

                <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-black/5">
                  <div className="rounded-2xl border border-[#F9BDBD] bg-[#FDE8E7] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#D70015] flex items-center gap-2 mb-2">
                      <ShieldAlert className="size-4" /> Allergies & Hypersensitivities
                    </p>
                    {allergies.length === 0 ? (
                      <EmptyState>No allergies recorded</EmptyState>
                    ) : (
                      <ul className="space-y-2 text-xs font-semibold text-black">
                        {allergies.map((allergy) => (
                          <li key={allergy.id} className="flex items-center justify-between gap-2">
                            <span className="min-w-0">
                              <span className="font-bold text-[#D70015]">{allergy.substance}</span>
                              {allergy.reaction ? (
                                <span className="text-[#515154]"> · {allergy.reaction}</span>
                              ) : null}
                            </span>
                            <span
                              className={`shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-bold border ${severityClass(allergy.severity)}`}
                            >
                              {titleCase(allergy.severity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-2 mb-2">
                      <FileText className="size-4 text-black" /> Active Diagnoses & Chronic
                      Conditions
                    </p>
                    {conditions.length === 0 ? (
                      <EmptyState>No conditions recorded</EmptyState>
                    ) : (
                      <ul className="space-y-2 text-xs font-semibold text-black">
                        {conditions.map((condition) => (
                          <li
                            key={condition.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="min-w-0">
                              {condition.name}
                              {condition.icd10 ? (
                                <span className="ml-1.5 font-mono text-[10px] text-[#86868B]">
                                  {condition.icd10}
                                </span>
                              ) : null}
                            </span>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${conditionStatusClass(condition.status)}`}
                            >
                              {titleCase(condition.status)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </Panel>

            {/* SOAP Clinical Notes */}
            <Panel title="Signed SOAP Notes" subtitle="Immutable physician notes">
              <div className="space-y-4">
                {notes.isLoading ? (
                  <EmptyState>Loading notes…</EmptyState>
                ) : signedNotes.length === 0 ? (
                  <EmptyState>No signed clinical notes yet</EmptyState>
                ) : (
                  signedNotes.map((note) => (
                    <article key={note.id} className="apple-card p-5">
                      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-black/5 pb-3 mb-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#86868B]">
                          <User className="size-4 text-black" />
                          <span>{note.author_label ?? "Unknown clinician"}</span>
                          <span className="text-[#86868B]">•</span>
                          <span>{titleCase(note.note_type)}</span>
                          <span className="text-[#86868B]">•</span>
                          <Clock className="size-3.5 text-[#86868B]" />
                          <span>
                            {new Date(note.signed_at ?? note.created_at).toLocaleString()}
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F8EC] px-3 py-1 text-xs font-bold text-[#1D8A39] border border-[#B6ECC3]">
                          <CheckCircle2 className="size-3" /> Signed & Locked
                        </span>
                      </header>
                      <div className="space-y-2 text-xs leading-relaxed text-[#1D1D1F] font-medium">
                        {(
                          [
                            ["Subjective", note.subjective],
                            ["Objective", note.objective],
                            ["Assessment", note.assessment],
                            ["Plan", note.plan],
                          ] as const
                        )
                          .filter(([, text]) => text)
                          .map(([label, text]) => (
                            <p key={label}>
                              <strong className="text-black">{label}:</strong> {text}
                            </p>
                          ))}
                      </div>
                    </article>
                  ))
                )}
              </div>
            </Panel>
          </div>

          {/* Right Sidebar: Active Orders & Visit History */}
          <div className="space-y-6">
            <Panel title="Orders & Prescriptions" subtitle="Connected lab, imaging & pharmacy">
              {orders.isLoading ? (
                <EmptyState>Loading orders…</EmptyState>
              ) : orderList.length === 0 ? (
                <EmptyState>No orders placed</EmptyState>
              ) : (
                <ul className="space-y-3 text-xs">
                  {orderList.map((order) => (
                    <li
                      key={order.id}
                      className={`apple-card p-4 ${order.is_critical ? "border border-[#F9BDBD]" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <p className="font-bold text-black min-w-0">{order.name}</p>
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${orderStatusClass(order.status)}`}
                        >
                          {titleCase(order.status)}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-[#86868B]">
                        {ORDER_CATEGORY_LABEL[order.category]} · Priority:{" "}
                        {titleCase(order.priority)} ·{" "}
                        {new Date(order.requested_at).toLocaleDateString()}
                      </p>
                      {order.is_critical ? (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-[#D70015]">
                          <AlertTriangle className="size-3" /> Critical result
                        </p>
                      ) : null}
                      {order.result_summary ? (
                        <p className="mt-1.5 rounded-xl bg-[#F5F5F7] p-2 text-[11px] font-semibold text-[#1D1D1F]">
                          {order.result_summary}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Hospital Journey Experience" subtitle="Chronological care encounters">
              {encounters.length === 0 ? (
                <EmptyState>No encounters recorded</EmptyState>
              ) : (
                <Timeline
                  items={encounters.map((encounter) => ({
                    id: encounter.id,
                    time: new Date(encounter.started_at).toLocaleDateString(),
                    title: encounter.chief_complaint ?? "Encounter",
                    detail: `Stage: ${STAGE_LABELS[encounter.stage] ?? titleCase(encounter.stage)} · Priority: ${
                      encounter.priority
                    }${encounter.ended_at ? ` · Closed ${new Date(encounter.ended_at).toLocaleDateString()}` : " · Open"}`,
                    tone: encounter.priority === "critical" ? "crit" : "default",
                  }))}
                />
              )}
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
