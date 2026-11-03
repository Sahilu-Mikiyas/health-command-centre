/**
 * Oncology data layer — regimen library, dose calculation, staging records and
 * chemotherapy cycles. Built entirely on existing tables:
 *   - cancer diagnosis      → `conditions` (ICD-10 C00–D09)
 *   - TNM staging           → `clinical_notes` note_type "oncology_staging" (JSON in `objective`)
 *   - tumour board decision → `clinical_notes` note_type "tumour_board"
 *   - chemotherapy doses    → `orders` category "medication", code "CHEMO:<regimen>:C<cycle>:<drug>"
 *   - next cycle            → `appointments` reason "Chemo <regimen> C<n>"
 * Tumour markers and CBC come from lab `orders.result_values` (see lab-panels.ts).
 */
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { toEthiopianName } from "@/lib/hip/ethiopian-names";
import { latestAnalyte } from "@/lib/hip/lab-panels";
import { emitEvent } from "@/lib/hip/mutations";

/* ------------------------------ regimen library ------------------------------ */

export type DoseBasis = "bsa" | "auc" | "flat";

export type RegimenDrug = {
  code: string;
  drug: string;
  basis: DoseBasis;
  /** mg/m² (bsa), target AUC (auc) or mg (flat). */
  amount: number;
  unit: "mg" | "units";
  route: "IV" | "PO" | "SC";
  schedule: string;
  maxDose?: number;
};

export type Regimen = {
  id: string;
  name: string;
  indication: string;
  cycleDays: number;
  cycles: number;
  emetogenic: "high" | "moderate" | "low";
  drugs: RegimenDrug[];
};

