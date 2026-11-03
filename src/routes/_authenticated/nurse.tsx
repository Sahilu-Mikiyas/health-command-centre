import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Barcode,
  CheckCircle2,
  Download,
  FileCheck,
  FileText,
  HeartPulse,
  Pill,
  RotateCcw,
  ShieldAlert,
  Syringe,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { HandoffBoard } from "@/components/hip/handoff-board";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";
import { supabase } from "@/integrations/supabase/client";
import { activeEncountersQuery, ordersQuery } from "@/lib/hip/clinical-queries";
import { emitEvent, recordScoredVitals } from "@/lib/hip/mutations";
import { computeNews2, type Consciousness } from "@/lib/hip/news2";
import { generateMAR, generateTriageChart } from "@/lib/hip/pdf-engine";
import { myProfileQuery, patientRecordQuery, patientsQuery } from "@/lib/hip/queries";
import {
  bedBoardQuery,
  journeyQuery,
  workQueueQuery,
  type JourneyRow,
  type WorkOrderRow,
} from "@/lib/hip/workflow";

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
  "overview" | "mypatients" | "care" | "meds" | "orders" | "procedures" | "handover" | "emergency";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (value: string) => UUID_RE.test(value);

/** Stages where the patient is in nursing hands. */
const NURSING_STAGES = ["nurse", "ward"];

type LatestVitals = {
  patient_id: string;
  systolic: number | null;
  diastolic: number | null;
  heart_rate: number | null;
  spo2: number | null;
  respiratory_rate: number | null;
  temperature_c: number | null;
  news2: number | null;
  recorded_at: string;
};

type AdministeredEvent = {
  entity_id: string | null;
  occurred_at: string;
  actor_label: string | null;
};

