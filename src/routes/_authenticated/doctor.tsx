import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Download,
  FileText,
  Maximize2,
  Minimize2,
  Pill,
  Plus,
  Printer,
  Radio,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { DoctorInbox } from "@/components/hip/doctor-inbox";
import { HandoffBoard } from "@/components/hip/handoff-board";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";
import { Timeline, type TimelineItem } from "@/components/hip/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { resultInboxQuery, type ResultInboxRow } from "@/lib/hip/alerts";
import {
  activeEncountersQuery,
  notesQuery,
  ordersQuery,
  type NoteRow,
  type OrderRow,
} from "@/lib/hip/clinical-queries";
import {
  bookAppointment,
  cancelOrder,
  createOrder,
  emitEvent,
  saveNote,
  setEncounterStage,
} from "@/lib/hip/mutations";
import {
  generateDischargeSummary,
  generateReferralLetter,
  generateSickLeaveCert,
  generateSOAPSummary,
} from "@/lib/hip/pdf-engine";
import { myProfileQuery, patientRecordQuery } from "@/lib/hip/queries";

const categories = ["laboratory", "imaging", "medication", "procedure"] as const;

const REFERRAL_SPECIALTIES = [
  "Nephrology & Renal Medicine",
  "Endocrinology & Diabetes",
  "Cardiology",
  "Gastroenterology & Hepatology",
  "Pulmonology & Respiratory Medicine",
  "Neurology",
  "Rheumatology",
  "General Surgery",
  "Obstetrics & Gynaecology",
] as const;

export const Route = createFileRoute("/_authenticated/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor Workspace | Furii Hospital Prototype" },
      {
        name: "description",
        content:
          "Attending physician cockpit: SOAP clinical notes, rule-based clinical decision support, eGFR renal dosing safety, electronic ordering & certificates.",
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
  | "inbox"
  | "records"
  | "orders"
  | "prescribe"
  | "certificates"
  | "referrals"
  | "followups";

/* ----------------------------- helpers ----------------------------- */

const DAY_MS = 24 * 60 * 60 * 1000;

function ageFromDob(dob: string | null | undefined): string {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "—";
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate());
  if (beforeBirthday) years -= 1;
  return years >= 0 ? String(years) : "—";
}

