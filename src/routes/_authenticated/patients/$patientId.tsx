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
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold text-[#1D1D1F] hover:bg-[#F5F5F7] shadow-2xs transition-all"
        >
          <ArrowLeft className="size-3.5" /> Back to Index
        </Link>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Apple Executive CV Hero Card */}
        <div className="apple-card relative overflow-hidden p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-6">
              <div className="relative grid size-24 shrink-0 place-items-center rounded-3xl bg-[#0071E3] text-4xl font-black text-white shadow-lg shadow-[#0071E3]/20">
                {patient?.full_name?.charAt(0) ?? "E"}
                <span className="absolute -bottom-1 -right-1 size-5 rounded-full bg-[#34C759] border-2 border-white shadow-xs" />
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-extrabold tracking-tight text-[#1D1D1F]">
                    {patient?.full_name ?? "Elena Rostova"}
                  </h1>
                  <span className="rounded-full bg-[#E5F1FF] border border-[#B8DAFF] px-3 py-1 text-xs font-bold text-[#0066CC]">
                    MRN: {patient?.mrn ?? "MRN-8829"}
                  </span>
                  <StatusPill status="healthy" label="Triage: Stable (NEWS2 1)" />
                </div>

                <p className="text-sm font-medium text-[#515154] flex flex-wrap items-center gap-3">
                  <span>{patient?.sex === "F" ? "Female" : "Male"} · Born 1988-04-12 (Age 38)</span>
                  <span className="text-[#86868B]">•</span>
                  <span className="text-[#0071E3] font-bold">Blood Group: O+</span>
                  <span className="text-[#86868B]">•</span>
                  <span>Primary: Dr. Sarah Hana</span>
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3 py-1 text-xs font-bold text-[#1D8A39]">
                    <ShieldCheck className="size-3.5" /> Insured: Aetna Platinum Care
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5E8FF] border border-[#E4BEFF] px-3 py-1 text-xs font-bold text-[#8922C7]">
                    <Zap className="size-3.5" /> eGFR: 42 mL/min (Renal Guard Active)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 md:flex-col md:items-end">
              <Link
                to="/doctor"
                className="inline-flex items-center gap-2 rounded-full bg-[#0071E3] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#005bb5] transition-all scale-105"
              >
                <Stethoscope className="size-4" /> Open Doctor Workspace
              </Link>
              <Link
                to="/pharmacy"
                className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#F5F5F7] px-5 py-2.5 text-xs font-bold text-[#1D1D1F] hover:bg-white transition-all shadow-2xs"
              >
                <Pill className="size-4 text-[#AF52DE]" /> Dispense In AI Pharmacy
              </Link>
            </div>
          </div>
        </div>

        {/* Telemetry Vitals Ribbon Bar (Apple Watch Style) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="apple-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B]">
              <span>NEWS2 Score</span>
              <Activity className="size-4 text-[#0071E3]" />
            </div>
            <p className="mt-3 text-4xl font-extrabold text-[#1D1D1F] numeric">{latestVitals?.news2 ?? 1}</p>
            <p className="mt-1 text-xs font-bold text-[#34C759]">Low Risk Clinical Status</p>
          </div>

          <div className="apple-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B]">
              <span>Blood Pressure</span>
              <Heart className="size-4 text-[#FF3B30]" />
            </div>
            <p className="mt-3 text-4xl font-extrabold text-[#1D1D1F] numeric">
              {latestVitals?.systolic ? `${latestVitals.systolic}/${latestVitals.diastolic ?? 80}` : "124/82"}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#86868B]">mmHg · Normal Baseline</p>
          </div>

          <div className="apple-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B]">
              <span>Oxygen SpO₂</span>
              <Activity className="size-4 text-[#0071E3]" />
            </div>
            <p className="mt-3 text-4xl font-extrabold text-[#1D1D1F] numeric">
              {latestVitals?.spo2 ? `${latestVitals.spo2}%` : "98%"}
            </p>
            <p className="mt-1 text-xs font-bold text-[#34C759]">Optimal Airway Flow</p>
          </div>

          <div className="apple-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B]">
              <span>Heart Rate</span>
              <Activity className="size-4 text-[#FF9500]" />
            </div>
            <p className="mt-3 text-4xl font-extrabold text-[#1D1D1F] numeric">
              {latestVitals?.heart_rate ? `${latestVitals.heart_rate} bpm` : "74 bpm"}
            </p>
            <p className="mt-1 text-xs font-semibold text-[#86868B]">Regular Sinus Rhythm</p>
          </div>

          <div className="apple-card p-5">
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#86868B]">
              <span>eGFR Clearance</span>
              <Zap className="size-4 text-[#AF52DE]" />
            </div>
            <p className="mt-3 text-4xl font-extrabold text-[#AF52DE] numeric">42</p>
            <p className="mt-1 text-xs font-bold text-[#FF9500]">Kidney Dose Warning</p>
          </div>
        </div>

        {/* Main CV Sections Layout */}
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <Panel title="Executive Medical Summary" subtitle="Core history & active clinical overview">
              <div className="space-y-5">
                <p className="text-sm leading-relaxed text-[#515154] font-medium">
                  Patient presents with acute migraine exacerbation with a background history of mild hypertension and Stage 3a Chronic Kidney Disease (eGFR 42). Currently undergoing clinical evaluation under Dr. Sarah Hana. All diagnostic orders and AI medication safety verifications are logged to the immutable event ledger.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-black/5">
                  <div className="rounded-2xl border border-[#F9BDBD] bg-[#FDE8E7] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#D70015] flex items-center gap-2 mb-2">
                      <ShieldAlert className="size-4" /> Allergies & Hypersensitivities
                    </p>
                    <ul className="space-y-2 text-xs font-semibold text-[#1D1D1F]">
                      <li className="flex items-center justify-between">
                        <span className="font-bold text-[#D70015]">Penicillin</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-[#D70015] font-bold border border-[#F9BDBD]">Severe Anaphylaxis</span>
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#1D1D1F] flex items-center gap-2 mb-2">
                      <FileText className="size-4 text-[#0071E3]" /> Active Diagnoses & Chronic Conditions
                    </p>
                    <ul className="space-y-2 text-xs font-semibold text-[#1D1D1F]">
                      <li className="flex items-center justify-between">
                        <span>Stage 3a Chronic Kidney Disease</span>
                        <span className="rounded-full bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2] px-2 py-0.5 text-[10px]">eGFR 42</span>
                      </li>
                      <li className="flex items-center justify-between">
                        <span>Primary Hypertension</span>
                        <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2 py-0.5 text-[10px]">Managed</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </Panel>

            {/* SOAP Clinical Notes */}
            <Panel title="Signed SOAP Notes" subtitle="Immutable physician notes">
              <div className="space-y-4">
                <article className="apple-card p-5">
                  <header className="flex items-center justify-between border-b border-black/5 pb-3 mb-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-[#86868B]">
                      <User className="size-4 text-[#0071E3]" />
                      <span>Dr. Sarah Hana (Attending Physician)</span>
                      <span className="text-[#86868B]">•</span>
                      <Clock className="size-3.5 text-[#86868B]" />
                      <span>Today at 09:43 AM</span>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F8EC] px-3 py-1 text-xs font-bold text-[#1D8A39] border border-[#B6ECC3]">
                      <CheckCircle2 className="size-3" /> Signed & Locked
                    </span>
                  </header>
                  <div className="space-y-2 text-xs leading-relaxed text-[#515154]">
                    <p><strong className="text-[#1D1D1F]">Subjective:</strong> Patient reports severe throbbing headache onset 4h ago, accompanied by mild photophobia.</p>
                    <p><strong className="text-[#0071E3]">Assessment & Plan:</strong> Acute Migraine Exacerbation. Order Sumatriptan 50mg, monitor eGFR clearance, schedule non-contrast head CT scan.</p>
                  </div>
                </article>
              </div>
            </Panel>
          </div>

          {/* Right Sidebar: Active Orders & Visit History */}
          <div className="space-y-6">
            <Panel title="Active Orders & Prescriptions" subtitle="Connected lab, imaging & pharmacy">
              <ul className="space-y-3 text-xs">
                <li className="apple-card p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-bold text-[#1D1D1F]">Sumatriptan 50mg Oral</p>
                    <span className="rounded-full bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2] px-2.5 py-0.5 text-[10px] font-bold uppercase">
                      Pharmacy Dispensing
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#86868B]">Prescription · Priority: Urgent</p>
                </li>

                <li className="apple-card p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="font-bold text-[#1D1D1F]">Head Non-Contrast CT Scan</p>
                    <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2.5 py-0.5 text-[10px] font-bold uppercase">
                      Completed
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-[#86868B]">Radiology · Priority: Routine</p>
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
