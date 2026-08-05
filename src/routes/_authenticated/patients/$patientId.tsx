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
import { Panel } from "@/components/hip/panel";
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
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-md"
        >
          <ArrowLeft className="size-3.5" /> Back to Index
        </Link>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Executive CV Hero Card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-indigo-950/70 p-8 backdrop-blur-2xl shadow-2xl">
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-6">
              <div className="relative grid size-24 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-600 to-cyan-500 text-4xl font-black text-white shadow-xl shadow-indigo-500/30">
                {patient?.full_name?.charAt(0) ?? "E"}
                <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-emerald-400 border-2 border-slate-900 shadow-md" />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black tracking-tight text-white">
                    {patient?.full_name ?? "Elena Rostova"}
                  </h1>
                  <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-3 py-1 text-xs font-extrabold text-indigo-300">
                    MRN: {patient?.mrn ?? "MRN-8829"}
                  </span>
                  <StatusPill status="healthy" label="Triage: Stable (NEWS2 1)" />
                </div>

                <p className="text-sm font-semibold text-slate-300 flex flex-wrap items-center gap-3">
                  <span>{patient?.sex === "F" ? "Female" : "Male"} · Born 1988-04-12 (Age 38)</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-indigo-400 font-bold">Blood Group: O+</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300">Primary: Dr. Sarah Hana</span>
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
                    <ShieldCheck className="size-3.5" /> Insured: Aetna Platinum Care
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 border border-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300">
                    <Zap className="size-3.5" /> eGFR: 42 mL/min (Renal Guard Active)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 md:flex-col md:items-end">
              <Link
                to="/doctor"
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all scale-105"
              >
                <Stethoscope className="size-4" /> Open Doctor Workspace
              </Link>
              <Link
                to="/pharmacy"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-800/80 px-5 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-all"
              >
                <Pill className="size-4 text-purple-400" /> Dispense In AI Pharmacy
              </Link>
            </div>
          </div>
        </div>

        {/* Telemetry Vitals Ribbon Bar */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-2xl shadow-xl">
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-slate-400">
              <span>NEWS2 Score</span>
              <Activity className="size-4 text-indigo-400" />
            </div>
            <p className="mt-3 text-4xl font-black text-white numeric">{latestVitals?.news2 ?? 1}</p>
            <p className="mt-1 text-xs font-bold text-emerald-400">Low Risk Clinical Status</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-2xl shadow-xl">
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-slate-400">
              <span>Blood Pressure</span>
              <Heart className="size-4 text-rose-400 animate-pulse" />
            </div>
            <p className="mt-3 text-4xl font-black text-white numeric">
              {latestVitals?.systolic ? `${latestVitals.systolic}/${latestVitals.diastolic ?? 80}` : "124/82"}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400">mmHg · Normal Baseline</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-2xl shadow-xl">
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-slate-400">
              <span>Oxygen SpO₂</span>
              <Activity className="size-4 text-sky-400" />
            </div>
            <p className="mt-3 text-4xl font-black text-white numeric">
              {latestVitals?.spo2 ? `${latestVitals.spo2}%` : "98%"}
            </p>
            <p className="mt-1 text-xs font-bold text-emerald-400">Optimal Airway Flow</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-2xl shadow-xl">
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-slate-400">
              <span>Heart Rate</span>
              <Activity className="size-4 text-amber-400" />
            </div>
            <p className="mt-3 text-4xl font-black text-white numeric">
              {latestVitals?.heart_rate ? `${latestVitals.heart_rate} bpm` : "74 bpm"}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-400">Regular Sinus Rhythm</p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-2xl shadow-xl">
            <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-slate-400">
              <span>eGFR Clearance</span>
              <Zap className="size-4 text-purple-400" />
            </div>
            <p className="mt-3 text-4xl font-black text-purple-400 numeric">42</p>
            <p className="mt-1 text-xs font-bold text-amber-400">Kidney Dose Warning</p>
          </div>
        </div>

        {/* Main CV Sections Layout */}
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Panel title="Executive Medical Summary" subtitle="Core history & active clinical overview">
              <div className="space-y-5">
                <p className="text-sm leading-relaxed text-slate-300 font-medium">
                  Patient presents with acute migraine exacerbation with a background history of mild hypertension and Stage 3a Chronic Kidney Disease (eGFR 42). Currently undergoing clinical evaluation under Dr. Sarah Hana. All diagnostic orders and AI medication safety verifications are logged to the immutable event ledger.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 pt-3 border-t border-white/10">
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-rose-400 flex items-center gap-2 mb-2">
                      <ShieldAlert className="size-4" /> Allergies & Hypersensitivities
                    </p>
                    <ul className="space-y-2 text-xs font-semibold text-slate-200">
                      <li className="flex items-center justify-between">
                        <span className="font-bold text-rose-300">Penicillin</span>
                        <span className="rounded bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] text-rose-300 font-bold">Severe Anaphylaxis</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-2">
                      <FileText className="size-4 text-indigo-400" /> Active Conditions & Diagnoses
                    </p>
                    <ul className="space-y-2 text-xs font-semibold text-slate-200">
                      <li className="flex items-center justify-between">
                        <span>Stage 3a Chronic Kidney Disease</span>
                        <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[10px]">eGFR 42</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Primary Hypertension</span>
                        <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px]">Managed</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </Panel>

            {/* SOAP Clinical Notes */}
            <Panel title="Signed SOAP Notes" subtitle="Immutable physician notes">
              <div className="space-y-4">
                <article className="rounded-2xl border border-white/10 bg-slate-900/80 p-5 shadow-md">
                  <header className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                      <User className="size-4 text-indigo-400" />
                      <span>Dr. Sarah Hana (Attending Physician)</span>
                      <span className="text-slate-600">•</span>
                      <Clock className="size-3.5 text-slate-400" />
                      <span>Today at 09:43 AM</span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="size-3" /> Signed & Locked
                    </span>
                  </header>
                  <div className="space-y-2 text-xs leading-relaxed text-slate-300">
                    <p><strong className="text-white">Subjective:</strong> Patient reports severe throbbing headache onset 4h ago, accompanied by mild photophobia.</p>
                    <p><strong className="text-indigo-400">Assessment & Plan:</strong> Acute Migraine Exacerbation. Order Sumatriptan 50mg, monitor eGFR clearance, schedule non-contrast head CT scan.</p>
                  </div>
                </article>
              </div>
            </Panel>
          </div>

          {/* Right Sidebar: Active Orders & Visit History */}
          <div className="space-y-6">
            <Panel title="Active Orders & Prescriptions" subtitle="Connected lab, imaging & pharmacy">
              <ul className="space-y-3 text-xs">
                <li className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-md">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-bold text-white">Sumatriptan 50mg Oral</p>
                    <span className="rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                      Pharmacy Dispensing
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400">Prescription · Priority: Urgent</p>
                </li>

                <li className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-md">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-bold text-white">Head Non-Contrast CT Scan</p>
                    <span className="rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase">
                      Completed
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400">Radiology · Priority: Routine</p>
                </li>
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
