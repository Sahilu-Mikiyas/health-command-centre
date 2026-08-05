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
import { RouteGuard } from "@/components/hip/route-guard";
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
  return (
    <RouteGuard route="/laboratory">
      <LaboratoryContent />
    </RouteGuard>
  );
}

function LaboratoryContent() {
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
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F8EC] px-3 py-1 text-xs font-bold text-[#1D8A39] border border-[#B6ECC3] truncate">
            <ShieldCheck className="size-3.5 shrink-0" /> Analyzers Online (3/3)
          </span>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[360px_1fr_340px] min-w-0">
        {/* Sample Worklist */}
        <div className="space-y-4 min-w-0">
          <Panel title="Active Sample Worklist" subtitle="Real-time lab order queue">
            <div className="space-y-3 min-w-0">
              {samples.map((sample) => (
                <div
                  key={sample.id}
                  onClick={() => setActiveSample(sample)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all shadow-2xs min-w-0 ${
                    activeSample?.id === sample.id
                      ? "border-black/15 bg-white"
                      : "border-black/5 bg-[#F5F5F7] hover:border-black/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-xs font-extrabold text-black truncate">{sample.id}</span>
                    <StatusPill status={sample.status === "Resulted" ? "healthy" : "busy"} label={sample.status} />
                  </div>
                  <h4 className="mt-1 font-bold text-black truncate">{sample.patientName}</h4>
                  <p className="text-xs font-semibold text-[#86868B] mt-0.5 truncate">{sample.test}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-[#86868B] border-t border-black/5 pt-2 gap-2 min-w-0">
                    <span className="truncate">Coll: {sample.collectedAt}</span>
                    <span className="text-[#515154] truncate">{sample.analyzer}</span>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Analyzer Health & Status" subtitle="Automated machine telemetry">
            <div className="space-y-3 text-xs font-medium min-w-0">
              <div className="flex items-center justify-between rounded-xl border border-black/5 bg-[#F5F5F7] p-3 gap-2 min-w-0">
                <div className="min-w-0">
                  <p className="font-bold text-black truncate">Roche Cobas 8000</p>
                  <p className="text-[11px] text-[#86868B] truncate">Chemistry & Immunoassay</p>
                </div>
                <span className="rounded bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2 py-0.5 text-[10px] font-bold shrink-0">READY</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-black/5 bg-[#F5F5F7] p-3 gap-2 min-w-0">
                <div className="min-w-0">
                  <p className="font-bold text-black truncate">Sysmex XN-1000</p>
                  <p className="text-[11px] text-[#86868B] truncate">Hematology Analyzer</p>
                </div>
                <span className="rounded bg-[#E8E8ED] text-black border border-black/10 px-2 py-0.5 text-[10px] font-bold shrink-0">RUNNING</span>
              </div>
            </div>
          </Panel>
        </div>

        {/* Central Sample Detail & Validation Surface */}
        <div className="space-y-6 min-w-0">
          <div className="apple-card p-6 min-w-0">
            <div className="flex items-center justify-between border-b border-black/5 pb-4 gap-4 min-w-0">
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-black block truncate">Sample Specification</span>
                <h2 className="text-2xl font-black text-black truncate">{activeSample?.test ?? ""}</h2>
                <p className="text-xs font-semibold text-[#86868B] truncate">Patient: {activeSample?.patientName ?? ""} ({activeSample?.mrn ?? ""})</p>
              </div>
              <Link
                to="/patients/$patientId"
                params={{ patientId: "pat-1" }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-xs font-bold text-black hover:bg-black/5 shadow-2xs shrink-0"
              >
                View Patient CV
              </Link>
            </div>

            {/* Lifecycle Stages */}
            <div className="mt-6 grid grid-cols-4 gap-2 text-center text-xs font-bold min-w-0">
              <div className="rounded-xl border border-[#B6ECC3] bg-[#E8F8EC] p-3 text-[#1D8A39] min-w-0">
                <CheckCircle2 className="size-4 mx-auto mb-1 text-[#34C759] shrink-0" />
                <span className="truncate block">1. Collected</span>
              </div>
              <div className="rounded-xl border border-[#B6ECC3] bg-[#E8F8EC] p-3 text-[#1D8A39] min-w-0">
                <CheckCircle2 className="size-4 mx-auto mb-1 text-[#34C759] shrink-0" />
                <span className="truncate block">2. Received</span>
              </div>
              <div className="rounded-xl border border-black/10 bg-[#E8E8ED] p-3 text-black min-w-0">
                <Activity className="size-4 mx-auto mb-1 text-black animate-spin shrink-0" />
                <span className="truncate block">3. Analyzed</span>
              </div>
              <div className="rounded-xl border border-black/5 bg-[#F5F5F7] p-3 text-[#86868B] min-w-0">
                <FileSpreadsheet className="size-4 mx-auto mb-1 text-[#86868B] shrink-0" />
                <span className="truncate block">4. Validated</span>
              </div>
            </div>

            {/* Result Table */}
            <div className="mt-6 space-y-4 min-w-0">
              <h4 className="text-sm font-bold uppercase tracking-wider text-black truncate">Analyzed Parameters & Telemetry</h4>
              <div className="overflow-x-auto rounded-2xl border border-black/5 min-w-0">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F5F5F7] text-[#86868B] font-bold uppercase tracking-wider border-b border-black/5">
                    <tr>
                      <th className="p-3">Analyte</th>
                      <th className="p-3">Value</th>
                      <th className="p-3">Reference Range</th>
                      <th className="p-3">Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 font-medium">
                    <tr>
                      <td className="p-3 font-bold text-black truncate">eGFR (Estimated GFR)</td>
                      <td className="p-3 font-bold text-[#B86200] numeric">42 mL/min</td>
                      <td className="p-3 text-[#86868B]">&gt; 60 mL/min</td>
                      <td className="p-3"><span className="rounded bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2] px-2 py-0.5 font-bold">LOW</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-black truncate">Serum Creatinine</td>
                      <td className="p-3 font-bold text-[#B86200] numeric">1.8 mg/dL</td>
                      <td className="p-3 text-[#86868B]">0.7 - 1.3 mg/dL</td>
                      <td className="p-3"><span className="rounded bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2] px-2 py-0.5 font-bold">HIGH</span></td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-black truncate">Serum Potassium (K+)</td>
                      <td className="p-3 font-bold text-[#1D8A39] numeric">4.2 mmol/L</td>
                      <td className="p-3 text-[#86868B]">3.5 - 5.0 mmol/L</td>
                      <td className="p-3"><span className="rounded bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2 py-0.5 font-bold">NORMAL</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <button className="w-full rounded-2xl bg-black py-3 text-sm font-bold text-white shadow-md hover:bg-[#1D1D1F] transition-colors cursor-pointer truncate">
                Validate & Sign Off Results into Patient CV Record
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Critical Alert Escalation */}
        <div className="space-y-4 min-w-0">
          <Panel title="Critical Result Escalation" subtitle="Automated clinician notification">
            <div className="space-y-3 text-xs font-medium min-w-0">
              <div className="rounded-2xl border border-[#FFE0B2] bg-[#FFF4E5] p-4 min-w-0">
                <p className="font-bold text-[#B86200] truncate">eGFR 42 Notification Sent</p>
                <p className="text-[#B86200] mt-1">Notified attending physician (Dr. Sarah Hana) at 10:28 AM.</p>
                <span className="mt-3 inline-flex items-center gap-1 rounded bg-[#FFE0B2]/80 text-[#B86200] px-2 py-0.5 font-bold text-[10px] truncate">
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
