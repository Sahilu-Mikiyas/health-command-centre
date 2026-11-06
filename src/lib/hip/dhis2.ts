/**
 * DHIS2 monthly aggregate reporting.
 *
 * Builds a DHIS2 `dataValueSet` for one facility and one month straight from
 * the coded clinical record (encounters, orders, ICD-10 diagnoses, chemo
 * orders). Data elements, category option combos and the org unit are sent as
 * CODES, so the file imports into any DHIS2 instance (Import/Export app, or
 * `POST /api/dataValueSets?dataElementIdScheme=CODE&orgUnitIdScheme=CODE&categoryOptionComboIdScheme=CODE`)
 * once the national HMIS codes are mapped to these.
 */
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { isCancerCode, parseChemoCode } from "@/lib/hip/oncology";
import { csvCell } from "@/lib/hip/csv";

const ROW_LIMIT = 10000;

/* ---------------------------------- period ---------------------------------- */

/** DHIS2 monthly period id, e.g. "202610". */
export function monthPeriod(date: Date): string {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function periodRange(period: string): { start: string; end: string; label: string } {
  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(4, 6)) - 1;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: start.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
  };
}

/** The last `count` months, newest first. */
export function recentPeriods(count = 12, now = new Date()): string[] {
  return Array.from({ length: count }, (_, i) =>
    monthPeriod(new Date(now.getFullYear(), now.getMonth() - i, 1)),
  );
}

/* ------------------------------- disaggregation ------------------------------ */

export const AGE_BANDS = [
  { code: "LT5", label: "< 5", max: 5 },
  { code: "5_14", label: "5–14", max: 15 },
  { code: "15_29", label: "15–29", max: 30 },
  { code: "30_64", label: "30–64", max: 65 },
  { code: "65P", label: "65+", max: Infinity },
] as const;

export const DEFAULT_COC = "default";

function ageAt(dob: string | null | undefined, at: Date): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  let age = at.getFullYear() - birth.getFullYear();
  const m = at.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < birth.getDate())) age -= 1;
  return age;
}

/** Category option combo code, e.g. "F_30_64". Unknown sex or age falls into the total only. */
export function sexAgeCoc(
  sex: string | null | undefined,
  dob: string | null | undefined,
  at: Date,
) {
  const s = (sex ?? "").toLowerCase();
  const sexCode = s.startsWith("f") ? "F" : s.startsWith("m") ? "M" : null;
  const age = ageAt(dob, at);
  if (!sexCode || age === null || age < 0) return null;
  const band = AGE_BANDS.find((b) => age < b.max)!;
  return `${sexCode}_${band.code}`;
}

/* -------------------------------- data elements ------------------------------- */

export type DataElementDef = {
  code: string;
  name: string;
  group: "Service utilisation" | "Diagnostics" | "Inpatient" | "Oncology" | "Morbidity";
  disaggregated: boolean;
};

export const DATA_ELEMENTS: DataElementDef[] = [
  {
    code: "FURII_VISITS",
    name: "Patient visits (all encounters)",
    group: "Service utilisation",
    disaggregated: true,
  },
  {
    code: "FURII_NEW_REGISTRATIONS",
    name: "New patients registered",
    group: "Service utilisation",
    disaggregated: true,
  },
  {
    code: "FURII_LAB_TESTS",
    name: "Laboratory tests performed",
    group: "Diagnostics",
    disaggregated: false,
  },
  {
    code: "FURII_LAB_CRITICAL",
    name: "Critical laboratory results",
    group: "Diagnostics",
    disaggregated: false,
  },
  {
    code: "FURII_IMAGING_EXAMS",
    name: "Imaging examinations performed",
    group: "Diagnostics",
    disaggregated: false,
  },
  {
    code: "FURII_ADMISSIONS",
    name: "Inpatient admissions",
    group: "Inpatient",
    disaggregated: true,
  },
  {
    code: "FURII_DISCHARGES",
    name: "Inpatient discharges",
    group: "Inpatient",
    disaggregated: false,
  },
  {
    code: "FURII_ONC_NEW_CASES",
    name: "New cancer cases diagnosed (ICD-10 C00–D09)",
    group: "Oncology",
    disaggregated: true,
  },
  {
    code: "FURII_ONC_CHEMO_CYCLES",
    name: "Chemotherapy cycles started",
    group: "Oncology",
    disaggregated: false,
  },
];

/** Morbidity data elements are generated per ICD-10 category, e.g. "FURII_MORB_E11". */
export const MORBIDITY_PREFIX = "FURII_MORB_";

/* ---------------------------------- building --------------------------------- */

export type DataValue = {
  dataElement: string;
  period: string;
  orgUnit: string;
  categoryOptionCombo: string;
  value: string;
  comment?: string;
};

