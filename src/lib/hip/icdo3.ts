/**
 * ICD-O-3 (International Classification of Diseases for Oncology, 3rd ed.)
 * coding for the cancer registry. A registry case needs four things beyond
 * ICD-10: topography (where), morphology (what cell type), behaviour
 * (malignant / in situ) and the basis of diagnosis (how sure we are).
 *
 * Codes kept here are a curated subset covering the sites the oncology
 * workspace offers; anything else can be typed in directly.
 */

export const ICDO3_SYSTEM = "http://terminology.hl7.org/CodeSystem/icd-o-3";

export type Morphology = { code: string; label: string; keywords: string[] };

/** Morphology codes without behaviour digit, e.g. "8500". */
export const MORPHOLOGIES: Morphology[] = [
  { code: "8000", label: "Neoplasm, malignant", keywords: [] },
  { code: "8010", label: "Carcinoma, NOS", keywords: ["carcinoma nos"] },
  { code: "8041", label: "Small cell carcinoma, NOS", keywords: ["small cell"] },
  { code: "8046", label: "Non-small cell carcinoma", keywords: ["non-small", "nsclc"] },
  { code: "8070", label: "Squamous cell carcinoma, NOS", keywords: ["squamous"] },
  {
    code: "8072",
    label: "Squamous cell carcinoma, large cell, non-keratinizing",
    keywords: ["non-keratinizing", "nonkeratinizing"],
  },
  { code: "8090", label: "Basal cell carcinoma, NOS", keywords: ["basal cell"] },
  {
    code: "8120",
    label: "Transitional cell carcinoma, NOS",
    keywords: ["transitional", "urothelial"],
  },
  { code: "8140", label: "Adenocarcinoma, NOS", keywords: ["adenocarcinoma"] },
  { code: "8170", label: "Hepatocellular carcinoma, NOS", keywords: ["hepatocellular", "hcc"] },
  { code: "8260", label: "Papillary adenocarcinoma, NOS", keywords: ["papillary"] },
  {
    code: "8461",
    label: "Serous surface papillary carcinoma (high-grade serous)",
    keywords: ["serous"],
  },
  { code: "8480", label: "Mucinous adenocarcinoma", keywords: ["mucinous"] },
  {
    code: "8500",
    label: "Infiltrating duct carcinoma, NOS",
    keywords: ["ductal", "duct carcinoma", "nst"],
  },
  { code: "8520", label: "Lobular carcinoma, NOS", keywords: ["lobular"] },
  { code: "8550", label: "Acinar cell carcinoma", keywords: [] },
  { code: "8720", label: "Malignant melanoma, NOS", keywords: ["melanoma"] },
  { code: "8890", label: "Leiomyosarcoma, NOS", keywords: ["leiomyosarcoma"] },
  { code: "9140", label: "Kaposi sarcoma", keywords: ["kaposi"] },
  { code: "9650", label: "Hodgkin lymphoma, NOS", keywords: ["hodgkin"] },
  {
    code: "9680",
    label: "Diffuse large B-cell lymphoma, NOS",
    keywords: ["diffuse large", "dlbcl"],
  },
  { code: "9732", label: "Plasma cell myeloma", keywords: ["myeloma"] },
  { code: "9861", label: "Acute myeloid leukaemia, NOS", keywords: ["acute myeloid", "aml"] },
  {
    code: "9835",
    label: "Precursor cell lymphoblastic leukaemia",
    keywords: ["lymphoblastic", "all"],
  },
];

export const BEHAVIOURS = [
  { code: "3", label: "/3 Malignant, primary site" },
  { code: "2", label: "/2 In situ" },
  { code: "6", label: "/6 Malignant, metastatic site" },
] as const;

/** IARC / IACR basis-of-diagnosis codes. */
export const BASIS_OF_DIAGNOSIS = [
  { code: "7", label: "7 — Histology of primary tumour" },
  { code: "6", label: "6 — Histology of a metastasis" },
  { code: "5", label: "5 — Cytology / haematology" },
  { code: "4", label: "4 — Specific tumour markers" },
  { code: "2", label: "2 — Clinical investigation (imaging, endoscopy)" },
  { code: "1", label: "1 — Clinical only" },
  { code: "0", label: "0 — Death certificate only" },
  { code: "9", label: "9 — Unknown" },
] as const;