function sexLabel(sex: string | null | undefined): string {
  if (!sex) return "—";
  const s = sex.toLowerCase();
  if (s === "f" || s === "female") return "Female";
  if (s === "m" || s === "male") return "Male";
  return sex;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

/** `YYYY-MM-DDTHH:mm` in local time, for <input type="datetime-local">. */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

const SEVERE_ALLERGY = /severe|anaphyla|life|high/i;

/** Drug-class keywords: an allergy to the class also matches its members. */
const ALLERGY_CLASSES: Record<string, string[]> = {
  penicillin: [
    "amoxicillin",
    "ampicillin",
    "flucloxacillin",
    "cloxacillin",
    "piperacillin",
    "co-amoxiclav",
    "augmentin",
    "benzylpenicillin",
  ],
  sulfa: ["sulfamethoxazole", "co-trimoxazole", "cotrimoxazole", "sulfasalazine"],
  sulph: ["sulfamethoxazole", "co-trimoxazole", "cotrimoxazole", "sulfasalazine"],
  nsaid: ["ibuprofen", "diclofenac", "naproxen", "ketorolac", "indomethacin", "aspirin"],
  cephalosporin: ["ceftriaxone", "cefuroxime", "cefalexin", "cephalexin", "cefixime"],
};

type Allergy = Tables<"allergies">;

/** Recorded allergies whose substance matches the drug name (case-insensitive). */
function allergyHits(drug: string, allergies: Allergy[]): Allergy[] {
  const d = drug.trim().toLowerCase();
  if (!d) return [];
  return allergies.filter((a) => {
    const s = a.substance.trim().toLowerCase();
    if (s.length < 3) return false;
    if (d.includes(s)) return true;
    const firstWord = d.split(/\s+/)[0] ?? "";
    if (firstWord.length >= 4 && s.includes(firstWord)) return true;
    return Object.entries(ALLERGY_CLASSES).some(
      ([cls, members]) => s.includes(cls) && members.some((m) => d.includes(m)),
    );
  });
}

const RENAL_DRUGS: Array<{ pattern: RegExp; label: string; advice: string }> = [
  {
    pattern: /metformin/i,
    label: "Metformin",
    advice: "reduce dose if eGFR 30–45; contraindicated below 30",
  },
  {
    pattern: /ibuprofen|diclofenac|naproxen|ketorolac|indomethacin|nsaid/i,
    label: "NSAID",
    advice: "avoid — risk of acute kidney injury",
  },
  {
    pattern: /gentamicin|amikacin/i,
    label: "Aminoglycoside",
    advice: "extend interval and monitor levels",
  },
  {
    pattern: /enoxaparin/i,
    label: "Enoxaparin",
    advice: "reduce dose if eGFR < 30; consider anti-Xa monitoring",
  },
];

function renalWarning(drug: string, egfr: number | null): string | null {
  if (egfr == null || egfr >= 60) return null;
  const hit = RENAL_DRUGS.find((r) => r.pattern.test(drug));
  return hit ? `${hit.label} with eGFR ${egfr} mL/min — ${hit.advice}.` : null;
}

type CdsFlag = {
  id: string;
  severity: "crit" | "warn" | "info";
  title: string;
  detail: string;
};

const MONITORING: Array<{
  condition: RegExp;
  label: string;
  tests: Array<{ name: string; pattern: RegExp }>;
}> = [
  {
    condition: /diabet|^E1[0-4]/i,
    label: "Diabetes",
    tests: [
      { name: "HbA1c", pattern: /hba1c|a1c|glycated/i },
      { name: "Lipid profile", pattern: /lipid|cholesterol/i },
      { name: "Renal function (RFT)", pattern: /renal|rft|creatinine|egfr|kidney function|u&e/i },
    ],
  },
  {
    condition: /hypertens|^I1[0-5]/i,
    label: "Hypertension",
    tests: [
      { name: "Renal function (RFT)", pattern: /renal|rft|creatinine|egfr|kidney function|u&e/i },
      { name: "Lipid profile", pattern: /lipid|cholesterol/i },
    ],
  },
  {
    condition: /kidney|renal|ckd|^N18/i,
    label: "CKD",
    tests: [
      { name: "Renal function (RFT)", pattern: /renal|rft|creatinine|egfr|kidney function|u&e/i },
      { name: "Urine albumin:creatinine", pattern: /acr|albumin|microalb|urinalysis|urine/i },
    ],
  },
];

const ACTIVE_ORDER = new Set(["draft", "requested", "in_progress"]);

function buildClinicalFlags(input: {
  patient: Tables<"patients"> | null;
  allergies: Allergy[];
  conditions: Tables<"conditions">[];
  vitals: Tables<"vitals">[];
  orders: OrderRow[];
  criticalPending: ResultInboxRow[];
}): CdsFlag[] {
  const flags: CdsFlag[] = [];
  const { patient, allergies, conditions, vitals, orders, criticalPending } = input;

  // Critical results awaiting physician acknowledgement.
  for (const row of criticalPending) {
    flags.push({
      id: `crit-${row.id}`,
      severity: "crit",
      title: `Critical result pending acknowledgement: ${row.name}`,
      detail: `${row.result_summary ?? "Result available"} — verified by ${
        row.verified_by_label ?? "lab"
      }. Acknowledge in the Results & Alerts Inbox.`,
    });
  }

  // Allergies.
  if (allergies.length > 0) {
    const severe = allergies.filter((a) => SEVERE_ALLERGY.test(a.severity));
    flags.push({
      id: "allergies",
      severity: severe.length > 0 ? "crit" : "warn",
      title: `Recorded allergies (${allergies.length})`,
      detail: allergies
        .map(
          (a) =>
            `${a.substance}${a.reaction ? ` — ${a.reaction}` : ""} [${a.severity}${
              SEVERE_ALLERGY.test(a.severity) ? " ⚠" : ""
            }]`,
        )
        .join("; "),
    });
  }

  // Renal function.
  const egfr = patient?.egfr ?? null;
  if (egfr == null) {
    flags.push({
      id: "egfr-missing",
      severity: "info",
      title: "No eGFR on file",
      detail: "Consider a renal function test before prescribing renally-cleared drugs.",
    });
  } else if (egfr < 30) {
    flags.push({
      id: "egfr",
      severity: "crit",
      title: `Severe renal impairment (eGFR ${egfr} mL/min)`,
      detail:
        "Renal dose adjustment required. Avoid NSAIDs and nephrotoxins; metformin contraindicated.",
    });
  } else if (egfr < 60) {
    flags.push({
      id: "egfr",
      severity: "warn",
      title: `Reduced renal function (eGFR ${egfr} mL/min)`,
      detail:
        "Review dosing of renally-cleared drugs (metformin, enoxaparin, aminoglycosides). Avoid NSAIDs.",
    });
  }

  // Active medication orders that conflict with renal function.
  if (egfr != null && egfr < 60) {
    for (const o of orders) {
      if (o.category !== "medication" || !ACTIVE_ORDER.has(o.status)) continue;
      const warning = renalWarning(o.name, egfr);
      if (warning) {
        flags.push({
          id: `renal-rx-${o.id}`,
          severity: "warn",
          title: `Renal dosing check: ${o.name}`,
          detail: warning,
        });
      }
    }
  }

  // Early-warning score.
  const latest = vitals[0];
  if (!latest) {
    flags.push({
      id: "vitals-missing",
      severity: "info",
      title: "No vitals recorded",
      detail: "Triage vitals have not been captured for this patient.",
    });
  } else if (latest.news2 != null && latest.news2 >= 5) {
    flags.push({
      id: "news2",
      severity: "crit",
      title: `NEWS2 ${latest.news2} — urgent clinical review`,
      detail: `Recorded ${fmtDateTime(latest.recorded_at)}. Escalate and increase observation frequency.`,
    });
  } else if (latest.news2 != null && latest.news2 >= 3) {
    flags.push({
      id: "news2",
      severity: "warn",
      title: `NEWS2 ${latest.news2} — increased monitoring`,
      detail: `Recorded ${fmtDateTime(latest.recorded_at)}. Consider repeat observations within 1 hour.`,
    });
  }

  // Pregnancy.
  const preg = patient?.pregnancy_status?.trim();
  if (preg && !/^(no|none|not pregnant|negative|n\/a|na|unknown)$/i.test(preg)) {
    flags.push({
      id: "pregnancy",
      severity: "warn",
      title: `Pregnancy status: ${preg}`,
      detail: "Check teratogenic risk of prescriptions and radiation exposure for imaging.",
    });
  }

  // Chronic disease monitoring.
  const recentOrders = orders.filter(
    (o) =>
      o.status !== "cancelled" && Date.now() - new Date(o.requested_at).getTime() < 90 * DAY_MS,
  );
  for (const rule of MONITORING) {
    const condition = conditions.find(
      (c) =>
        c.status.toLowerCase() === "active" &&
        (rule.condition.test(c.name) || (c.icd10 != null && rule.condition.test(c.icd10))),
    );
    if (!condition) continue;
    const missing = rule.tests.filter((t) => !recentOrders.some((o) => t.pattern.test(o.name)));
    if (missing.length === 0) continue;
    flags.push({
      id: `monitor-${rule.label}`,
      severity: "info",
      title: `${condition.name}: monitoring due`,
      detail: `No ${missing.map((t) => t.name).join(", ")} ordered in the last 90 days.`,
    });
  }

  // Duplicate active orders.
  const byName = new Map<string, OrderRow[]>();
  for (const o of orders) {
    if (!ACTIVE_ORDER.has(o.status)) continue;
    const key = o.name.trim().toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), o]);
  }
  for (const [key, rows] of byName) {
    if (rows.length < 2) continue;
    flags.push({
      id: `dup-${key}`,
      severity: "warn",
      title: `Duplicate active order: ${rows[0]!.name}`,
      detail: `${rows.length} open orders with the same name. Cancel duplicates in Clinical Orders Entry.`,
    });
  }

  const rank = { crit: 0, warn: 1, info: 2 } as const;
  return flags.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

type TimelineTone = NonNullable<TimelineItem["tone"]>;

const FLAG_STYLE: Record<CdsFlag["severity"], string> = {
  crit: "border-[#FF3B30]/30 bg-[#FDE8E7] text-[#D70015]",
  warn: "border-[#FFE0B2] bg-[#FFF4E5] text-[#B86200]",
  info: "border-black/5 bg-[#F5F5F7] text-[#1D1D1F]",
};

type RxLine = {
  key: string;
  drug: string;
  strength: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  notes: string;
};

const EMPTY_RX: Omit<RxLine, "key"> = {
  drug: "",
  strength: "",
  dose: "",
  route: "",
  frequency: "",
  duration: "",
  notes: "",
};

function rxName(line: Omit<RxLine, "key">): string {
  return `${line.drug.trim()} ${line.strength.trim()}`.trim();
}

function rxInstructions(line: Omit<RxLine, "key">): string {
  return [line.dose, line.route, line.frequency, line.duration, line.notes]
    .map((v) => v.trim())
    .filter(Boolean)
    .join(", ");
}