export type Dhis2Report = {
  period: string;
  periodLabel: string;
  orgUnit: string;
  /** Totals per data element, for the on-screen summary. */
  totals: { code: string; name: string; group: DataElementDef["group"]; value: number }[];
  morbidity: { icd10: string; name: string; value: number }[];
  dataValues: DataValue[];
  generatedAt: string;
};

type PatientInfo = { sex: string | null; date_of_birth: string | null };

class Tally {
  private totals = new Map<string, number>();
  private split = new Map<string, Map<string, number>>();
  add(code: string, coc: string | null, count = 1) {
    if (count <= 0) return;
    this.totals.set(code, (this.totals.get(code) ?? 0) + count);
    if (!coc) return;
    const byCoc = this.split.get(code) ?? new Map<string, number>();
    byCoc.set(coc, (byCoc.get(coc) ?? 0) + count);
    this.split.set(code, byCoc);
  }
  total(code: string) {
    return this.totals.get(code) ?? 0;
  }
  values(code: string, disaggregated: boolean): { coc: string; value: number }[] {
    const total = this.total(code);
    if (!disaggregated) return total ? [{ coc: DEFAULT_COC, value: total }] : [];
    const byCoc = this.split.get(code);
    const rows = byCoc ? [...byCoc.entries()].map(([coc, value]) => ({ coc, value })) : [];
    const known = rows.reduce((sum, r) => sum + r.value, 0);
    // Records with unknown sex or age still count, reported under the default combo.
    if (total - known > 0) rows.push({ coc: DEFAULT_COC, value: total - known });
    return rows.sort((a, b) => a.coc.localeCompare(b.coc));
  }
}

