/**
 * Laboratory panel catalogue — analytes, units, adult reference ranges, critical
 * limits and LOINC codes. Results are stored on `orders.result_values` as a
 * `LabResultValues` object so every workspace (doctor, oncology, HIS export)
 * reads the same structured data.
 */

export type Analyte = {
  code: string;
  label: string;
  unit: string;
  loinc?: string | undefined;
  low?: number;
  high?: number;
  critLow?: number;
  critHigh?: number;
};

export type LabPanel = {
  id: string;
  label: string;
  /** Lower-case keywords matched against the order name to pre-select a panel. */
  match: string[];
  analytes: Analyte[];
};

export type ResultFlag = "N" | "L" | "H" | "LL" | "HH";

export type AnalyteResult = {
  code: string;
  label: string;
  value: number;
  unit: string;
  loinc?: string | undefined;
  ref?: string;
  flag: ResultFlag;
};

export type LabResultValues = {
  kind: "lab";
  panel: string;
  analyzer?: string | undefined;
  analytes: AnalyteResult[];
  comment?: string | undefined;
};

export type ImagingResultValues = {
  kind: "imaging";
  modality?: string;
  findings: string;
  impression: string;
};

export const LAB_PANELS: LabPanel[] = [
  {
    id: "cbc",
    label: "Complete Blood Count (CBC)",
    match: ["cbc", "blood count", "hemogram", "haemogram", "fbc"],
    analytes: [
      {
        code: "WBC",
        label: "WBC",
        unit: "×10⁹/L",
        loinc: "6690-2",
        low: 4,
        high: 11,
        critLow: 2,
        critHigh: 30,
      },
      {
        code: "ANC",
        label: "Neutrophils (ANC)",
        unit: "×10⁹/L",
        loinc: "751-8",
        low: 1.8,
        high: 7.5,
        critLow: 0.5,
      },
      {
        code: "HGB",
        label: "Haemoglobin",
        unit: "g/dL",
        loinc: "718-7",
        low: 12,
        high: 17,
        critLow: 7,
        critHigh: 20,
      },
      {
        code: "PLT",
        label: "Platelets",
        unit: "×10⁹/L",
        loinc: "777-3",
        low: 150,
        high: 400,
        critLow: 50,
        critHigh: 1000,
      },
    ],
  },
  {
    id: "rft",
    label: "Renal Function (RFT)",
    match: ["rft", "renal", "kidney", "creatinine", "urea", "bun", "u&e"],
    analytes: [
      {
        code: "CREA",
        label: "Creatinine",
        unit: "mg/dL",
        loinc: "2160-0",
        low: 0.6,
        high: 1.3,
        critHigh: 5,
      },
      {
        code: "UREA",
        label: "BUN / Urea",
        unit: "mg/dL",
        loinc: "3094-0",
        low: 7,
        high: 20,
        critHigh: 100,
      },
      {
        code: "EGFR",
        label: "eGFR",
        unit: "mL/min/1.73m²",
        loinc: "33914-3",
        low: 60,
        critLow: 15,
      },
    ],
  },
  {
    id: "electrolytes",
    label: "Electrolytes",
    match: ["electrolyte", "sodium", "potassium", "na/k"],
    analytes: [
      {
        code: "NA",
        label: "Sodium",
        unit: "mmol/L",
        loinc: "2951-2",
        low: 135,
        high: 145,
        critLow: 120,
        critHigh: 160,
      },
      {
        code: "K",
        label: "Potassium",
        unit: "mmol/L",
        loinc: "2823-3",
        low: 3.5,
        high: 5.1,
        critLow: 2.5,
        critHigh: 6.5,
      },
      { code: "CL", label: "Chloride", unit: "mmol/L", loinc: "2075-0", low: 98, high: 107 },
    ],
  },
  {
    id: "lft",
    label: "Liver Function (LFT)",
    match: ["lft", "liver", "hepatic", "bilirubin", "alt", "ast"],
    analytes: [
      { code: "ALT", label: "ALT", unit: "U/L", loinc: "1742-6", high: 40, critHigh: 1000 },
      { code: "AST", label: "AST", unit: "U/L", loinc: "1920-8", high: 40, critHigh: 1000 },
      { code: "ALP", label: "ALP", unit: "U/L", loinc: "6768-6", low: 40, high: 130 },
      {
        code: "TBIL",
        label: "Total bilirubin",
        unit: "mg/dL",
        loinc: "1975-2",
        high: 1.2,
        critHigh: 15,
      },
      { code: "ALB", label: "Albumin", unit: "g/dL", loinc: "1751-7", low: 3.5, high: 5 },
    ],
  },
  {
    id: "glucose",
    label: "Glucose & HbA1c",
    match: ["glucose", "hba1c", "a1c", "fbs", "rbs", "sugar", "diabet"],
    analytes: [
      {
        code: "GLU",
        label: "Glucose (fasting)",
        unit: "mg/dL",
        loinc: "1558-6",
        low: 70,
        high: 100,
        critLow: 40,
        critHigh: 450,
      },
      { code: "HBA1C", label: "HbA1c", unit: "%", loinc: "4548-4", high: 5.7 },
    ],
  },
  {
    id: "lipids",
    label: "Lipid Profile",
    match: ["lipid", "cholesterol", "triglyceride"],
    analytes: [
      { code: "CHOL", label: "Total cholesterol", unit: "mg/dL", loinc: "2093-3", high: 200 },
      { code: "LDL", label: "LDL-C", unit: "mg/dL", loinc: "13457-7", high: 130 },
      { code: "HDL", label: "HDL-C", unit: "mg/dL", loinc: "2085-9", low: 40 },
      { code: "TG", label: "Triglycerides", unit: "mg/dL", loinc: "2571-8", high: 150 },
    ],
  },
  {
    id: "tumour_markers",
    label: "Tumour Markers",
    match: [
      "tumour",
      "tumor",
      "marker",
      "cea",
      "ca-125",
      "ca 125",
      "ca125",
      "ca 15-3",
      "psa",
      "afp",
    ],
    analytes: [
      { code: "CEA", label: "CEA", unit: "ng/mL", loinc: "2039-6", high: 5 },
      { code: "CA125", label: "CA-125", unit: "U/mL", loinc: "10334-1", high: 35 },
      { code: "CA153", label: "CA 15-3", unit: "U/mL", loinc: "6875-9", high: 30 },
      { code: "PSA", label: "PSA", unit: "ng/mL", loinc: "2857-1", high: 4 },
      { code: "AFP", label: "AFP", unit: "ng/mL", loinc: "1834-1", high: 10 },
    ],
  },
];