export const REGIMENS: Regimen[] = [
  {
    id: "AC",
    name: "AC (Doxorubicin + Cyclophosphamide)",
    indication: "Breast cancer — adjuvant / neoadjuvant",
    cycleDays: 21,
    cycles: 4,
    emetogenic: "high",
    drugs: [
      {
        code: "DOXO",
        drug: "Doxorubicin",
        basis: "bsa",
        amount: 60,
        unit: "mg",
        route: "IV",
        schedule: "Day 1, IV push",
      },
      {
        code: "CYCLO",
        drug: "Cyclophosphamide",
        basis: "bsa",
        amount: 600,
        unit: "mg",
        route: "IV",
        schedule: "Day 1, over 30 min",
      },
    ],
  },
  {
    id: "PAC-W",
    name: "Weekly Paclitaxel",
    indication: "Breast cancer — after AC",
    cycleDays: 7,
    cycles: 12,
    emetogenic: "low",
    drugs: [
      {
        code: "PACLI",
        drug: "Paclitaxel",
        basis: "bsa",
        amount: 80,
        unit: "mg",
        route: "IV",
        schedule: "Day 1, over 1 h (premedicate)",
      },
    ],
  },
  {
    id: "FOLFOX6",
    name: "mFOLFOX6",
    indication: "Colorectal cancer",
    cycleDays: 14,
    cycles: 12,
    emetogenic: "moderate",
    drugs: [
      {
        code: "OXALI",
        drug: "Oxaliplatin",
        basis: "bsa",
        amount: 85,
        unit: "mg",
        route: "IV",
        schedule: "Day 1, over 2 h",
      },
      {
        code: "LEUCO",
        drug: "Leucovorin",
        basis: "bsa",
        amount: 400,
        unit: "mg",
        route: "IV",
        schedule: "Day 1, over 2 h",
      },
      {
        code: "5FU-B",
        drug: "Fluorouracil bolus",
        basis: "bsa",
        amount: 400,
        unit: "mg",
        route: "IV",
        schedule: "Day 1, bolus",
      },
      {
        code: "5FU-I",
        drug: "Fluorouracil infusion",
        basis: "bsa",
        amount: 2400,
        unit: "mg",
        route: "IV",
        schedule: "Over 46 h via pump",
      },
    ],
  },
  {
    id: "CAPOX",
    name: "CAPOX (XELOX)",
    indication: "Colorectal / gastric cancer",
    cycleDays: 21,
    cycles: 8,
    emetogenic: "moderate",
    drugs: [
      {
        code: "OXALI",
        drug: "Oxaliplatin",
        basis: "bsa",
        amount: 130,
        unit: "mg",
        route: "IV",
        schedule: "Day 1, over 2 h",
      },
      {
        code: "CAPE",
        drug: "Capecitabine",
        basis: "bsa",
        amount: 1000,
        unit: "mg",
        route: "PO",
        schedule: "Twice daily, days 1–14",
      },
    ],
  },
  {
    id: "RCHOP",
    name: "R-CHOP",
    indication: "Diffuse large B-cell lymphoma",
    cycleDays: 21,
    cycles: 6,
    emetogenic: "moderate",
    drugs: [
      {
        code: "RITUX",
        drug: "Rituximab",
        basis: "bsa",
        amount: 375,
        unit: "mg",
        route: "IV",
        schedule: "Day 1, titrated infusion",
      },
      {
        code: "CYCLO",
        drug: "Cyclophosphamide",
        basis: "bsa",
        amount: 750,
        unit: "mg",
        route: "IV",
        schedule: "Day 1",
      },
      {
        code: "DOXO",
        drug: "Doxorubicin",
        basis: "bsa",
        amount: 50,
        unit: "mg",
        route: "IV",
        schedule: "Day 1",
      },
      {
        code: "VINC",
        drug: "Vincristine",
        basis: "bsa",
        amount: 1.4,
        unit: "mg",
        route: "IV",
        schedule: "Day 1 (max 2 mg)",
        maxDose: 2,
      },
      {
        code: "PRED",
        drug: "Prednisone",
        basis: "flat",
        amount: 100,
        unit: "mg",
        route: "PO",
        schedule: "Days 1–5",
      },
    ],
  },
  {
    id: "CARBO-PAC",
    name: "Carboplatin + Paclitaxel",
    indication: "Ovarian / lung / cervical cancer",
    cycleDays: 21,
    cycles: 6,
    emetogenic: "moderate",
    drugs: [
      {
        code: "PACLI",
        drug: "Paclitaxel",
        basis: "bsa",
        amount: 175,
        unit: "mg",
        route: "IV",
        schedule: "Day 1, over 3 h (premedicate)",
      },
      {
        code: "CARBO",
        drug: "Carboplatin",
        basis: "auc",
        amount: 5,
        unit: "mg",
        route: "IV",
        schedule: "Day 1, over 1 h (Calvert)",
      },
    ],
  },
  {
    id: "CIS-ETO",
    name: "Cisplatin + Etoposide",
    indication: "Small-cell lung cancer",
    cycleDays: 21,
    cycles: 4,
    emetogenic: "high",
    drugs: [
      {
        code: "CISP",
        drug: "Cisplatin",
        basis: "bsa",
        amount: 75,
        unit: "mg",
        route: "IV",
        schedule: "Day 1 with hydration",
      },
      {
        code: "ETOP",
        drug: "Etoposide",
        basis: "bsa",
        amount: 100,
        unit: "mg",
        route: "IV",
        schedule: "Days 1–3",
      },
    ],
  },
  {
    id: "ABVD",
    name: "ABVD",
    indication: "Hodgkin lymphoma",
    cycleDays: 14,
    cycles: 12,
    emetogenic: "high",
    drugs: [
      {
        code: "DOXO",
        drug: "Doxorubicin",
        basis: "bsa",
        amount: 25,
        unit: "mg",
        route: "IV",
        schedule: "Day 1",
      },
      {
        code: "BLEO",
        drug: "Bleomycin",
        basis: "bsa",
        amount: 10,
        unit: "units",
        route: "IV",
        schedule: "Day 1",
      },
      {
        code: "VINB",
        drug: "Vinblastine",
        basis: "bsa",
        amount: 6,
        unit: "mg",
        route: "IV",
        schedule: "Day 1",
      },
      {
        code: "DACA",
        drug: "Dacarbazine",
        basis: "bsa",
        amount: 375,
        unit: "mg",
        route: "IV",
        schedule: "Day 1",
      },
    ],
  },
  {
    id: "GEM-CIS",
    name: "Gemcitabine + Cisplatin",
    indication: "Bladder / biliary / lung cancer",
    cycleDays: 21,
    cycles: 6,
    emetogenic: "high",
    drugs: [
      {
        code: "GEMC",
        drug: "Gemcitabine",
        basis: "bsa",
        amount: 1000,
        unit: "mg",
        route: "IV",
        schedule: "Days 1 and 8",
      },
      {
        code: "CISP",
        drug: "Cisplatin",
        basis: "bsa",
        amount: 75,
        unit: "mg",
        route: "IV",
        schedule: "Day 1 with hydration",
      },
    ],
  },
];