export async function buildDhis2Report(period: string, orgUnit: string): Promise<Dhis2Report> {
  const { start, end, label } = periodRange(period);
  const mid = new Date(new Date(start).getTime() + 14 * 86_400_000);

  const [encountersRes, newPatientsRes, ordersRes, conditionsRes] = await Promise.all([
    supabase
      .from("encounters")
      .select("id,patient_id,started_at,ended_at,bed_id,stage")
      .gte("started_at", start)
      .lt("started_at", end)
      .limit(ROW_LIMIT),
    supabase
      .from("patients")
      .select("id,sex,date_of_birth,created_at")
      .gte("created_at", start)
      .lt("created_at", end)
      .limit(ROW_LIMIT),
    supabase
      .from("orders")
      .select("patient_id,category,code,status,is_critical,requested_at,completed_at,verified_at")
      .gte("requested_at", start)
      .lt("requested_at", end)
      .neq("status", "cancelled")
      .limit(ROW_LIMIT),
    supabase
      .from("conditions")
      .select("patient_id,icd10,name,onset_date,created_at")
      .gte("created_at", start)
      .lt("created_at", end)
      .limit(ROW_LIMIT),
  ]);
  for (const [res, label_] of [
    [encountersRes, "Encounters"],
    [newPatientsRes, "Patients"],
    [ordersRes, "Orders"],
    [conditionsRes, "Diagnoses"],
  ] as const) {
    if (res.error) throw new Error(`${label_}: ${res.error.message}`);
  }
  const encounters = encountersRes.data ?? [];
  const newPatients = newPatientsRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const conditions = conditionsRes.data ?? [];

  // Discharges are counted by discharge date, which may fall after the admission month.
  const dischargesRes = await supabase
    .from("encounters")
    .select("id,bed_id,ended_at")
    .gte("ended_at", start)
    .lt("ended_at", end)
    .not("bed_id", "is", null)
    .limit(ROW_LIMIT);
  if (dischargesRes.error) throw new Error(`Discharges: ${dischargesRes.error.message}`);

  const patientIds = [
    ...new Set([...encounters, ...conditions].map((r) => r.patient_id).filter(Boolean)),
  ];
  const info = new Map<string, PatientInfo>();
  for (const p of newPatients) info.set(p.id, p);
  const missing = patientIds.filter((id) => !info.has(id));
  for (let i = 0; i < missing.length; i += 200) {
    const { data, error } = await supabase
      .from("patients")
      .select("id,sex,date_of_birth")
      .in("id", missing.slice(i, i + 200));
    if (error) throw new Error(`Patient demographics: ${error.message}`);
    for (const p of data ?? []) info.set(p.id, p);
  }
  const coc = (patientId: string, at: Date) => {
    const p = info.get(patientId);
    return p ? sexAgeCoc(p.sex, p.date_of_birth, at) : null;
  };

  const tally = new Tally();
  for (const e of encounters) {
    const at = new Date(e.started_at);
    tally.add("FURII_VISITS", coc(e.patient_id, at));
    if (e.bed_id || e.stage === "ward") tally.add("FURII_ADMISSIONS", coc(e.patient_id, at));
  }
  for (const p of newPatients) {
    tally.add("FURII_NEW_REGISTRATIONS", sexAgeCoc(p.sex, p.date_of_birth, new Date(p.created_at)));
  }
  tally.add("FURII_DISCHARGES", null, dischargesRes.data?.length ?? 0);

  const chemoCycles = new Set<string>();
  for (const o of orders) {
    const done = o.status === "resulted" || o.status === "completed";
    if (o.category === "laboratory" && done) {
      tally.add("FURII_LAB_TESTS", null);
      if (o.is_critical) tally.add("FURII_LAB_CRITICAL", null);
    }
    if (o.category === "imaging" && done) tally.add("FURII_IMAGING_EXAMS", null);
    const chemo = parseChemoCode(o.code);
    if (chemo) chemoCycles.add(`${o.patient_id}:${chemo.regimenId}:${chemo.cycle}`);
  }
  tally.add("FURII_ONC_CHEMO_CYCLES", null, chemoCycles.size);

  const morbidity = new Map<string, { name: string; value: number }>();
  const cancerPatients = new Set<string>();
  for (const c of conditions) {
    const code = (c.icd10 ?? "").toUpperCase().replace(/\s/g, "");
    if (!/^[A-Z]\d{2}/.test(code)) continue;
    const category = code.slice(0, 3);
    const entry = morbidity.get(category) ?? { name: c.name, value: 0 };
    entry.value++;
    morbidity.set(category, entry);
    if (isCancerCode(code) && !cancerPatients.has(c.patient_id)) {
      cancerPatients.add(c.patient_id);
      tally.add("FURII_ONC_NEW_CASES", coc(c.patient_id, mid));
    }
  }

  const dataValues: DataValue[] = [];
  for (const de of DATA_ELEMENTS) {
    for (const v of tally.values(de.code, de.disaggregated)) {
      dataValues.push({
        dataElement: de.code,
        period,
        orgUnit,
        categoryOptionCombo: v.coc,
        value: String(v.value),
      });
    }
  }
  const morbidityRows = [...morbidity.entries()]
    .map(([icd10, m]) => ({ icd10, name: m.name, value: m.value }))
    .sort((a, b) => b.value - a.value || a.icd10.localeCompare(b.icd10));
  for (const m of morbidityRows) {
    dataValues.push({
      dataElement: `${MORBIDITY_PREFIX}${m.icd10}`,
      period,
      orgUnit,
      categoryOptionCombo: DEFAULT_COC,
      value: String(m.value),
      comment: m.name,
    });
  }

  return {
    period,
    periodLabel: label,
    orgUnit,
    totals: DATA_ELEMENTS.map((de) => ({
      code: de.code,
      name: de.name,
      group: de.group,
      value: tally.total(de.code),
    })),
    morbidity: morbidityRows,
    dataValues,
    generatedAt: new Date().toISOString(),
  };
}

export const dhis2ReportQuery = (period: string, orgUnit: string) =>
  queryOptions({
    queryKey: ["his", "dhis2", period, orgUnit],
    queryFn: () => buildDhis2Report(period, orgUnit),
  });

/* --------------------------------- serialising -------------------------------- */

/** The dataValueSet object DHIS2 imports (also what the server sends on a direct push). */
export function toDataValueSet(report: Dhis2Report) {
  return {
    dataSet: "FURII_MONTHLY",
    period: report.period,
    orgUnit: report.orgUnit,
    completeDate: report.generatedAt.slice(0, 10),
    dataValues: report.dataValues.map(({ comment, ...v }) => (comment ? { ...v, comment } : v)),
  };
}

/** JSON body for DHIS2 `POST /api/dataValueSets` (import with CODE id schemes). */
export function toDataValueSetJson(report: Dhis2Report): string {
  return JSON.stringify(toDataValueSet(report), null, 2);
}


/** DHIS2 CSV data value format (dataelement, period, orgunit, catoptcombo, attroptcombo, value, …). */
export function toDataValueCsv(report: Dhis2Report): string {
  const header =
    "dataelement,period,orgunit,catoptcombo,attroptcombo,value,storedby,lastupdated,comment,followup";
  const lines = report.dataValues.map((v) =>
    [
      v.dataElement,
      v.period,
      v.orgUnit,
      v.categoryOptionCombo,
      "",
      v.value,
      "furii-his",
      report.generatedAt,
      v.comment ?? "",
      "false",
    ]
      .map(csvCell)
      .join(","),
  );
  return [header, ...lines].join("\r\n");
}