/** Basis codes that count as microscopically verified (MV%), the registry's key quality indicator. */
export const MICROSCOPIC_BASIS = new Set(["5", "6", "7"]);

/**
 * ICD-O-3 topography from an ICD-10 code. Solid tumours share the C-code; lymphomas,
 * leukaemias and Kaposi sarcoma are coded to where the tumour actually is, so the
 * default is the most common site and can be overridden.
 */
export function topographyFromIcd10(icd10: string | null | undefined): string {
  const code = (icd10 ?? "").toUpperCase().trim();
  if (!/^C\d{2}/.test(code)) return "";
  const three = code.slice(0, 3);
  const n = Number(three.slice(1));
  if (n >= 81 && n <= 88) return "C77.9"; // lymphoma → lymph nodes, NOS
  if (n >= 90 && n <= 95) return "C42.1"; // myeloma / leukaemia → bone marrow
  if (three === "C46") return "C44.9"; // Kaposi sarcoma → skin, NOS
  if (n >= 76) return ""; // ill-defined / secondary / unknown primary
  const sub = /^C\d{2}\.(\d)/.exec(code)?.[1];
  return `${three}.${sub ?? "9"}`;
}

/** Suggests a morphology code from free-text histology (most specific keyword wins). */
export function suggestMorphology(histology: string | null | undefined): string {
  const text = (histology ?? "").toLowerCase();
  if (!text.trim()) return "";
  if (text.includes("non-small") || text.includes("nsclc")) return "8046";
  if (text.includes("acinar") && !text.includes("adenocarcinoma")) return "8550";
  let best: { code: string; len: number } | null = null;
  for (const m of MORPHOLOGIES) {
    for (const k of m.keywords) {
      const hit = k === "all" ? /\ball\b/.test(text) : text.includes(k);
      if (hit && (!best || k.length > best.len)) best = { code: m.code, len: k.length };
    }
  }
  return best?.code ?? "";
}

/** "8500" + "3" + "2" → "8500/32" (grade digit 9 when not determined). */
export function morphologyCode(
  morphology: string,
  behaviour: string | null | undefined,
  grade: string | null | undefined,
): string {
  if (!/^\d{4}$/.test(morphology)) return "";
  const g = grade && /^[1-4]$/.test(grade) ? grade : "9";
  return `${morphology}/${behaviour || "3"}${g}`;
}

export function morphologyLabel(code: string | null | undefined): string {
  const base = (code ?? "").slice(0, 4);
  return MORPHOLOGIES.find((m) => m.code === base)?.label ?? "";
}

export function basisLabel(code: string | null | undefined): string {
  return BASIS_OF_DIAGNOSIS.find((b) => b.code === code)?.label.replace(/^\d — /, "") ?? "";
}

export type Icdo3Fields = {
  icdo3Topography?: string;
  icdo3Morphology?: string;
  icdo3Behaviour?: string;
  basisOfDiagnosis?: string;
};

export type ResolvedIcdo3 = {
  topography: string;
  /** Full code with behaviour and grade, e.g. "8500/32". Empty when unknown. */
  morphology: string;
  morphologyLabel: string;
  basis: string;
  basisLabel: string;
  /** True when a value came from inference rather than the clinician's own entry. */
  inferred: boolean;
};

/** Combines what the clinician recorded with safe inferences for older staging notes. */
export function resolveIcdo3(
  s: (Icdo3Fields & { icd10?: string; histology?: string; grade?: string }) | null | undefined,
  fallbackIcd10?: string | null,
): ResolvedIcdo3 {
  const topoRecorded = s?.icdo3Topography?.trim().toUpperCase() ?? "";
  const morphRecorded = s?.icdo3Morphology?.trim() ?? "";
  const topography = topoRecorded || topographyFromIcd10(s?.icd10 || fallbackIcd10);
  const base = morphRecorded || suggestMorphology(s?.histology);
  const morphology = morphologyCode(base, s?.icdo3Behaviour, s?.grade);
  const basis = s?.basisOfDiagnosis ?? "";
  return {
    topography,
    morphology,
    morphologyLabel: morphologyLabel(base),
    basis,
    basisLabel: basisLabel(basis),
    inferred: Boolean((topography && !topoRecorded) || (morphology && !morphRecorded)),
  };
}