export function regimenById(id: string) {
  return REGIMENS.find((r) => r.id === id);
}

/* -------------------------------- dose maths -------------------------------- */

/** Mosteller body-surface area in m². */
export function bsaMosteller(heightCm: number, weightKg: number): number {
  if (!(heightCm > 0) || !(weightKg > 0)) return 0;
  return Math.round(Math.sqrt((heightCm * weightKg) / 3600) * 100) / 100;
}

/** Calvert carboplatin dose (mg) = AUC × (GFR + 25), GFR capped at 125 mL/min. */
export function calvertDose(auc: number, gfr: number): number {
  const capped = Math.min(Math.max(gfr, 0), 125);
  return Math.round(auc * (capped + 25));
}

export type CalculatedDose = RegimenDrug & {
  fullDose: number;
  dose: number;
  capped: boolean;
  formula: string;
};

export function calculateDoses(input: {
  regimen: Regimen;
  bsa: number;
  egfr: number | null;
  reductionPct: number;
}): CalculatedDose[] {
  const factor = 1 - Math.min(Math.max(input.reductionPct, 0), 75) / 100;
  return input.regimen.drugs.map((drug) => {
    let full = 0;
    let formula = "";
    if (drug.basis === "bsa") {
      full = drug.amount * input.bsa;
      formula = `${drug.amount} ${drug.unit}/m² × ${input.bsa} m²`;
    } else if (drug.basis === "auc") {
      const gfr = input.egfr ?? 0;
      full = calvertDose(drug.amount, gfr);
      formula = `AUC ${drug.amount} × (GFR ${Math.min(gfr, 125)} + 25)`;
    } else {
      full = drug.amount;
      formula = "flat dose";
    }
    let dose = full * factor;
    let capped = false;
    if (drug.maxDose !== undefined && dose > drug.maxDose) {
      dose = drug.maxDose;
      capped = true;
    }
    const round = (n: number) => (n >= 100 ? Math.round(n) : Math.round(n * 10) / 10);
    return { ...drug, fullDose: round(full), dose: round(dose), capped, formula };
  });
}

/* --------------------------------- staging --------------------------------- */

export type TreatmentIntent = "curative" | "adjuvant" | "neoadjuvant" | "palliative";

export type Staging = {
  primarySite: string;
  icd10: string;
  histology: string;
  t: string;
  n: string;
  m: string;
  stage: string;
  grade: string;
  ecog: number;
  intent: TreatmentIntent;
  biomarkers: Record<string, string>;
  diagnosedOn: string;
};

export function stagingSummary(s: Staging): string {
  const markers = Object.entries(s.biomarkers)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  return `${s.primarySite} (${s.icd10}) · ${s.histology} · ${s.t}${s.n}${s.m} · Stage ${s.stage}${
    s.grade ? ` · Grade ${s.grade}` : ""
  } · ECOG ${s.ecog} · ${s.intent}${markers ? ` · ${markers}` : ""}`;
}

export function parseStaging(objective: string | null | undefined): Staging | null {
  if (!objective) return null;
  try {
    const value = JSON.parse(objective) as Partial<Staging>;
    return value && typeof value === "object" && value.primarySite ? (value as Staging) : null;
  } catch {
    return null;
  }
}

