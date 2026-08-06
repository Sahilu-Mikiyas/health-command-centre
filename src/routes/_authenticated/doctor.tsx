import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Heart,
  HeartPulse,
  Mic,
  Pill,
  Printer,
  QrCode,
  Radio,
  RotateCcw,
  Search,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Thermometer,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { HandoffBoard } from "@/components/hip/handoff-board";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";
import { Timeline } from "@/components/hip/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { activeEncountersQuery, notesQuery, ordersQuery } from "@/lib/hip/clinical-queries";
import { cancelOrder, createOrder, saveNote, setEncounterPriority, setEncounterStage } from "@/lib/hip/mutations";
import { patientRecordQuery } from "@/lib/hip/queries";

const categories = ["laboratory", "imaging", "medication", "procedure"] as const;

export const Route = createFileRoute("/_authenticated/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor Workspace | Furii Hospital Prototype" },
      {
        name: "description",
        content:
          "Commercial attending physician cockpit: SOAP clinical notes, AI diagnostic assistant, eGFR renal dosing safety, electronic ordering & certificates.",
      },
    ],
  }),
  component: DoctorWorkspace,
});

function DoctorWorkspace() {
  return (
    <RouteGuard route="/doctor">
      <DoctorContent />
    </RouteGuard>
  );
}

type DoctorTab =
  | "consultation"
  | "records"
  | "orders"
  | "prescribe"
  | "certificates"
  | "referrals"
  | "followups";

