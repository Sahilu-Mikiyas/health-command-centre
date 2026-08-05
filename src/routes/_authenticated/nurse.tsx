import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Barcode,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  Heart,
  HeartPulse,
  Pill,
  Printer,
  QrCode,
  Radio,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Thermometer,
  UserCheck,
  Users,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";
import { activeEncountersQuery, ordersQuery } from "@/lib/hip/clinical-queries";
import { patientsQuery } from "@/lib/hip/queries";

export const Route = createFileRoute("/_authenticated/nurse")({
  head: () => ({
    meta: [
      { title: "Nurse Workspace | Furii Hospital Prototype" },
      {
        name: "description",
        content:
          "Commercial nurse execution cockpit: assigned patients, vitals, nursing notes, barcode medication administration, doctor orders, and shift handover.",
      },
    ],
  }),
  component: NurseWorkspace,
});

function NurseWorkspace() {
  return (
    <RouteGuard route="/nurse">
      <NurseContent />
    </RouteGuard>
  );
}

type NurseTab =
  | "overview"
  | "mypatients"
  | "care"
  | "meds"
  | "orders"
  | "procedures"
  | "handover"
  | "emergency";

function NurseContent() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<NurseTab>("overview");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("pat-1");

  // Code Blue Emergency State
  const [codeBlueActive, setCodeBlueActive] = useState(false);

  // Barcode Verification Modal State
  const [verifyingMed, setVerifyingMed] = useState<{
    drugName: string;
    patientName: string;
    mrn: string;
    dose: string;
    route: string;
  } | null>(null);

  const [scanStep, setScanStep] = useState<"idle" | "scanning" | "verified" | "administered">("idle");

  // Form states for Care tab
  const [systolic, setSystolic] = useState("124");
  const [diastolic, setDiastolic] = useState("82");
  const [pulse, setPulse] = useState("74");
  const [spo2, setSpo2] = useState("98");
  const [temp, setTemp] = useState("36.8");
  const [nursingNote, setNursingNote] = useState("");
  const [fluidIntake, setFluidIntake] = useState("1200");
  const [fluidOutput, setFluidOutput] = useState("1400");

  // Queries
  const encounters = useQuery({ ...activeEncountersQuery, refetchInterval: 15000 });
  const orders = useQuery({ ...ordersQuery(selectedPatientId), enabled: Boolean(selectedPatientId) });
  const patients = useQuery(patientsQuery(""));

  const assignedPatients = [
    { id: "pat-1", name: "Abebech Tadesse", mrn: "MRN-8829", bed: "ICU-01", status: "Stable", vitals: "124/82 · HR 74", diagnosis: "Acute Migraine Exacerbation & CKD Stage 3a" },
    { id: "pat-2", name: "Dawit Yohannes", mrn: "MRN-4410", bed: "ICU-02", status: "Observation", vitals: "138/90 · HR 88", diagnosis: "Post-Op Appendectomy & CBC Monitoring" },
    { id: "pat-3", name: "Tigist Alemu", mrn: "MRN-9021", bed: "Ward A-04", status: "Stable", vitals: "118/76 · HR 68", diagnosis: "Type 2 Diabetes Routine Control" },
  ];

  const dueMeds = [
    { id: "m-1", drug: "Sumatriptan 50mg Oral", patient: "Abebech Tadesse", mrn: "MRN-8829", dueTime: "14:00 (In 15 mins)", route: "Oral Tablet", doctor: "Dr. Bethlehem Tadesse" },
    { id: "m-2", drug: "Amoxicillin 500mg", patient: "Dawit Yohannes", mrn: "MRN-4410", dueTime: "16:00", route: "Oral Capsule", doctor: "Dr. Getachew Reda" },
  ];

  const handleAdministerMed = () => {
    setScanStep("scanning");
    setTimeout(() => setScanStep("verified"), 1200);
  };

  const confirmMedicationLog = () => {
    setScanStep("administered");
    toast.success(`Administered ${verifyingMed?.drugName} to ${verifyingMed?.patientName}. 5-Right Verification Logged.`);
    setTimeout(() => {
      setVerifyingMed(null);
      setScanStep("idle");
    }, 1500);
  };

  const handleSaveVitals = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(`Vitals recorded for Abebech Tadesse: ${systolic}/${diastolic} mmHg, HR ${pulse} bpm, SpO2 ${spo2}%. NEWS2 score calculated: 1 (Low Risk).`);
    setNursingNote("");
  };

  return (
    <AppShell
      title="Nurse Execution Workspace & Patient Care"
      subtitle="Shift overview · Bedside vitals · Barcode medication administration · Doctor orders · Handover"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCodeBlueActive(true);
              toast.error("🚨 CODE BLUE TRIGGERED FOR ICU TOWER 1. EMERGENCY TEAM NOTIFIED.", { duration: 6000 });
            }}
            className="inline-flex items-center gap-2 rounded-full bg-[#FF3B30] px-4 py-2 text-xs font-black text-white shadow-lg hover:bg-red-700 transition-all scale-105 cursor-pointer animate-pulse"
          >
            <ShieldAlert className="size-4" /> Trigger Code Blue Emergency
          </button>
        </div>
      }
    >
      {/* Code Blue Emergency Active Banner */}
      {codeBlueActive && (
        <div className="rounded-2xl border border-[#F9BDBD] bg-[#FDE8E7] p-4 flex items-center justify-between gap-4 text-[#D70015] animate-in zoom-in-95">
          <div className="flex items-center gap-3">
            <ShieldAlert className="size-6 shrink-0 animate-bounce" />
            <div>
              <h3 className="text-base font-black uppercase tracking-wider">CODE BLUE ACTIVE — ICU BED 01</h3>
              <p className="text-xs font-bold">Rapid Response Team Dispatched to ICU. Attending Physician & Anesthesia notified.</p>
            </div>
          </div>
          <button
            onClick={() => setCodeBlueActive(false)}
            className="rounded-full bg-[#D70015] text-white px-4 py-1.5 text-xs font-bold hover:bg-red-800 transition-colors shadow-2xs"
          >
            Cancel Alert
          </button>
        </div>
      )}

      {/* Barcode Scanner Medication Verification Modal */}
      {verifyingMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="apple-card max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <span className="text-xs font-black uppercase text-black">5-Right Barcode Verification</span>
              <button onClick={() => setVerifyingMed(null)} className="text-[#86868B] hover:text-black">
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-[#FAFAFC] border border-black/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-black text-sm">{verifyingMed.patientName}</span>
                <span className="rounded-full bg-black text-white px-2.5 py-0.5 text-[10px] font-bold">
                  {verifyingMed.mrn}
                </span>
              </div>
              <p className="text-xs font-bold text-[#1D1D1F]">{verifyingMed.drugName}</p>
              <p className="text-xs text-[#86868B]">Prescribed: {verifyingMed.dose} · {verifyingMed.route}</p>

              {scanStep === "idle" && (
                <div className="pt-2 text-center space-y-2">
                  <div className="grid size-12 place-items-center rounded-2xl bg-[#F5F5F7] mx-auto text-black border border-black/10">
                    <Barcode className="size-6" />
                  </div>
                  <p className="text-xs font-semibold text-[#86868B]">Scan patient wristband and drug package barcode to verify</p>
                  <button
                    onClick={handleAdministerMed}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer"
                  >
                    Simulate Laser Barcode Scan ⚡
                  </button>
                </div>
              )}

              {scanStep === "scanning" && (
                <div className="py-6 text-center space-y-2">
                  <Activity className="size-8 text-black animate-spin mx-auto" />
                  <p className="text-xs font-bold text-black">Verifying 5-Rights against Electronic Medication Record...</p>
                </div>
              )}

              {scanStep === "verified" && (
                <div className="pt-2 text-center space-y-3">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3 py-1 text-xs font-bold text-[#1D8A39]">
                    <CheckCircle2 className="size-4" /> 5-Right Safety Checks Passed
                  </div>
                  <ul className="text-left text-[11px] font-semibold text-[#515154] space-y-1 bg-white p-3 rounded-xl border border-black/5">
                    <li className="text-[#1D8A39]">✓ Right Patient ({verifyingMed.patientName})</li>
                    <li className="text-[#1D8A39]">✓ Right Drug ({verifyingMed.drugName})</li>
                    <li className="text-[#1D8A39]">✓ Right Dose ({verifyingMed.dose})</li>
                    <li className="text-[#1D8A39]">✓ Right Route ({verifyingMed.route})</li>
                    <li className="text-[#1D8A39]">✓ Right Time (Scheduled Now)</li>
                  </ul>
                  <button
                    onClick={confirmMedicationLog}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1D8A39] py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 cursor-pointer"
                  >
                    Confirm Administration & Sign Log
                  </button>
                </div>
              )}

              {scanStep === "administered" && (
                <div className="py-4 text-center text-xs font-bold text-[#1D8A39] space-y-1">
                  <CheckCircle2 className="size-8 mx-auto text-[#1D8A39]" />
                  <p>Medication Administered & Signed!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Commercial Sub-Tab Rail */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/5 pb-4 overflow-x-auto">
        {[
          { id: "overview", label: "Shift Dashboard", icon: Activity },
          { id: "mypatients", label: "My Assigned Patients", icon: Users },
          { id: "care", label: "Bedside Vitals & Notes", icon: HeartPulse },
          { id: "meds", label: "Medication Administration", icon: Pill },
          { id: "orders", label: "Doctor Orders", icon: FileText },
          { id: "procedures", label: "Nursing Procedures", icon: Syringe },
          { id: "handover", label: "Shift Handover", icon: RotateCcw },
          { id: "emergency", label: "Emergency Protocols", icon: ShieldAlert },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as NurseTab)}
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

      {/* SUB-TAB 1: SHIFT DASHBOARD */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel className="min-w-0">
              <Stat label="Assigned Patients" value="3" hint="Ward A & ICU" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Medications Due" value="2" hint="Next at 14:00" tone="warn" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Doctor Orders Pending" value="1" hint="Lab FBC order" tone="ok" />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Shift Status" value="On Duty" hint="Day Shift 08:00 - 16:00" tone="ok" />
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <Panel title="My Inpatient Care Roster" subtitle="Assigned beds under your active shift">
              <div className="space-y-3">
                {assignedPatients.map((p) => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#F5F5F7] p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-black text-sm">{p.name}</span>
                        <span className="rounded-full bg-black text-white px-2.5 py-0.5 text-[10px] font-bold">
                          Bed: {p.bed}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[#86868B] mt-0.5">{p.mrn} · {p.diagnosis}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-black numeric">{p.vitals}</span>
                      <button
                        onClick={() => {
                          setSelectedPatientId(p.id);
                          setActiveTab("care");
                        }}
                        className="rounded-full bg-black px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs"
                      >
                        Record Vitals →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Shift Tasks & Reminders" subtitle="Nursing task checklist">
              <div className="space-y-2 text-xs font-semibold text-[#1D1D1F]">
                <label className="flex items-center gap-2 rounded-2xl bg-[#FAFAFC] border border-black/5 p-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>09:00 Bedside rounds & NEWS2 calculation</span>
                </label>
                <label className="flex items-center gap-2 rounded-2xl bg-[#FAFAFC] border border-black/5 p-3 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span>14:00 Administer Sumatriptan 50mg (Abebech Tadesse)</span>
                </label>
                <label className="flex items-center gap-2 rounded-2xl bg-[#FAFAFC] border border-black/5 p-3 cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  <span>15:30 Fluid balance chart review prior to handover</span>
                </label>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MY ASSIGNED PATIENTS */}
      {activeTab === "mypatients" && (
        <div className="space-y-6">
          <Panel title="Detailed Inpatient Care Roster" subtitle="Complete bedside overview">
            <div className="grid gap-4 sm:grid-cols-3">
              {assignedPatients.map((p) => (
                <div key={p.id} className="rounded-2xl border border-black/10 bg-white p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-black text-white px-3 py-1 text-xs font-bold">
                      {p.bed}
                    </span>
                    <StatusPill status="healthy" label={p.status} />
                  </div>

                  <div>
                    <h3 className="font-extrabold text-black text-base">{p.name}</h3>
                    <p className="text-xs font-semibold text-[#86868B]">{p.mrn}</p>
                  </div>

                  <div className="rounded-xl bg-[#F5F5F7] p-3 text-xs space-y-1 font-semibold">
                    <p className="text-black">Diagnosis: {p.diagnosis}</p>
                    <p className="text-[#86868B]">Vitals: {p.vitals}</p>
                  </div>

                  <Link
                    to="/patients/$patientId"
                    params={{ patientId: p.id }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] py-2 text-xs font-bold text-black hover:bg-black hover:text-white transition-all shadow-2xs"
                  >
                    Open Executive Medical Record →
                  </Link>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 3: BEDSIDE VITALS & NOTES */}
      {activeTab === "care" && (
        <div className="mx-auto max-w-4xl space-y-6">
          <Panel title="Bedside Clinical Vitals Entry & Nursing SOAP" subtitle="Record vital signs for Abebech Tadesse (ICU-01)">
            <form className="space-y-5 text-xs font-semibold text-black" onSubmit={handleSaveVitals}>
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Heart Pulse (bpm)
                  </label>
                  <input
                    type="number"
                    value={pulse}
                    onChange={(e) => setPulse(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Oxygen SpO₂ (%)
                  </label>
                  <input
                    type="number"
                    value={spo2}
                    onChange={(e) => setSpo2(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black"
                  />
                </div>
              </div>

              {/* Fluid Balance Chart */}
              <div className="rounded-2xl bg-[#FAFAFC] border border-black/5 p-4 space-y-3">
                <span className="text-xs font-bold text-black flex items-center gap-1.5">
                  <Activity className="size-4 text-black" /> 24-Hour Fluid Balance Tracker
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-[#86868B]">Total Fluid Intake (mL)</label>
                    <input
                      type="number"
                      value={fluidIntake}
                      onChange={(e) => setFluidIntake(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white p-2.5 text-xs font-bold text-black mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#86868B]">Total Urine Output (mL)</label>
                    <input
                      type="number"
                      value={fluidOutput}
                      onChange={(e) => setFluidOutput(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white p-2.5 text-xs font-bold text-black mt-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  Nursing Observation SOAP Note
                </label>
                <textarea
                  rows={3}
                  value={nursingNote}
                  onChange={(e) => setNursingNote(e.target.value)}
                  placeholder="Patient reports mild headache relief following fluid hydration. Wound dressing dry and intact. eGFR 42 monitored."
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                <HeartPulse className="size-4" /> Save Vitals & Calculate NEWS2 Score
              </button>
            </form>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 4: MEDICATION ADMINISTRATION */}
      {activeTab === "meds" && (
        <div className="space-y-6">
          <Panel title="Medication Administration Schedule" subtitle="5-Right Barcode Scanner verification workflow">
            <div className="space-y-3">
              {dueMeds.map((med) => (
                <div key={med.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#F5F5F7] p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-black text-sm">{med.drug}</h4>
                      <span className="rounded-full bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2] px-2 py-0.5 text-[10px] font-bold">
                        Due {med.dueTime}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#86868B] mt-0.5">
                      Patient: {med.patient} ({med.mrn}) · Route: {med.route} · Prescribed by {med.doctor}
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setVerifyingMed({
                        drugName: med.drug,
                        patientName: med.patient,
                        mrn: med.mrn,
                        dose: "50mg",
                        route: med.route,
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                  >
                    <Barcode className="size-4" /> Scan & Administer
                  </button>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 5: DOCTOR ORDERS */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <Panel title="Physician Orders Execution" subtitle="Review & acknowledge incoming doctor orders">
            <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
              <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#F5F5F7] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-extrabold text-black text-sm">Full Blood Count (FBC) Lab Order</p>
                    <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2 py-0.5 text-[10px] font-bold">
                      Requested
                    </span>
                  </div>
                  <p className="text-[#86868B] mt-0.5">Patient: Abebech Tadesse (MRN-8829) · Ordered by Dr. Bethlehem Tadesse</p>
                </div>

                <button
                  onClick={() => toast.success("Order acknowledged by Nurse. Sample collection scheduled.")}
                  className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  Acknowledge Order
                </button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 6: NURSING PROCEDURES */}
      {activeTab === "procedures" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="Bedside Clinical Procedures Log" subtitle="Log IV replacements, dressing changes & specimen collection">
            <div className="space-y-3">
              {[
                { title: "Surgical Wound Dressing Change", patient: "Dawit Yohannes", time: "10:30 AM", status: "Completed" },
                { title: "IV Peripheral Line Replacement (18G)", patient: "Abebech Tadesse", time: "11:15 AM", status: "Completed" },
              ].map((proc) => (
                <div key={proc.title} className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#FAFAFC] p-4">
                  <div>
                    <p className="font-extrabold text-black text-sm">{proc.title}</p>
                    <p className="text-xs font-medium text-[#86868B]">{proc.patient} · {proc.time}</p>
                  </div>
                  <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-3 py-1 text-xs font-bold">
                    ✓ {proc.status}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 7: SHIFT HANDOVER */}
      {activeTab === "handover" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="AI-Generated Nursing Shift Handover Report" subtitle="Automated summary for incoming shift">
            <div className="space-y-4 text-xs font-semibold text-[#1D1D1F]">
              <div className="rounded-2xl border border-black/10 bg-[#FAFAFC] p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-black/5 pb-2">
                  <span className="font-extrabold text-black text-sm">Shift Report: Day Shift → Evening Shift</span>
                  <span className="text-[#86868B]">Date: {new Date().toLocaleDateString()}</span>
                </div>

                <p className="text-xs leading-relaxed text-[#1D1D1F]">
                  <strong>Ward Summary:</strong> 3 patients actively monitored in Ward A / ICU.
                  <br /><br />
                  <strong>1. Abebech Tadesse (ICU-01):</strong> eGFR 42 stable. Sumatriptan 50mg administered at 14:00. Vitals stable at 124/82. NEWS2 score = 1.
                  <br />
                  <strong>2. Dawit Yohannes (ICU-02):</strong> Post-op appendectomy. Surgical dressing dry & intact. FBC lab sample collected.
                  <br />
                  <strong>3. Tigist Alemu (Ward A-04):</strong> Routine diabetic blood sugar monitoring intact.
                </p>
              </div>

              <button
                onClick={() => toast.success("Shift Handover report signed & submitted to Evening Shift Nurse.")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                <FileCheck className="size-4" /> Sign Off & Deliver Shift Handover
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 8: EMERGENCY PROTOCOLS */}
      {activeTab === "emergency" && (
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <Panel title="Emergency & Rapid Response Protocols" subtitle="Code Blue & Critical Escalations">
            <div className="p-6 space-y-6">
              <div className="grid size-20 place-items-center rounded-full bg-[#FDE8E7] text-[#D70015] border-2 border-[#F9BDBD] mx-auto shadow-lg">
                <ShieldAlert className="size-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-black">Hospital Emergency Trigger</h3>
                <p className="text-xs font-medium text-[#86868B] max-w-md mx-auto">
                  Activating Code Blue broadcasts an emergency alert to all attending physicians, ICU staff, and hospital command centre.
                </p>
              </div>

              <button
                onClick={() => {
                  setCodeBlueActive(true);
                  toast.error("🚨 CODE BLUE TRIGGERED. DISPATCHING EMERGENCY CARDIAC TEAM.");
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-[#FF3B30] py-4 text-sm font-black text-white shadow-xl hover:bg-red-700 transition-all scale-105 cursor-pointer"
              >
                <ShieldAlert className="size-5" /> ACTIVATE CODE BLUE (BEDSIDE EMERGENCY)
              </button>
            </div>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