/** Common primary sites with ICD-10 codes for quick coding. */
export const CANCER_SITES: { label: string; icd10: string }[] = [
  { label: "Breast", icd10: "C50.9" },
  { label: "Cervix uteri", icd10: "C53.9" },
  { label: "Colon", icd10: "C18.9" },
  { label: "Rectum", icd10: "C20" },
  { label: "Oesophagus", icd10: "C15.9" },
  { label: "Stomach", icd10: "C16.9" },
  { label: "Liver (HCC)", icd10: "C22.0" },
  { label: "Lung / bronchus", icd10: "C34.9" },
  { label: "Prostate", icd10: "C61" },
  { label: "Ovary", icd10: "C56.9" },
  { label: "Bladder", icd10: "C67.9" },
  { label: "Thyroid", icd10: "C73" },
  { label: "Nasopharynx", icd10: "C11.9" },
  { label: "Hodgkin lymphoma", icd10: "C81.9" },
  { label: "Diffuse large B-cell lymphoma", icd10: "C83.3" },
  { label: "Kaposi sarcoma", icd10: "C46.9" },
];

export function isCancerCode(icd10: string | null | undefined): boolean {
  if (!icd10) return false;
  const code = icd10.toUpperCase();
  return code.startsWith("C") || /^D0[0-9]/.test(code);
}

/* ------------------------------- chemo orders ------------------------------- */

export type ChemoCode = { regimenId: string; cycle: number; drugCode: string };

export function chemoCode(c: ChemoCode) {
  return `CHEMO:${c.regimenId}:C${c.cycle}:${c.drugCode}`;
}

export function parseChemoCode(code: string | null | undefined): ChemoCode | null {
  const match = /^CHEMO:([^:]+):C(\d+):(.+)$/.exec(code ?? "");
  return match ? { regimenId: match[1]!, cycle: Number(match[2]), drugCode: match[3]! } : null;
}

/** Parses the administered amount from a chemo order name like "Doxorubicin 102 mg IV". */
export function doseFromOrderName(name: string): number | null {
  const match = /([\d.]+)\s*(mg|units)/i.exec(name);
  return match ? Number(match[1]) : null;
}

/* ----------------------------------- chart ----------------------------------- */

export type OncOrder = {
  id: string;
  category: string;
  code: string | null;
  name: string;
  status: string;
  priority: string;
  instructions: string | null;
  result_summary: string | null;
  result_values: unknown;
  is_critical: boolean;
  requested_at: string;
  verified_at: string | null;
  requested_by_label: string | null;
};

export type OncNote = {
  id: string;
  note_type: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  author_label: string | null;
  signed_at: string | null;
  created_at: string;
};

export type OncPatient = {
  id: string;
  full_name: string;
  mrn: string;
  date_of_birth: string;
  sex: string;
  egfr: number | null;
  blood_group: string | null;
  phone: string | null;
  insurance_provider: string | null;
};

export type OncologyChart = {
  patient: OncPatient;
  conditions: {
    id: string;
    name: string;
    icd10: string | null;
    status: string;
    onset_date: string | null;
  }[];
  allergies: { id: string; substance: string; reaction: string | null; severity: string }[];
  orders: OncOrder[];
  notes: OncNote[];
  appointments: { id: string; scheduled_at: string; reason: string | null; status: string }[];
  staging: Staging | null;
  cyclesGiven: { regimenId: string; cycle: number; at: string }[];
  cumulativeDoxorubicinMgM2: number | null;
};

const ORDER_COLS =
  "id,category,code,name,status,priority,instructions,result_summary,result_values,is_critical,requested_at,verified_at,requested_by_label";
const NOTE_COLS =
  "id,note_type,subjective,objective,assessment,plan,author_label,signed_at,created_at";