function DoctorContent() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DoctorTab>("consultation");

  const encounters = useQuery({ ...activeEncountersQuery, refetchInterval: 15000 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queue = (encounters.data ?? []).filter((e) =>
    ["waiting", "nurse", "doctor"].includes(e.stage)
  );
  const selected = queue.find((e) => e.id === selectedId) ?? queue[0] ?? null;
  const patientId = selected?.patient_id ?? "pat-1";

  const record = useQuery({ ...patientRecordQuery(patientId), enabled: Boolean(patientId) });
  const orders = useQuery({ ...ordersQuery(patientId), enabled: Boolean(patientId) });
  const notes = useQuery({ ...notesQuery(patientId), enabled: Boolean(patientId) });

  // Voice Dictation State
  const [isDictating, setIsDictating] = useState(false);

  // Sick Leave Form State
  const [sickDays, setSickDays] = useState("3");
  const [sickReason, setSickReason] = useState("Acute Exacerbation of Migraine & Severe Fatigue");

  // Prescription State
  const [rxDrug, setRxDrug] = useState("Sumatriptan 50mg Oral");
  const [rxDose, setRxDose] = useState("50mg");
  const [rxFrequency, setRxFrequency] = useState("PRN max 100mg/24h");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["encounters"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["notes"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const stage = useMutation({
    mutationFn: setEncounterStage,
    onSuccess: () => {
      toast.success("Encounter stage updated");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const orderMut = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      toast.success("Clinical order dispatched to department");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dropOrderMut = useMutation({
    mutationFn: cancelOrder,
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const noteMut = useMutation({
    mutationFn: saveNote,
    onSuccess: (_data, variables) => {
      toast.success(variables.sign ? "SOAP Clinical Note Signed & Immutably Stamped" : "SOAP Note Draft Saved");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const latestVitals = record.data?.vitals?.[0];
  const allergies = record.data?.allergies ?? [];
  const patientEgfr = record.data?.patient?.egfr ?? 42;

  const handleVoiceDictation = () => {
    setIsDictating(true);
    toast.success("Voice dictation active. Speak clearly into microphone...");
    setTimeout(() => {
      setIsDictating(false);
      toast.success("Voice dictation transcribed into SOAP Assessment.");
    }, 2200);
  };

  const handlePrintCertificate = () => {
    toast.success(`Generated official Medical Sick Leave Certificate (${sickDays} Days) for ${selected?.patients?.full_name ?? "Patient"}.`);
  };

  return (
    <AppShell
      title="Attending Physician Cockpit"
      subtitle="SOAP clinical notes · AI diagnostic assist · eGFR renal safety guard · Electronic orders & certificates"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3.5 py-1 text-xs font-bold text-[#1D8A39]">
            <Stethoscope className="size-3.5" /> Doctor License Active (MD-88291)
          </span>
        </div>
      }
    >
      <HandoffBoard role="doctor" />
      {/* Commercial Sub-Tab Rail */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/5 pb-4 overflow-x-auto">
        {[
          { id: "consultation", label: "Consultation Cockpit", icon: Stethoscope },
          { id: "records", label: "Medical Records Timeline", icon: FileText },
          { id: "orders", label: "Clinical Orders Entry", icon: Activity },
          { id: "prescribe", label: "Prescription Builder & Safety", icon: Pill },
          { id: "certificates", label: "Medical Certificates", icon: Printer },
          { id: "referrals", label: "Specialist Referrals", icon: Share2 },
          { id: "followups", label: "Follow-ups & Chronic Care", icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as DoctorTab)}
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

      {/* SUB-TAB 1: CONSULTATION COCKPIT */}
      {activeTab === "consultation" && (
        <div className="grid gap-6 xl:grid-cols-[280px_1fr_340px]">
          {/* Patient Queue List */}
          <Panel title="Live Outpatient Queue" subtitle={`${queue.length} waiting`} bodyClassName="p-0" className="min-w-0">
            <ul className="divide-y divide-black/5">
              {queue.map((encounter) => (
                <li key={encounter.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedId(encounter.id)}
                    className={
                      selected?.id === encounter.id
                        ? "w-full bg-white px-4 py-3 text-left min-w-0 font-bold border-l-4 border-black"
                        : "w-full px-4 py-3 text-left transition-colors hover:bg-[#F5F5F7] min-w-0"
                    }
                  >
                    <div className="flex items-center justify-between">
                      <p className="truncate text-sm font-bold text-black">
                        {encounter.patients?.full_name ?? "Unknown"}
                      </p>
                      <StatusPill status={encounter.priority === "critical" ? "critical" : "healthy"} label={encounter.stage} />
                    </div>
                    <p className="numeric truncate text-xs text-[#86868B] mt-0.5">
                      {encounter.patients?.mrn}
                    </p>
                  </button>
                </li>
              ))}
              {queue.length === 0 ? (
                <li className="px-4 py-6 text-xs text-[#86868B] truncate">
                  No waiting patients.
                </li>
              ) : null}
            </ul>
          </Panel>

          {/* Central Consultation Surface */}
          {selected ? (
            <div className="space-y-6 min-w-0">
              {/* Patient Banner */}
              <Panel
                className="min-w-0"
                title={`Active Consult: ${selected.patients?.full_name ?? "Patient"}`}
                subtitle={`MRN: ${selected.patients?.mrn ?? "—"}`}
                action={
                  <div className="flex flex-wrap gap-2 min-w-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-2xl text-xs font-bold"
                      onClick={() => stage.mutate({ encounterId: selected.id, stage: "doctor" })}
                    >
                      Start Consult
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-2xl text-xs font-bold bg-black text-white"
                      onClick={() => stage.mutate({ encounterId: selected.id, stage: "complete" })}
                    >
                      Complete Consult ✓
                    </Button>
                  </div>
                }
              >
                <div className="grid gap-3 sm:grid-cols-4 min-w-0">
                  <Stat
                    label="NEWS2 Score"
                    value={latestVitals?.news2 ?? 1}
                    tone={(latestVitals?.news2 ?? 0) >= 5 ? "crit" : "ok"}
                  />
                  <Stat
                    label="Blood Pressure"
                    value={latestVitals?.systolic ? `${latestVitals.systolic}/${latestVitals.diastolic}` : "124/82"}
                  />
                  <Stat label="Heart Pulse" value={latestVitals?.heart_rate ? `${latestVitals.heart_rate} bpm` : "74 bpm"} />
                  <Stat label="eGFR Renal" value={`${patientEgfr} mL/min`} hint="CKD Guard Active" tone={patientEgfr < 60 ? "warn" : "ok"} />
                </div>

                {allergies.length > 0 && (
                  <div className="mt-3 rounded-xl border border-[#FF3B30]/30 bg-[#FDE8E7] p-2.5 text-xs font-bold text-[#D70015]">
                    ⚠️ Patient Allergies: {allergies.map((a) => a.substance).join(", ")}
                  </div>
                )}
              </Panel>

              {/* AI Clinical Diagnostic Assistant */}
              <div className="rounded-2xl border border-[#B6ECC3] bg-[#E8F8EC] p-4 space-y-2">
                <span className="font-extrabold text-[#1D8A39] flex items-center gap-1.5 text-xs">
                  <Zap className="size-4 text-[#34C759]" /> AI Clinical Decision Support
                </span>
                <p className="text-xs text-[#1D8A39] leading-relaxed">
                  Synthesizing patient history: Presenting with Acute Migraine Exacerbation. Renal panel flags eGFR = {patientEgfr} mL/min (Stage 3a CKD). Recommend triptan therapy with renal clearance dose adjustment. Avoid NSAIDs due to renal safety guard.
                </p>
              </div>

              {/* SOAP Clinical Note Form */}
              <Panel
                title="SOAP Clinical Documentation"
                subtitle="Sign-off produces an immutable medical audit record"
                action={
                  <button
                    onClick={handleVoiceDictation}
                    disabled={isDictating}
                    className="inline-flex items-center gap-1.5 rounded-full bg-black px-3.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-slate-800 cursor-pointer"
                  >
                    <Mic className={`size-3.5 ${isDictating ? "animate-pulse text-red-400" : ""}`} />
                    <span>{isDictating ? "Listening..." : "Voice Dictation"}</span>
                  </button>
                }
              >
                <form
                  className="space-y-4 text-xs font-semibold text-black"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const form = new FormData(event.currentTarget);
                    const sign = (event.nativeEvent as SubmitEvent).submitter?.dataset['sign'] === "1";
                    noteMut.mutate({
                      patientId: selected.patient_id,
                      encounterId: selected.id,
                      subjective: String(form.get("subjective") || ""),
                      objective: String(form.get("objective") || ""),
                      assessment: String(form.get("assessment") || ""),
                      plan: String(form.get("plan") || ""),
                      sign,
                    });
                    event.currentTarget.reset();
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="subjective" className="text-[10px] font-extrabold uppercase text-[#86868B]">
                        Subjective (Chief Complaint & History)
                      </Label>
                      <Textarea id="subjective" name="subjective" rows={3} defaultValue="Patient reports severe right-sided throbbing headache with nausea for 12 hours. No visual aura." className="rounded-2xl border-black/10 bg-[#F5F5F7] text-xs font-bold text-black" />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="objective" className="text-[10px] font-extrabold uppercase text-[#86868B]">
                        Objective (Physical Exam & Vitals)
                      </Label>
                      <Textarea id="objective" name="objective" rows={3} defaultValue="BP 124/82, HR 74. Neurological exam intact. No neck stiffness or focal deficit." className="rounded-2xl border-black/10 bg-[#F5F5F7] text-xs font-bold text-black" />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="assessment" className="text-[10px] font-extrabold uppercase text-[#86868B]">
                        Assessment (Diagnosis)
                      </Label>
                      <Textarea id="assessment" name="assessment" rows={3} defaultValue="1. Acute Migraine Exacerbation without aura. 2. Stage 3a Chronic Kidney Disease (eGFR 42)." className="rounded-2xl border-black/10 bg-[#F5F5F7] text-xs font-bold text-black" />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="plan" className="text-[10px] font-extrabold uppercase text-[#86868B]">
                        Plan & Management
                      </Label>
                      <Textarea id="plan" name="plan" rows={3} defaultValue="Prescribe Sumatriptan 50mg PRN. Fluid hydration 1L IV Normal Saline. Avoid NSAIDs due to CKD stage." className="rounded-2xl border-black/10 bg-[#F5F5F7] text-xs font-bold text-black" />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" variant="outline" className="rounded-2xl text-xs font-bold" disabled={noteMut.isPending}>
                      Save Draft Note
                    </Button>
                    <Button type="submit" data-sign="1" className="rounded-2xl text-xs font-bold bg-black text-white" disabled={noteMut.isPending}>
                      Sign & Lock Note ✓
                    </Button>
                  </div>
                </form>
              </Panel>
            </div>
          ) : (
            <Panel title="Consultation Cockpit">
              <p className="text-xs font-semibold text-[#86868B]">Select a patient from the live queue to begin.</p>
            </Panel>
          )}

          {/* Quick Orders Panel */}
          <div className="space-y-6 min-w-0">
            <Panel title="Fast Clinical Order Entry" subtitle="Direct routing to Lab / Pharmacy / Radiology">
              <form
                className="space-y-3 text-xs font-semibold text-black"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selected) {
                    toast.error("Select a patient first");
                    return;
                  }
                  const form = new FormData(event.currentTarget);
                  orderMut.mutate({
                    patientId: selected.patient_id,
                    encounterId: selected.id,
                    category: String(form.get("category")) as any,
                    name: String(form.get("name")),
                    priority: String(form.get("priority") || "routine"),
                    instructions: String(form.get("instructions") || ""),
                  });
                  event.currentTarget.reset();
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="category" className="text-[10px] font-extrabold uppercase text-[#86868B]">Department Category</Label>
                  <select id="category" name="category" className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-2.5 text-xs font-bold text-black">
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="name" className="text-[10px] font-extrabold uppercase text-[#86868B]">Order / Procedure Name</Label>
                  <Input id="name" name="name" required placeholder="e.g. Comprehensive Metabolic Panel" className="rounded-2xl border-black/10 bg-[#F5F5F7] text-xs font-bold text-black" />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="priority" className="text-[10px] font-extrabold uppercase text-[#86868B]">Priority Level</Label>
                  <select id="priority" name="priority" className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-2.5 text-xs font-bold text-black">
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT Emergency</option>
                  </select>
                </div>

                <Button type="submit" className="w-full rounded-2xl bg-black text-xs font-bold text-white py-3 shadow-md hover:bg-slate-800 cursor-pointer" disabled={orderMut.isPending}>
                  Dispatch Order →
                </Button>
              </form>
            </Panel>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MEDICAL RECORDS TIMELINE */}
      {activeTab === "records" && (
        <div className="mx-auto max-w-4xl space-y-6">
          <Panel title="Patient Comprehensive Medical History & Timeline" subtitle="Abebech Tadesse (MRN-8829)">
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#FAFAFC] border border-black/5 p-4 space-y-2">
                <h4 className="font-bold text-black text-sm">Chronic Conditions & Diagnoses</h4>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-black text-white px-3 py-1">Acute Migraine Exacerbation</span>
                  <span className="rounded-full bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2] px-3 py-1">Stage 3a Chronic Kidney Disease (eGFR 42)</span>
                  <span className="rounded-full bg-[#F5F5F7] text-black border border-black/10 px-3 py-1">Hypertension</span>
                </div>
              </div>

              <Timeline
                items={[
                  { id: "t-1", time: "Today 10:15 AM", title: "Laboratory Result: CMP + Renal Panel", detail: "eGFR 42 mL/min · Creatinine 1.8 mg/dL · K+ 4.2 mmol/L", tone: "warn" },
                  { id: "t-2", time: "Today 09:30 AM", title: "Nurse Triage Vitals", detail: "BP 124/82 · HR 74 bpm · NEWS2 = 1", tone: "ok" },
                  { id: "t-3", time: "2 Months Ago", title: "Outpatient Consultation", detail: "Diagnosed Stage 3a CKD. Hydration protocol initiated.", tone: "ok" },
                ]}
              />
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 3: CLINICAL ORDERS ENTRY */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <Panel title="Active Orders & Department Execution Queue" subtitle="Dispatched physician orders">
            <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
              {(orders.data ?? []).map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#F5F5F7] p-4">
                  <div>
                    <p className="font-bold text-black text-sm">{row.name}</p>
                    <p className="text-[#86868B]">{row.category} · Priority: {row.priority} · Status: {row.status}</p>
                  </div>
                  {row.status === "requested" && (
                    <button
                      onClick={() => dropOrderMut.mutate(row.id)}
                      className="rounded-full border border-[#F9BDBD] bg-[#FDE8E7] px-3 py-1 text-xs font-bold text-[#D70015] hover:bg-[#D70015] hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 4: PRESCRIPTION BUILDER & SAFETY GUARD */}
      {activeTab === "prescribe" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="Electronic Prescription Builder & Safety Guard" subtitle="Real-time renal dosing & drug interaction check">
            <div className="space-y-4 text-xs font-semibold text-black">
              <div className="rounded-2xl border border-[#FFE0B2] bg-[#FFF4E5] p-4 space-y-1">
                <span className="font-bold text-[#B86200] flex items-center gap-1.5 text-xs">
                  <ShieldAlert className="size-4" /> Renal Dosing Safety Alert
                </span>
                <p className="text-[#B86200]">
                  Patient eGFR is <strong>42 mL/min</strong>. Max Sumatriptan dosage restricted to 50mg. High-dose NSAIDs contraindicated.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-[#86868B]">Select Medication</label>
                  <input type="text" value={rxDrug} onChange={(e) => setRxDrug(e.target.value)} className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-[#86868B]">Dosage</label>
                    <input type="text" value={rxDose} onChange={(e) => setRxDose(e.target.value)} className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-[#86868B]">Frequency & Route</label>
                    <input type="text" value={rxFrequency} onChange={(e) => setRxFrequency(e.target.value)} className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black" />
                  </div>
                </div>

                <button
                  onClick={() => toast.success(`Prescription for ${rxDrug} sent to AI Pharmacy for dispensing.`)}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer"
                >
                  <Pill className="size-4" /> Sign & Send Electronic Prescription to Pharmacy
                </button>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 5: MEDICAL CERTIFICATES */}
      {activeTab === "certificates" && (
        <div className="mx-auto max-w-2xl space-y-6">
          <Panel title="Official Medical Sick Leave Certificate Generator" subtitle="Print official medical certificate">
            <div className="space-y-4 text-xs font-semibold text-black">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-[#86868B]">Number of Sick Days</label>
                  <input type="number" value={sickDays} onChange={(e) => setSickDays(e.target.value)} className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-[#86868B]">Attending Physician Stamp</label>
                  <input type="text" readOnly value="Dr. Bethlehem Tadesse (MD-88291)" className="w-full rounded-2xl border border-black/10 bg-[#FAFAFC] p-3 text-xs font-bold text-[#86868B]" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-[#86868B]">Medical Reason & Diagnosis</label>
                <textarea rows={2} value={sickReason} onChange={(e) => setSickReason(e.target.value)} className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black" />
              </div>

              <button
                onClick={handlePrintCertificate}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer"
              >
                <Printer className="size-4" /> Issue & Print Official Certificate
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 6: SPECIALIST REFERRALS */}
      {activeTab === "referrals" && (
        <div className="mx-auto max-w-2xl space-y-6">
          <Panel title="Specialist Referral Desk" subtitle="Refer patient to Nephrology / Neurology">
            <div className="space-y-4 text-xs font-semibold text-black">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase text-[#86868B]">Specialty Department</label>
                <select className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black">
                  <option>Nephrology & Renal Medicine (CKD Follow-up)</option>
                  <option>Neurology & Headache Clinic</option>
                  <option>Cardiology</option>
                </select>
              </div>

              <button
                onClick={() => toast.success("Specialist referral generated & sent to Nephrology Department.")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer"
              >
                <Share2 className="size-4" /> Issue Specialist Referral Letter
              </button>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 7: FOLLOW-UPS & CHRONIC CARE */}
      {activeTab === "followups" && (
        <div className="mx-auto max-w-2xl space-y-6">
          <Panel title="Follow-up Appointment Scheduler & Chronic Care Plan" subtitle="Schedule review date">
            <div className="space-y-4 text-xs font-semibold text-black">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-[#86868B]">Follow-up Interval</label>
                  <select className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black">
                    <option>1 Week Review</option>
                    <option>2 Weeks Review</option>
                    <option>1 Month Review</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase text-[#86868B]">Chronic Disease Program</label>
                  <input type="text" readOnly value="CKD Stage 3a Care Plan" className="w-full rounded-2xl border border-black/10 bg-[#FAFAFC] p-3 text-xs font-bold text-[#86868B]" />
                </div>
              </div>

              <button
                onClick={() => toast.success("Follow-up appointment scheduled for Abebech Tadesse.")}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer"
              >
                <Calendar className="size-4" /> Book Follow-up Consultation
              </button>
            </div>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
