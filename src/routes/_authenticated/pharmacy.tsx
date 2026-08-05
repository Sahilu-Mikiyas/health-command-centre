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
import { RouteGuard } from "@/components/hip/route-guard";
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
  return (
    <RouteGuard route="/pharmacy">
      <PharmacyContent />
    </RouteGuard>
  );
}

function PharmacyContent() {
  const [selectedRx, setSelectedRx] = useState({
    id: "rx-101",
    patientName: "Abebech Tadesse",
    mrn: "MRN-8829",
    doctor: "Dr. Bethlehem Tadesse",
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5E8FF] border border-[#E4BEFF] px-3.5 py-1 text-xs font-bold text-[#8922C7]">
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
                  patientName: "Abebech Tadesse",
                  mrn: "MRN-8829",
                  doctor: "Dr. Bethlehem Tadesse",
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
                className="group cursor-pointer rounded-2xl border border-black/15 bg-white p-4 transition-all shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-black">{selectedRx.patientName}</p>
                  <StatusPill status="busy" label="Urgent" />
                </div>
                <p className="mt-1 text-xs font-semibold text-[#515154]">Sumatriptan 50mg · Dr. Bethlehem Tadesse</p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-bold border-t border-black/5 pt-2">
                  <span className="text-[#86868B]">MRN-8829</span>
                  <span className="text-[#B86200]">⚠️ eGFR 42 Alert</span>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-4 transition-all hover:border-black/10 opacity-80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#1D1D1F]">Dawit Yohannes</p>
                  <StatusPill status="healthy" label="Routine" />
                </div>
                <p className="mt-1 text-xs font-semibold text-[#86868B]">Amoxicillin 500mg · Dr. Getachew Reda</p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-[#86868B] border-t border-black/5 pt-2">
                  <span>MRN-4410</span>
                  <span className="text-[#1D8A39]">✓ Safety Cleared</span>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-4 transition-all hover:border-black/10 opacity-80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-[#1D1D1F]">Tigist Alemu</p>
                  <StatusPill status="healthy" label="Routine" />
                </div>
                <p className="mt-1 text-xs font-semibold text-[#86868B]">Metformin 500mg ER · Dr. Almaz Tefera</p>
                <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-[#86868B] border-t border-black/5 pt-2">
                  <span>MRN-9021</span>
                  <span className="text-[#1D8A39]">✓ In Stock</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Warehouse Inventory Preview */}
          <Panel title="Warehouse Expiry Heatmap" subtitle="Shelf zone tracking">
            <div className="space-y-4 text-xs font-semibold text-[#515154]">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>30-Day Expiry Zone</span>
                  <span className="rounded-full bg-[#FDE8E7] text-[#D70015] border border-[#F9BDBD] px-2 py-0.5 font-bold">4 Items</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F5F7]">
                  <div className="h-full bg-[#FF3B30]" style={{ width: "25%" }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>60-Day Expiry Zone</span>
                  <span className="rounded-full bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2] px-2 py-0.5 font-bold">12 Items</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F5F7]">
                  <div className="h-full bg-[#FF9500]" style={{ width: "55%" }} />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span>90+ Day Stable Zone</span>
                  <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2 py-0.5 font-bold">140 Items</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F5F7]">
                  <div className="h-full bg-[#34C759]" style={{ width: "90%" }} />
                </div>
              </div>
            </div>
          </Panel>
        </div>

        {/* Central Workspace: Prescription Detail & Scan Verification Ring */}
        <div className="space-y-6">
          <div className="apple-card p-6">
            <div className="flex items-center justify-between border-b border-black/5 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-black">Active Dispensing Workspace</span>
                <h2 className="text-2xl font-extrabold text-black">{selectedRx.patientName}</h2>
                <p className="text-xs font-semibold text-[#86868B]">{selectedRx.diagnosis} · Prescribed by {selectedRx.doctor}</p>
              </div>
              <Link
                to="/patients/pat-1"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-xs font-bold text-black hover:bg-[#F5F5F7] shadow-2xs transition-all"
              >
                <Eye className="size-3.5" /> View Executive CV
              </Link>
            </div>

            {/* Smart Medication Card */}
            <div className="mt-6 rounded-2xl border border-black/10 bg-[#F5F5F7] p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="grid size-12 place-items-center rounded-2xl bg-black text-white shadow-md">
                    <Pill className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-black">{selectedRx.medication}</h3>
                    <p className="text-xs font-semibold text-[#515154]">Dosage: {selectedRx.dosage}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-3 py-1 text-xs font-bold">
                    Stock: 480 Available
                  </span>
                  <p className="mt-1.5 text-[11px] font-semibold text-[#86868B]">Batch {selectedRx.batch} · Exp {selectedRx.expiry}</p>
                </div>
              </div>
            </div>

            {/* Scan and Verify Workflow Ring */}
            <div className="mt-6 rounded-2xl border border-black/5 bg-[#F5F5F7] p-6 text-center shadow-inner">
              <h4 className="text-xs font-bold uppercase tracking-wider text-black mb-1">5-Point Scan & Verification Ring</h4>
              <p className="text-xs font-semibold text-[#86868B] mb-6">Barcoding · Batch Verification · Expiry Check · Dose Safety</p>

              <div className="flex flex-col items-center justify-center">
                {scanStep === "idle" && (
                  <div className="space-y-4">
                    <div className="grid size-28 place-items-center rounded-full bg-white border-4 border-black/20 shadow-md">
                      <QrCode className="size-12 text-black" />
                    </div>
                    <button
                      onClick={startScanAndVerify}
                      className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-slate-800 transition-all scale-105 cursor-pointer"
                    >
                      <Scan className="size-4" /> Start Barcode Scan & Verification
                    </button>
                  </div>
                )}

                {scanStep === "scanning" && (
                  <div className="space-y-4">
                    <div className="relative grid size-28 place-items-center rounded-full bg-white border-4 border-black animate-spin shadow-md">
                      <RotateCw className="size-10 text-black" />
                    </div>
                    <p className="text-xs font-bold text-black animate-pulse">
                      Verifying barcode, batch #{selectedRx.batch} & expiry date... ({scanProgress}%)
                    </p>
                  </div>
                )}

                {scanStep === "verified" && (
                  <div className="space-y-4">
                    <div className="grid size-28 place-items-center rounded-full bg-[#E8F8EC] border-4 border-[#34C759] shadow-md animate-bounce">
                      <CheckCircle2 className="size-14 text-[#1D8A39]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1D8A39]">✓ 5/5 Safety Parameters Verified!</p>
                      <p className="text-xs font-medium text-[#86868B] mt-0.5">Barcode, Batch, Expiry, Patient & eGFR Safety Cleared.</p>
                    </div>
                    <button
                      onClick={confirmDispense}
                      className="inline-flex items-center gap-2 rounded-full bg-[#34C759] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-[#2cb04e] transition-all scale-105 cursor-pointer"
                    >
                      <Check className="size-4" /> Complete & Dispense Medication
                    </button>
                  </div>
                )}

                {scanStep === "dispensed" && (
                  <div className="space-y-4">
                    <div className="grid size-28 place-items-center rounded-full bg-black text-white shadow-xl">
                      <Boxes className="size-12" />
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-black text-white px-3.5 py-1 text-xs font-bold uppercase tracking-wider">
                        Dispensed & Logged to Ledger
                      </span>
                      <p className="text-xs font-semibold text-[#515154] mt-2">Rx task complete. Event emitted to Command Centre.</p>
                    </div>
                    <button
                      onClick={() => setScanStep("idle")}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:underline cursor-pointer"
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
              <div className="rounded-2xl border border-[#FFE0B2] bg-[#FFF4E5] p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-[#B86200]">
                  <AlertTriangle className="size-4 text-[#FF9500]" />
                  <span>Kidney Function Dosage Signal</span>
                </div>
                <p className="mt-2 text-xs font-medium leading-relaxed text-[#515154]">
                  Patient eGFR is <strong>42 mL/min</strong>. Sumatriptan 50mg dose is safe, but maximum daily dosage should not exceed 100mg per 24 hours.
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-[#FFE0B2] pt-2 text-[11px] font-bold text-[#B86200]">
                  <span>Guideline: Renal Protocol 2B</span>
                  <span className="text-[#1D8A39]">✓ Approved</span>
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <div className="flex items-center justify-between border-b border-black/5 pb-2.5 mb-2.5">
                  <span className="text-xs font-bold text-black flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-[#34C759]" /> Allergy Cross-Check
                  </span>
                  <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2 py-0.5 text-[10px] font-bold">Passed</span>
                </div>
                <p className="text-xs font-medium text-[#86868B]">No cross-reactivity with known patient allergies (Penicillin).</p>
              </div>

              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <div className="flex items-center justify-between border-b border-black/5 pb-2.5 mb-2.5">
                  <span className="text-xs font-bold text-black flex items-center gap-1.5">
                    <Info className="size-4 text-black" /> Drug Interaction Score
                  </span>
                  <span className="rounded-full bg-[#E8E8ED] text-black border border-black/10 px-2 py-0.5 text-[10px] font-bold">Low Risk</span>
                </div>
                <p className="text-xs font-medium text-[#86868B]">Zero moderate or severe interactions with active outpatient regimens.</p>
              </div>
            </div>
          </Panel>

          <Panel title="Multilingual Counselling" subtitle="Patient instructions sheet">
            <div className="space-y-3 text-xs font-medium text-[#515154]">
              <p className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-3.5 leading-relaxed font-semibold">
                "Take one 50mg tablet with water at the first sign of migraine. Rest in a quiet, dark room."
              </p>
              <div className="flex gap-2">
                <button className="flex-1 rounded-full bg-black py-2.5 text-[11px] font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs">
                  Print Instructions
                </button>
                <button className="flex-1 rounded-full border border-black/10 bg-white py-2.5 text-[11px] font-bold text-black hover:bg-[#F5F5F7] shadow-2xs">
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