function summariseCycles(orders: OncOrder[]) {
  const seen = new Map<string, { regimenId: string; cycle: number; at: string }>();
  for (const order of orders) {
    const code = parseChemoCode(order.code);
    if (!code || order.status === "cancelled") continue;
    const key = `${code.regimenId}:${code.cycle}`;
    if (!seen.has(key))
      seen.set(key, { regimenId: code.regimenId, cycle: code.cycle, at: order.requested_at });
  }
  return [...seen.values()].sort((a, b) => a.at.localeCompare(b.at));
}

/** Cumulative doxorubicin exposure in mg/m², using BSA stored in each order's instructions. */
function cumulativeDoxorubicin(orders: OncOrder[]): number | null {
  let total = 0;
  let any = false;
  for (const order of orders) {
    const code = parseChemoCode(order.code);
    if (!code || code.drugCode !== "DOXO" || order.status === "cancelled") continue;
    const mg = doseFromOrderName(order.name);
    const bsa = Number(/BSA ([\d.]+)/.exec(order.instructions ?? "")?.[1]);
    if (mg && bsa > 0) {
      total += mg / bsa;
      any = true;
    }
  }
  return any ? Math.round(total) : null;
}

export const oncologyChartQuery = (patientId: string) =>
  queryOptions({
    queryKey: ["oncology", "chart", patientId],
    enabled: Boolean(patientId),
    queryFn: async (): Promise<OncologyChart> => {
      const [patient, conditions, allergies, orders, notes, appointments] = await Promise.all([
        supabase
          .from("patients")
          .select("id,full_name,mrn,date_of_birth,sex,egfr,blood_group,phone,insurance_provider")
          .eq("id", patientId)
          .single(),
        supabase
          .from("conditions")
          .select("id,name,icd10,status,onset_date")
          .eq("patient_id", patientId),
        supabase
          .from("allergies")
          .select("id,substance,reaction,severity")
          .eq("patient_id", patientId),
        supabase
          .from("orders")
          .select(ORDER_COLS)
          .eq("patient_id", patientId)
          .order("requested_at", { ascending: false }),
        supabase
          .from("clinical_notes")
          .select(NOTE_COLS)
          .eq("patient_id", patientId)
          .order("created_at", { ascending: false }),
        supabase
          .from("appointments")
          .select("id,scheduled_at,reason,status")
          .eq("patient_id", patientId)
          .order("scheduled_at", { ascending: true }),
      ]);
      if (patient.error) throw new Error(patient.error.message);
      const orderRows = (orders.data ?? []) as unknown as OncOrder[];
      const noteRows = (notes.data ?? []) as unknown as OncNote[];
      const stagingNote = noteRows.find((n) => n.note_type === "oncology_staging");
      return {
        patient: {
          ...(patient.data as OncPatient),
          full_name: toEthiopianName(patient.data.full_name),
        },
        conditions: conditions.data ?? [],
        allergies: allergies.data ?? [],
        orders: orderRows,
        notes: noteRows,
        appointments: appointments.data ?? [],
        staging: parseStaging(stagingNote?.objective),
        cyclesGiven: summariseCycles(orderRows),
        cumulativeDoxorubicinMgM2: cumulativeDoxorubicin(orderRows),
      };
    },
  });

export type OncologyListRow = {
  patient: OncPatient;
  diagnosis: { name: string; icd10: string | null; onset_date: string | null };
  staging: Staging | null;
  regimenId: string | null;
  lastCycle: number | null;
  lastCycleAt: string | null;
  nextAppointment: string | null;
  tumourBoardPending: boolean;
};

