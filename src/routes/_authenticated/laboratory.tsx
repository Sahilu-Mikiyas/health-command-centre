import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  Barcode,
  CheckCircle2,
  Clock,
  FileCheck,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  Microscope,
  Printer,
  QrCode,
  Radio,
  RotateCcw,
  Scan,
  ShieldAlert,
  ShieldCheck,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";

export const Route = createFileRoute("/_authenticated/laboratory")({
  head: () => ({
    meta: [
      { title: "Laboratory & Diagnostics | Furii Hospital Prototype" },
      {
        name: "description",
        content:
          "Commercial laboratory technician workspace: sample collection, tube barcode printing, analyzer telemetry, result verification & QC.",
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

type LabTab =
  | "overview"
  | "orders"
  | "collection"
  | "processing"
  | "results"
  | "escalation"
  | "qc"
  | "reports";

function LaboratoryContent() {
  const [activeTab, setActiveTab] = useState<LabTab>("overview");
  const [printedTubeBarcode, setPrintedTubeBarcode] = useState<{
    sampleId: string;
    patientName: string;
    mrn: string;
    tubeType: string;
    testName: string;
  } | null>(null);

  const [samples, setSamples] = useState([
    {
      id: "SMP-9021",
      patientName: "Abebech Tadesse",
      mrn: "MRN-8829",
      test: "Comprehensive Metabolic Panel + Renal Panel",
      status: "Resulted",
      priority: "Urgent",
      collectedAt: "10:15 AM",
      analyzer: "Roche Cobas 8000",
      tube: "SST Gold Top (5mL)",
      resultSummary: "eGFR 42 mL/min · Creatinine 1.8 mg/dL · K+ 4.2 mmol/L",
    },
    {
      id: "SMP-9022",
      patientName: "Dawit Yohannes",
      mrn: "MRN-4410",
      test: "Complete Blood Count (CBC) with Differential",
      status: "Processing",
      priority: "Routine",
      collectedAt: "10:45 AM",
      analyzer: "Sysmex XN-1000",
      tube: "EDTA Purple Top (3mL)",
      resultSummary: "Analyzing Leukocytes & Platelets...",
    },
    {
      id: "SMP-9023",
      patientName: "Tigist Alemu",
      mrn: "MRN-9021",
      test: "HbA1c Glycated Hemoglobin",
      status: "Received",
      priority: "Routine",
      collectedAt: "11:00 AM",
      analyzer: "Beckman Coulter AU5800",
      tube: "Fluoride Gray Top (2mL)",
      resultSummary: "Queued for automated pipetting",
    },
  ]);

  const [activeSample, setActiveSample] = useState(samples[0]!);

  const handleValidateAndSign = () => {
    toast.success(`Lab test ${activeSample.test} validated & signed off into ${activeSample.patientName}'s Executive CV record.`);
  };

  return (
    <AppShell
      title="Laboratory & Diagnostics Mission Control"
      subtitle="Sample lifecycle tracking · Automated analyzer telemetry · Critical value escalation · QC Calibration"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3.5 py-1 text-xs font-bold text-[#1D8A39]">
            <ShieldCheck className="size-3.5" /> Analyzers Online (3/3)
          </span>
        </div>
      }
    >
      {/* Printable Barcode Tube Modal */}
      {printedTubeBarcode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="apple-card max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <span className="text-xs font-black uppercase text-black">Specimen Tube Barcode Label</span>
              <button onClick={() => setPrintedTubeBarcode(null)} className="text-[#86868B] hover:text-black">
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-black/20 bg-[#FAFAFC] p-5 space-y-3">
              <span className="rounded-full bg-black text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                {printedTubeBarcode.tubeType}
              </span>
              <h3 className="text-lg font-extrabold text-black">{printedTubeBarcode.patientName}</h3>
              <p className="text-xs font-semibold text-[#86868B]">{printedTubeBarcode.sampleId} · {printedTubeBarcode.mrn}</p>
              <p className="text-xs font-bold text-black">{printedTubeBarcode.testName}</p>
              <Barcode className="size-16 mx-auto text-black" />
            </div>

            <button
              onClick={() => {
                toast.success("Printed specimen tube label.");
                setPrintedTubeBarcode(null);
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer"
            >
              <Printer className="size-4" /> Print Specimen Tube Label
            </button>
          </div>
        </div>
      )}

      {/* Commercial Sub-Tab Rail */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/5 pb-4 overflow-x-auto">
        {[
          { id: "overview", label: "Lab Dashboard & Telemetry", icon: FlaskConical },
          { id: "orders", label: "Incoming Lab Orders", icon: FileText },
          { id: "collection", label: "Specimen Collection & Barcode", icon: Barcode },
          { id: "processing", label: "Analyzer Processing Queue", icon: Activity },
          { id: "results", label: "Results Entry & Verification", icon: FileCheck },
          { id: "escalation", label: "Critical Value Escalation", icon: ShieldAlert },
          { id: "qc", label: "Quality Control & Calibration", icon: ShieldCheck },
          { id: "reports", label: "Workload Reports", icon: FileSpreadsheet },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as LabTab)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? "bg-black text-white shadow-md scale-105"
                : "bg-white text-[#1D1D1F] border border-black/5 hover:bg-[#F5F5F7]"
            }`}
          >
            <tab.icon className="size-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: LAB DASHBOARD & TELEMETRY */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel className="min-w-0">
              <Stat label="Active Samples" value="3" hint="Real-time queue" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Analyzers Online" value="3 / 3" hint="100% operational" tone="ok" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Critical Alerts" value="1" hint="eGFR 42 Flagged" tone="warn" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Avg Turnaround" value="18 mins" hint="STAT Target < 30m" tone="ok" />
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[360px_1fr_340px]">
            {/* Worklist Panel */}
            <Panel title="Active Sample Worklist" subtitle="Real-time lab order queue">
              <div className="space-y-3">
                {samples.map((sample) => (
                  <div
                    key={sample.id}
                    onClick={() => setActiveSample(sample)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all shadow-2xs ${
                      activeSample.id === sample.id
                        ? "border-black/15 bg-white"
                        : "border-black/5 bg-[#F5F5F7] hover:border-black/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-black">{sample.id}</span>
                      <StatusPill status={sample.status === "Resulted" ? "healthy" : "busy"} label={sample.status} />
                    </div>
                    <h4 className="mt-1 font-bold text-black">{sample.patientName}</h4>
                    <p className="text-xs font-semibold text-[#86868B] mt-0.5">{sample.test}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-[#86868B] border-t border-black/5 pt-2">
                      <span>Coll: {sample.collectedAt}</span>
                      <span className="text-[#515154] font-bold">{sample.analyzer}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Central Sample Detail & Validation Surface */}
            <Panel title="Sample Specification & Telemetry" subtitle={`Patient: ${activeSample.patientName} (${activeSample.mrn})`}>
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-black/5 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Order Name</span>
                    <h3 className="text-xl font-black text-black">{activeSample.test}</h3>
                  </div>
                  <button
                    onClick={() =>
                      setPrintedTubeBarcode({
                        sampleId: activeSample.id,
                        patientName: activeSample.patientName,
                        mrn: activeSample.mrn,
                        tubeType: activeSample.tube,
                        testName: activeSample.test,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-black px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Barcode className="size-3.5" /> Tube Barcode
                  </button>
                </div>

                {/* Lifecycle Stages */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
                  <div className="rounded-xl border border-[#B6ECC3] bg-[#E8F8EC] p-3 text-[#1D8A39]">
                    <CheckCircle2 className="size-4 mx-auto mb-1 text-[#1D8A39]" />
                    <span>1. Collected</span>
                  </div>
                  <div className="rounded-xl border border-[#B6ECC3] bg-[#E8F8EC] p-3 text-[#1D8A39]">
                    <CheckCircle2 className="size-4 mx-auto mb-1 text-[#1D8A39]" />
                    <span>2. Received</span>
                  </div>
                  <div className="rounded-xl border border-black/10 bg-[#E8E8ED] p-3 text-black">
                    <Activity className="size-4 mx-auto mb-1 text-black animate-spin" />
                    <span>3. Analyzed</span>
                  </div>
                  <div className="rounded-xl border border-black/5 bg-[#F5F5F7] p-3 text-[#86868B]">
                    <FileSpreadsheet className="size-4 mx-auto mb-1 text-[#86868B]" />
                    <span>4. Validated</span>
                  </div>
                </div>

                {/* Result Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-black">Analyzed Parameters & Telemetry</h4>
                  <div className="overflow-x-auto rounded-2xl border border-black/5">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAFAFC] text-[#86868B] font-extrabold uppercase tracking-wider border-b border-black/5">
                        <tr>
                          <th className="p-3">Analyte</th>
                          <th className="p-3">Value</th>
                          <th className="p-3">Reference Range</th>
                          <th className="p-3">Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/5 font-semibold text-[#1D1D1F]">
                        <tr>
                          <td className="p-3 font-bold text-black">eGFR (Estimated GFR)</td>
                          <td className="p-3 font-bold text-[#B86200] numeric">42 mL/min</td>
                          <td className="p-3 text-[#86868B]">&gt; 60 mL/min</td>
                          <td className="p-3"><span className="rounded-full bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2] px-2 py-0.5 text-[10px] font-bold">LOW</span></td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-black">Serum Creatinine</td>
                          <td className="p-3 font-bold text-[#B86200] numeric">1.8 mg/dL</td>
                          <td className="p-3 text-[#86868B]">0.7 - 1.3 mg/dL</td>
                          <td className="p-3"><span className="rounded-full bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2] px-2 py-0.5 text-[10px] font-bold">HIGH</span></td>
                        </tr>
                        <tr>
                          <td className="p-3 font-bold text-black">Serum Potassium (K+)</td>
                          <td className="p-3 font-bold text-[#1D8A39] numeric">4.2 mmol/L</td>
                          <td className="p-3 text-[#86868B]">3.5 - 5.0 mmol/L</td>
                          <td className="p-3"><span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2 py-0.5 text-[10px] font-bold">NORMAL</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <button
                    onClick={handleValidateAndSign}
                    className="w-full rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer scale-105"
                  >
                    Validate & Sign Off Results into Patient CV Record
                  </button>
                </div>
              </div>
            </Panel>

            {/* Right Sidebar: Analyzer Health & Status */}
            <Panel title="Analyzer Health & Status" subtitle="Automated machine telemetry">
              <div className="space-y-3 text-xs font-semibold">
                <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#F5F5F7] p-3.5">
                  <div>
                    <p className="font-bold text-black">Roche Cobas 8000</p>
                    <p className="text-[11px] text-[#86868B]">Chemistry & Immunoassay</p>
                  </div>
                  <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2.5 py-0.5 text-[10px] font-bold">READY</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#F5F5F7] p-3.5">
                  <div>
                    <p className="font-bold text-black">Sysmex XN-1000</p>
                    <p className="text-[11px] text-[#86868B]">Hematology Analyzer</p>
                  </div>
                  <span className="rounded-full bg-[#E8E8ED] text-black border border-black/10 px-2.5 py-0.5 text-[10px] font-bold">RUNNING</span>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: INCOMING LAB ORDERS */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <Panel title="Incoming Physician Laboratory Orders" subtitle="Physician orders sent from Doctor Workspace">
            <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
              <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#F5F5F7] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-black text-sm">Comprehensive Metabolic Panel + Renal Function</p>
                    <span className="rounded-full bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2] px-2.5 py-0.5 text-[10px] font-bold">
                      STAT Urgent
                    </span>
                  </div>
                  <p className="text-[#86868B] mt-0.5">Patient: Abebech Tadesse (MRN-8829) · Ordered by Dr. Bethlehem Tadesse</p>
                </div>

                <button
                  onClick={() => toast.success("Specimen collection queued for Abebech Tadesse.")}
                  className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-2xs"
                >
                  Accept & Queue Collection
                </button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 3: SPECIMEN COLLECTION & BARCODE */}
      {activeTab === "collection" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="Specimen Collection & Tube Barcode Printing" subtitle="Print specimen barcode stickers for phlebotomy">
            <div className="space-y-4">
              {samples.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#FAFAFC] p-4">
                  <div>
                    <p className="font-extrabold text-black text-sm">{s.patientName} ({s.mrn})</p>
                    <p className="text-xs font-medium text-[#86868B]">{s.test} · Tube: {s.tube}</p>
                  </div>

                  <button
                    onClick={() =>
                      setPrintedTubeBarcode({
                        sampleId: s.id,
                        patientName: s.patientName,
                        mrn: s.mrn,
                        tubeType: s.tube,
                        testName: s.test,
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    <Barcode className="size-4" /> Print Tube Barcode
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 4: ANALYZER PROCESSING QUEUE */}
      {activeTab === "processing" && (
        <div className="space-y-6">
          <Panel title="Analyzer Machine Queue & Telemetry" subtitle="Automated sample pipetting and run status">
            <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-black">Roche Cobas 8000 — Rack #04</span>
                  <span className="rounded-full bg-[#E8E8ED] text-black border border-black/10 px-2.5 py-0.5 text-[10px] font-bold">
                    Analyzing (Run #884)
                  </span>
                </div>
                <p className="text-[#86868B]">Sample: SMP-9021 (Abebech Tadesse) · Est. Completion: 3 mins</p>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 5: RESULTS ENTRY & VERIFICATION */}
      {activeTab === "results" && (
        <div className="mx-auto max-w-4xl space-y-6">
          <Panel title="Result Verification & Sign-off" subtitle="2-Step clinical laboratory sign-off">
            <div className="space-y-4 text-xs font-semibold text-black">
              <div className="rounded-2xl bg-[#FAFAFC] border border-black/5 p-4 space-y-3">
                <h4 className="font-bold text-black text-sm">SMP-9021 — Abebech Tadesse (MRN-8829)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div><span className="text-[#86868B] text-[10px] block">eGFR</span><strong className="text-[#B86200]">42 mL/min (LOW)</strong></div>
                  <div><span className="text-[#86868B] text-[10px] block">Creatinine</span><strong className="text-[#B86200]">1.8 mg/dL (HIGH)</strong></div>
                  <div><span className="text-[#86868B] text-[10px] block">Potassium</span><strong className="text-[#1D8A39]">4.2 mmol/L (NORMAL)</strong></div>
                </div>
                <button
                  onClick={handleValidateAndSign}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <FileCheck className="size-4" /> Sign Off Results to Patient Medical Record
                </button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 6: CRITICAL VALUE ESCALATION */}
      {activeTab === "escalation" && (
        <div className="mx-auto max-w-2xl space-y-6">
          <Panel title="Critical Result Escalation Log" subtitle="Automated alert dispatch to attending physicians">
            <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
              <div className="rounded-2xl border border-[#FFE0B2] bg-[#FFF4E5] p-4">
                <p className="font-bold text-[#B86200] text-sm">⚠️ Critical Alert: eGFR 42 mL/min (Abebech Tadesse)</p>
                <p className="text-[#B86200] mt-1">Notified attending physician (Dr. Bethlehem Tadesse) at 10:28 AM via priority notification.</p>
                <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#FFE0B2] text-[#B86200] px-3 py-0.5 font-bold text-[10px]">
                  ✓ Acknowledged by Dr. Bethlehem Tadesse
                </span>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 7: QUALITY CONTROL & CALIBRATION */}
      {activeTab === "qc" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="Analyzer Quality Control & Calibration" subtitle="Machine calibration logs">
            <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
              <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#FAFAFC] p-4">
                <div>
                  <p className="font-bold text-black text-sm">Roche Cobas 8000 — Calibration QC Pass</p>
                  <p className="text-[#86868B]">Daily Control Lot #QC-99201 · Deviation &lt; 0.2 SD</p>
                </div>
                <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-3 py-1 text-xs font-bold">
                  QC PASSED
                </span>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 8: WORKLOAD REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <Panel title="Daily Workload & Analytics Summary" subtitle="Lab throughput metrics">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Tests Processed Today</span>
                <p className="text-2xl font-black text-black numeric">142 Tests</p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Critical Values Flagged</span>
                <p className="text-2xl font-black text-[#B86200] numeric">4 Criticals</p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Average Turnaround Time</span>
                <p className="text-2xl font-black text-[#1D8A39] numeric">18 Minutes</p>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