function toNum(value: string) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function ageFromDob(dob: string | null | undefined) {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return String(age);
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function vitalsLine(v: LatestVitals | undefined) {
  if (!v) return "No vitals yet";
  const bp = v.systolic != null ? `${v.systolic}/${v.diastolic ?? "–"}` : "BP –";
  return `${bp} · HR ${v.heart_rate ?? "–"} · SpO₂ ${v.spo2 ?? "–"}%`;
}

function news2Tone(score: number | null | undefined): "healthy" | "busy" | "critical" | "offline" {
  if (score == null) return "offline";
  if (score >= 7) return "critical";
  if (score >= 5) return "critical";
  if (score >= 3) return "busy";
  return "healthy";
}

function currentShift() {
  const h = new Date().getHours();
  if (h >= 8 && h < 16) return { name: "Day Shift", hours: "08:00 - 16:00", next: "Evening Shift" };
  if (h >= 16) return { name: "Evening Shift", hours: "16:00 - 00:00", next: "Night Shift" };
  return { name: "Night Shift", hours: "00:00 - 08:00", next: "Day Shift" };
}

const MED_STATUS_LABEL: Record<string, string> = {
  requested: "Awaiting pharmacy",
  in_progress: "Pharmacy preparing",
  resulted: "Pharmacy verified",
  completed: "Dispensed — ready",
};

function NurseContent() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<NurseTab>("overview");
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");

  // Code Blue Emergency State
  const [codeBlue, setCodeBlue] = useState<{ location: string; patient: string | null } | null>(
    null,
  );

  // Barcode Verification Modal State
  const [verifyingMed, setVerifyingMed] = useState<{
    orderId: string;
    patientId: string;
    encounterId: string | null;
    drugName: string;
    patientName: string;
    mrn: string;
    dose: string;
    route: string;
  } | null>(null);

  const [scanStep, setScanStep] = useState<"idle" | "scanning" | "verified" | "administered">(
    "idle",
  );
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());

  // Form states for Care tab
  const [systolic, setSystolic] = useState("124");
  const [diastolic, setDiastolic] = useState("82");
  const [pulse, setPulse] = useState("74");
  const [spo2, setSpo2] = useState("98");
  const [respRate, setRespRate] = useState("16");
  const [temp, setTemp] = useState("36.8");
  const [consciousness, setConsciousness] = useState<Consciousness>("A");
  const [onOxygen, setOnOxygen] = useState(false);
  const [nursingNote, setNursingNote] = useState("");
  const [fluidIntake, setFluidIntake] = useState("1200");
  const [fluidOutput, setFluidOutput] = useState("1400");

  // Queries
  const me = useQuery(myProfileQuery);
  const encounters = useQuery({ ...activeEncountersQuery, refetchInterval: 15000 });
  const journey = useQuery({ ...journeyQuery, refetchInterval: 15000 });
  const beds = useQuery(bedBoardQuery);
  const patients = useQuery(patientsQuery(""));
  const medOrders = useQuery({ ...workQueueQuery("medication"), refetchInterval: 20000 });
  const allOrders = useQuery({ ...workQueueQuery("all"), refetchInterval: 20000 });
  const wardCodes = useQuery({
    queryKey: ["wards", "codes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wards").select("name,departments(code)");
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as {
        name: string;
        departments: { code: string } | null;
      }[];
      return new Map(rows.map((w) => [w.name, w.departments?.code ?? null]));
    },
  });

  const nurseName =
    me.data?.staff?.full_name ?? me.data?.profile?.full_name ?? me.data?.email ?? "Duty Nurse";

  // Real nursing roster: live encounters in triage or on the ward.
  const roster: JourneyRow[] = (journey.data ?? []).filter((j) => NURSING_STAGES.includes(j.stage));
  const rosterPatientIds = roster.map((r) => r.patient_id);

  const latestVitals = useQuery({
    queryKey: ["vitals", "latest", rosterPatientIds.join(",")],
    enabled: rosterPatientIds.length > 0,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vitals")
        .select(
          "patient_id,systolic,diastolic,heart_rate,spo2,respiratory_rate,temperature_c,news2,recorded_at",
        )
        .in("patient_id", rosterPatientIds)
        .order("recorded_at", { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);
      const latest = new Map<string, LatestVitals>();
      for (const row of (data ?? []) as LatestVitals[]) {
        if (!latest.has(row.patient_id)) latest.set(row.patient_id, row);
      }
      return latest;
    },
  });

  // Administrations are recorded on the event stream (pharmacy owns order status).
  const administered = useQuery({
    queryKey: ["nurse", "administered"],
    refetchInterval: 20000,
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("entity_id,occurred_at,actor_label")
        .eq("event_type", "medication.administered")
        .gte("occurred_at", since)
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      const byOrder = new Map<string, AdministeredEvent>();
      for (const row of (data ?? []) as AdministeredEvent[]) {
        if (row.entity_id && !byOrder.has(row.entity_id)) byOrder.set(row.entity_id, row);
      }
      return byOrder;
    },
  });

  // Fall back to the first live encounter so we never query with a placeholder id.
  const activePatientId =
    selectedPatientId || roster[0]?.patient_id || (encounters.data ?? [])[0]?.patient_id || "";
  const orders = useQuery({ ...ordersQuery(activePatientId), enabled: isUuid(activePatientId) });
  const record = useQuery({
    ...patientRecordQuery(activePatientId),
    enabled: isUuid(activePatientId),
  });

  const bedById = new Map((beds.data ?? []).map((b) => [b.id, b]));
  const bedLabel = (j: JourneyRow | undefined) => {
    const bed = j?.bed_id ? bedById.get(j.bed_id) : undefined;
    return bed ? bed.label : j?.stage === "nurse" ? "Triage" : "Unassigned";
  };
  const wardName = (j: JourneyRow | undefined) => {
    const bed = j?.bed_id ? bedById.get(j.bed_id) : undefined;
    return bed?.rooms?.wards?.name ?? j?.departments?.name ?? null;
  };

  const activeEncounter =
    (journey.data ?? []).find((j) => j.patient_id === activePatientId) ?? undefined;
  const activePatient = record.data?.patient ?? null;
  const activePatientName =
    activePatient?.full_name ??
    activeEncounter?.patients?.full_name ??
    (patients.data ?? []).find((p) => p.id === activePatientId)?.full_name ??
    "No patient selected";
  const activeMrn = activePatient?.mrn ?? activeEncounter?.patients?.mrn ?? "—";
  const activeAllergies = (record.data?.allergies ?? []).map((a) => a.substance).join(", ");

  const liveNews2 = computeNews2({
    respiratoryRate: toNum(respRate),
    spo2: toNum(spo2),
    supplementalO2: onOxygen,
    systolic: toNum(systolic),
    pulse: toNum(pulse),
    consciousness,
    temperatureC: toNum(temp),
  });

  const rosterSet = new Set(rosterPatientIds);
  const dueMeds = (medOrders.data ?? []).filter(
    (o) =>
      ["requested", "in_progress", "resulted", "completed"].includes(o.status) &&
      (rosterSet.size === 0 || rosterSet.has(o.patient_id)),
  );
  const medsOutstanding = dueMeds.filter((o) => !administered.data?.has(o.id));
  const pendingOrdersFor = (patientId: string) =>
    (allOrders.data ?? []).filter(
      (o) => o.patient_id === patientId && (o.status === "requested" || o.status === "in_progress"),
    );
  const rosterPendingOrders = (allOrders.data ?? []).filter(
    (o) => rosterSet.has(o.patient_id) && (o.status === "requested" || o.status === "in_progress"),
  );
  const procedureOrders = (allOrders.data ?? []).filter(
    (o) => o.category === "procedure" && (rosterSet.size === 0 || rosterSet.has(o.patient_id)),
  );
  const highRisk = roster.filter((r) => (latestVitals.data?.get(r.patient_id)?.news2 ?? 0) >= 5);
  const shift = currentShift();

  const invalidateClinical = () => {
    queryClient.invalidateQueries({ queryKey: ["vitals"] });
    queryClient.invalidateQueries({ queryKey: ["patient", activePatientId] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  // ---------------------------------------------------------------- mutations
  const vitalsMut = useMutation({
    mutationFn: async () => {
      if (!isUuid(activePatientId)) throw new Error("Select a patient before recording vitals");
      const ward = wardName(activeEncounter);
      const departmentCode =
        (ward ? wardCodes.data?.get(ward) : null) ?? activeEncounter?.departments?.code ?? "TRIAGE";
      const saved = await recordScoredVitals({
        patientId: activePatientId,
        systolic: toNum(systolic),
        diastolic: toNum(diastolic),
        heartRate: toNum(pulse),
        spo2: toNum(spo2),
        respiratoryRate: toNum(respRate),
        temperatureC: toNum(temp),
        news2: liveNews2.score,
        band: liveNews2.band,
        consciousness,
        supplementalO2: onOxygen,
        departmentCode,
      });
      const note = nursingNote.trim();
      if (note || fluidIntake || fluidOutput) {
        await emitEvent({
          eventType: "nurse.observation_note",
          departmentCode,
          entityType: "patient",
          entityId: activePatientId,
          payload: {
            note: note || null,
            fluid_intake_ml: toNum(fluidIntake),
            fluid_output_ml: toNum(fluidOutput),
            vitals_id: saved.id,
          },
        });
      }
      return saved;
    },
    onSuccess: (saved) => {
      const msg = `Vitals recorded for ${activePatientName}: ${systolic}/${diastolic} mmHg, HR ${pulse}, RR ${respRate}, SpO₂ ${spo2}%. NEWS2 ${saved.news2} (${liveNews2.label} risk).`;
      if (liveNews2.band === "high" || liveNews2.band === "medium")
        toast.error(msg, { duration: 6000 });
      else if (liveNews2.band === "low_medium") toast.warning(msg);
      else toast.success(msg);
      setNursingNote("");
      invalidateClinical();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const codeBlueMut = useMutation({
    mutationFn: async () => {
      const ward = wardName(activeEncounter);
      const location = activeEncounter
        ? `${ward ?? "Nursing station"} · ${bedLabel(activeEncounter)}`
        : "Nursing station";
      const patientName = activeEncounter ? activePatientName : null;
      const departmentCode =
        (ward ? wardCodes.data?.get(ward) : null) ?? activeEncounter?.departments?.code ?? "ED";
      await emitEvent({
        eventType: "code_blue.activated",
        severity: "critical",
        departmentCode,
        entityType: activeEncounter ? "encounter" : null,
        entityId: activeEncounter?.id ?? null,
        payload: {
          location,
          patient: patientName,
          patient_id: activeEncounter?.patient_id ?? null,
          mrn: activeEncounter ? activeMrn : null,
          activated_by: nurseName,
          activated_at: new Date().toISOString(),
        },
      });
      return { location, patient: patientName };
    },
    onSuccess: (info) => {
      setCodeBlue(info);
      toast.error("Code Blue broadcast to Command Centre", { duration: 6000 });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: Error) => toast.error(`Code Blue broadcast failed: ${err.message}`),
  });

  const administerMut = useMutation({
    mutationFn: async (med: NonNullable<typeof verifyingMed>) => {
      await emitEvent({
        eventType: "medication.administered",
        entityType: "order",
        entityId: med.orderId,
        payload: {
          patient_id: med.patientId,
          encounter_id: med.encounterId,
          patient: med.patientName,
          mrn: med.mrn,
          drug: med.drugName,
          dose: med.dose,
          route: med.route,
          administered_by: nurseName,
          five_rights_verified: true,
        },
      });
      return med;
    },
    onSuccess: (med) => {
      setScanStep("administered");
      toast.success(
        `Administered ${med.drugName} to ${med.patientName}. 5-Right Verification Logged.`,
      );
      queryClient.invalidateQueries({ queryKey: ["nurse", "administered"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setTimeout(() => {
        setVerifyingMed(null);
        setScanStep("idle");
      }, 1500);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const acknowledgeMut = useMutation({
    mutationFn: async (order: { id: string; name: string; category: string }) => {
      await emitEvent({
        eventType: "order.acknowledged_by_nurse",
        entityType: "order",
        entityId: order.id,
        payload: {
          name: order.name,
          category: order.category,
          patient_id: activePatientId,
          nurse: nurseName,
        },
      });
      return order;
    },
    onSuccess: (order) => {
      setAcknowledged((prev) => new Set(prev).add(order.id));
      toast.success(`${order.name} acknowledged by ${nurseName}.`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handoverMut = useMutation({
    mutationFn: async () => {
      await emitEvent({
        eventType: "nurse.handover_signed",
        departmentCode: "WARD",
        payload: {
          from_shift: shift.name,
          to_shift: shift.next,
          signed_by: nurseName,
          patients: roster.map((r) => ({
            patient_id: r.patient_id,
            name: r.patients?.full_name ?? null,
            bed: bedLabel(r),
            news2: latestVitals.data?.get(r.patient_id)?.news2 ?? null,
            pending_orders: pendingOrdersFor(r.patient_id).length,
          })),
        },
      });
    },
    onSuccess: () => toast.success(`Shift handover signed & delivered to ${shift.next}.`),
    onError: (err: Error) => toast.error(err.message),
  });

  // ---------------------------------------------------------------- helpers
  const handleAdministerMed = () => {
    setScanStep("scanning");
    setTimeout(() => setScanStep("verified"), 1200);
  };

  const openMed = (med: WorkOrderRow) =>
    setVerifyingMed({
      orderId: med.id,
      patientId: med.patient_id,
      encounterId: med.encounter_id,
      drugName: med.name,
      patientName: med.patients?.full_name ?? "Patient",
      mrn: med.patients?.mrn ?? "—",
      dose: med.instructions ?? "As prescribed",
      route:
        med.instructions
          ?.match(/\b(oral|po|iv|im|sc|subcut|topical|inhaled|pr|sl)\b/i)?.[0]
          ?.toUpperCase() ?? "As prescribed",
    });

  const downloadTriagePdf = (source: "form" | "latest") => {
    if (!isUuid(activePatientId)) {
      toast.error("Select a patient first");
      return;
    }
    const latest = latestVitals.data?.get(activePatientId) ?? record.data?.vitals?.[0];
    const useLatest = source === "latest" && latest;
    const news2Score = useLatest ? (latest.news2 ?? 0) : liveNews2.score;
    const news2Risk = useLatest
      ? news2Score >= 7
        ? "High"
        : news2Score >= 5
          ? "Medium"
          : "Low"
      : liveNews2.label;
    generateTriageChart({
      patientName: activePatientName,
      mrn: activeMrn,
      age: ageFromDob(activePatient?.date_of_birth ?? activeEncounter?.patients?.date_of_birth),
      gender: activePatient?.sex ?? "—",
      bp: useLatest
        ? `${latest.systolic ?? "–"}/${latest.diastolic ?? "–"}`
        : `${systolic}/${diastolic}`,
      temp: `${useLatest ? (latest.temperature_c ?? "–") : temp}°C`,
      hr: `${useLatest ? (latest.heart_rate ?? "–") : pulse} bpm`,
      spo2: `${useLatest ? (latest.spo2 ?? "–") : spo2}%`,
      rr: `${useLatest ? (latest.respiratory_rate ?? "–") : respRate} /min`,
      gcs: useLatest ? "—" : consciousness === "A" ? "Alert (ACVPU A)" : `ACVPU ${consciousness}`,
      news2Score,
      news2Risk,
      chiefComplaint: nursingNote || activeEncounter?.chief_complaint || "As documented",
      allergies: activeAllergies,
      nurseName,
    });
  };

  const patientOptions = (
    <select
      value={activePatientId}
      onChange={(e) => setSelectedPatientId(e.target.value)}
      className="rounded-2xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-xs font-bold text-black max-w-[260px]"
    >
      {!activePatientId && <option value="">Select patient…</option>}
      {roster.length > 0 && (
        <optgroup label="My roster">
          {roster.map((r) => (
            <option key={r.id} value={r.patient_id}>
              {r.patients?.full_name ?? "Patient"} · {bedLabel(r)}
            </option>
          ))}
        </optgroup>
      )}
      <optgroup label="All patients">
        {(patients.data ?? [])
          .filter((p) => !rosterSet.has(p.id))
          .map((p) => (
            <option key={p.id} value={p.id}>
              {p.full_name} ({p.mrn})
            </option>
          ))}
      </optgroup>
    </select>
  );

  const emptyRoster = (
    <p className="py-8 text-center text-xs font-semibold text-[#86868B]">
      {journey.isLoading
        ? "Loading roster…"
        : "No patients currently in nurse triage or on the ward. Patients appear here after reception hands them over."}
    </p>
  );

  return (
    <AppShell
      title="Nurse Execution Workspace & Patient Care"
      subtitle="Shift overview · Bedside vitals · Barcode medication administration · Doctor orders · Handover"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => downloadTriagePdf("latest")}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
          >
            <Download className="size-4" /> Download Triage Chart PDF
          </button>
          <button
            onClick={() => codeBlueMut.mutate()}
            disabled={codeBlueMut.isPending}
            className="inline-flex items-center gap-2 rounded-full bg-[#FF3B30] px-4 py-2 text-xs font-black text-white shadow-lg hover:bg-red-700 transition-all scale-105 cursor-pointer animate-pulse"
          >
            <ShieldAlert className="size-4" /> Trigger Code Blue Emergency
          </button>
        </div>
      }
    >
      <HandoffBoard role="nurse" />
      {/* Code Blue Emergency Active Banner */}
      {codeBlue && (
        <div className="rounded-2xl border border-[#F9BDBD] bg-[#FDE8E7] p-4 flex items-center justify-between gap-4 text-[#D70015] animate-in zoom-in-95">
          <div className="flex items-center gap-3">
            <ShieldAlert className="size-6 shrink-0 animate-bounce" />
            <div>
              <h3 className="text-base font-black uppercase tracking-wider">
                CODE BLUE ACTIVE — {codeBlue.location}
              </h3>
              <p className="text-xs font-bold">
                {codeBlue.patient ? `Patient: ${codeBlue.patient}. ` : ""}Broadcast to Command
                Centre by {nurseName}.
              </p>
            </div>
          </div>
          <button
            onClick={() => setCodeBlue(null)}
            className="rounded-full bg-[#D70015] text-white px-4 py-1.5 text-xs font-bold hover:bg-red-800 transition-colors shadow-2xs"
          >
            Dismiss Banner
          </button>
        </div>
      )}

      {/* Barcode Scanner Medication Verification Modal */}
      {verifyingMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="apple-card max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <span className="text-xs font-black uppercase text-black">
                5-Right Barcode Verification
              </span>
              <button
                onClick={() => {
                  setVerifyingMed(null);
                  setScanStep("idle");
                }}
                className="text-[#86868B] hover:text-black"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-2xl bg-[#FAFAFC] border border-black/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-black text-sm">
                  {verifyingMed.patientName}
                </span>
                <span className="rounded-full bg-black text-white px-2.5 py-0.5 text-[10px] font-bold">
                  {verifyingMed.mrn}
                </span>
              </div>
              <p className="text-xs font-bold text-[#1D1D1F]">{verifyingMed.drugName}</p>
              <p className="text-xs text-[#86868B]">
                Prescribed: {verifyingMed.dose} · {verifyingMed.route}
              </p>

              {scanStep === "idle" && (
                <div className="pt-2 text-center space-y-2">
                  <div className="grid size-12 place-items-center rounded-2xl bg-[#F5F5F7] mx-auto text-black border border-black/10">
                    <Barcode className="size-6" />
                  </div>
                  <p className="text-xs font-semibold text-[#86868B]">
                    Scan patient wristband and drug package barcode to verify
                  </p>
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
                  <p className="text-xs font-bold text-black">
                    Verifying 5-Rights against Electronic Medication Record...
                  </p>
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
                    onClick={() => administerMut.mutate(verifyingMed)}
                    disabled={administerMut.isPending}
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
              <Stat
                label="Assigned Patients"
                value={roster.length}
                hint={`${roster.filter((r) => r.stage === "nurse").length} triage · ${roster.filter((r) => r.stage === "ward").length} ward`}
              />
            </Panel>
            <Panel className="min-w-0">
              <Stat
                label="Medications Due"
                value={medsOutstanding.length}
                hint={`${dueMeds.length - medsOutstanding.length} administered (24h)`}
                tone={medsOutstanding.length > 0 ? "warn" : "ok"}
              />
            </Panel>
            <Panel className="min-w-0">
              <Stat
                label="Doctor Orders Pending"
                value={rosterPendingOrders.length}
                hint={rosterPendingOrders[0]?.name ?? "None outstanding"}
                tone={rosterPendingOrders.length > 0 ? "warn" : "ok"}
              />
            </Panel>
            <Panel className="min-w-0">
              <Stat
                label="High NEWS2 (≥5)"
                value={highRisk.length}
                hint={`${shift.name} ${shift.hours}`}
                tone={highRisk.length > 0 ? "crit" : "ok"}
              />
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <Panel
              title="My Inpatient Care Roster"
              subtitle="Patients in nurse triage or on the ward"
            >
              <div className="space-y-3">
                {roster.length === 0 && emptyRoster}
                {roster.map((r) => {
                  const v = latestVitals.data?.get(r.patient_id);
                  return (
                    <div
                      key={r.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#F5F5F7] p-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-black text-sm">
                            {r.patients?.full_name ?? "Patient"}
                          </span>
                          <span className="rounded-full bg-black text-white px-2.5 py-0.5 text-[10px] font-bold">
                            Bed: {bedLabel(r)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#86868B] mt-0.5">
                          {r.patients?.mrn} · {r.chief_complaint ?? "No chief complaint recorded"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-black numeric">
                          {vitalsLine(v)}
                        </span>
                        <StatusPill
                          status={news2Tone(v?.news2)}
                          label={v?.news2 != null ? `NEWS2 ${v.news2}` : "No NEWS2"}
                        />
                        <button
                          onClick={() => {
                            setSelectedPatientId(r.patient_id);
                            setActiveTab("care");
                          }}
                          className="rounded-full bg-black px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs"
                        >
                          Record Vitals →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>

            <Panel
              title="Shift Tasks & Reminders"
              subtitle="Generated from live orders & observations"
            >
              <div className="space-y-2 text-xs font-semibold text-[#1D1D1F]">
                {highRisk.map((r) => (
                  <label
                    key={`risk-${r.id}`}
                    className="flex items-center gap-2 rounded-2xl bg-[#FDE8E7] border border-[#F9BDBD] p-3 cursor-pointer text-[#D70015]"
                  >
                    <input type="checkbox" className="rounded" />
                    <span>
                      Escalate NEWS2 {latestVitals.data?.get(r.patient_id)?.news2} —{" "}
                      {r.patients?.full_name}
                    </span>
                  </label>
                ))}
                {medsOutstanding.slice(0, 6).map((m) => (
                  <label
                    key={`med-${m.id}`}
                    className="flex items-center gap-2 rounded-2xl bg-[#FAFAFC] border border-black/5 p-3 cursor-pointer"
                  >
                    <input type="checkbox" className="rounded" />
                    <span>
                      Administer {m.name} ({m.patients?.full_name ?? "Patient"})
                    </span>
                  </label>
                ))}
                {roster
                  .filter((r) => !latestVitals.data?.get(r.patient_id))
                  .map((r) => (
                    <label
                      key={`obs-${r.id}`}
                      className="flex items-center gap-2 rounded-2xl bg-[#FAFAFC] border border-black/5 p-3 cursor-pointer"
                    >
                      <input type="checkbox" className="rounded" />
                      <span>First set of observations & NEWS2 — {r.patients?.full_name}</span>
                    </label>
                  ))}
                {highRisk.length === 0 &&
                  medsOutstanding.length === 0 &&
                  roster.every((r) => latestVitals.data?.get(r.patient_id)) && (
                    <p className="py-4 text-center text-[#86868B]">No outstanding nursing tasks.</p>
                  )}
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: MY ASSIGNED PATIENTS */}
      {activeTab === "mypatients" && (
        <div className="space-y-6">
          <Panel title="Detailed Inpatient Care Roster" subtitle="Complete bedside overview">
            {roster.length === 0 && emptyRoster}
            <div className="grid gap-4 sm:grid-cols-3">
              {roster.map((r) => {
                const v = latestVitals.data?.get(r.patient_id);
                return (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-black/10 bg-white p-5 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-full bg-black text-white px-3 py-1 text-xs font-bold truncate">
                        {bedLabel(r)}
                      </span>
                      <StatusPill
                        status={news2Tone(v?.news2)}
                        label={
                          v?.news2 != null
                            ? `NEWS2 ${v.news2}`
                            : r.stage === "ward"
                              ? "Ward"
                              : "Triage"
                        }
                      />
                    </div>

                    <div>
                      <h3 className="font-extrabold text-black text-base">
                        {r.patients?.full_name ?? "Patient"}
                      </h3>
                      <p className="text-xs font-semibold text-[#86868B]">{r.patients?.mrn}</p>
                    </div>

                    <div className="rounded-xl bg-[#F5F5F7] p-3 text-xs space-y-1 font-semibold">
                      <p className="text-black">Complaint: {r.chief_complaint ?? "—"}</p>
                      <p className="text-[#86868B]">Vitals: {vitalsLine(v)}</p>
                      <p className="text-[#86868B]">
                        Pending orders: {pendingOrdersFor(r.patient_id).length}
                      </p>
                    </div>

                    <Link
                      to="/patients/$patientId"
                      params={{ patientId: r.patient_id }}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] py-2 text-xs font-bold text-black hover:bg-black hover:text-white transition-all shadow-2xs"
                    >
                      Open Executive Medical Record →
                    </Link>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 3: BEDSIDE VITALS & NOTES */}
      {activeTab === "care" && (
        <div className="mx-auto max-w-4xl space-y-6">
          <Panel
            title="Bedside Clinical Vitals Entry & Nursing SOAP"
            subtitle={`Record vital signs for ${activePatientName}${activeEncounter ? ` (${bedLabel(activeEncounter)})` : ""}`}
            action={
              <div className="flex items-center gap-2">
                {patientOptions}
                <button
                  type="button"
                  onClick={() => downloadTriagePdf("form")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                  title="Download PDF"
                >
                  <Download className="size-3" /> Download PDF
                </button>
              </div>
            }
          >
            <form
              className="space-y-5 text-xs font-semibold text-black"
              onSubmit={(e) => {
                e.preventDefault();
                vitalsMut.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-4">
                {[
                  { label: "Systolic BP (mmHg)", value: systolic, set: setSystolic },
                  { label: "Diastolic BP (mmHg)", value: diastolic, set: setDiastolic },
                  { label: "Heart Pulse (bpm)", value: pulse, set: setPulse },
                  { label: "Oxygen SpO₂ (%)", value: spo2, set: setSpo2 },
                  { label: "Resp. Rate (/min)", value: respRate, set: setRespRate },
                  { label: "Temperature (°C)", value: temp, set: setTemp, step: "0.1" },
                ].map((field) => (
                  <div key={field.label} className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                      {field.label}
                    </label>
                    <input
                      type="number"
                      step={field.step ?? "1"}
                      value={field.value}
                      onChange={(e) => field.set(e.target.value)}
                      className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black"
                    />
                  </div>
                ))}

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Consciousness (ACVPU)
                  </label>
                  <select
                    value={consciousness}
                    onChange={(e) => setConsciousness(e.target.value as Consciousness)}
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black"
                  >
                    <option value="A">Alert</option>
                    <option value="C">New Confusion</option>
                    <option value="V">Responds to Voice</option>
                    <option value="P">Responds to Pain</option>
                    <option value="U">Unresponsive</option>
                  </select>
                </div>

                <label className="flex items-end gap-2 pb-3 text-xs font-bold text-black cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onOxygen}
                    onChange={(e) => setOnOxygen(e.target.checked)}
                    className="rounded border-black/20"
                  />
                  On supplemental O₂
                </label>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#FAFAFC] p-4">
                <span className="text-xs font-bold text-black">Live NEWS2 (RCP scale 1)</span>
                <StatusPill
                  status={news2Tone(liveNews2.score)}
                  label={`NEWS2 ${liveNews2.score} · ${liveNews2.label} risk`}
                />
              </div>

              {/* Fluid Balance Chart */}
              <div className="rounded-2xl bg-[#FAFAFC] border border-black/5 p-4 space-y-3">
                <span className="text-xs font-bold text-black flex items-center gap-1.5">
                  <Activity className="size-4 text-black" /> 24-Hour Fluid Balance Tracker
                </span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-[#86868B]">
                      Total Fluid Intake (mL)
                    </label>
                    <input
                      type="number"
                      value={fluidIntake}
                      onChange={(e) => setFluidIntake(e.target.value)}
                      className="w-full rounded-xl border border-black/10 bg-white p-2.5 text-xs font-bold text-black mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-[#86868B]">
                      Total Urine Output (mL)
                    </label>
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
                  placeholder="Patient reports mild headache relief following fluid hydration. Wound dressing dry and intact."
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black"
                />
              </div>

              <button
                type="submit"
                disabled={vitalsMut.isPending || !isUuid(activePatientId)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              >
                <HeartPulse className="size-4" /> Save Vitals & Record NEWS2 ({liveNews2.score})
              </button>
            </form>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 4: MEDICATION ADMINISTRATION */}
      {activeTab === "meds" && (
        <div className="space-y-6">
          <Panel
            title="Medication Administration Schedule"
            subtitle="Doctor-prescribed medication orders · 5-Right barcode verification"
          >
            <div className="space-y-3">
              {dueMeds.length === 0 && (
                <p className="py-8 text-center text-xs font-semibold text-[#86868B]">
                  {medOrders.isLoading
                    ? "Loading medication orders…"
                    : "No active medication orders for your patients."}
                </p>
              )}
              {dueMeds.map((med) => {
                const given = administered.data?.get(med.id);
                return (
                  <div
                    key={med.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#F5F5F7] p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-black text-sm">{med.name}</h4>
                        {given ? (
                          <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2 py-0.5 text-[10px] font-bold">
                            Administered {fmtTime(given.occurred_at)}
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2] px-2 py-0.5 text-[10px] font-bold">
                            {MED_STATUS_LABEL[med.status] ?? med.status}
                          </span>
                        )}
                        {med.priority === "stat" && <StatusPill status="critical" label="STAT" />}
                      </div>
                      <p className="text-xs font-semibold text-[#86868B] mt-0.5">
                        Patient: {med.patients?.full_name ?? "Patient"} ({med.patients?.mrn ?? "—"})
                        · {med.instructions ?? "As prescribed"} · Prescribed by{" "}
                        {med.requested_by_label ?? "Doctor"} at {fmtTime(med.requested_at)}
                      </p>
                    </div>

                    <button
                      onClick={() => openMed(med)}
                      disabled={!!given}
                      className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Barcode className="size-4" /> {given ? "Logged" : "Scan & Administer"}
                    </button>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 5: DOCTOR ORDERS */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <Panel
            title="Physician Orders Execution"
            subtitle={`Orders for ${activePatientName} (${activeMrn})`}
            action={patientOptions}
          >
            <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
              {(orders.data ?? []).length === 0 && (
                <p className="py-8 text-center text-xs font-semibold text-[#86868B]">
                  {orders.isLoading ? "Loading orders…" : "No doctor orders for this patient."}
                </p>
              )}
              {(orders.data ?? []).map((order) => {
                const open = order.status === "requested" || order.status === "in_progress";
                const acked = acknowledged.has(order.id);
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#F5F5F7] p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-extrabold text-black text-sm">{order.name}</p>
                        <span className="rounded-full bg-white border border-black/10 px-2 py-0.5 text-[10px] font-bold capitalize">
                          {order.category}
                        </span>
                        <StatusPill
                          status={
                            order.status === "cancelled"
                              ? "offline"
                              : open
                                ? order.priority === "stat"
                                  ? "critical"
                                  : "busy"
                                : "healthy"
                          }
                          label={order.status.replace("_", " ")}
                        />
                      </div>
                      <p className="text-[#86868B] mt-0.5">
                        Ordered by {order.requested_by_label ?? "Doctor"} ·{" "}
                        {new Date(order.requested_at).toLocaleString()}
                        {order.instructions ? ` · ${order.instructions}` : ""}
                      </p>
                    </div>

                    {open && (
                      <button
                        onClick={() => acknowledgeMut.mutate(order)}
                        disabled={acked || acknowledgeMut.isPending}
                        className="rounded-full bg-black px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all cursor-pointer shadow-2xs shrink-0 disabled:opacity-40"
                      >
                        {acked ? "Acknowledged" : "Acknowledge Order"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 6: NURSING PROCEDURES */}
      {activeTab === "procedures" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel
            title="Bedside Clinical Procedures"
            subtitle="Procedure orders for patients on your roster"
          >
            <div className="space-y-3">
              {procedureOrders.length === 0 && (
                <p className="py-8 text-center text-xs font-semibold text-[#86868B]">
                  No procedure orders for your patients.
                </p>
              )}
              {procedureOrders.map((proc) => {
                const done = proc.status === "completed" || proc.status === "resulted";
                return (
                  <div
                    key={proc.id}
                    className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#FAFAFC] p-4"
                  >
                    <div>
                      <p className="font-extrabold text-black text-sm">{proc.name}</p>
                      <p className="text-xs font-medium text-[#86868B]">
                        {proc.patients?.full_name ?? "Patient"} · requested{" "}
                        {fmtTime(proc.requested_at)}
                        {proc.instructions ? ` · ${proc.instructions}` : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold border ${
                        done
                          ? "bg-[#E8F8EC] text-[#1D8A39] border-[#B6ECC3]"
                          : "bg-[#FFF4E5] text-[#B86200] border-[#FFE0B2]"
                      }`}
                    >
                      {done ? "✓ Completed" : proc.status.replace("_", " ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 7: SHIFT HANDOVER */}
      {activeTab === "handover" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel
            title="Nursing Shift Handover Report"
            subtitle="Generated from live roster, observations and orders"
            action={
              <button
                type="button"
                onClick={() => {
                  if (!isUuid(activePatientId)) {
                    toast.error("Select a patient first");
                    return;
                  }
                  generateMAR({
                    patientName: activePatientName,
                    mrn: activeMrn,
                    ward: wardName(activeEncounter) ?? "—",
                    bed: bedLabel(activeEncounter),
                    medications: (medOrders.data ?? [])
                      .filter((m) => m.patient_id === activePatientId)
                      .map((m) => {
                        const given = administered.data?.get(m.id);
                        return {
                          drug: m.name,
                          dose: m.instructions ?? "As prescribed",
                          route: "As prescribed",
                          time: given ? fmtTime(given.occurred_at) : "—",
                          status: given ? "Administered" : (MED_STATUS_LABEL[m.status] ?? m.status),
                        };
                      }),
                    nurseName,
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                title={`Download MAR for ${activePatientName}`}
              >
                <Download className="size-3" /> MAR PDF
              </button>
            }
          >
            <div className="space-y-4 text-xs font-semibold text-[#1D1D1F]">
              <div className="rounded-2xl border border-black/10 bg-[#FAFAFC] p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-black/5 pb-2">
                  <span className="font-extrabold text-black text-sm">
                    Shift Report: {shift.name} → {shift.next}
                  </span>
                  <span className="text-[#86868B]">Date: {new Date().toLocaleDateString()}</span>
                </div>

                <p className="text-xs leading-relaxed text-[#1D1D1F]">
                  <strong>Ward Summary:</strong> {roster.length} patient
                  {roster.length === 1 ? "" : "s"} under nursing care · {medsOutstanding.length}{" "}
                  medication{medsOutstanding.length === 1 ? "" : "s"} outstanding ·{" "}
                  {highRisk.length} with NEWS2 ≥ 5.
                </p>
                {roster.length === 0 && emptyRoster}
                <ol className="space-y-2">
                  {roster.map((r, i) => {
                    const v = latestVitals.data?.get(r.patient_id);
                    const pending = pendingOrdersFor(r.patient_id);
                    return (
                      <li key={r.id} className="text-xs leading-relaxed">
                        <strong>
                          {i + 1}. {r.patients?.full_name ?? "Patient"} ({bedLabel(r)}):
                        </strong>{" "}
                        {r.chief_complaint ?? "No chief complaint"}. Last obs {vitalsLine(v)}
                        {v ? ` at ${fmtTime(v.recorded_at)}` : ""}. NEWS2{" "}
                        {v?.news2 ?? "not recorded"}.{" "}
                        {pending.length > 0
                          ? `Pending: ${pending.map((o) => o.name).join(", ")}.`
                          : "No pending orders."}
                      </li>
                    );
                  })}
                </ol>
              </div>

              <button
                onClick={() => handoverMut.mutate()}
                disabled={handoverMut.isPending}
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
          <Panel
            title="Emergency & Rapid Response Protocols"
            subtitle="Code Blue & Critical Escalations"
          >
            <div className="p-6 space-y-6">
              <div className="grid size-20 place-items-center rounded-full bg-[#FDE8E7] text-[#D70015] border-2 border-[#F9BDBD] mx-auto shadow-lg">
                <ShieldAlert className="size-10" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-black">Hospital Emergency Trigger</h3>
                <p className="text-xs font-medium text-[#86868B] max-w-md mx-auto">
                  Activating Code Blue broadcasts a critical alert to the hospital command centre
                  for{" "}
                  <strong>
                    {activeEncounter
                      ? `${activePatientName} · ${bedLabel(activeEncounter)}`
                      : "the nursing station"}
                  </strong>
                  .
                </p>
                <div className="flex justify-center pt-1">{patientOptions}</div>
              </div>

              <button
                onClick={() => codeBlueMut.mutate()}
                disabled={codeBlueMut.isPending}
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