/** Cancer registry — every patient with an ICD-10 C/D0 condition. */
export const oncologyPatientsQuery = queryOptions({
  queryKey: ["oncology", "patients"],
  queryFn: async (): Promise<OncologyListRow[]> => {
    const { data: conds, error } = await supabase
      .from("conditions")
      .select(
        "name,icd10,onset_date,patient_id,patients(id,full_name,mrn,date_of_birth,sex,egfr,blood_group,phone,insurance_provider)",
      )
      .or("icd10.ilike.C%,icd10.ilike.D0%")
      .limit(500);
    if (error) throw new Error(error.message);
    const rows = (conds ?? []) as unknown as {
      name: string;
      icd10: string | null;
      onset_date: string | null;
      patient_id: string;
      patients: OncPatient | null;
    }[];
    const ids = [...new Set(rows.map((r) => r.patient_id))];
    if (!ids.length) return [];

    const [notes, orders, appts] = await Promise.all([
      supabase
        .from("clinical_notes")
        .select("patient_id,note_type,objective,created_at")
        .in("patient_id", ids)
        .in("note_type", ["oncology_staging", "tumour_board"])
        .order("created_at", { ascending: false }),
      supabase
        .from("orders")
        .select("patient_id,code,status,requested_at")
        .in("patient_id", ids)
        .like("code", "CHEMO:%")
        .order("requested_at", { ascending: false }),
      supabase
        .from("appointments")
        .select("patient_id,scheduled_at,status")
        .in("patient_id", ids)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true }),
    ]);

    const byPatient = new Map<string, OncologyListRow>();
    for (const row of rows) {
      if (!row.patients || byPatient.has(row.patient_id)) continue;
      const pNotes = (notes.data ?? []).filter((n) => n.patient_id === row.patient_id);
      const staging = parseStaging(
        pNotes.find((n) => n.note_type === "oncology_staging")?.objective,
      );
      const lastChemo = (orders.data ?? []).find(
        (o) => o.patient_id === row.patient_id && o.status !== "cancelled",
      );
      const code = parseChemoCode(lastChemo?.code);
      const next = (appts.data ?? []).find(
        (a) => a.patient_id === row.patient_id && a.status === "booked",
      );
      byPatient.set(row.patient_id, {
        patient: { ...row.patients, full_name: toEthiopianName(row.patients.full_name) },
        diagnosis: { name: row.name, icd10: row.icd10, onset_date: row.onset_date },
        staging,
        regimenId: code?.regimenId ?? null,
        lastCycle: code?.cycle ?? null,
        lastCycleAt: lastChemo?.requested_at ?? null,
        nextAppointment: next?.scheduled_at ?? null,
        tumourBoardPending: Boolean(staging) && !pNotes.some((n) => n.note_type === "tumour_board"),
      });
    }
    return [...byPatient.values()];
  },
});

/* ------------------------------ pre-chemo gate ------------------------------ */

export type GateCheck = {
  label: string;
  status: "pass" | "warn" | "fail" | "missing";
  detail: string;
};