/** One SOAP block: compact preview by default, expands to a full editor on its own. */
function NoteSection({
  id,
  title,
  hint,
  defaultValue,
}: {
  id: string;
  title: string;
  hint: string;
  defaultValue: string;
}) {
  const storageKey = `hip:soap-expanded:${id}`;
  const [expanded, setExpanded] = useState(false);

  // Restore the layout the doctor left behind (after hydration, to avoid SSR mismatch).
  useEffect(() => {
    try {
      setExpanded(window.localStorage.getItem(storageKey) === "1");
    } catch {
      /* storage unavailable — keep the default */
    }
  }, [storageKey]);

  const toggle = () =>
    setExpanded((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(storageKey, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });

  return (
    <div
      className={`space-y-2 rounded-2xl border bg-white p-3 transition-all ${
        expanded ? "border-black/20 shadow-sm sm:col-span-2" : "border-black/5"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Label
            htmlFor={id}
            className="text-[10px] font-extrabold uppercase tracking-wider text-black"
          >
            {title}
          </Label>
          <p className="truncate text-[10px] font-medium text-[#86868B]">{hint}</p>
        </div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={expanded}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-black/10 bg-[#F5F5F7] px-2.5 py-1 text-[10px] font-bold text-black transition-colors hover:bg-black hover:text-white"
        >
          {expanded ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
          <span>{expanded ? "Minimise" : "Expand"}</span>
        </button>
      </div>

      <Textarea
        id={id}
        name={id}
        rows={expanded ? 10 : 2}
        defaultValue={defaultValue}
        className={`rounded-xl border-black/10 bg-[#F5F5F7] font-semibold text-black transition-all ${
          expanded ? "text-xs leading-relaxed" : "text-[10px] leading-snug"
        }`}
      />
    </div>
  );
}

const fieldClass =
  "w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black";
const labelClass = "text-[10px] font-extrabold uppercase text-[#86868B]";

function DoctorContent() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<DoctorTab>("consultation");

  const me = useQuery(myProfileQuery);
  const doctorName =
    me.data?.staff?.full_name?.trim() ||
    me.data?.profile?.full_name?.trim() ||
    "Attending physician";
  const licenseId = me.data?.staff?.license_number?.trim() || "—";

  const encounters = useQuery({ ...activeEncountersQuery, refetchInterval: 15000 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queue = (encounters.data ?? []).filter((e) =>
    ["waiting", "nurse", "doctor"].includes(e.stage),
  );
  const selected = queue.find((e) => e.id === selectedId) ?? queue[0] ?? null;
  // No live encounter selected means no patient to load — never query with a placeholder id.
  const patientId = selected?.patient_id ?? "";

  const record = useQuery({ ...patientRecordQuery(patientId), enabled: Boolean(patientId) });
  const orders = useQuery({ ...ordersQuery(patientId), enabled: Boolean(patientId) });
  const notes = useQuery({ ...notesQuery(patientId), enabled: Boolean(patientId) });
  const results = useQuery({ ...resultInboxQuery, refetchInterval: 15000 });

  const patient = record.data?.patient ?? null;
  const allergies = record.data?.allergies ?? [];
  const conditions = record.data?.conditions ?? [];
  const vitals = record.data?.vitals ?? [];
  const latestVitals = vitals[0];
  const patientEgfr = patient?.egfr ?? null;
  const patientOrders = orders.data ?? [];
  const patientNotes = notes.data ?? [];

  const patientName = selected?.patients?.full_name || patient?.full_name || "Patient";
  const patientMrn = selected?.patients?.mrn || patient?.mrn || "—";
  const patientInfo = {
    patientName,
    mrn: patientMrn,
    age: ageFromDob(patient?.date_of_birth ?? selected?.patients?.date_of_birth),
    gender: sexLabel(patient?.sex),
  };

  // Notes for the current encounter: unsigned SOAP draft + latest signed clinical note.
  const clinicalNotes = patientNotes.filter((n) => n.note_type !== "referral");
  const draft: NoteRow | undefined = selected
    ? clinicalNotes.find((n) => n.encounter_id === selected.id && !n.signed_at)
    : undefined;
  const latestSigned: NoteRow | undefined =
    clinicalNotes.find((n) => n.signed_at && n.encounter_id === selected?.id) ??
    clinicalNotes.find((n) => n.signed_at);
  const referralNotes = patientNotes.filter((n) => n.note_type === "referral");

  const criticalPending = (results.data ?? []).filter(
    (r) => r.patient_id === patientId && r.is_critical && r.status === "resulted",
  );

  const flags = patient
    ? buildClinicalFlags({
        patient,
        allergies,
        conditions,
        vitals,
        orders: patientOrders,
        criticalPending,
      })
    : [];

  const encounterMeds = patientOrders.filter(
    (o) =>
      o.category === "medication" && o.status !== "cancelled" && o.encounter_id === selected?.id,
  );
  const activeMeds =
    encounterMeds.length > 0
      ? encounterMeds
      : patientOrders.filter((o) => o.category === "medication" && ACTIVE_ORDER.has(o.status));
  const medsText =
    activeMeds.length > 0
      ? activeMeds.map((o) => `${o.name}${o.instructions ? ` (${o.instructions})` : ""}`).join("; ")
      : "None prescribed";

  /* ---------- SOAP form state: reset per encounter, load existing draft ---------- */
  const [soapSubjective, setSoapSubjective] = useState("");
  const [soapObjective, setSoapObjective] = useState("");
  const [soapAssessment, setSoapAssessment] = useState("");
  const [soapPlan, setSoapPlan] = useState("");
  const soapKey = `${selected?.id ?? ""}|${draft?.id ?? ""}`;
  const [loadedSoapKey, setLoadedSoapKey] = useState(soapKey);
  if (loadedSoapKey !== soapKey) {
    setLoadedSoapKey(soapKey);
    setSoapSubjective(draft?.subjective ?? "");
    setSoapObjective(draft?.objective ?? "");
    setSoapAssessment(draft?.assessment ?? "");
    setSoapPlan(draft?.plan ?? "");
  }

  /* ---------- per-patient form state ---------- */
  const [sickDays, setSickDays] = useState("3");
  const [sickReason, setSickReason] = useState("");
  const [sickIcd, setSickIcd] = useState("");

  const [rxForm, setRxForm] = useState<Omit<RxLine, "key">>(EMPTY_RX);
  const [rxLines, setRxLines] = useState<RxLine[]>([]);
  const [rxPriority, setRxPriority] = useState("routine");
  const [rxAllergyOverride, setRxAllergyOverride] = useState(false);

  const [refSpecialty, setRefSpecialty] = useState<string>(REFERRAL_SPECIALTIES[0]);
  const [refUrgency, setRefUrgency] = useState("Routine");
  const [refReason, setRefReason] = useState("");

  const [fuDate, setFuDate] = useState("");
  const [fuReason, setFuReason] = useState("");

  const [formsPatientKey, setFormsPatientKey] = useState(selected?.id ?? "");
  if (formsPatientKey !== (selected?.id ?? "")) {
    setFormsPatientKey(selected?.id ?? "");
    setSickDays("3");
    setSickReason("");
    setSickIcd("");
    setRxForm(EMPTY_RX);
    setRxLines([]);
    setRxPriority("routine");
    setRxAllergyOverride(false);
    setRefSpecialty(REFERRAL_SPECIALTIES[0]);
    setRefUrgency("Routine");
    setRefReason("");
    setFuDate("");
    setFuReason("");
  }

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["encounters"] });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["notes"] });
    void queryClient.invalidateQueries({ queryKey: ["events"] });
    void queryClient.invalidateQueries({ queryKey: ["appointments"] });
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
      toast.success(
        variables.sign ? "SOAP clinical note signed & locked" : "SOAP note draft saved",
      );
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rxMut = useMutation({
    mutationFn: async (lines: Array<Omit<RxLine, "key">>) => {
      if (!selected) throw new Error("Select a patient first");
      for (const line of lines) {
        await createOrder({
          patientId: selected.patient_id,
          encounterId: selected.id,
          category: "medication",
          name: rxName(line),
          priority: rxPriority,
          instructions: rxInstructions(line),
        });
      }
      return lines.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} prescription line(s) sent to pharmacy for ${patientName}`);
      setRxLines([]);
      setRxForm(EMPTY_RX);
      setRxAllergyOverride(false);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const referralMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a patient first");
      if (!refReason.trim()) throw new Error("Enter the reason for referral");
      const { data, error } = await supabase
        .from("clinical_notes")
        .insert({
          patient_id: selected.patient_id,
          encounter_id: selected.id,
          author_label: doctorName,
          note_type: "referral",
          assessment: `Referral to ${refSpecialty} (${refUrgency})`,
          plan: refReason.trim(),
          signed_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await emitEvent({
        eventType: "doctor.referral_issued",
        entityType: "clinical_note",
        entityId: data.id,
        payload: {
          patient: patientName,
          specialty: refSpecialty,
          urgency: refUrgency,
          reason: refReason.trim(),
          referring_doctor: doctorName,
        },
      });
    },
    onSuccess: () => {
      toast.success(`Referral to ${refSpecialty} recorded in ${patientName}'s chart`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const followUpMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a patient first");
      if (!fuDate) throw new Error("Choose a follow-up date and time");
      if (new Date(fuDate).getTime() <= Date.now()) {
        throw new Error("Follow-up must be in the future");
      }
      return bookAppointment({
        patientId: selected.patient_id,
        departmentId: selected.department_id,
        scheduledAt: fuDate,
        reason: fuReason.trim() || "Follow-up review",
      });
    },
    onSuccess: () => {
      toast.success(`Follow-up booked for ${patientName} on ${fmtDateTime(fuDate)}`);
      setFuDate("");
      setFuReason("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const downloadSoapPdf = () => {
    if (!selected) {
      toast.error("Select a patient first");
      return;
    }
    generateSOAPSummary({
      ...patientInfo,
      subjective: soapSubjective,
      objective: soapObjective,
      assessment: soapAssessment,
      plan: soapPlan,
      doctorName,
      licenseId,
    });
  };

  const downloadDischargePdf = () => {
    if (!selected) return;
    const otherOrders = patientOrders
      .filter(
        (o) =>
          o.encounter_id === selected.id && o.category !== "medication" && o.status !== "cancelled",
      )
      .map((o) => `${o.name} (${o.status})`);
    generateDischargeSummary({
      ...patientInfo,
      admissionDate: fmtDate(selected.started_at),
      dischargeDate: new Date().toLocaleDateString(),
      admittingDiagnosis: selected.chief_complaint || "Not recorded",
      dischargeDiagnosis: latestSigned?.assessment || "No signed assessment on record",
      treatmentSummary:
        otherOrders.length > 0 ? otherOrders.join("; ") : "No investigations ordered",
      dischargeMedications: medsText,
      followUpInstructions: latestSigned?.plan || "No signed plan on record",
      doctorName,
      licenseId,
    });
  };

  const handleIssueCertificate = () => {
    if (!selected) {
      toast.error("Select a patient first");
      return;
    }
    if (!sickReason.trim()) {
      toast.error("Enter the medical reason / diagnosis");
      return;
    }
    const days = Math.max(1, Math.round(Number(sickDays) || 1));
    generateSickLeaveCert({
      ...patientInfo,
      diagnosis: sickReason.trim(),
      icdCode: sickIcd.trim() || "—",
      startDate: new Date().toLocaleDateString(),
      endDate: new Date(Date.now() + (days - 1) * DAY_MS).toLocaleDateString(),
      totalDays: days,
      doctorName,
      licenseId,
    });
  };

  // Prescription safety checks.
  const pendingRx: Array<Omit<RxLine, "key">> = [
    ...rxLines,
    ...(rxForm.drug.trim() ? [rxForm] : []),
  ];
  const rxAllergyHits = pendingRx.flatMap((line) =>
    allergyHits(line.drug, allergies).map((a) => ({ drug: rxName(line), allergy: a })),
  );
  const rxRenalWarnings = pendingRx
    .map((line) => {
      const warning = renalWarning(line.drug, patientEgfr);
      return warning ? { drug: rxName(line), warning } : null;
    })
    .filter((w): w is { drug: string; warning: string } => w !== null);

  const addRxLine = () => {
    if (!rxForm.drug.trim()) {
      toast.error("Enter a medication name");
      return;
    }
    setRxLines((prev) => [...prev, { ...rxForm, key: crypto.randomUUID() }]);
    setRxForm(EMPTY_RX);
    setRxAllergyOverride(false);
  };

  const sendPrescription = () => {
    if (!selected) {
      toast.error("Select a patient first");
      return;
    }
    if (pendingRx.length === 0) {
      toast.error("Add at least one medication");
      return;
    }
    if (rxAllergyHits.length > 0 && !rxAllergyOverride) {
      toast.error("Allergy conflict — review and confirm the override before sending");
      return;
    }
    rxMut.mutate(pendingRx);
  };

  // Records timeline from real encounters, notes, orders and vitals.
  const timelineItems: Array<{
    id: string;
    at: number;
    time: string;
    title: string;
    detail: string;
    tone: TimelineTone;
  }> = [
    ...(record.data?.encounters ?? []).map((e) => ({
      id: `enc-${e.id}`,
      at: new Date(e.started_at).getTime(),
      time: fmtDateTime(e.started_at),
      title: `Encounter · ${e.stage}${e.ended_at ? " (closed)" : ""}`,
      detail: e.chief_complaint ?? "",
      tone: (e.priority === "critical" ? "crit" : "default") as TimelineTone,
    })),
    ...patientNotes.map((n) => ({
      id: `note-${n.id}`,
      at: new Date(n.created_at).getTime(),
      time: fmtDateTime(n.created_at),
      title: `${n.note_type === "referral" ? "Referral" : "Clinical note"} · ${
        n.signed_at ? "signed" : "draft"
      } · ${n.author_label ?? "Unknown author"}`,
      detail: [n.assessment, n.plan].filter(Boolean).join(" — "),
      tone: (n.signed_at ? "ok" : "default") as TimelineTone,
    })),
    ...patientOrders.map((o) => ({
      id: `ord-${o.id}`,
      at: new Date(o.requested_at).getTime(),
      time: fmtDateTime(o.requested_at),
      title: `Order · ${o.name}`,
      detail: `${o.category} · ${o.priority} · ${o.status}${
        o.instructions ? ` · ${o.instructions}` : ""
      }`,
      tone: (o.status === "cancelled" ? "default" : "accent") as TimelineTone,
    })),
    ...vitals.map((v) => ({
      id: `vit-${v.id}`,
      at: new Date(v.recorded_at).getTime(),
      time: fmtDateTime(v.recorded_at),
      title: "Vitals recorded",
      detail: [
        v.systolic != null ? `BP ${v.systolic}/${v.diastolic ?? "—"}` : null,
        v.heart_rate != null ? `HR ${v.heart_rate} bpm` : null,
        v.spo2 != null ? `SpO₂ ${v.spo2}%` : null,
        v.temperature_c != null ? `T ${v.temperature_c}°C` : null,
        v.news2 != null ? `NEWS2 ${v.news2}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      tone: (v.news2 != null && v.news2 >= 5
        ? "crit"
        : v.news2 != null && v.news2 >= 3
          ? "warn"
          : "ok") as TimelineTone,
    })),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, 40);

  const activeConditions = conditions.filter((c) => c.status.toLowerCase() === "active");

  const noPatient = (
    <p className="text-xs font-semibold text-[#86868B]">
      Select a patient from the live queue in the Consultation Cockpit first.
    </p>
  );

  return (
    <AppShell
      title="Attending Physician Cockpit"
      subtitle="SOAP clinical notes · Rule-based decision support · eGFR renal safety guard · Electronic orders & certificates"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadSoapPdf}
            disabled={!selected}
            className="inline-flex items-center gap-1.5 rounded-2xl bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-40"
          >
            <Download className="size-4" /> Download Consultation PDF
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3.5 py-1 text-xs font-bold text-[#1D8A39]">
            <Stethoscope className="size-3.5" /> {doctorName}
            {licenseId !== "—" ? ` (${licenseId})` : ""}
          </span>
        </div>
      }
    >
      <HandoffBoard role="doctor" />
      {/* Commercial Sub-Tab Rail */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/5 pb-4 overflow-x-auto">
        {[
          { id: "consultation", label: "Consultation Cockpit", icon: Stethoscope },
          { id: "inbox", label: "Results & Alerts Inbox", icon: Radio },
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
          <Panel
            title="Live Outpatient Queue"
            subtitle={`${queue.length} waiting`}
            bodyClassName="p-0"
            className="min-w-0"
          >
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
                      <StatusPill
                        status={encounter.priority === "critical" ? "critical" : "healthy"}
                        label={encounter.stage}
                      />
                    </div>
                    <p className="numeric truncate text-xs text-[#86868B] mt-0.5">
                      {encounter.patients?.mrn}
                    </p>
                  </button>
                </li>
              ))}
              {queue.length === 0 ? (
                <li className="px-4 py-6 text-xs text-[#86868B] truncate">No waiting patients.</li>
              ) : null}
            </ul>
          </Panel>

          {/* Central Consultation Surface */}
          {selected ? (
            <div className="space-y-6 min-w-0">
              {/* Patient Banner */}
              <Panel
                className="min-w-0"
                title={`Active Consult: ${patientName}`}
                subtitle={`MRN: ${patientMrn} · ${patientInfo.age} y · ${patientInfo.gender}${
                  selected.chief_complaint ? ` · ${selected.chief_complaint}` : ""
                }`}
                action={
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    {selected.stage !== "doctor" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-2xl text-xs font-bold"
                        disabled={stage.isPending}
                        onClick={() => stage.mutate({ encounterId: selected.id, stage: "doctor" })}
                      >
                        Start Consult
                      </Button>
                    )}
                    <button
                      type="button"
                      onClick={downloadDischargePdf}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                      title="Download visit / discharge summary PDF"
                    >
                      <Download className="size-3" /> Visit Summary PDF
                    </button>
                  </div>
                }
              >
                <div className="grid gap-3 sm:grid-cols-4 min-w-0">
                  <Stat
                    label="NEWS2 Score"
                    value={latestVitals?.news2 ?? "—"}
                    tone={
                      latestVitals?.news2 == null
                        ? "default"
                        : latestVitals.news2 >= 5
                          ? "crit"
                          : latestVitals.news2 >= 3
                            ? "warn"
                            : "ok"
                    }
                  />
                  <Stat
                    label="Blood Pressure"
                    value={
                      latestVitals?.systolic != null
                        ? `${latestVitals.systolic}/${latestVitals.diastolic ?? "—"}`
                        : "—"
                    }
                  />
                  <Stat
                    label="Heart Pulse"
                    value={
                      latestVitals?.heart_rate != null ? `${latestVitals.heart_rate} bpm` : "—"
                    }
                  />
                  <Stat
                    label="eGFR Renal"
                    value={patientEgfr != null ? `${patientEgfr} mL/min` : "—"}
                    hint={patientEgfr != null ? "CKD Guard Active" : "Not on file"}
                    tone={patientEgfr == null ? "default" : patientEgfr < 60 ? "warn" : "ok"}
                  />
                </div>

                {allergies.length > 0 && (
                  <div className="mt-3 rounded-xl border border-[#FF3B30]/30 bg-[#FDE8E7] p-2.5 text-xs font-bold text-[#D70015]">
                    ⚠️ Patient Allergies:{" "}
                    {allergies.map((a) => `${a.substance} (${a.severity})`).join(", ")}
                  </div>
                )}

                <p className="mt-3 text-[10px] font-semibold text-[#86868B]">
                  To close the consult, use “Sign off” in the Consultation Handoff Queue above — it
                  routes the patient to diagnostics, pharmacy or billing.
                </p>
              </Panel>

              {/* Rule-based Clinical Decision Support */}
              <div className="rounded-2xl border border-black/5 bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-black flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="size-4 text-[#34C759]" /> Clinical decision support
                  </span>
                  <span className="text-[10px] font-semibold text-[#86868B]">
                    Rule-based checks on recorded data · not a diagnosis
                  </span>
                </div>
                {record.isLoading ? (
                  <p className="text-xs font-semibold text-[#86868B]">Loading patient record…</p>
                ) : flags.length === 0 ? (
                  <p className="rounded-xl border border-[#B6ECC3] bg-[#E8F8EC] p-2.5 text-xs font-bold text-[#1D8A39]">
                    No flags raised for this patient’s recorded data.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {flags.map((flag) => (
                      <li
                        key={flag.id}
                        className={`rounded-xl border p-2.5 text-xs ${FLAG_STYLE[flag.severity]}`}
                      >
                        <p className="font-extrabold flex items-center gap-1.5">
                          {flag.severity === "info" ? (
                            <FileText className="size-3.5 shrink-0" />
                          ) : (
                            <AlertTriangle className="size-3.5 shrink-0" />
                          )}
                          {flag.title}
                        </p>
                        <p className="mt-0.5 font-semibold leading-relaxed">{flag.detail}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* SOAP Clinical Note Form */}
              <Panel
                title="SOAP Clinical Documentation"
                subtitle={
                  draft
                    ? `Draft loaded · last saved ${fmtDateTime(draft.created_at)}`
                    : "Sign-off produces an immutable medical audit record"
                }
                action={
                  <button
                    type="button"
                    onClick={downloadSoapPdf}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1 text-xs font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                    title="Download PDF"
                  >
                    <Download className="size-3.5" /> Download PDF
                  </button>
                }
              >
                <form
                  className="space-y-4 text-xs font-semibold text-black"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const sign =
                      (event.nativeEvent as SubmitEvent).submitter?.dataset["sign"] === "1";
                    if (sign && !soapAssessment.trim() && !soapPlan.trim()) {
                      toast.error("Add an assessment or plan before signing");
                      return;
                    }
                    noteMut.mutate({
                      ...(draft ? { id: draft.id } : {}),
                      patientId: selected.patient_id,
                      encounterId: selected.id,
                      subjective: soapSubjective,
                      objective: soapObjective,
                      assessment: soapAssessment,
                      plan: soapPlan,
                      sign,
                    });
                  }}
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label htmlFor="subjective" className={labelClass}>
                        Subjective (Chief Complaint & History)
                      </Label>
                      <Textarea
                        id="subjective"
                        name="subjective"
                        rows={3}
                        value={soapSubjective}
                        onChange={(e) => setSoapSubjective(e.target.value)}
                        placeholder="Presenting complaint, history of presenting illness, relevant PMH, medications, review of systems…"
                        className="rounded-2xl border-black/10 bg-[#F5F5F7] text-xs font-bold text-black"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="objective" className={labelClass}>
                        Objective (Physical Exam & Vitals)
                      </Label>
                      <Textarea
                        id="objective"
                        name="objective"
                        rows={3}
                        value={soapObjective}
                        onChange={(e) => setSoapObjective(e.target.value)}
                        placeholder="Vitals, examination findings, available results…"
                        className="rounded-2xl border-black/10 bg-[#F5F5F7] text-xs font-bold text-black"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="assessment" className={labelClass}>
                        Assessment (Diagnosis)
                      </Label>
                      <Textarea
                        id="assessment"
                        name="assessment"
                        rows={3}
                        value={soapAssessment}
                        onChange={(e) => setSoapAssessment(e.target.value)}
                        placeholder="Working diagnosis / differentials (with ICD-10 if known)…"
                        className="rounded-2xl border-black/10 bg-[#F5F5F7] text-xs font-bold text-black"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="plan" className={labelClass}>
                        Plan & Management
                      </Label>
                      <Textarea
                        id="plan"
                        name="plan"
                        rows={3}
                        value={soapPlan}
                        onChange={(e) => setSoapPlan(e.target.value)}
                        placeholder="Investigations, treatment, patient education, follow-up…"
                        className="rounded-2xl border-black/10 bg-[#F5F5F7] text-xs font-bold text-black"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="submit"
                      variant="outline"
                      className="rounded-2xl text-xs font-bold"
                      disabled={noteMut.isPending}
                    >
                      Save Draft Note
                    </Button>
                    <Button
                      type="submit"
                      data-sign="1"
                      className="rounded-2xl text-xs font-bold bg-black text-white"
                      disabled={noteMut.isPending}
                    >
                      Sign & Lock Note ✓
                    </Button>
                  </div>
                </form>
              </Panel>
            </div>
          ) : (
            <Panel title="Consultation Cockpit">
              <p className="text-xs font-semibold text-[#86868B]">
                Select a patient from the live queue to begin.
              </p>
            </Panel>
          )}

          {/* Quick Orders Panel */}
          <div className="space-y-6 min-w-0">
            <Panel
              title="Fast Clinical Order Entry"
              subtitle="Direct routing to Lab / Pharmacy / Radiology"
            >
              <form
                className="space-y-3 text-xs font-semibold text-black"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selected) {
                    toast.error("Select a patient first");
                    return;
                  }
                  const formEl = event.currentTarget;
                  const form = new FormData(formEl);
                  const category = String(form.get("category")) as (typeof categories)[number];
                  const name = String(form.get("name"));
                  if (category === "medication") {
                    const hits = allergyHits(name, allergies);
                    if (
                      hits.length > 0 &&
                      !window.confirm(
                        `Allergy warning: ${patientName} has a recorded allergy to ${hits
                          .map((a) => a.substance)
                          .join(", ")}. Order ${name} anyway?`,
                      )
                    ) {
                      return;
                    }
                  }
                  orderMut.mutate({
                    patientId: selected.patient_id,
                    encounterId: selected.id,
                    category,
                    name,
                    priority: String(form.get("priority") || "routine"),
                    instructions: String(form.get("instructions") || ""),
                  });
                  formEl.reset();
                }}
              >
                <div className="space-y-1">
                  <Label htmlFor="category" className={labelClass}>
                    Department Category
                  </Label>
                  <select
                    id="category"
                    name="category"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-2.5 text-xs font-bold text-black"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="name" className={labelClass}>
                    Order / Procedure Name
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    placeholder="e.g. Comprehensive Metabolic Panel"
                    className="rounded-2xl border-black/10 bg-[#F5F5F7] text-xs font-bold text-black"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="priority" className={labelClass}>
                    Priority Level
                  </Label>
                  <select
                    id="priority"
                    name="priority"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-2.5 text-xs font-bold text-black"
                  >
                    <option value="routine">Routine</option>
                    <option value="urgent">Urgent</option>
                    <option value="stat">STAT Emergency</option>
                  </select>
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-2xl bg-black text-xs font-bold text-white py-3 shadow-md hover:bg-slate-800 cursor-pointer"
                  disabled={orderMut.isPending || !selected}
                >
                  Dispatch Order →
                </Button>
              </form>
            </Panel>
          </div>
        </div>
      )}

      {/* SUB-TAB: RESULTS & ALERTS INBOX */}
      {activeTab === "inbox" && <DoctorInbox doctorLabel={doctorName} />}

      {/* SUB-TAB 2: MEDICAL RECORDS TIMELINE */}
      {activeTab === "records" && (
        <div className="mx-auto max-w-4xl space-y-6">
          <Panel
            title="Patient Medical History & Timeline"
            subtitle={selected ? `${patientName} (${patientMrn})` : "No patient selected"}
          >
            {!selected ? (
              noPatient
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#FAFAFC] border border-black/5 p-4 space-y-2">
                  <h4 className="font-bold text-black text-sm">Conditions & Diagnoses</h4>
                  {conditions.length === 0 ? (
                    <p className="text-xs font-semibold text-[#86868B]">No conditions recorded.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 text-xs font-bold">
                      {conditions.map((c) => (
                        <span
                          key={c.id}
                          className={
                            c.status.toLowerCase() === "active"
                              ? "rounded-full bg-black text-white px-3 py-1"
                              : "rounded-full bg-[#F5F5F7] text-black border border-black/10 px-3 py-1"
                          }
                        >
                          {c.name}
                          {c.icd10 ? ` · ${c.icd10}` : ""} · {c.status}
                        </span>
                      ))}
                    </div>
                  )}
                  {allergies.length > 0 && (
                    <div className="flex flex-wrap gap-2 text-xs font-bold pt-1">
                      {allergies.map((a) => (
                        <span
                          key={a.id}
                          className="rounded-full bg-[#FDE8E7] text-[#D70015] border border-[#F9BDBD] px-3 py-1"
                        >
                          Allergy: {a.substance} ({a.severity})
                        </span>
                      ))}
                    </div>
                  )}
                  {patientEgfr != null && (
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                        patientEgfr < 60
                          ? "bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2]"
                          : "bg-[#F5F5F7] text-black border border-black/10"
                      }`}
                    >
                      eGFR {patientEgfr} mL/min
                    </span>
                  )}
                </div>

                <Timeline items={timelineItems} />
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* SUB-TAB 3: CLINICAL ORDERS ENTRY */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <Panel
            title="Active Orders & Department Execution Queue"
            subtitle={selected ? `Orders for ${patientName}` : "Dispatched physician orders"}
          >
            <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
              {!selected ? noPatient : null}
              {selected && patientOrders.length === 0 ? (
                <p className="text-xs font-semibold text-[#86868B]">No orders for this patient.</p>
              ) : null}
              {patientOrders.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-2xl border border-black/5 bg-[#F5F5F7] p-4"
                >
                  <div>
                    <p className="font-bold text-black text-sm">{row.name}</p>
                    <p className="text-[#86868B]">
                      {row.category} · Priority: {row.priority} · Status: {row.status}
                      {row.instructions ? ` · ${row.instructions}` : ""}
                    </p>
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
          <Panel
            title="Electronic Prescription Builder & Safety Guard"
            subtitle={
              selected
                ? `Prescribing for ${patientName} (${patientMrn}) · allergy & renal checks`
                : "Allergy & renal dosing checks"
            }
          >
            {!selected ? (
              noPatient
            ) : (
              <div className="space-y-4 text-xs font-semibold text-black">
                {patientEgfr != null && patientEgfr < 60 && (
                  <div className="rounded-2xl border border-[#FFE0B2] bg-[#FFF4E5] p-4 space-y-1">
                    <span className="font-bold text-[#B86200] flex items-center gap-1.5 text-xs">
                      <ShieldAlert className="size-4" /> Renal Dosing Safety
                    </span>
                    <p className="text-[#B86200]">
                      Patient eGFR is <strong>{patientEgfr} mL/min</strong>. Review dosing of
                      renally-cleared drugs; avoid NSAIDs.
                    </p>
                  </div>
                )}
                {patientEgfr == null && (
                  <p className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-3 text-[#86868B]">
                    No eGFR on file — renal dosing checks cannot run.
                  </p>
                )}
                {allergies.length > 0 && (
                  <p className="rounded-2xl border border-[#FF3B30]/30 bg-[#FDE8E7] p-3 font-bold text-[#D70015]">
                    Recorded allergies:{" "}
                    {allergies.map((a) => `${a.substance} (${a.severity})`).join(", ")}
                  </p>
                )}

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className={labelClass}>Medication</label>
                      <input
                        type="text"
                        value={rxForm.drug}
                        onChange={(e) => setRxForm((f) => ({ ...f, drug: e.target.value }))}
                        placeholder="e.g. Metformin"
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Strength / Form</label>
                      <input
                        type="text"
                        value={rxForm.strength}
                        onChange={(e) => setRxForm((f) => ({ ...f, strength: e.target.value }))}
                        placeholder="e.g. 500mg tablet"
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="space-y-1">
                      <label className={labelClass}>Dose</label>
                      <input
                        type="text"
                        value={rxForm.dose}
                        onChange={(e) => setRxForm((f) => ({ ...f, dose: e.target.value }))}
                        placeholder="1 tablet"
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Route</label>
                      <input
                        type="text"
                        value={rxForm.route}
                        onChange={(e) => setRxForm((f) => ({ ...f, route: e.target.value }))}
                        placeholder="PO"
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Frequency</label>
                      <input
                        type="text"
                        value={rxForm.frequency}
                        onChange={(e) => setRxForm((f) => ({ ...f, frequency: e.target.value }))}
                        placeholder="BID"
                        className={fieldClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className={labelClass}>Duration</label>
                      <input
                        type="text"
                        value={rxForm.duration}
                        onChange={(e) => setRxForm((f) => ({ ...f, duration: e.target.value }))}
                        placeholder="30 days"
                        className={fieldClass}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className={labelClass}>Notes</label>
                    <input
                      type="text"
                      value={rxForm.notes}
                      onChange={(e) => setRxForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="e.g. with meals"
                      className={fieldClass}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addRxLine}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-2 text-xs font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                  >
                    <Plus className="size-3.5" /> Add another medication
                  </button>

                  {rxLines.length > 0 && (
                    <ul className="space-y-2">
                      {rxLines.map((line) => (
                        <li
                          key={line.key}
                          className="flex items-center justify-between gap-2 rounded-2xl border border-black/5 bg-[#FAFAFC] p-3"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-black">{rxName(line)}</p>
                            <p className="truncate text-[#86868B]">
                              {rxInstructions(line) || "No instructions"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setRxLines((prev) => prev.filter((l) => l.key !== line.key));
                              setRxAllergyOverride(false);
                            }}
                            className="shrink-0 rounded-full border border-[#F9BDBD] bg-[#FDE8E7] p-1.5 text-[#D70015] hover:bg-[#D70015] hover:text-white cursor-pointer"
                            aria-label={`Remove ${rxName(line)}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {rxRenalWarnings.map((w) => (
                    <p
                      key={`renal-${w.drug}`}
                      className="rounded-2xl border border-[#FFE0B2] bg-[#FFF4E5] p-3 font-bold text-[#B86200]"
                    >
                      <ShieldAlert className="mr-1 inline size-3.5" />
                      {w.drug}: {w.warning}
                    </p>
                  ))}

                  {rxAllergyHits.length > 0 && (
                    <div className="space-y-2 rounded-2xl border border-[#FF3B30]/30 bg-[#FDE8E7] p-3 text-[#D70015]">
                      {rxAllergyHits.map((h) => (
                        <p key={`${h.drug}-${h.allergy.id}`} className="font-bold">
                          <AlertTriangle className="mr-1 inline size-3.5" />
                          {h.drug} matches recorded allergy: {h.allergy.substance} (
                          {h.allergy.severity}
                          {h.allergy.reaction ? `, ${h.allergy.reaction}` : ""})
                        </p>
                      ))}
                      <label className="flex items-center gap-2 font-bold">
                        <input
                          type="checkbox"
                          checked={rxAllergyOverride}
                          onChange={(e) => setRxAllergyOverride(e.target.checked)}
                        />
                        I have reviewed the allergy and confirm this prescription
                      </label>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <label className={labelClass}>Priority</label>
                    <select
                      value={rxPriority}
                      onChange={(e) => setRxPriority(e.target.value)}
                      className="rounded-2xl border border-black/10 bg-[#F5F5F7] p-2 text-xs font-bold text-black"
                    >
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">STAT</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={sendPrescription}
                    disabled={
                      rxMut.isPending ||
                      pendingRx.length === 0 ||
                      (rxAllergyHits.length > 0 && !rxAllergyOverride)
                    }
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer disabled:opacity-40"
                  >
                    <Pill className="size-4" /> Sign & Send{" "}
                    {pendingRx.length > 1 ? `${pendingRx.length} Medications` : "Prescription"} to
                    Pharmacy
                  </button>
                </div>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* SUB-TAB 5: MEDICAL CERTIFICATES */}
      {activeTab === "certificates" && (
        <div className="mx-auto max-w-2xl space-y-6">
          <Panel
            title="Medical Sick Leave Certificate"
            subtitle={selected ? `For ${patientName} (${patientMrn})` : "Print medical certificate"}
          >
            {!selected ? (
              noPatient
            ) : (
              <div className="space-y-4 text-xs font-semibold text-black">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={labelClass}>Number of Sick Days</label>
                    <input
                      type="number"
                      min={1}
                      value={sickDays}
                      onChange={(e) => setSickDays(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Attending Physician Stamp</label>
                    <input
                      type="text"
                      readOnly
                      value={`${doctorName}${licenseId !== "—" ? ` (${licenseId})` : ""}`}
                      className="w-full rounded-2xl border border-black/10 bg-[#FAFAFC] p-3 text-xs font-bold text-[#86868B]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-[1fr_140px] gap-3">
                  <div className="space-y-1">
                    <label className={labelClass}>Medical Reason & Diagnosis</label>
                    <textarea
                      rows={2}
                      value={sickReason}
                      onChange={(e) => setSickReason(e.target.value)}
                      placeholder={latestSigned?.assessment || "e.g. Acute gastroenteritis"}
                      className={fieldClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>ICD-10 (optional)</label>
                    <input
                      type="text"
                      value={sickIcd}
                      onChange={(e) => setSickIcd(e.target.value)}
                      placeholder="e.g. A09"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleIssueCertificate}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer"
                >
                  <Printer className="size-4" /> Issue & Download Certificate PDF
                </button>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* SUB-TAB 6: SPECIALIST REFERRALS */}
      {activeTab === "referrals" && (
        <div className="mx-auto max-w-2xl space-y-6">
          <Panel
            title="Specialist Referral Desk"
            subtitle={
              selected ? `Refer ${patientName} (${patientMrn})` : "Refer patient to a specialist"
            }
          >
            {!selected ? (
              noPatient
            ) : (
              <div className="space-y-4 text-xs font-semibold text-black">
                <div className="grid grid-cols-[1fr_140px] gap-3">
                  <div className="space-y-1">
                    <label className={labelClass}>Specialty Department</label>
                    <select
                      value={refSpecialty}
                      onChange={(e) => setRefSpecialty(e.target.value)}
                      className={fieldClass}
                    >
                      {REFERRAL_SPECIALTIES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Urgency</label>
                    <select
                      value={refUrgency}
                      onChange={(e) => setRefUrgency(e.target.value)}
                      className={fieldClass}
                    >
                      <option>Routine</option>
                      <option>Urgent</option>
                      <option>Emergency</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Reason for Referral & Clinical Findings</label>
                  <textarea
                    rows={3}
                    value={refReason}
                    onChange={(e) => setRefReason(e.target.value)}
                    placeholder="Clinical question, relevant findings and results…"
                    className={fieldClass}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => referralMut.mutate()}
                    disabled={referralMut.isPending || !refReason.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer disabled:opacity-40"
                  >
                    <Share2 className="size-4" /> Issue Specialist Referral
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      generateReferralLetter({
                        ...patientInfo,
                        referTo: "Specialist",
                        referDepartment: refSpecialty,
                        clinicalFindings: refReason.trim() || "—",
                        currentMedications: medsText,
                        urgency: refUrgency,
                        doctorName,
                        licenseId,
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                    title="Download PDF"
                  >
                    <Download className="size-3" /> Download Letter PDF
                  </button>
                </div>

                {referralNotes.length > 0 && (
                  <div className="space-y-2">
                    <p className={labelClass}>Referrals on record</p>
                    {referralNotes.map((n) => (
                      <div
                        key={n.id}
                        className="rounded-2xl border border-black/5 bg-[#FAFAFC] p-3"
                      >
                        <p className="font-bold text-black">{n.assessment}</p>
                        <p className="text-[#86868B]">
                          {fmtDateTime(n.created_at)} · {n.author_label ?? "—"} · {n.plan}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* SUB-TAB 7: FOLLOW-UPS & CHRONIC CARE */}
      {activeTab === "followups" && (
        <div className="mx-auto max-w-2xl space-y-6">
          <Panel
            title="Follow-up Appointment Scheduler & Chronic Care"
            subtitle={selected ? `Book a review for ${patientName}` : "Schedule review date"}
          >
            {!selected ? (
              noPatient
            ) : (
              <div className="space-y-4 text-xs font-semibold text-black">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={labelClass}>Quick Interval</label>
                    <select
                      value=""
                      onChange={(e) => {
                        const days = Number(e.target.value);
                        if (!days) return;
                        const d = new Date(Date.now() + days * DAY_MS);
                        d.setHours(9, 0, 0, 0);
                        setFuDate(toLocalInputValue(d));
                      }}
                      className={fieldClass}
                    >
                      <option value="">Pick an interval…</option>
                      <option value="7">1 Week Review</option>
                      <option value="14">2 Weeks Review</option>
                      <option value="30">1 Month Review</option>
                      <option value="90">3 Months Review</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className={labelClass}>Date & Time</label>
                    <input
                      type="datetime-local"
                      value={fuDate}
                      onChange={(e) => setFuDate(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Reason</label>
                  <input
                    type="text"
                    value={fuReason}
                    onChange={(e) => setFuReason(e.target.value)}
                    placeholder="e.g. Review HbA1c and BP control"
                    className={fieldClass}
                  />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Active Chronic Conditions</label>
                  <p className="rounded-2xl border border-black/10 bg-[#FAFAFC] p-3 text-xs font-bold text-[#86868B]">
                    {activeConditions.length > 0
                      ? activeConditions.map((c) => c.name).join(", ")
                      : "None recorded"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => followUpMut.mutate()}
                  disabled={followUpMut.isPending || !fuDate}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 cursor-pointer disabled:opacity-40"
                >
                  <Calendar className="size-4" /> Book Follow-up Consultation
                </button>
              </div>
            )}
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
