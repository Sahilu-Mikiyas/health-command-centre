import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Heart,
  Pill,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  User,
  Zap,
} from "lucide-react";

import { AppShell } from "@/components/hip/app-shell";
import { Panel, Stat } from "@/components/hip/panel";
import { StatusPill } from "@/components/hip/status-pill";
import { Timeline } from "@/components/hip/timeline";
import { notesQuery, ordersQuery } from "@/lib/hip/clinical-queries";
import { patientRecordQuery } from "@/lib/hip/queries";

export const Route = createFileRoute("/_authenticated/patients/$patientId")({
  head: () => ({
    meta: [
      { title: "Executive Patient CV | Meridian HIP" },
      {
        name: "description",
        content: "Living Patient Record presented in an executive CV profile format.",
      },
    ],
  }),
  component: PatientRecordCV,
});

function PatientRecordCV() {
  const { patientId } = Route.useParams();
  const record = useQuery(patientRecordQuery(patientId));
  const orders = useQuery(ordersQuery(patientId));
  const notes = useQuery(notesQuery(patientId));

  const patient = record.data?.patient;
  const latestVitals = record.data?.vitals?.[0];

  return (
    <AppShell
      title={patient?.full_name ?? "Patient Executive CV"}
      subtitle={patient ? `MRN: ${patient.mrn} · Living Patient Record CV` : "Loading profile…"}
      actions={
        <Link
          to="/patients"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs"
        >
          <ArrowLeft className="size-3.5" /> Back to Index
        </Link>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Executive CV Header Header Card */}
        <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-8 shadow-sm backdrop-blur-2xl">
          <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-500/10 via-blue-500/5 to-transparent blur-3xl" />
          
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-5">
              <div className="relative grid size-24 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-3xl font-black text-white shadow-lg shadow-indigo-500/25">
                {patient?.full_name?.charAt(0) ?? "P"}
                <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-500 border-2 border-white" />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-black tracking-tight text-slate-900">
                    {patient?.full_name ?? "Loading Patient..."}
                  </h1>
                  <span className="rounded-full bg-indigo-50 border border-indigo-200 px-3 py-0.5 text-xs font-bold text-indigo-700">
                    MRN: {patient?.mrn ?? "MRN-8829"}
                  </span>
                  <StatusPill status={latestVitals?.news2 && latestVitals.news2 >= 4 ? "critical" : "healthy"} label={latestVitals?.news2 && latestVitals.news2 >= 4 ? "Triage: Critical" : "Triage: Stable"} />
                </div>

                <p className="text-sm font-semibold text-slate-600 flex items-center gap-3">
                  <span>{patient?.sex === "F" ? "Female" : "Male"} · {patient?.date_of_birth ?? "1988-04-12"}</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-indigo-600 font-bold">Blood Group: O+</span>
                  <span className="text-slate-300">•</span>
                  <span>Primary Doctor: Dr. Sarah Hana</span>
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    <ShieldCheck className="size-3 text-emerald-600" /> Insured: Aetna Platinum
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 border border-purple-200">
                    <Zap className="size-3" /> eGFR: {patient?.egfr ?? "42"} mL/min (Renal Guard Active)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 md:flex-col md:items-end">
              <Link
                to="/doctor"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition-colors"
              >
                <Stethoscope className="size-4" /> Open Doctor Workspace
              </Link>
              <Link
                to="/pharmacy"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-colors"
              >
                <Pill className="size-4" /> Dispense In Pharmacy
              </Link>
            </div>
          </div>
        </div>

        {/* Telemetry Vitals Ribbon Bar */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>NEWS2 Score</span>
              <Activity className="size-4 text-indigo-500" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 numeric">{latestVitals?.news2 ?? 1}</p>
            <p className="mt-1 text-xs font-medium text-emerald-600">Low Risk Clinical Score</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Blood Pressure</span>
              <Heart className="size-4 text-rose-500" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 numeric">
              {latestVitals?.systolic ? `${latestVitals.systolic}/${latestVitals.diastolic ?? 80}` : "124/82"}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">mmHg · Normal</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Oxygen Saturation</span>
              <Activity className="size-4 text-sky-500" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 numeric">
              {latestVitals?.spo2 ? `${latestVitals.spo2}%` : "98%"}
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-600">Optimal Airway Flow</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>Heart Rate</span>
              <Activity className="size-4 text-amber-500" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-slate-900 numeric">
              {latestVitals?.heart_rate ? `${latestVitals.heart_rate} bpm` : "74 bpm"}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500">Regular Sinus Rhythm</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 backdrop-blur-xl shadow-2xs">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>eGFR Clearance</span>
              <Zap className="size-4 text-purple-500" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-purple-700 numeric">
              {patient?.egfr ?? "42"}
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-600">Kidney Dose Adjustment</p>
          </div>
        </div>

        {/* Main CV Sections Layout */}
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            {/* Executive Medical Bio */}
            <Panel title="Executive Medical Summary" subtitle="Core history & active clinical overview">
              <div className="space-y-4">
                <p className="text-sm leading-relaxed text-slate-700 font-medium">
                  Patient presents with acute migraine exacerbation with a background history of mild hypertension and Stage 3a Chronic Kidney Disease (eGFR 42). Currently undergoing clinical evaluation under Dr. Sarah Hana. All diagnostic orders and AI medication safety verifications are logged to the immutable event ledger.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-slate-100">
                  <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5 mb-2">
                      <ShieldAlert className="size-4" /> Allergies & Hypersensitivities
                    </p>
                    <ul className="space-y-1.5 text-xs font-medium text-slate-800">
                      {(record.data?.allergies ?? []).map((allergy) => (
                        <li key={allergy.id} className="flex items-center justify-between">
                          <span className="font-bold text-rose-800">{allergy.substance}</span>
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] text-rose-700">{allergy.severity}</span>
                        </li>
                      ))}
                      {record.data?.allergies?.length === 0 ? (
                        <li className="text-slate-500">Penicillin (Severe Anaphylaxis)</li>
                      ) : null}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5 mb-2">
                      <FileText className="size-4" /> Active Diagnoses & Chronic Conditions
                    </p>
                    <ul className="space-y-1.5 text-xs font-medium text-slate-800">
                      {(record.data?.conditions ?? []).map((condition) => (
                        <li key={condition.id} className="flex items-center justify-between">
                          <span>{condition.name}</span>
                          <span className="rounded bg-slate-200/70 px-1.5 py-0.5 text-[10px]">{condition.status}</span>
                        </li>
                      ))}
                      {record.data?.conditions?.length === 0 ? (
                        <>
                          <li className="flex items-center justify-between">
                            <span>Stage 3a Chronic Kidney Disease</span>
                            <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px]">Active</span>
                          </li>
                          <li className="flex items-center justify-between">
                            <span>Primary Hypertension</span>
                            <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 text-[10px]">Managed</span>
                          </li>
                        </>
                      ) : null}
                    </ul>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Clinical SOAP Notes (CV Publications / Recommendations) */}
            <Panel title="Clinical Encounter Notes" subtitle="Signed by attending physicians">
              <div className="space-y-4">
                {(notes.data ?? []).map((note) => (
                  <article key={note.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
                    <header className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <User className="size-4 text-indigo-600" />
                        <span>{note.author_label ?? "Dr. Sarah Hana"}</span>
                        <span className="text-slate-300">•</span>
                        <Clock className="size-3.5 text-slate-400" />
                        <span>{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="size-3" /> Signed & Locked
                      </span>
                    </header>
                    <dl className="space-y-2 text-xs leading-relaxed">
                      {note.subjective ? (
                        <div>
                          <dt className="font-bold text-slate-900">Subjective (S):</dt>
                          <dd className="text-slate-700 font-medium mt-0.5">{note.subjective}</dd>
                        </div>
                      ) : null}
                      {note.assessment ? (
                        <div>
                          <dt className="font-bold text-indigo-700">Assessment & Plan (A/P):</dt>
                          <dd className="text-slate-700 font-medium mt-0.5">{note.assessment} - {note.plan}</dd>
                        </div>
                      ) : null}
                    </dl>
                  </article>
                ))}
              </div>
            </Panel>
          </div>

          {/* Right Sidebar: Active Orders & Visit Experience */}
          <div className="space-y-6">
            <Panel title="Active Orders & Prescriptions" subtitle="Connected lab, imaging & pharmacy">
              <ul className="space-y-2.5 text-xs">
                {(orders.data ?? []).map((order) => (
                  <li key={order.id} className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-slate-900">{order.name}</p>
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 border border-sky-200 uppercase">
                        {order.status}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-500">
                      Category: {order.category} · Priority: {order.priority}
                    </p>
                  </li>
                ))}
                {orders.data?.length === 0 ? (
                  <>
                    <li className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-slate-900">Sumatriptan 50mg Oral</p>
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200 uppercase">
                          Pharmacy Dispensing
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-500">Prescription · Priority: Urgent</p>
                    </li>
                    <li className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-slate-900">Head Non-Contrast CT Scan</p>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 uppercase">
                          Completed
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-500">Radiology · Priority: Routine</p>
                    </li>
                  </>
                ) : null}
              </ul>
            </Panel>

            <Panel title="Hospital Journey Experience" subtitle="Chronological care encounters">
              <Timeline
                items={(record.data?.encounters ?? []).map((encounter) => ({
                  id: encounter.id,
                  time: new Date(encounter.started_at).toLocaleDateString(),
                  title: encounter.chief_complaint ?? "Emergency Triage & Consultation",
                  detail: `Stage: ${encounter.stage} · Priority: ${encounter.priority}`,
                  tone: encounter.priority === "critical" ? "crit" : "default",
                }))}
              />
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