export function preChemoChecks(
  chart: OncologyChart,
  regimen: Regimen,
  doses: CalculatedDose[],
): GateCheck[] {
  const checks: GateCheck[] = [];
  const results = chart.orders.filter((o) => o.status === "resulted" || o.status === "completed");
  const withinDays = (at: string | null, days: number) =>
    at ? Date.now() - new Date(at).getTime() <= days * 86_400_000 : false;

  const anc = latestAnalyte(results, "ANC");
  checks.push(
    !anc
      ? {
          label: "Neutrophils (ANC)",
          status: "missing",
          detail: "No CBC on file — order before treatment",
        }
      : {
          label: "Neutrophils (ANC)",
          status: anc.value >= 1.5 ? (withinDays(anc.at, 7) ? "pass" : "warn") : "fail",
          detail: `${anc.value} ×10⁹/L (needs ≥ 1.5)${withinDays(anc.at, 7) ? "" : " · result older than 7 days"}`,
        },
  );

  const plt = latestAnalyte(results, "PLT");
  checks.push(
    !plt
      ? { label: "Platelets", status: "missing", detail: "No platelet count on file" }
      : {
          label: "Platelets",
          status: plt.value >= 100 ? "pass" : "fail",
          detail: `${plt.value} ×10⁹/L (needs ≥ 100)`,
        },
  );

  const egfr = chart.patient.egfr;
  const usesCisplatin = regimen.drugs.some((d) => d.code === "CISP");
  const usesCarbo = regimen.drugs.some((d) => d.basis === "auc");
  checks.push(
    egfr === null
      ? {
          label: "Renal function (eGFR)",
          status: usesCarbo || usesCisplatin ? "fail" : "missing",
          detail: "eGFR not recorded",
        }
      : {
          label: "Renal function (eGFR)",
          status:
            usesCisplatin && egfr < 60 ? "fail" : egfr < 30 ? "fail" : egfr < 60 ? "warn" : "pass",
          detail: `${egfr} mL/min${usesCisplatin && egfr < 60 ? " · cisplatin contraindicated below 60" : ""}${
            usesCarbo ? " · drives Calvert carboplatin dose" : ""
          }`,
        },
  );

  const bili = latestAnalyte(results, "TBIL");
  const hepaticSensitive = regimen.drugs.some((d) =>
    ["DOXO", "PACLI", "VINC", "VINB"].includes(d.code),
  );
  if (hepaticSensitive) {
    checks.push(
      !bili
        ? {
            label: "Bilirubin",
            status: "missing",
            detail: "No LFT on file — anthracycline/taxane/vinca need hepatic check",
          }
        : {
            label: "Bilirubin",
            status: bili.value <= 1.2 ? "pass" : bili.value <= 3 ? "warn" : "fail",
            detail: `${bili.value} mg/dL${bili.value > 1.2 ? " · consider dose reduction" : ""}`,
          },
    );
  }

  const doxo = doses.find((d) => d.code === "DOXO");
  if (doxo) {
    const prior = chart.cumulativeDoxorubicinMgM2 ?? 0;
    const after = prior + doxo.amount;
    checks.push({
      label: "Cumulative anthracycline",
      status: after > 450 ? "fail" : after > 400 ? "warn" : "pass",
      detail: `${prior} → ${after} mg/m² doxorubicin (lifetime limit 450)`,
    });
  }

  const allergyHits = chart.allergies.filter((a) =>
    regimen.drugs.some(
      (d) =>
        d.drug.toLowerCase().includes(a.substance.toLowerCase()) ||
        a.substance.toLowerCase().includes(d.drug.toLowerCase()),
    ),
  );
  checks.push(
    allergyHits.length
      ? {
          label: "Allergy check",
          status: "fail",
          detail: allergyHits.map((a) => `${a.substance} (${a.severity})`).join(", "),
        }
      : {
          label: "Allergy check",
          status: "pass",
          detail: chart.allergies.length
            ? `No match against ${chart.allergies.length} recorded allergies`
            : "No allergies recorded",
        },
  );

  const ecog = chart.staging?.ecog;
  checks.push(
    ecog === undefined
      ? { label: "Performance status", status: "missing", detail: "No ECOG on staging record" }
      : {
          label: "Performance status",
          status: ecog <= 1 ? "pass" : ecog === 2 ? "warn" : "fail",
          detail: `ECOG ${ecog}`,
        },
  );

  return checks;
}

/* --------------------------------- mutations -------------------------------- */

async function actorLabel() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return "Clinician";
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return data?.full_name ?? auth.user.email ?? "Clinician";
}

async function hospitalId() {
  const { data, error } = await supabase
    .from("hospitals")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "No hospital configured");
  return data.id;
}

