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
      subtitle="Medication intelligence · Scan-verify flow · Safety alerts · Warehouse tracking"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-200">
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
                className="group cursor-pointer rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 transition-all hover:bg-indigo-50 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900">Elena Rostova</p>
                  <StatusPill status="busy" label="Urgent" />
                </div>
                <p className="mt-1 text-xs font-medium text-slate-600">Sumatriptan 50mg · Dr. Sarah Hana</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-semibold border-t border-indigo-100/80 pt-2">
                  <span>MRN-8829</span>
                  <span className="text-amber-700 font-bold">⚠️ eGFR 42 Alert</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:border-slate-300 shadow-2xs opacity-80">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900">Marcus Vance</p>
                  <StatusPill status="healthy" label="Routine" />
                </div>
                <p className="mt-1 text-xs font-medium text-slate-600">Amoxicillin 500mg · Dr. K. Miller</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-semibold border-t border-slate-100 pt-2">
                  <span>MRN-4410</span>
                  <span className="text-emerald-600">✓ Safety Cleared</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:border-slate-300 shadow-2xs opacity-80">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-slate-900">Sophia Chen</p>
                  <StatusPill status="healthy" label="Routine" />
                </div>
                <p className="mt-1 text-xs font-medium text-slate-600">Metformin 500mg ER · Dr. H. Vance</p>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 font-semibold border-t border-slate-100 pt-2">
                  <span>MRN-9021</span>
                  <span className="text-emerald-600">✓ In Stock</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Warehouse Inventory Preview */}
          <Panel title="Warehouse Expiry Heatmap" subtitle="Shelf zone tracking">
            <div className="space-y-3 text-xs font-medium">
              <div className="flex items-center justify-between">
                <span>30-Day Expiry Zone</span>
                <span className="rounded bg-rose-100 text-rose-800 px-2 py-0.5 font-bold">4 Items</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-rose-500" style={{ width: "25%" }} />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span>60-Day Expiry Zone</span>
                <span className="rounded bg-amber-100 text-amber-800 px-2 py-0.5 font-bold">12 Items</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-amber-500" style={{ width: "55%" }} />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span>90+ Day Stable Zone</span>
                <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 font-bold">140 Items</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-500" style={{ width: "90%" }} />
              </div>
            </div>
          </Panel>
        </div>

        {/* Central Workspace: Prescription Detail & Scan Verification Ring */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 backdrop-blur-2xl shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Active Dispensing Workspace</span>
                <h2 className="text-2xl font-black text-slate-900">{selectedRx.patientName}</h2>
                <p className="text-xs font-semibold text-slate-500">{selectedRx.diagnosis} · Prescribed by {selectedRx.doctor}</p>
              </div>
              <Link
                to="/patients/pat-1"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                <Eye className="size-3.5" /> View Executive CV
              </Link>
            </div>

            {/* Smart Medication Card */}
            <div className="mt-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="grid size-12 place-items-center rounded-xl bg-indigo-600 text-white shadow-md">
                    <Pill className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{selectedRx.medication}</h3>
                    <p className="text-xs font-semibold text-slate-600">Dosage: {selectedRx.dosage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1 text-xs font-bold">
                    Stock: 480 Available
                  </span>
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">Batch {selectedRx.batch} · Exp {selectedRx.expiry}</p>
                </div>
              </div>
            </div>

            {/* Scan and Verify Workflow Ring */}
            <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 text-center">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-2">5-Point Scan & Verification Ring</h4>
              <p className="text-xs font-medium text-slate-500 mb-6">Barcoding · Batch Verification · Expiry Check · Dose Safety</p>

              <div className="flex flex-col items-center justify-center">
                {scanStep === "idle" && (
                  <div className="space-y-4">
                    <div className="grid size-28 place-items-center rounded-full bg-indigo-50 border-4 border-indigo-200 shadow-inner">
                      <QrCode className="size-12 text-indigo-600" />
                    </div>
                    <button
                      onClick={startScanAndVerify}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 transition-all scale-105 cursor-pointer"
                    >
                      <Scan className="size-4" /> Start Barcode Scan & Verification
                    </button>
                  </div>
                )}

                {scanStep === "scanning" && (
                  <div className="space-y-4">
                    <div className="relative grid size-28 place-items-center rounded-full bg-indigo-50 border-4 border-indigo-500 animate-spin">
                      <RotateCw className="size-10 text-indigo-600" />
                    </div>
                    <p className="text-xs font-bold text-indigo-700 animate-pulse">
                      Verifying barcode, batch #{selectedRx.batch} & expiry date... ({scanProgress}%)
                    </p>
                  </div>
                )}

                {scanStep === "verified" && (
                  <div className="space-y-4">
                    <div className="grid size-28 place-items-center rounded-full bg-emerald-50 border-4 border-emerald-500 shadow-md">
                      <CheckCircle2 className="size-14 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-700">✓ 5/5 Safety Parameters Verified!</p>
                      <p className="text-xs text-slate-500 mt-0.5">Barcode, Batch, Expiry, Patient & eGFR Safety Cleared.</p>
                    </div>
                    <button
                      onClick={confirmDispense}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 transition-all scale-105 cursor-pointer"
                    >
                      <Check className="size-4" /> Complete & Dispense Medication
                    </button>
                  </div>
                )}

                {scanStep === "dispensed" && (
                  <div className="space-y-4">
                    <div className="grid size-28 place-items-center rounded-full bg-slate-900 text-white shadow-xl">
                      <Boxes className="size-12" />
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 text-white px-3 py-1 text-xs font-extrabold uppercase">
                        Dispensed & Logged to Ledger
                      </span>
                      <p className="text-xs font-semibold text-slate-600 mt-2">Rx task complete. Event emitted to Command Centre.</p>
                    </div>
                    <button
                      onClick={() => setScanStep("idle")}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
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
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <AlertTriangle className="size-4 text-amber-600" />
                  <span>Kidney Function Dosage Signal</span>
                </div>
                <p className="mt-2 text-xs font-medium leading-relaxed text-amber-900">
                  Patient eGFR is <strong>42 mL/min</strong>. Sumatriptan 50mg dose is safe, but maximum daily dosage should not exceed 100mg per 24 hours.
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-amber-200/80 pt-2 text-[11px] font-bold text-amber-800">
                  <span>Guideline: Renal Protocol 2B</span>
                  <span className="text-emerald-700">✓ Approved</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-emerald-600" /> Allergy Cross-Check
                  </span>
                  <span className="rounded bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">Passed</span>
                </div>
                <p className="text-xs font-medium text-slate-600">No cross-reactivity with known patient allergies (Penicillin).</p>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Info className="size-4 text-indigo-600" /> Drug Interaction Score
                  </span>
                  <span className="rounded bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-bold">Low Risk</span>
                </div>
                <p className="text-xs font-medium text-slate-600">Zero moderate or severe interactions with active outpatient regimens.</p>
              </div>
            </div>
          </Panel>

          <Panel title="Multilingual Counselling" subtitle="Patient instructions sheet">
            <div className="space-y-2 text-xs font-medium text-slate-700">
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 leading-relaxed">
                "Take one 50mg tablet with water at the first sign of migraine. Rest in a quiet, dark room."
              </p>
              <div className="flex gap-2 pt-1">
                <button className="flex-1 rounded-xl bg-slate-900 py-2 text-[11px] font-bold text-white hover:bg-slate-800">
                  Print Instructions
                </button>
                <button className="flex-1 rounded-xl border border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50">
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
