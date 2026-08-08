import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Barcode,
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileSpreadsheet,
  Info,
  Package,
  Pill,
  Printer,
  QrCode,
  RotateCw,
  Scan,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { generatePrescription } from "@/lib/hip/pdf-engine";

import { AppShell } from "@/components/hip/app-shell";
import { HandoffBoard } from "@/components/hip/handoff-board";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";

export const Route = createFileRoute("/_authenticated/pharmacy")({
  head: () => ({
    meta: [
      { title: "AI Clinical Pharmacy | Furii Hospital Prototype" },
      {
        name: "description",
        content:
          "Commercial AI pharmacy workspace: electronic prescriptions, 5-point barcode verification, eGFR renal dosing guard, inventory FEFO tracking & controlled substance register.",
      },
    ],
  }),
  component: PharmacyWorkspace,
});

function PharmacyWorkspace() {
  return (
    <RouteGuard route="/pharmacy">
      <PharmacyContent />
    </RouteGuard>
  );
}

type PharmacyTab =
  | "overview"
  | "queue"
  | "dispense"
  | "safety"
  | "counseling"
  | "inventory"
  | "narcotics"
  | "reports";

type Step = "idle" | "scanning" | "verified" | "dispensed";

function PharmacyContent() {
  const [activeTab, setActiveTab] = useState<PharmacyTab>("overview");
  const [selectedRx, setSelectedRx] = useState({
    id: "RX-101",
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
    toast.success(`Dispensed ${selectedRx.medication} to ${selectedRx.patientName}. Inventory updated & ledger billed.`);
  };

  return (
    <AppShell
      title="AI Clinical Pharmacy & Dispensing Mission Control"
      subtitle="Prescription lifecycle · 5-Point Barcode verification · eGFR Renal Guard · Controlled Substance Register"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              generatePrescription({
                patientName: selectedRx?.patientName || "Abebech Tadesse",
                mrn: selectedRx?.mrn || "MRN-8829",
                age: "45",
                gender: "Female",
                weight: "65 kg",
                egfr: selectedRx?.egfr ? `${selectedRx.egfr} mL/min` : "42 mL/min",
                prescriber: selectedRx?.doctor || "Dr. Bethlehem Tadesse",
                prescriberId: "MD-88291",
                medications: [
                  {
                    drug: selectedRx?.medication || "Sumatriptan 50mg",
                    dose: selectedRx?.dosage || "50mg",
                    frequency: "PRN",
                    duration: "7 days",
                    instructions: "Take at onset of migraine",
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1.5 rounded-2xl bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Download className="size-4" /> Download e-Prescription PDF
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3.5 py-1 text-xs font-bold text-[#1D8A39]">
            <Zap className="size-3.5 text-[#34C759]" /> AI Safety Guard Active
          </span>
        </div>
      }
    >
      <HandoffBoard role="pharmacy" />
      {/* Commercial Sub-Tab Rail */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/5 pb-4 overflow-x-auto">
        {[
          { id: "overview", label: "Pharmacy Dashboard", icon: Pill },
          { id: "queue", label: "Prescription Queue", icon: Clock },
          { id: "dispense", label: "Barcode Dispensing & Verification", icon: Barcode },
          { id: "safety", label: "AI Safety & Renal Dosing Engine", icon: ShieldAlert },
          { id: "counseling", label: "Patient Counseling & Instructions", icon: FileCheck },
          { id: "inventory", label: "Inventory & FEFO Tracking", icon: Package },
          { id: "narcotics", label: "High-Alert & Controlled Substances", icon: ShieldCheck },
          { id: "reports", label: "Pharmacy Analytics", icon: FileSpreadsheet },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as PharmacyTab)}
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

      {/* SUB-TAB 1: PHARMACY DASHBOARD */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel className="min-w-0">
              <Stat label="Prescriptions Pending" value="3" hint="Live electronic orders" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Dispensed Today" value="48" hint="100% verified" tone="ok" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Renal Dosing Alerts" value="1" hint="eGFR 42 Flagged" tone="warn" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Stock Health" value="98.2%" hint="FEFO Optimal" tone="ok" />
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[340px_1fr_360px]">
            {/* Prescriptions Queue List */}
            <Panel title="Incoming Electronic Prescriptions" subtitle="Prescriptions from Doctor Workspace">
              <div className="space-y-3">
                <div
                  onClick={() => setSelectedRx({
                    id: "RX-101",
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
                  className="cursor-pointer rounded-2xl border border-black/15 bg-white p-4 transition-all shadow-xs"
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

                <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 transition-all hover:border-black/10 opacity-80">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-[#1D1D1F]">Dawit Yohannes</p>
                    <StatusPill status="healthy" label="Routine" />
                  </div>
                  <p className="mt-1 text-xs font-semibold text-[#86868B]">Amoxicillin 500mg · Dr. Getachew Reda</p>
                </div>
              </div>
            </Panel>

            {/* Central Workspace: Prescription Detail */}
            <Panel title="Active Dispensing Surface" subtitle={`Patient: ${selectedRx.patientName} (${selectedRx.mrn})`}>
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-black/5 pb-3">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Prescribed Drug</span>
                    <h3 className="text-xl font-black text-black">{selectedRx.medication}</h3>
                    <p className="text-xs font-semibold text-[#86868B]">{selectedRx.dosage}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        generatePrescription({
                          patientName: selectedRx?.patientName || (selectedRx as any)?.patient || 'Patient',
                          mrn: selectedRx?.mrn || 'N/A',
                          age: '45', gender: 'Female',
                          weight: '65 kg', egfr: selectedRx?.egfr ? selectedRx.egfr + ' mL/min' : 'N/A',
                          prescriber: selectedRx?.doctor || 'Dr. Bethlehem Tadesse',
                          prescriberId: 'MD-88291',
                          medications: [{ drug: selectedRx?.medication || 'Sumatriptan 50mg', dose: selectedRx?.dosage || '50mg', frequency: 'PRN', duration: '7 days', instructions: 'Take at onset of migraine' }],
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                      title="Download PDF"
                    >
                      <Download className="size-3" /> Download PDF
                    </button>
                    <button
                      onClick={() => setActiveTab("dispense")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <Barcode className="size-4" /> Start Barcode Scan
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#FAFAFC] border border-black/5 p-4 grid grid-cols-2 gap-3 text-xs font-semibold">
                  <div><span className="text-[#86868B] text-[10px] block">Prescribed By</span><strong className="text-black">{selectedRx.doctor}</strong></div>
                  <div><span className="text-[#86868B] text-[10px] block">Quantity</span><strong className="text-black">{selectedRx.quantity}</strong></div>
                  <div><span className="text-[#86868B] text-[10px] block">Batch Lot</span><strong className="text-black">{selectedRx.batch}</strong></div>
                  <div><span className="text-[#86868B] text-[10px] block">Expiry Date</span><strong className="text-[#1D8A39]">{selectedRx.expiry}</strong></div>
                </div>
              </div>
            </Panel>

            {/* Right Sidebar: AI Safety Panel */}
            <Panel title="AI Medication Safety Engine" subtitle="Renal dosing & interaction guard">
              <div className="space-y-3 text-xs font-semibold">
                <div className="rounded-2xl border border-[#FFE0B2] bg-[#FFF4E5] p-3.5 space-y-1">
                  <span className="font-bold text-[#B86200] flex items-center gap-1">
                    <AlertTriangle className="size-4" /> eGFR Renal Clearance Guard
                  </span>
                  <p className="text-[#B86200] text-[11px]">
                    Patient eGFR = <strong>42 mL/min</strong>. Max Sumatriptan 50mg PRN approved. High dose NSAIDs flagged.
                  </p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PRESCRIPTION QUEUE */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          <Panel title="Incoming Physician Electronic Prescriptions" subtitle="Real-time clinical pharmacy queue">
            <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
              <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#F5F5F7] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-black text-sm">Sumatriptan 50mg Oral Tablets (Qty: 6)</p>
                    <span className="rounded-full bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2] px-2.5 py-0.5 text-[10px] font-bold">
                      Renal Guard Alert
                    </span>
                  </div>
                  <p className="text-[#86868B] mt-0.5">Patient: Abebech Tadesse (MRN-8829) · Dr. Bethlehem Tadesse</p>
                </div>
                <button
                  onClick={() => setActiveTab("dispense")}
                  className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer"
                >
                  Select & Process Rx
                </button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 3: BARCODE DISPENSING & VERIFICATION */}
      {activeTab === "dispense" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="5-Point Barcode Scanner & Safety Verification Ring" subtitle="Verify barcode, batch, expiry & dose">
            <div className="p-6 text-center space-y-6">
              {scanStep === "idle" && (
                <div className="space-y-4">
                  <div className="grid size-28 place-items-center rounded-full bg-[#FAFAFC] border-4 border-black/20 mx-auto shadow-md">
                    <QrCode className="size-12 text-black" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-black">{selectedRx.medication}</h3>
                    <p className="text-xs font-semibold text-[#86868B] mt-1">Patient: {selectedRx.patientName} ({selectedRx.mrn})</p>
                  </div>
                  <button
                    onClick={startScanAndVerify}
                    className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-slate-800 transition-all scale-105 cursor-pointer"
                  >
                    <Scan className="size-4" /> Simulate Laser Barcode Scan
                  </button>
                </div>
              )}

              {scanStep === "scanning" && (
                <div className="space-y-4 py-6">
                  <RotateCw className="size-12 text-black animate-spin mx-auto" />
                  <p className="text-xs font-bold text-black animate-pulse">Scanning package barcode, checking batch #{selectedRx.batch} & eGFR renal safety...</p>
                </div>
              )}

              {scanStep === "verified" && (
                <div className="space-y-4">
                  <div className="grid size-24 place-items-center rounded-full bg-[#E8F8EC] border-4 border-[#34C759] mx-auto text-[#1D8A39] shadow-md animate-bounce">
                    <CheckCircle2 className="size-12" />
                  </div>
                  <p className="text-sm font-bold text-[#1D8A39]">✓ 5-Point Safety Checks Passed!</p>
                  <button
                    onClick={confirmDispense}
                    className="inline-flex items-center gap-2 rounded-full bg-[#1D8A39] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 transition-all scale-105 cursor-pointer"
                  >
                    <Check className="size-4" /> Confirm Dispense & Update Ledger
                  </button>
                </div>
              )}

              {scanStep === "dispensed" && (
                <div className="space-y-3 py-4 text-center">
                  <CheckCircle2 className="size-12 text-[#1D8A39] mx-auto" />
                  <h4 className="text-base font-black text-black">Medication Dispensed Successfully!</h4>
                  <p className="text-xs text-[#86868B]">Inventory updated and charges sent to Billing Ledger.</p>
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 4: AI SAFETY & RENAL DOSING */}
      {activeTab === "safety" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="AI Clinical Decision Engine & Renal Clearance" subtitle="eGFR 42 mL/min Protocol">
            <div className="space-y-4 text-xs font-semibold text-black">
              <div className="rounded-2xl border border-[#FFE0B2] bg-[#FFF4E5] p-5 space-y-2">
                <h4 className="font-extrabold text-[#B86200] text-sm">eGFR Renal Dose Adjustment Warning</h4>
                <p className="text-[#B86200]">
                  Patient Abebech Tadesse has Stage 3a CKD (eGFR 42 mL/min). The prescribed Sumatriptan 50mg dose is safe, but NSAIDs (Ibuprofen/Diclofenac) are strictly blocked by the AI Safety Guard.
                </p>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 5: PATIENT COUNSELING */}
      {activeTab === "counseling" && (
        <div className="mx-auto max-w-2xl space-y-6">
          <Panel title="Multilingual Patient Counseling Sheet" subtitle="Patient instructions in English & Amharic">
            <div className="space-y-4 text-xs font-semibold text-black">
              <div className="rounded-2xl border border-black/5 bg-[#FAFAFC] p-5 space-y-3">
                <p className="text-black leading-relaxed">
                  <strong>English:</strong> Take one 50mg tablet with water at the onset of migraine. Rest in a quiet dark room. Max 100mg per 24 hours.
                </p>
                <p className="text-[#515154] leading-relaxed border-t border-black/5 pt-3">
                  <strong>አማርኛ (Amharic):</strong> የማይግሬን ራስ ምታት ሲጀምር አንድ 50 ሚሊግራም ኪኒን በውሃ ይውሰዱ። በፀጥተኛ ክፍል ውስጥ ያረፉ።
                </p>
              </div>

              <button
                onClick={() => toast.success("Printed bilingual counseling sheet.")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer"
              >
                <Printer className="size-4" /> Print Bilingual Counseling Sheet
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 6: INVENTORY & FEFO */}
      {activeTab === "inventory" && (
        <div className="space-y-6">
          <Panel title="Pharmacy Warehouse & FEFO Batch Tracking" subtitle="First-Expiry, First-Out inventory tracking">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Sumatriptan 50mg</span>
                <p className="text-2xl font-black text-black numeric">480 Tablets</p>
                <span className="text-[10px] text-[#1D8A39] font-bold">FEFO Batch B-9942A (Exp 2028)</span>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 7: HIGH-ALERT & CONTROLLED SUBSTANCES */}
      {activeTab === "narcotics" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="Controlled Substance Register & Double-Sign Log" subtitle="Narcotics & High-Alert medication vault">
            <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
              <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#FAFAFC] p-4">
                <div>
                  <p className="font-bold text-black text-sm">Morphine Sulfate 10mg/mL Ampoules</p>
                  <p className="text-[#86868B]">Vault B-02 · Vault Count: 24 Ampoules · Requires Dual Pharmacist Sign</p>
                </div>
                <span className="rounded-full bg-[#E8E8ED] text-black border border-black/10 px-3 py-1 text-xs font-bold">
                  VAULT LOCKED
                </span>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 8: PHARMACY ANALYTICS */}
      {activeTab === "reports" && (
        <div className="space-y-6">
          <Panel title="Pharmacy Dispensing Analytics & Volume Summary" subtitle="Daily operational report">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Prescriptions Dispensed</span>
                <p className="text-2xl font-black text-black numeric">48 Prescriptions</p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Safety Interventions</span>
                <p className="text-2xl font-black text-[#1D8A39] numeric">3 Interventions</p>
              </div>
              <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">Turnaround Time</span>
                <p className="text-2xl font-black text-black numeric">6.5 Minutes</p>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
