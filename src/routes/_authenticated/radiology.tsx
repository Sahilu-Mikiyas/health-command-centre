import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Layers,
  Maximize2,
  Mic,
  Printer,
  QrCode,
  Radio,
  Scan,
  ShieldAlert,
  ShieldCheck,
  Sun,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";

export const Route = createFileRoute("/_authenticated/radiology")({
  head: () => ({
    meta: [
      { title: "Radiology & Imaging PACS | Furii Hospital Prototype" },
      {
        name: "description",
        content:
          "Commercial radiology workspace: imaging orders, DICOM PACS viewer, contrast safety, AI findings & radiologist dictation.",
      },
    ],
  }),
  component: RadiologyWorkspace,
});

function RadiologyWorkspace() {
  return (
    <RouteGuard route="/radiology">
      <RadiologyContent />
    </RouteGuard>
  );
}

type RadTab =
  | "overview"
  | "orders"
  | "scheduling"
  | "acquisition"
  | "pacs"
  | "findings"
  | "reports";

function RadiologyContent() {
  const [activeTab, setActiveTab] = useState<RadTab>("overview");
  const [selectedScan, setSelectedScan] = useState({
    id: "RAD-8821",
    patientName: "Abebech Tadesse",
    mrn: "MRN-8829",
    modality: "CT Head Non-Contrast",
    bodyPart: "Brain / Neuro",
    priority: "Urgent",
    doctor: "Dr. Bethlehem Tadesse",
    status: "Images Acquired",
    egfr: 42,
    slices: 64,
  });

  // DICOM Viewer Interactive Controls
  const [zoomLevel, setZoomLevel] = useState(100);
  const [contrastWindow, setContrastWindow] = useState("Brain Window (W:80 L:40)");
  const [aiOverlay, setAiOverlay] = useState(true);
  const [isDictating, setIsDictating] = useState(false);
  const [radiologyReportText, setRadiologyReportText] = useState(
    "FINDINGS: Head CT scan non-contrast performed. No evidence of acute intracranial hemorrhage, mass effect, or midline shift. Ventricles and sulci within normal limits for age. IMPRESSION: Normal head CT."
  );

  const handleStartDictation = () => {
    setIsDictating(true);
    toast.success("Voice dictation active. Listening...");
    setTimeout(() => {
      setIsDictating(false);
      toast.success("Voice dictation transcribed into radiology report.");
    }, 2000);
  };

  const handleSignReport = () => {
    toast.success(`Signed radiology report for ${selectedScan.patientName}. Published to DICOM PACS & Executive CV.`);
  };

  return (
    <AppShell
      title="Radiology & Imaging PACS Mission Control"
      subtitle="DICOM PACS Viewer · AI CAD Findings · Contrast Safety Guard · Radiologist Dictation"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5F1FF] border border-[#B8DAFF] px-3.5 py-1 text-xs font-bold text-[#0066CC]">
            <Zap className="size-3.5" /> PACS Server 100% Online
          </span>
        </div>
      }
    >
      {/* Commercial Sub-Tab Rail */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/5 pb-4 overflow-x-auto">
        {[
          { id: "overview", label: "Imaging Dashboard & Equipment", icon: Scan },
          { id: "orders", label: "Imaging Orders Queue", icon: FileText },
          { id: "scheduling", label: "Scan Scheduling & Contrast Safety", icon: Clock },
          { id: "acquisition", label: "Image Acquisition & Upload", icon: Radio },
          { id: "pacs", label: "Interactive DICOM PACS Viewer", icon: Eye },
          { id: "findings", label: "AI Findings & Dictation", icon: Mic },
          { id: "reports", label: "Radiation Dose & Reports", icon: FileSpreadsheet },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as RadTab)}
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

      {/* SUB-TAB 1: IMAGING DASHBOARD & EQUIPMENT */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel className="min-w-0">
              <Stat label="Scans Today" value="28" hint="12 CT · 10 X-Ray · 6 MRI" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Urgent Studies" value="3" hint="Head CT STAT" tone="warn" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="AI CAD Findings Ready" value="2" hint="Auto-scanned" tone="ok" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Equipment Operational" value="4 / 4" hint="100% Uptime" tone="ok" />
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            {/* Active Imaging Queue */}
            <Panel title="Active Radiology Worklist" subtitle="Scheduled & acquired scans">
              <div className="space-y-3">
                {[
                  { id: "RAD-8821", name: "Abebech Tadesse", mrn: "MRN-8829", mod: "CT Head Non-Contrast", priority: "Urgent", status: "Acquired" },
                  { id: "RAD-8822", name: "Dawit Yohannes", mrn: "MRN-4410", mod: "Chest X-Ray PA/Lateral", priority: "Routine", status: "Scheduled" },
                  { id: "RAD-8823", name: "Tigist Alemu", mrn: "MRN-9021", mod: "Lumbar Spine MRI 3T", priority: "Routine", status: "Processing" },
                ].map((scan) => (
                  <div key={scan.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#F5F5F7] p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-black text-sm">{scan.name}</span>
                        <StatusPill status={scan.priority === "Urgent" ? "busy" : "healthy"} label={scan.priority} />
                      </div>
                      <p className="text-xs font-semibold text-[#86868B] mt-0.5">{scan.mod} · {scan.mrn}</p>
                    </div>

                    <button
                      onClick={() => setActiveTab("pacs")}
                      className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                    >
                      <Eye className="size-4" /> Open in DICOM Viewer
                    </button>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Equipment Telemetry */}
            <Panel title="Radiology Equipment Telemetry" subtitle="Live machine status">
              <div className="space-y-3 text-xs font-semibold">
                <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#FAFAFC] p-3.5">
                  <div>
                    <p className="font-bold text-black">128-Slice CT Scanner</p>
                    <p className="text-[11px] text-[#86868B]">Tube Temp: 38°C · Ready</p>
                  </div>
                  <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2.5 py-0.5 text-[10px] font-bold">READY</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#FAFAFC] p-3.5">
                  <div>
                    <p className="font-bold text-black">3.0 Tesla MRI System</p>
                    <p className="text-[11px] text-[#86868B]">Helium Level: 98% · Scanning</p>
                  </div>
                  <span className="rounded-full bg-[#E8E8ED] text-black border border-black/10 px-2.5 py-0.5 text-[10px] font-bold">ACTIVE</span>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: IMAGING ORDERS QUEUE */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <Panel title="Incoming Physician Radiology Requests" subtitle="Orders from Doctor Workspace">
            <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
              <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#F5F5F7] p-4">
                <div>
                  <p className="font-extrabold text-black text-sm">CT Head Non-Contrast (Neuro)</p>
                  <p className="text-[#86868B] mt-0.5">Patient: Abebech Tadesse (MRN-8829) · Ordered by Dr. Bethlehem Tadesse</p>
                </div>
                <button
                  onClick={() => toast.success("Order accepted. Scheduled for CT Suite 1.")}
                  className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                >
                  Accept & Schedule Scan
                </button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 3: SCAN SCHEDULING & CONTRAST SAFETY */}
      {activeTab === "scheduling" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="Scan Scheduling & Contrast Safety Guard" subtitle="Renal safety check prior to IV Contrast">
            <div className="space-y-4 text-xs font-semibold text-black">
              <div className="rounded-2xl border border-[#FFE0B2] bg-[#FFF4E5] p-4 space-y-2">
                <span className="font-bold text-[#B86200] flex items-center gap-1.5 text-sm">
                  <ShieldAlert className="size-4" /> eGFR Contrast Safety Warning
                </span>
                <p className="text-[#B86200]">
                  Patient <strong>Abebech Tadesse</strong> has eGFR = 42 mL/min (Stage 3a CKD). Ensure non-contrast protocol or pre-hydration if IV Iodine contrast is required.
                </p>
              </div>

              <div className="rounded-2xl border border-black/5 bg-[#FAFAFC] p-4 flex items-center justify-between">
                <div>
                  <p className="font-extrabold text-black text-sm">CT Suite 1 — Slot 11:30 AM</p>
                  <p className="text-xs text-[#86868B]">Abebech Tadesse · Protocol: Non-Contrast Brain CT</p>
                </div>
                <button
                  onClick={() => toast.success("Patient prepped for CT scan.")}
                  className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 cursor-pointer"
                >
                  Confirm Patient Prep
                </button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 4: IMAGE ACQUISITION & UPLOAD */}
      {activeTab === "acquisition" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="Image Acquisition & DICOM PACS Upload" subtitle="64-Slice series acquisition">
            <div className="space-y-4 text-xs font-semibold text-[#1D1D1F]">
              <div className="rounded-2xl border border-black/5 bg-[#FAFAFC] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-black text-sm">Series: Axial Brain 2.5mm</span>
                  <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2.5 py-0.5 text-[10px] font-bold">
                    Acquired (64 Images)
                  </span>
                </div>
                <p className="text-[#86868B]">Modal: CT · Scanner: 128-Slice CT Suite 1 · Exposure: 120 kV, 200 mAs</p>

                <button
                  onClick={() => {
                    toast.success("64 DICOM Slices uploaded to PACS server.");
                    setActiveTab("pacs");
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer"
                >
                  <Radio className="size-4" /> Push to DICOM PACS Server & Open Viewer
                </button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 5: INTERACTIVE DICOM PACS VIEWER */}
      {activeTab === "pacs" && (
        <div className="space-y-6">
          <Panel title="Interactive DICOM PACS Image Viewer" subtitle="High-resolution slice inspection & windowing controls">
            <div className="space-y-4">
              {/* Viewer Control Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-3 text-xs font-bold text-black">
                <div className="flex items-center gap-2">
                  <span className="text-[#86868B]">Window Preset:</span>
                  <select
                    value={contrastWindow}
                    onChange={(e) => setContrastWindow(e.target.value)}
                    className="rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1 text-xs font-bold text-black"
                  >
                    <option value="Brain Window (W:80 L:40)">Brain Window (W:80 L:40)</option>
                    <option value="Bone Window (W:2000 L:500)">Bone Window (W:2000 L:500)</option>
                    <option value="Subdural Window (W:150 L:50)">Subdural Window (W:150 L:50)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(80, z - 10))}
                    className="rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1 text-xs font-bold hover:bg-white"
                  >
                    Zoom -
                  </button>
                  <span className="text-black numeric">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(160, z + 10))}
                    className="rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1 text-xs font-bold hover:bg-white"
                  >
                    Zoom +
                  </button>
                  <button
                    onClick={() => setAiOverlay(!aiOverlay)}
                    className={`rounded-xl border px-3 py-1 text-xs font-bold transition-all ${
                      aiOverlay ? "bg-black text-white" : "bg-[#F5F5F7] text-black"
                    }`}
                  >
                    AI Overlay: {aiOverlay ? "ON" : "OFF"}
                  </button>
                </div>
              </div>

              {/* Simulated High-Res DICOM Screen Canvas */}
              <div className="relative grid place-items-center rounded-3xl bg-black p-8 text-white min-h-[380px] overflow-hidden shadow-2xl">
                <div
                  className="transition-transform duration-200 text-center space-y-4"
                  style={{ transform: `scale(${zoomLevel / 100})` }}
                >
                  <div className="relative grid size-64 place-items-center rounded-full border-4 border-slate-700 bg-slate-900 mx-auto shadow-inner">
                    <div className="absolute inset-4 rounded-full border border-slate-600 bg-slate-800/80 flex items-center justify-center">
                      <span className="text-xs font-mono text-slate-400">Axial CT Brain Slice #32/64</span>
                    </div>

                    {aiOverlay && (
                      <div className="absolute inset-16 rounded-full border-2 border-emerald-400/60 bg-emerald-500/10 animate-pulse flex items-center justify-center">
                        <span className="text-[10px] font-bold text-emerald-300">✓ AI CAD: No Bleed</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs font-mono text-slate-400">
                    Patient: Abebech Tadesse · {contrastWindow} · Slice 32/64
                  </p>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 6: AI FINDINGS & DICTATION */}
      {activeTab === "findings" && (
        <div className="mx-auto max-w-4xl space-y-6">
          <Panel title="Radiologist Report & Voice Dictation" subtitle="AI CAD suggestions & formal sign-off">
            <div className="space-y-5 text-xs font-semibold text-black">
              {/* AI CAD Findings Box */}
              <div className="rounded-2xl border border-[#B6ECC3] bg-[#E8F8EC] p-4 space-y-2">
                <span className="font-bold text-[#1D8A39] flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="size-4" /> AI Computer-Assisted Diagnosis (CAD) Summary
                </span>
                <p className="text-[#1D8A39]">
                  No acute intracranial hemorrhage, mass effect, or midline shift. Ventricles and sulci are within normal age limits. Confidence: 99.4%.
                </p>
              </div>

              {/* Dictation Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Radiology Report Text
                  </label>
                  <button
                    onClick={handleStartDictation}
                    disabled={isDictating}
                    className="inline-flex items-center gap-1.5 rounded-full bg-black px-3.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 cursor-pointer"
                  >
                    <Mic className={`size-3.5 ${isDictating ? "animate-pulse text-red-400" : ""}`} />
                    <span>{isDictating ? "Listening Dictation..." : "Voice Dictation"}</span>
                  </button>
                </div>

                <textarea
                  rows={4}
                  value={radiologyReportText}
                  onChange={(e) => setRadiologyReportText(e.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black"
                />
              </div>

              <button
                onClick={handleSignReport}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer scale-105"
              >
                <FileCheck className="size-4" /> Sign Off Radiology Report & Publish to PACS
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 7: RADIATION DOSE & REPORTS */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <Panel title="Radiation Dose Tracker & Workload Summary" subtitle="Safety compliance logs">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Scans Completed Today</span>
                <p className="text-2xl font-black text-black numeric">28 Scans</p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Average Radiation Dose</span>
                <p className="text-2xl font-black text-[#1D8A39] numeric">1.8 mGy (Optimal)</p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Report Turnaround Time</span>
                <p className="text-2xl font-black text-black numeric">14 Minutes</p>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
