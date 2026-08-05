import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  Info,
  Pill,
  QrCode,
  RotateCw,
  Scan,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { AppShell } from "@/components/hip/app-shell";
import { Panel } from "@/components/hip/panel";
import { StatusPill } from "@/components/hip/status-pill";

export const Route = createFileRoute("/_authenticated/pharmacy")({
  head: () => ({
    meta: [
      { title: "AI Pharmacy & Dispensing | Meridian HIP" },
      {
        name: "description",
        content: "Mission control for medication safety: AI safety engine, eGFR warnings, interaction map, scan-verify ring.",
      },
    ],
  }),
  component: PharmacyWorkspace,
});

type Step = "idle" | "scanning" | "verified" | "dispensed";

function PharmacyWorkspace() {
  const [selectedRx, setSelectedRx] = useState({
    id: "rx-101",
    patientName: "Elena Rostova",
    mrn: "MRN-8829",
    doctor: "Dr. Sarah Hana",
    medication: "Sumatriptan 50mg Oral Tablets",
    dosage: "50mg once at onset of severe migraine",
    quantity: "6 Tablets",
    batch: "B-9942A",
    expiry: "2028-11",
    egfr: 42,
    allergyAlert: false,
    kidneyWarning: true,
    interactionScore: "Low Risk",
    diagnosis: "Acute Migraine Exacerbation",
  });

  const [scanStep, setScanStep] = useState<Step>("idle");
  const [scanProgress, setScanProgress] = useState(0);

  const startScanAndVerify = () => {
    setScanStep("scanning");
    setScanProgress(20);
    setTimeout(() => setScanProgress(50), 600);
    setTimeout(() => setScanProgress(80), 1200);
    setTimeout(() => {
      setScanProgress(100);
      setScanStep("verified");
    }, 1800);
  };

  const confirmDispense = () => {
    setScanStep("dispensed");
  };

  return (
    <AppShell
      title="Pharmacy Mission Control & AI Dispensing"
      subtitle="Medication intelligence · 5-Point Scan-Verify ring · eGFR Renal Guard · Expiry heatmaps"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 border border-purple-500/30 px-3.5 py-1 text-xs font-extrabold text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Zap className="size-3.5" /> AI Safety Guard Active
          </span>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[340px_1fr_360px]">
        {/* Incoming Prescriptions Queue */}
        <div className="space-y-4">
          <Panel title="Incoming Prescriptions" subtitle="Live prescription task queue">
            <div className="space-y-3">
              <div
                onClick={() => setSelectedRx({
                  id: "rx-101",
                  patientName: "Elena Rostova",
                  mrn: "MRN-8829",
                  doctor: "Dr. Sarah Hana",
                  medication: "Sumatriptan 50mg Oral Tablets",
                  dosage: "50mg once at onset of severe migraine",
                  quantity: "6 Tablets",
                  batch: "B-9942A",
                  expiry: "2028-11",
                  egfr: 42,
                  allergyAlert: false,
                  kidneyWarning: true,
                  interactionScore: "Low Risk",
                  diagnosis: "Acute Migraine Exacerbation",
                })}
                className="group cursor-pointer rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-4 transition-all hover:border-indigo-500 shadow-lg glow-indigo"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white">Elena Rostova</p>
                  <StatusPill status="busy" label="Urgent" />
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-300">Sumatriptan 50mg · Dr. Sarah Hana</p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold border-t border-indigo-500/20 pt-2">
                  <span className="text-slate-400">MRN-8829</span>
                  <span className="text-amber-400">⚠️ eGFR 42 Alert</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition-all hover:border-white/20 opacity-80">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-200">Marcus Vance</p>
                  <StatusPill status="healthy" label="Routine" />
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-400">Amoxicillin 500mg · Dr. K. Miller</p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-400 border-t border-white/10 pt-2">
                  <span>MRN-4410</span>
                  <span className="text-emerald-400">✓ Safety Cleared</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition-all hover:border-white/20 opacity-80">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-200">Sophia Chen</p>
                  <StatusPill status="healthy" label="Routine" />
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-400">Metformin 500mg ER · Dr. H. Vance</p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-400 border-t border-white/10 pt-2">
                  <span>MRN-9021</span>
                  <span className="text-emerald-400">✓ In Stock</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Warehouse Inventory Preview */}
          <Panel title="Warehouse Expiry Heatmap" subtitle="Shelf zone tracking">
            <div className="space-y-4 text-xs font-semibold text-slate-300">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>30-Day Expiry Zone</span>
                  <span className="rounded-md bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 font-bold">4 Items</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-rose-500" style={{ width: "25%" }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>60-Day Expiry Zone</span>
                  <span className="rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 font-bold">12 Items</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-amber-500" style={{ width: "55%" }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>90+ Day Stable Zone</span>
                  <span className="rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 font-bold">140 Items</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full bg-emerald-400" style={{ width: "90%" }} />
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Central Workspace: Prescription Detail & Scan Verification Ring */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-400">Active Dispensing Workspace</span>
                <h2 className="text-2xl font-black text-white">{selectedRx.patientName}</h2>
                <p className="text-xs font-semibold text-slate-400">{selectedRx.diagnosis} · Prescribed by {selectedRx.doctor}</p>
              </div>
              <Link
                to="/patients/pat-1"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-slate-800 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-all shadow-md"
              >
                <Eye className="size-3.5" /> View Executive CV
              </Link>
            </div>

            {/* Smart Medication Card */}
            <div className="mt-6 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-950/60 to-purple-950/40 p-5 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30">
                    <Pill className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{selectedRx.medication}</h3>
                    <p className="text-xs font-semibold text-slate-300">Dosage: {selectedRx.dosage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs font-extrabold">
                    Stock: 480 Available
                  </span>
                  <p className="mt-1.5 text-[11px] font-semibold text-slate-400">Batch {selectedRx.batch} · Exp {selectedRx.expiry}</p>
                </div>
              </div>
            </div>

            {/* Scan and Verify Workflow Ring */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-6 text-center shadow-inner">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-400 mb-1">5-Point Scan & Verification Ring</h4>
              <p className="text-xs font-semibold text-slate-400 mb-6">Barcoding · Batch Verification · Expiry Check · Dose Safety</p>

              <div className="flex flex-col items-center justify-center">
                {scanStep === "idle" && (
                  <div className="space-y-4">
                    <div className="grid size-28 place-items-center rounded-full bg-indigo-500/10 border-4 border-indigo-500/40 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                      <QrCode className="size-12 text-indigo-400" />
                    </div>
                    <button
                      onClick={startScanAndVerify}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-indigo-500/30 hover:scale-105 transition-all cursor-pointer"
                    >
                      <Scan className="size-4" /> Start Barcode Scan & Verification
                    </button>
                  </div>
                )}

                {scanStep === "scanning" && (
                  <div className="space-y-4">
                    <div className="relative grid size-28 place-items-center rounded-full bg-indigo-500/10 border-4 border-indigo-500 animate-spin shadow-[0_0_30px_rgba(99,102,241,0.5)]">
                      <RotateCw className="size-10 text-indigo-400" />
                    </div>
                    <p className="text-xs font-bold text-indigo-300 animate-pulse">
                      Verifying barcode, batch #{selectedRx.batch} & expiry date... ({scanProgress}%)
                    </p>
                  </div>
                )}

                {scanStep === "verified" && (
                  <div className="space-y-4">
                    <div className="grid size-28 place-items-center rounded-full bg-emerald-500/10 border-4 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                      <CheckCircle2 className="size-14 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-emerald-400">✓ 5/5 Safety Parameters Verified!</p>
                      <p className="text-xs font-medium text-slate-400 mt-0.5">Barcode, Batch, Expiry, Patient & eGFR Safety Cleared.</p>
                    </div>
                    <button
                      onClick={confirmDispense}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-500/30 hover:bg-emerald-400 transition-all cursor-pointer scale-105"
                    >
                      <Check className="size-4" /> Complete & Dispense Medication
                    </button>
                  </div>
                )}

                {scanStep === "dispensed" && (
                  <div className="space-y-4">
                    <div className="grid size-28 place-items-center rounded-full bg-purple-500/10 border-4 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.4)]">
                      <Boxes className="size-12 text-purple-300" />
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 text-xs font-black uppercase tracking-wider">
                        Dispensed & Logged to Ledger
                      </span>
                      <p className="text-xs font-semibold text-slate-300 mt-2">Rx task complete. Event emitted to Command Centre.</p>
                    </div>
                    <button
                      onClick={() => setScanStep("idle")}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:underline cursor-pointer"
                    >
                      Reset Workspace for Next Rx
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: AI Medication Intelligence Safety Panel */}
        <div className="space-y-4">
          <Panel title="AI Medication Safety Panel" subtitle="Real-time clinical decision engine">
            <div className="space-y-4">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                  <AlertTriangle className="size-4 text-amber-400" />
                  <span>Kidney Function Dosage Signal</span>
                </div>
                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-300">
                  Patient eGFR is <strong className="text-amber-300">42 mL/min</strong>. Sumatriptan 50mg dose is safe, but maximum daily dosage should not exceed 100mg per 24 hours.
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-amber-500/20 pt-2 text-[11px] font-bold text-amber-300">
                  <span>Guideline: Renal Protocol 2B</span>
                  <span className="text-emerald-400">✓ Approved</span>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-emerald-400" /> Allergy Cross-Check
                  </span>
                  <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold">Passed</span>
                </div>
                <p className="text-xs font-medium text-slate-400">No cross-reactivity with known patient allergies (Penicillin).</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-2.5">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Info className="size-4 text-indigo-400" /> Drug Interaction Score
                  </span>
                  <span className="rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold">Low Risk</span>
                </div>
                <p className="text-xs font-medium text-slate-400">Zero moderate or severe interactions with active outpatient regimens.</p>
              </div>
            </div>
          </Panel>

          <Panel title="Multilingual Counselling" subtitle="Patient instructions sheet">
            <div className="space-y-3 text-xs font-medium text-slate-300">
              <p className="rounded-2xl border border-white/10 bg-slate-950/60 p-3.5 leading-relaxed font-semibold">
                "Take one 50mg tablet with water at the first sign of migraine. Rest in a quiet, dark room."
              </p>
              <div className="flex gap-2">
                <button className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-[11px] font-bold text-white hover:bg-indigo-500 transition-colors shadow-md">
                  Print Instructions
                </button>
                <button className="flex-1 rounded-xl border border-white/10 bg-slate-800 py-2.5 text-[11px] font-bold text-slate-300 hover:bg-slate-700">
                  Send SMS / Email
                </button>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
