/**
 * HIS & Interoperability analytics — every figure on the HIS page is computed
 * here from live Supabase queries (bounded row counts, no mock data).
 */
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { toEthiopianName } from "@/lib/hip/ethiopian-names";
import { atcFor } from "@/lib/hip/atc";
import { resolveIcdo3 } from "@/lib/hip/icdo3";
import { readLabValues } from "@/lib/hip/lab-panels";
import {
  CANCER_SITES,
  parseChemoCode,
  regimenById,
  type OncologyListRow,
} from "@/lib/hip/oncology";
import { csvCell } from "@/lib/hip/csv";

const ROW_LIMIT = 1000;
const DAY_MS = 86_400_000;

type Countable = { count: number | null; error: { message: string } | null };

function countOf(result: Countable, label: string): number {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.count ?? 0;
}

function rowsOf<T>(
  result: { data: T[] | null; error: { message: string } | null },
  label: string,
): T[] {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data ?? [];
}

export function median(values: number[]): number | null {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

/* ------------------------------------ KPIs ----------------------------------- */

export type HisKpis = {
  patients: number;
  encounters30d: number;
  conditions: number;
  codedConditions: number;
  codedPct: number;
  structuredLabs: number;
  events24h: number;
  fhirRecords: number;
};

export const hisKpiQuery = queryOptions({
  queryKey: ["his", "kpis"],
  refetchInterval: 60_000,
  queryFn: async (): Promise<HisKpis> => {
    const since30 = new Date(Date.now() - 30 * DAY_MS).toISOString();
    const since24 = new Date(Date.now() - DAY_MS).toISOString();
    const head = { count: "exact" as const, head: true };
    const [
      patients,
      encounters30d,
      encountersAll,
      conditions,
      coded,
      structuredLabs,
      imagingResults,
      medications,
      allergies,
      vitals,
      events24h,
    ] = await Promise.all([
      supabase.from("patients").select("id", head),
      supabase.from("encounters").select("id", head).gte("started_at", since30),
      supabase.from("encounters").select("id", head),
      supabase.from("conditions").select("id", head),
      supabase.from("conditions").select("id", head).not("icd10", "is", null).neq("icd10", ""),
      supabase
        .from("orders")
        .select("id", head)
        .eq("category", "laboratory")
        .eq("result_values->>kind", "lab"),
      supabase
        .from("orders")
        .select("id", head)
        .eq("category", "imaging")
        .in("status", ["resulted", "completed"]),
      supabase.from("orders").select("id", head).eq("category", "medication"),
      supabase.from("allergies").select("id", head),
      supabase.from("vitals").select("id", head),
      supabase.from("events").select("id", head).gte("occurred_at", since24),
    ]);
    const n = {
      patients: countOf(patients, "Patients"),
      encounters30d: countOf(encounters30d, "Encounters"),
      encountersAll: countOf(encountersAll, "Encounters"),
      conditions: countOf(conditions, "Conditions"),
      coded: countOf(coded, "Conditions"),
      structuredLabs: countOf(structuredLabs, "Lab results"),
      imaging: countOf(imagingResults, "Imaging"),
      medications: countOf(medications, "Medication orders"),
      allergies: countOf(allergies, "Allergies"),
      vitals: countOf(vitals, "Vitals"),
      events24h: countOf(events24h, "Events"),
    };
    return {
      patients: n.patients,
      encounters30d: n.encounters30d,
      conditions: n.conditions,
      codedConditions: n.coded,
      codedPct: pct(n.coded, n.conditions),
      structuredLabs: n.structuredLabs,
      events24h: n.events24h,
      fhirRecords:
        n.patients +
        n.encountersAll +
        n.conditions +
        n.allergies +
        n.vitals +
        n.medications +
        n.structuredLabs +
        n.imaging,
    };
  },
});

/* ------------------------------ data quality ------------------------------ */

export type QualityMetric = {
  key: string;
  label: string;
  numerator: number;
  denominator: number;
  pct: number;
};

export type DataQuality = {
  metrics: QualityMetric[];
  score: number;
  topIcd10: { code: string; name: string; count: number }[];
  sampled: { patients: number; conditions: number; labs: number };
};

export const dataQualityQuery = queryOptions({
  queryKey: ["his", "data-quality"],
  queryFn: async (): Promise<DataQuality> => {
    const [patientsRes, conditionsRes, labsRes, medsRes, consentRes] = await Promise.all([
      supabase
        .from("patients")
        .select("id,date_of_birth,sex,phone,blood_group,insurance_provider")
        .limit(ROW_LIMIT),
      supabase.from("conditions").select("name,icd10").limit(ROW_LIMIT),
      supabase
        .from("orders")
        .select("result_values")
        .eq("category", "laboratory")
        .in("status", ["resulted", "completed"])
        .order("requested_at", { ascending: false })
        .limit(ROW_LIMIT),
      supabase
        .from("orders")
        .select("name")
        .eq("category", "medication")
        .order("requested_at", { ascending: false })
        .limit(ROW_LIMIT),
      supabase
        .from("events")
        .select("entity_id,payload")
        .eq("event_type", "patient.consent_recorded")
        .limit(ROW_LIMIT * 5),
    ]);
    const patients = rowsOf(patientsRes, "Patients");
    const meds = rowsOf(medsRes, "Medication orders");
    const withNationalId = new Set(
      rowsOf(consentRes, "Consent records")
        .filter((e) => {
          const nid = (e.payload as Record<string, unknown> | null)?.["national_id"];
          return typeof nid === "string" && nid.trim() !== "";
        })
        .map((e) => e.entity_id),
    );
    const conditions = rowsOf(conditionsRes, "Conditions");
    const labs = rowsOf(labsRes, "Lab orders");

    const filled = (v: string | null | undefined) => Boolean(v && v.trim());
    const metric = (
      key: string,
      label: string,
      numerator: number,
      denominator: number,
    ): QualityMetric => ({
      key,
      label,
      numerator,
      denominator,
      pct: pct(numerator, denominator),
    });

    const codedConditions = conditions.filter((c) => filled(c.icd10));
    const metrics: QualityMetric[] = [
      metric(
        "dob",
        "Date of birth",
        patients.filter((p) => filled(p.date_of_birth)).length,
        patients.length,
      ),
      metric(
        "sex",
        "Sex recorded",
        patients.filter((p) => filled(p.sex) && p.sex.toLowerCase() !== "unknown").length,
        patients.length,
      ),
      metric(
        "phone",
        "Phone contact",
        patients.filter((p) => filled(p.phone)).length,
        patients.length,
      ),
      metric(
        "blood",
        "Blood group",
        patients.filter((p) => filled(p.blood_group)).length,
        patients.length,
      ),
      metric(
        "insurance",
        "Insurance / payer",
        patients.filter((p) => filled(p.insurance_provider)).length,
        patients.length,
      ),
      metric(
        "nid",
        "National ID recorded",
        patients.filter((p) => withNationalId.has(p.id)).length,
        patients.length,
      ),
      metric("icd10", "Diagnoses ICD-10 coded", codedConditions.length, conditions.length),
      metric(
        "atc",
        "Medications ATC-coded",
        meds.filter((m) => atcFor(m.name) !== null).length,
        meds.length,
      ),
      metric(
        "labs",
        "Lab results structured",
        labs.filter((l) => readLabValues(l.result_values) !== null).length,
        labs.length,
      ),
    ];
    const scored = metrics.filter((m) => m.denominator > 0);
    const score = scored.length
      ? Math.round((scored.reduce((sum, m) => sum + m.pct, 0) / scored.length) * 10) / 10
      : 0;

    const byCode = new Map<string, { code: string; name: string; count: number }>();
    for (const c of codedConditions) {
      const code = c.icd10!.trim().toUpperCase();
      const entry = byCode.get(code) ?? { code, name: c.name, count: 0 };
      entry.count += 1;
      byCode.set(code, entry);
    }
    const topIcd10 = [...byCode.values()].sort((a, b) => b.count - a.count).slice(0, 10);

    return {
      metrics,
      score,
      topIcd10,
      sampled: { patients: patients.length, conditions: conditions.length, labs: labs.length },
    };
  },
});

/* ----------------------------- cancer registry ----------------------------- */

/** First (earliest) non-cancelled chemotherapy order per patient. */
export const firstChemoQuery = queryOptions({
  queryKey: ["his", "first-chemo"],
  queryFn: async (): Promise<Record<string, { at: string; regimenId: string | null }>> => {
    const res = await supabase
      .from("orders")
      .select("patient_id,code,status,requested_at")
      .like("code", "CHEMO:%")
      .neq("status", "cancelled")
      .order("requested_at", { ascending: true })
      .limit(ROW_LIMIT);
    const rows = rowsOf(res, "Chemotherapy orders");
    const first: Record<string, { at: string; regimenId: string | null }> = {};
    for (const row of rows) {
      if (first[row.patient_id]) continue;
      first[row.patient_id] = {
        at: row.requested_at,
        regimenId: parseChemoCode(row.code)?.regimenId ?? null,
      };
    }
    return first;
  },
});

export type RegistryRow = {
  patientId: string;
  mrn: string;
  name: string;
  sex: string;
  age: number | null;
  site: string;
  icd10: string;
  histology: string;
  tnm: string;
  stage: string;
  stageGroup: "I" | "II" | "III" | "IV" | "0" | "Unstaged";
  intent: string;
  diagnosisDate: string | null;
  firstTreatment: string | null;
  daysToTreatment: number | null;
  regimen: string;
  icdo3Topography: string;
  icdo3Morphology: string;
  morphologyLabel: string;
  basis: string;
  basisLabel: string;
  /** Some ICD-O-3 values were inferred (ICD-10 / histology text) rather than coded. */
  icdo3Inferred: boolean;
};

function ageFrom(dob: string | null | undefined): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function stageGroup(stage: string | null | undefined): RegistryRow["stageGroup"] {
  const value = (stage ?? "")
    .toUpperCase()
    .replace(/^STAGE\s*/, "")
    .trim();
  if (!value) return "Unstaged";
  if (value.startsWith("IV") || value.startsWith("4")) return "IV";
  if (value.startsWith("III") || value.startsWith("3")) return "III";
  if (value.startsWith("II") || value.startsWith("2")) return "II";
  if (value.startsWith("I") || value.startsWith("1")) return "I";
  if (value.startsWith("0")) return "0";
  return "Unstaged";
}

function siteFor(icd10: string | null, fallback: string): string {
  if (!icd10) return fallback;
  const code = icd10.toUpperCase();
  const exact = CANCER_SITES.find((s) => s.icd10 === code);
  if (exact) return exact.label;
  const prefix = CANCER_SITES.find((s) => s.icd10.slice(0, 3) === code.slice(0, 3));
  return prefix?.label ?? fallback;
}

export function buildRegistry(
  rows: OncologyListRow[],
  firstChemo: Record<string, { at: string; regimenId: string | null }>,
): RegistryRow[] {
  return rows.map((row) => {
    const s = row.staging;
    const icd10 = s?.icd10 || row.diagnosis.icd10 || "";
    const diagnosisDate = s?.diagnosedOn || row.diagnosis.onset_date || null;
    const first = firstChemo[row.patient.id];
    const firstTreatment = first?.at ?? null;
    let daysToTreatment: number | null = null;
    if (diagnosisDate && firstTreatment) {
      const diff = Math.round(
        (new Date(firstTreatment).getTime() - new Date(diagnosisDate).getTime()) / DAY_MS,
      );
      daysToTreatment = Number.isFinite(diff) && diff >= 0 ? diff : null;
    }
    const regimenId = first?.regimenId ?? row.regimenId;
    const regimen = regimenId ? (regimenById(regimenId)?.name ?? regimenId) : "";
    const o3 = resolveIcdo3(s, icd10);
    return {
      patientId: row.patient.id,
      mrn: row.patient.mrn,
      name: toEthiopianName(row.patient.full_name),
      sex: row.patient.sex,
      age: ageFrom(row.patient.date_of_birth),
      site: s?.primarySite || siteFor(icd10 || null, row.diagnosis.name),
      icd10,
      histology: s?.histology ?? "",
      tnm: s ? `${s.t}${s.n}${s.m}` : "",
      stage: s?.stage ?? "",
      stageGroup: stageGroup(s?.stage),
      intent: s?.intent ?? "",
      diagnosisDate,
      firstTreatment,
      daysToTreatment,
      regimen,
      icdo3Topography: o3.topography,
      icdo3Morphology: o3.morphology,
      morphologyLabel: o3.morphologyLabel,
      basis: o3.basis,
      basisLabel: o3.basisLabel,
      icdo3Inferred: o3.inferred,
    };
  });
}


export function registryCsv(rows: RegistryRow[]): string {
  const header = [
    "MRN",
    "Name",
    "Sex",
    "Age",
    "Primary site",
    "ICD-10",
    "ICD-O-3 topography",
    "ICD-O-3 morphology",
    "Morphology description",
    "Basis of diagnosis",
    "Histology",
    "TNM",
    "Stage",
    "Intent",
    "Diagnosis date",
    "First treatment date",
    "Regimen",
  ];
  const lines = rows.map((r) =>
    [
      r.mrn,
      r.name,
      r.sex,
      r.age,
      r.site,
      r.icd10,
      r.icdo3Topography,
      r.icdo3Morphology,
      r.morphologyLabel,
      r.basis,
      r.histology,
      r.tnm,
      r.stage,
      r.intent,
      r.diagnosisDate?.slice(0, 10),
      r.firstTreatment?.slice(0, 10),
      r.regimen,
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\r\n");
}

/* ---------------------------- audit & provenance ---------------------------- */

export const eventTypeCountsQuery = queryOptions({
  queryKey: ["his", "event-types"],
  refetchInterval: 30_000,
  queryFn: async () => {
    const res = await supabase
      .from("events")
      .select("event_type,severity")
      .order("occurred_at", { ascending: false })
      .limit(ROW_LIMIT);
    const rows = rowsOf(res, "Events");
    const map = new Map<string, number>();
    for (const row of rows) map.set(row.event_type, (map.get(row.event_type) ?? 0) + 1);
    return {
      sampled: rows.length,
      critical: rows.filter((r) => r.severity === "critical").length,
      warning: rows.filter((r) => r.severity === "warning").length,
      top: [...map.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    };
  },
});

export type TrailItem = {
  id: string;
  source: "event" | "audit" | "provenance";
  at: string;
  title: string;
  detail: string;
  severity: string;
  /** Set for read-only access (chart opened, FHIR API read). */
  view?: { actor: string; via: string };
};

/** Every event, audit entry and provenance record touching a patient or their encounters/orders. */
/** Read-only access to a chart: opening it in the app, or reading it through the FHIR API. */
export const VIEW_EVENTS = new Set(["patient.chart_viewed", "fhir.api_read"]);

export type ChartViewer = { actor: string; views: number; lastAt: string; viaApi: boolean };

/** Who looked at this record, most recent first. */
export function viewersFrom(items: TrailItem[]): ChartViewer[] {
  const byActor = new Map<string, ChartViewer>();
  for (const item of items) {
    if (!item.view) continue;
    const v = byActor.get(item.view.actor) ?? {
      actor: item.view.actor,
      views: 0,
      lastAt: item.at,
      viaApi: false,
    };
    v.views += 1;
    if (item.at > v.lastAt) v.lastAt = item.at;
    if (item.view.via === "fhir.api_read") v.viaApi = true;
    byActor.set(item.view.actor, v);
  }
  return [...byActor.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export const patientTrailQuery = (patientId: string) =>
  queryOptions({
    queryKey: ["his", "trail", patientId],
    enabled: Boolean(patientId),
    queryFn: async (): Promise<TrailItem[]> => {
      const [encRes, ordRes] = await Promise.all([
        supabase.from("encounters").select("id").eq("patient_id", patientId).limit(50),
        supabase
          .from("orders")
          .select("id")
          .eq("patient_id", patientId)
          .order("requested_at", { ascending: false })
          .limit(100),
      ]);
      const ids = [
        patientId,
        ...rowsOf(encRes, "Encounters").map((r) => r.id),
        ...rowsOf(ordRes, "Orders").map((r) => r.id),
      ];
      const [eventsRes, auditRes, provRes] = await Promise.all([
        supabase
          .from("events")
          .select(
            "id,event_type,severity,department_code,actor_label,entity_type,entity_id,occurred_at",
          )
          .or(`entity_id.in.(${ids.join(",")}),payload->>patient_id.eq.${patientId}`)
          .order("occurred_at", { ascending: false })
          .limit(200),
        supabase
          .from("audit_log")
          .select("id,action,actor_label,entity_type,reason,occurred_at")
          .in("entity_id", ids)
          .order("occurred_at", { ascending: false })
          .limit(100),
        supabase
          .from("data_provenance")
          .select("id,entity_type,field_name,source,confidence,entered_by,verified_at,created_at")
          .in("entity_id", ids)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      const items: TrailItem[] = [];
      for (const e of rowsOf(eventsRes, "Events")) {
        items.push({
          id: `e-${e.id}`,
          source: "event",
          at: e.occurred_at,
          title: e.event_type.replace(/[._]/g, " "),
          detail: [e.actor_label, e.department_code, e.entity_type].filter(Boolean).join(" · "),
          severity: e.severity,
          ...(VIEW_EVENTS.has(e.event_type)
            ? { view: { actor: e.actor_label ?? "Unknown user", via: e.event_type } }
            : {}),
        });
      }
      // audit_log / provenance are best-effort: a restricted role simply sees fewer rows.
      for (const a of auditRes.error ? [] : (auditRes.data ?? [])) {
        items.push({
          id: `a-${a.id}`,
          source: "audit",
          at: a.occurred_at,
          title: a.action.replace(/[._]/g, " "),
          detail: [a.actor_label, a.entity_type, a.reason].filter(Boolean).join(" · "),
          severity: "info",
        });
      }
      for (const p of provRes.error ? [] : (provRes.data ?? [])) {
        items.push({
          id: `p-${p.id}`,
          source: "provenance",
          at: p.created_at,
          title: `${p.entity_type}.${p.field_name} recorded`,
          detail: [
            `source: ${p.source}`,
            `confidence: ${p.confidence}`,
            p.verified_at ? "verified" : "unverified",
          ].join(" · "),
          severity: "info",
        });
      }
      return items.sort((a, b) => b.at.localeCompare(a.at));
    },
  });

export const provenanceSummaryQuery = queryOptions({
  queryKey: ["his", "provenance"],
  queryFn: async () => {
    const res = await supabase
      .from("data_provenance")
      .select("source,confidence,verified_at")
      .limit(ROW_LIMIT);
    if (res.error)
      return { total: 0, verified: 0, sources: [] as { source: string; count: number }[] };
    const rows = res.data ?? [];
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.source, (map.get(r.source) ?? 0) + 1);
    return {
      total: rows.length,
      verified: rows.filter((r) => r.verified_at).length,
      sources: [...map.entries()]
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
    };
  },
});

/* ---------------------------- facility analytics ---------------------------- */

export type FacilityAnalytics = {
  encountersByDay: { day: string; label: string; count: number }[];
  ordersByCategory: { category: string; count: number }[];
  tat: { category: "laboratory" | "imaging"; medianMinutes: number | null; n: number }[];
  sampledOrders: number;
};

export const facilityAnalyticsQuery = queryOptions({
  queryKey: ["his", "facility-analytics"],
  refetchInterval: 60_000,
  queryFn: async (): Promise<FacilityAnalytics> => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setTime(start.getTime() - 13 * DAY_MS);
    const [encRes, ordRes] = await Promise.all([
      supabase
        .from("encounters")
        .select("started_at")
        .gte("started_at", start.toISOString())
        .limit(ROW_LIMIT * 5),
      supabase
        .from("orders")
        .select("category,status,requested_at,verified_at")
        .order("requested_at", { ascending: false })
        .limit(ROW_LIMIT),
    ]);
    const encounters = rowsOf(encRes, "Encounters");
    const orders = rowsOf(ordRes, "Orders");

    const dayKey = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const days: FacilityAnalytics["encountersByDay"] = [];
    const index = new Map<string, number>();
    for (let i = 0; i < 14; i += 1) {
      const d = new Date(start.getTime() + i * DAY_MS);
      index.set(dayKey(d), days.length);
      days.push({
        day: dayKey(d),
        label: d.toLocaleDateString([], { month: "short", day: "numeric" }),
        count: 0,
      });
    }
    for (const e of encounters) {
      const i = index.get(dayKey(new Date(e.started_at)));
      if (i !== undefined) days[i]!.count += 1;
    }

    const cats = ["laboratory", "imaging", "medication", "procedure"] as const;
    const ordersByCategory = cats.map((category) => ({
      category,
      count: orders.filter((o) => o.category === category).length,
    }));

    const tat = (["laboratory", "imaging"] as const).map((category) => {
      const minutes = orders
        .filter((o) => o.category === category && o.verified_at)
        .map(
          (o) => (new Date(o.verified_at!).getTime() - new Date(o.requested_at).getTime()) / 60_000,
        )
        .filter((m) => m >= 0);
      const med = median(minutes);
      return { category, medianMinutes: med === null ? null : Math.round(med), n: minutes.length };
    });

    return { encountersByDay: days, ordersByCategory, tat, sampledOrders: orders.length };
  },
});

/* --------------------------------- download --------------------------------- */

/** Client-side file download via Blob URL (no server round-trip, no PHI leaves the browser). */
export function downloadText(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