/** Records the cancer diagnosis (condition) and a signed staging note. */
export async function saveStaging(input: {
  patientId: string;
  staging: Staging;
  conditionId?: string | null;
}) {
  const author = await actorLabel();
  const s = input.staging;
  const conditionName = `${s.histology || "Malignant neoplasm"} of ${s.primarySite.toLowerCase()}`;

  if (input.conditionId) {
    const { error } = await supabase
      .from("conditions")
      .update({ name: conditionName, icd10: s.icd10, onset_date: s.diagnosedOn || null })
      .eq("id", input.conditionId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("conditions").insert({
      patient_id: input.patientId,
      name: conditionName,
      icd10: s.icd10,
      status: "active",
      onset_date: s.diagnosedOn || null,
    });
    if (error) throw new Error(error.message);
  }

  const { error } = await supabase.from("clinical_notes").insert({
    patient_id: input.patientId,
    author_label: author,
    note_type: "oncology_staging",
    subjective: `Cancer staging — ${s.primarySite}`,
    objective: JSON.stringify(s),
    assessment: stagingSummary(s),
    plan: `Treatment intent: ${s.intent}`,
    signed_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);

  await emitEvent({
    eventType: "oncology.staging_recorded",
    departmentCode: "ONCOLOGY",
    entityType: "patient",
    entityId: input.patientId,
    payload: {
      site: s.primarySite,
      icd10: s.icd10,
      stage: s.stage,
      tnm: `${s.t}${s.n}${s.m}`,
      by: author,
    },
  });
}

/** Prescribes one chemotherapy cycle: one medication order per drug + the next-cycle appointment. */
export async function prescribeCycle(input: {
  patientId: string;
  regimen: Regimen;
  cycle: number;
  doses: CalculatedDose[];
  bsa: number;
  heightCm: number;
  weightKg: number;
  reductionPct: number;
  startDate: string;
  overrideReason?: string;
}) {
  const [hid, author] = await Promise.all([hospitalId(), actorLabel()]);
  const rows = input.doses.map((d) => ({
    hospital_id: hid,
    patient_id: input.patientId,
    encounter_id: null,
    category: "medication" as const,
    code: chemoCode({ regimenId: input.regimen.id, cycle: input.cycle, drugCode: d.code }),
    name: `${d.drug} ${d.dose} ${d.unit} ${d.route}`,
    priority: "urgent",
    instructions:
      `${input.regimen.name} · Cycle ${input.cycle} of ${input.regimen.cycles} · ${d.schedule} · ` +
      `${d.formula}${input.reductionPct ? ` · ${input.reductionPct}% dose reduction` : ""}${d.capped ? " · capped" : ""} · ` +
      `BSA ${input.bsa} m² (Ht ${input.heightCm} cm, Wt ${input.weightKg} kg) · Start ${input.startDate} · ` +
      `CHEMO — independent double-check required${input.overrideReason ? ` · Override: ${input.overrideReason}` : ""}`,
    requested_by_label: author,
  }));
  const { error } = await supabase.from("orders").insert(rows);
  if (error) throw new Error(error.message);

  if (input.cycle < input.regimen.cycles) {
    const next = new Date(`${input.startDate}T09:00:00`);
    next.setDate(next.getDate() + input.regimen.cycleDays);
    const { error: apptError } = await supabase.from("appointments").insert({
      hospital_id: hid,
      patient_id: input.patientId,
      scheduled_at: next.toISOString(),
      reason: `Chemo ${input.regimen.id} C${input.cycle + 1}`,
      status: "booked",
      booked_by_label: author,
    });
    if (apptError) throw new Error(apptError.message);
  }

  await emitEvent({
    eventType: "oncology.cycle_prescribed",
    severity: input.overrideReason ? "warning" : "info",
    departmentCode: "ONCOLOGY",
    entityType: "patient",
    entityId: input.patientId,
    payload: {
      regimen: input.regimen.id,
      cycle: input.cycle,
      bsa: input.bsa,
      reduction_pct: input.reductionPct,
      override: input.overrideReason ?? null,
      by: author,
    },
  });
}

/** Records a multidisciplinary tumour-board decision. */
export async function recordTumourBoard(input: {
  patientId: string;
  caseSummary: string;
  attendees: string[];
  discussion: string;
  recommendation: string;
}) {
  const author = await actorLabel();
  const { error } = await supabase.from("clinical_notes").insert({
    patient_id: input.patientId,
    author_label: author,
    note_type: "tumour_board",
    subjective: input.caseSummary,
    objective: JSON.stringify({ attendees: input.attendees }),
    assessment: input.discussion,
    plan: input.recommendation,
    signed_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  await emitEvent({
    eventType: "oncology.tumour_board_decision",
    departmentCode: "ONCOLOGY",
    entityType: "patient",
    entityId: input.patientId,
    payload: { recommendation: input.recommendation, attendees: input.attendees, by: author },
  });
}