export function panelById(id: string): LabPanel | undefined {
  return LAB_PANELS.find((panel) => panel.id === id);
}

/** Best-guess panel for an order name, falling back to CBC. */
export function guessPanel(orderName: string): LabPanel {
  const name = orderName.toLowerCase();
  return (
    LAB_PANELS.find((panel) => panel.match.some((word) => name.includes(word))) ?? LAB_PANELS[0]!
  );
}

export function refRange(analyte: Analyte): string {
  if (analyte.low !== undefined && analyte.high !== undefined)
    return `${analyte.low}–${analyte.high}`;
  if (analyte.high !== undefined) return `< ${analyte.high}`;
  if (analyte.low !== undefined) return `> ${analyte.low}`;
  return "—";
}

export function flagValue(analyte: Analyte, value: number): ResultFlag {
  if (analyte.critLow !== undefined && value < analyte.critLow) return "LL";
  if (analyte.critHigh !== undefined && value > analyte.critHigh) return "HH";
  if (analyte.low !== undefined && value < analyte.low) return "L";
  if (analyte.high !== undefined && value > analyte.high) return "H";
  return "N";
}

export const FLAG_LABEL: Record<ResultFlag, string> = {
  N: "Normal",
  L: "Low",
  H: "High",
  LL: "Critical low",
  HH: "Critical high",
};

/** Builds the structured result, a one-line clinical summary and the critical flag. */
export function buildLabResult(
  panel: LabPanel,
  raw: Record<string, string>,
  extra: { analyzer?: string | undefined; comment?: string | undefined } = {},
): { values: LabResultValues; summary: string; isCritical: boolean } {
  const analytes: AnalyteResult[] = [];
  for (const analyte of panel.analytes) {
    const text = raw[analyte.code]?.trim();
    if (!text) continue;
    const value = Number(text);
    if (!Number.isFinite(value)) continue;
    analytes.push({
      code: analyte.code,
      label: analyte.label,
      value,
      unit: analyte.unit,
      loinc: analyte.loinc,
      ref: refRange(analyte),
      flag: flagValue(analyte, value),
    });
  }

  const abnormal = analytes.filter((a) => a.flag !== "N");
  const isCritical = analytes.some((a) => a.flag === "LL" || a.flag === "HH");
  const summary = !analytes.length
    ? "No analyte values entered."
    : abnormal.length
      ? `${isCritical ? "CRITICAL — " : "Abnormal: "}${abnormal
          .map((a) => `${a.label} ${a.value} ${a.unit} (${a.flag})`)
          .join("; ")}`
      : `${panel.label}: all ${analytes.length} analytes within reference range.`;

  return {
    values: { kind: "lab", panel: panel.id, analytes, ...extra },
    summary: extra.comment ? `${summary} · ${extra.comment}` : summary,
    isCritical,
  };
}

/** Reads structured lab values off an order's `result_values`, tolerating legacy shapes. */
export function readLabValues(resultValues: unknown): LabResultValues | null {
  if (!resultValues || typeof resultValues !== "object") return null;
  const value = resultValues as Partial<LabResultValues>;
  return value.kind === "lab" && Array.isArray(value.analytes) ? (value as LabResultValues) : null;
}

/**
 * Most recent value of an analyte across a patient's resulted orders.
 * `orders` must carry `result_values` and a timestamp (`verified_at` or `requested_at`).
 */
export function latestAnalyte(
  orders: { result_values?: unknown; verified_at?: string | null; requested_at?: string | null }[],
  code: string,
): (AnalyteResult & { at: string | null }) | null {
  let best: (AnalyteResult & { at: string | null }) | null = null;
  for (const order of orders) {
    const values = readLabValues(order.result_values);
    const hit = values?.analytes.find((a) => a.code === code);
    if (!hit) continue;
    const at = order.verified_at ?? order.requested_at ?? null;
    if (!best || (at ?? "") > (best.at ?? "")) best = { ...hit, at };
  }
  return best;
}

/** Time series of an analyte, oldest first — used for tumour-marker trends. */
export function analyteSeries(
  orders: { result_values?: unknown; verified_at?: string | null; requested_at?: string | null }[],
  code: string,
): { at: string; value: number }[] {
  const points: { at: string; value: number }[] = [];
  for (const order of orders) {
    const hit = readLabValues(order.result_values)?.analytes.find((a) => a.code === code);
    const at = order.verified_at ?? order.requested_at;
    if (hit && at) points.push({ at, value: hit.value });
  }
  return points.sort((a, b) => a.at.localeCompare(b.at));
}
