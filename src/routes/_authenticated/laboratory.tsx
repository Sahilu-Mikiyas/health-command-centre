import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FlaskConical,
  Microscope,
  Scan,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { AppShell } from "@/components/hip/app-shell";
import { Panel } from "@/components/hip/panel";
import { StatusPill } from "@/components/hip/status-pill";

export const Route = createFileRoute("/_authenticated/laboratory")({
  head: () => ({
    meta: [
      { title: "Laboratory & Diagnostics | Meridian HIP" },
      {
        name: "description",
        content: "Sample lifecycle tracking, analyzer integration, critical result alerts, and lab trends.",
      },
    ],
  }),
  component: LaboratoryWorkspace,
});

function LaboratoryWorkspace() {
  const [samples, setSamples] = useState([
    {
      id: "SMP-9021",
      patientName: "Elena Rostova",
      mrn: "MRN-8829",
      test: "Comprehensive Metabolic Panel + Renal Panel",
      status: "Resulted",
      priority: "Urgent",
      collectedAt: "10:15 AM",
      analyzer: "Roche Cobas 8000",
      resultSummary: "eGFR 42 mL/min · Creatinine 1.8 mg/dL · K+ 4.2 mmol/L",
    },
    {
      id: "SMP-9022",
      patientName: "Marcus Vance",
      mrn: "MRN-4410",
      test: "Complete Blood Count (CBC) with Differential",
      status: "Processing",
      priority: "Routine",
      collectedAt: "10:45 AM",
      analyzer: "Sysmex XN-1000",
      resultSummary: "Analyzing Leukocytes & Platelets...",
    },
    {
      id: "SMP-9023",
      patientName: "Sophia Chen",
      mrn: "MRN-9021",
      test: "HbA1c Glycated Hemoglobin",
      status: "Received",
      priority: "Routine",
      collectedAt: "11:00 AM",
      analyzer: "Beckman Coulter AU5800",
      resultSummary: "Queued for automated pipetting",
    },
  ]);

  const [activeSample, setActiveSample] = useState(samples[0]);

  return (
    <AppShell
      title="Laboratory & Diagnostics Intelligence"
      subtitle="Sample lifecycle · Automated analyzer telemetry · Critical value escalation"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
            <ShieldCheck className="size-3.5" /> Analyzers Online (3/3)
          </span>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[360px_1fr_340px]">
        {/* Sample Worklist */}
        <div className="space-y-4">
          <Panel title="Active Sample Worklist" subtitle="Real-time lab order queue">
            <div className="space-y-3">
              {samples.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => setActiveSample(sample)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all shadow-2xs ${
                    activeSample.id === sample.id
                      ? "border-indigo-300 bg-indigo-50/50"
                      : "border-slate-200/80 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-indigo-600">{sample.id}</span>
                    <StatusPill status={sample.status === "Resulted" ? "healthy" : "busy"} label={sample.status} />
                  </div>
                  <h4 className="mt-1 font-bold text-slate-900">{sample.patientName}</h4>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">{sample.test}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500 border-t border-slate-100 pt-2">
                    <span>Coll: {sample.collectedAt}</span>
                    <span className="text-slate-700">{sample.analyzer}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Analyzer Health & Status" subtitle="Automated machine telemetry">
            <div className="space-y-3 text-xs font-medium">
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="font-bold text-slate-900">Roche Cobas 8000</p>
                  <p className="text-[11px] text-slate-500">Chemistry & Immunoassay</p>
                </div>
                <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">READY</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="font-bold text-slate-900">Sysmex XN-1000</p>
                  <p className="text-[11px] text-slate-500">Hematology Analyzer</p>
                </div>
                <span className="rounded bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-bold">RUNNING</span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Central Sample Detail & Validation Surface */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-2xl shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Sample Specification</span>
                <h2 className="text-2xl font-black text-slate-900">{activeSample.test}</h2>
                <p className="text-xs font-semibold text-slate-500">Patient: {activeSample.patientName} ({activeSample.mrn})</p>
              </div>
              <Link
                to={`/patients/pat-1`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                View Patient CV
              </Link>
            </div>

            {/* Lifecycle Stages */}
            <div className="mt-6 grid grid-cols-4 gap-2 text-center text-xs font-bold">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                <CheckCircle2 className="size-4 mx-auto mb-1 text-emerald-600" />
                <span>1. Collected</span>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                <CheckCircle2 className="size-4 mx-auto mb-1 text-emerald-600" />
                <span>2. Received</span>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-indigo-800">
                <Activity className="size-4 mx-auto mb-1 text-indigo-600 animate-spin" />
                <span>3. Analyzed</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-600">
                <FileSpreadsheet className="size-4 mx-auto mb-1 text-slate-400" />
                <span>4. Validated</span>
              </div>
            </div>

            {/* Result Table */}
            <div className="mt-6 space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-800">Analyzed Parameters & Telemetry</h4>
              <div className="overflow-hidden rounded-2xl border border-slate-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Analyte</th>
                      <th className="p-3">Value</th>
                      <th className="p-3">Reference Range</th>
                      <th className="p-3">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr>
                      <td className="p-3 font-bold text-slate-900">eGFR (Estimated GFR)</td>
                      <td className="p-3 font-bold text-amber-700 numeric">42 mL/min</td>
                      <td className="p-3 text-slate-500">&gt; 60 mL/min</td>
                      <td className="p-3"><span className="rounded bg-amber-100 text-amber-800 px-2 py-0.5 font-bold">LOW</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Serum Creatinine</td>
                      <td className="p-3 font-bold text-amber-700 numeric">1.8 mg/dL</td>
                      <td className="p-3 text-slate-500">0.7 - 1.3 mg/dL</td>
                      <td className="p-3"><span className="rounded bg-amber-100 text-amber-800 px-2 py-0.5 font-bold">HIGH</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-900">Serum Potassium (K+)</td>
                      <td className="p-3 font-bold text-emerald-700 numeric">4.2 mmol/L</td>
                      <td className="p-3 text-slate-500">3.5 - 5.0 mmol/L</td>
                      <td className="p-3"><span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold">NORMAL</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition-colors cursor-pointer">
                Validate & Sign Off Results into Patient CV Record
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Critical Alert Escalation */}
        <div className="space-y-4">
          <Panel title="Critical Result Escalation" subtitle="Automated clinician notification">
            <div className="space-y-3 text-xs font-medium">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="font-bold text-amber-900">eGFR 42 Notification Sent</p>
                <p className="text-amber-800 mt-1">Notified attending physician (Dr. Sarah Hana) at 10:28 AM.</p>
                <span className="mt-3 inline-flex items-center gap-1 rounded bg-amber-200/80 text-amber-900 px-2 py-0.5 font-bold text-[10px]">
                  Acknowledged by Doctor
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
