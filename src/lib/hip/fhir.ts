/**
 * HL7 FHIR R4 export — builds a self-contained `Bundle` (type "collection") for a
 * single patient from the live clinical record. No external FHIR library: the
 * resource shapes below follow the R4 base specification (4.0.1) and every bundle
 * is checked by `validateBundle` before it is offered for download.
 */
import { supabase } from "@/integrations/supabase/client";
import { toEthiopianName } from "@/lib/hip/ethiopian-names";
import { readLabValues, type ImagingResultValues, type ResultFlag } from "@/lib/hip/lab-panels";

/* ----------------------------------- types ---------------------------------- */

export type Coding = { system?: string | undefined; code?: string | undefined; display?: string | undefined };
export type CodeableConcept = { coding?: Coding[] | undefined; text?: string | undefined };
export type Reference = { reference?: string | undefined; display?: string | undefined };
export type Quantity = { value: number; unit?: string | undefined; system?: string | undefined; code?: string | undefined };
export type Narrative = { status: "generated"; div: string };

type Base<T extends string> = {
  resourceType: T;
  id: string;
  meta?: { lastUpdated?: string | undefined; profile?: string[] | undefined; source?: string | undefined };
  text?: Narrative | undefined;
};

export type FhirPatient = Base<"Patient"> & {
  identifier: { use?: string | undefined; type?: CodeableConcept | undefined; system: string; value: string }[];
  active: boolean;
  name: { use: string; text: string; family?: string | undefined; given?: string[] | undefined }[];
  gender: "male" | "female" | "other" | "unknown";
  birthDate?: string | undefined;
  telecom?: { system: "phone" | undefined; value: string; use?: string | undefined }[];
};

export type FhirCondition = Base<"Condition"> & {
  clinicalStatus: CodeableConcept;
  verificationStatus: CodeableConcept;
  category: CodeableConcept[];
  code: CodeableConcept;
  subject: Reference;
  onsetDateTime?: string | undefined;
  recordedDate?: string | undefined;
};

export type FhirAllergyIntolerance = Base<"AllergyIntolerance"> & {
  clinicalStatus: CodeableConcept;
  verificationStatus: CodeableConcept;
  criticality: "low" | "high" | "unable-to-assess";
  code: CodeableConcept;
  patient: Reference;
  recordedDate?: string | undefined;
  reaction?: { manifestation: CodeableConcept[] | undefined; severity?: "mild" | "moderate" | "severe" | undefined }[];
};

export type FhirObservation = Base<"Observation"> & {
  status: "final" | "preliminary" | "amended";
  category: CodeableConcept[];
  code: CodeableConcept;
  subject: Reference;
  encounter?: Reference | undefined;
  effectiveDateTime?: string | undefined;
  valueQuantity?: Quantity | undefined;
  valueString?: string | undefined;
  interpretation?: CodeableConcept[] | undefined;
  referenceRange?: { text: string | undefined }[];
};

export type FhirDiagnosticReport = Base<"DiagnosticReport"> & {
  status: "final" | "preliminary" | "registered";
  category: CodeableConcept[];
  code: CodeableConcept;
  subject: Reference;
  encounter?: Reference | undefined;
  effectiveDateTime?: string | undefined;
  issued?: string | undefined;
  performer?: Reference[] | undefined;
  result?: Reference[] | undefined;
  conclusion?: string | undefined;
};

export type FhirMedicationRequest = Base<"MedicationRequest"> & {
  status: "active" | "on-hold" | "cancelled" | "completed" | "draft" | "unknown";
  intent: "order";
  priority?: "routine" | "urgent" | "asap" | "stat" | undefined;
  category?: CodeableConcept[] | undefined;
  medicationCodeableConcept: CodeableConcept;
  subject: Reference;
  encounter?: Reference | undefined;
  authoredOn?: string | undefined;
  requester?: Reference | undefined;
  dosageInstruction?: { text: string | undefined }[];
};

export type FhirEncounter = Base<"Encounter"> & {
  status: "planned" | "arrived" | "triaged" | "in-progress" | "finished" | "cancelled";
  class: Coding;
  priority?: CodeableConcept | undefined;
  subject: Reference;
  period: { start: string; end?: string | undefined };
  reasonCode?: CodeableConcept[] | undefined;
};

export type FhirCoverage = Base<"Coverage"> & {
  status: "active";
  subscriberId?: string | undefined;
  beneficiary: Reference;
  payor: Reference[];
};

export type FhirResource =
  | FhirPatient
  | FhirCondition
  | FhirAllergyIntolerance
  | FhirObservation
  | FhirDiagnosticReport
  | FhirMedicationRequest
  | FhirEncounter
  | FhirCoverage;

export type FhirBundle = {
  resourceType: "Bundle";
  id: string;
  meta: { lastUpdated: string; source: string };
  identifier: { system: string; value: string };
  type: "collection";
  timestamp: string;
  total: number;
  entry: { fullUrl: string; resource: FhirResource }[];
};

/* --------------------------------- systems ---------------------------------- */

export const SYSTEMS = {
  mrn: "urn:furii:mrn",
  icd10: "http://hl7.org/fhir/sid/icd-10",
  loinc: "http://loinc.org",
  ucum: "http://unitsofmeasure.org",
  localLab: "urn:furii:lab-analyte",
  localOrder: "urn:furii:order-code",
  v2_0203: "http://terminology.hl7.org/CodeSystem/v2-0203",
  v2_0074: "http://terminology.hl7.org/CodeSystem/v2-0074",
  actCode: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
  actPriority: "http://terminology.hl7.org/CodeSystem/v3-ActPriority",
  interpretation: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
  obsCategory: "http://terminology.hl7.org/CodeSystem/observation-category",
  conditionClinical: "http://terminology.hl7.org/CodeSystem/condition-clinical",
  conditionVer: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
  conditionCategory: "http://terminology.hl7.org/CodeSystem/condition-category",
  allergyClinical: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
  allergyVer: "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
  medReqCategory: "http://terminology.hl7.org/CodeSystem/medicationrequest-category",
} as const;

/* --------------------------------- helpers ---------------------------------- */

function newUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const urn = (id: string) => `urn:uuid:${id}`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function narrative(text: string): Narrative {
  return {
    status: "generated",
    div: `<div xmlns="http://www.w3.org/1999/xhtml">${escapeHtml(text)}</div>`,
  };
}

/** FHIR `date` (YYYY-MM-DD) from any ISO-ish timestamp. */
function fhirDate(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : undefined;
}

/** FHIR `dateTime` / `instant` — normalised ISO 8601 with timezone. */
function fhirDateTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function mapGender(sex: string | null | undefined): FhirPatient["gender"] {
  const value = (sex ?? "").trim().toLowerCase();
  if (value === "male" || value === "m") return "male";
  if (value === "female" || value === "f") return "female";
  if (value === "other") return "other";
  return "unknown";
}

function mapConditionStatus(status: string | null | undefined): string {
  const value = (status ?? "").toLowerCase();
  if (["resolved", "inactive", "remission", "recurrence", "relapse"].includes(value)) return value;
  return "active";
}

function mapCriticality(severity: string | null | undefined): FhirAllergyIntolerance["criticality"] {
  const value = (severity ?? "").toLowerCase();
  if (value === "severe" || value === "life-threatening" || value === "high") return "high";
  if (value === "mild" || value === "moderate" || value === "low") return "low";
  return "unable-to-assess";
}

function mapReactionSeverity(
  severity: string | null | undefined,
): "mild" | "moderate" | "severe" | undefined {
  const value = (severity ?? "").toLowerCase();
  if (value === "mild" || value === "moderate" || value === "severe") return value;
  if (value === "life-threatening") return "severe";
  return undefined;
}

function mapMedStatus(status: string): FhirMedicationRequest["status"] {
  switch (status) {
    case "draft":
      return "draft";
    case "requested":
    case "in_progress":
      return "active";
    case "resulted":
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "unknown";
  }
}

function mapPriority(priority: string | null | undefined): FhirMedicationRequest["priority"] {
  const value = (priority ?? "").toLowerCase();
  if (value === "stat" || value === "critical") return "stat";
  if (value === "urgent") return "urgent";
  if (value === "asap") return "asap";
  return "routine";
}

function mapEncounterStatus(stage: string, endedAt: string | null): FhirEncounter["status"] {
  if (endedAt || stage === "complete") return "finished";
  if (stage === "registered" || stage === "waiting") return "arrived";
  if (stage === "nurse") return "triaged";
  return "in-progress";
}

const INTERPRETATION: Record<ResultFlag, Coding> = {
  N: { system: SYSTEMS.interpretation, code: "N", display: "Normal" },
  H: { system: SYSTEMS.interpretation, code: "H", display: "High" },
  L: { system: SYSTEMS.interpretation, code: "L", display: "Low" },
  HH: { system: SYSTEMS.interpretation, code: "HH", display: "Critical high" },
  LL: { system: SYSTEMS.interpretation, code: "LL", display: "Critical low" },
};

/** Display unit → UCUM code. Unknown units are exported as display-only. */
const UCUM: Record<string, string> = {
  "×10⁹/L": "10*9/L",
  "x10^9/L": "10*9/L",
  "×10¹²/L": "10*12/L",
  "g/dL": "g/dL",
  "g/L": "g/L",
  "mg/dL": "mg/dL",
  "mg/L": "mg/L",
  "µmol/L": "umol/L",
  "umol/L": "umol/L",
  "mmol/L": "mmol/L",
  "mEq/L": "meq/L",
  "U/L": "U/L",
  "IU/L": "[IU]/L",
  "kU/L": "k[IU]/L",
  "ng/mL": "ng/mL",
  "pg/mL": "pg/mL",
  "µg/L": "ug/L",
  "mIU/L": "m[IU]/L",
  "mIU/mL": "m[IU]/mL",
  "U/mL": "U/mL",
  "%": "%",
  "fL": "fL",
  "pg": "pg",
  "s": "s",
  "sec": "s",
  "INR": "{INR}",
  "ratio": "{ratio}",
  "mL/min/1.73m²": "mL/min/{1.73_m2}",
  "mL/min": "mL/min",
};

function quantity(value: number, unit: string): Quantity {
  const code = UCUM[unit.trim()];
  return code
    ? { value, unit, system: SYSTEMS.ucum, code }
    : { value, unit };
}

const VITAL_SIGNS_CATEGORY: CodeableConcept[] = [
  {
    coding: [{ system: SYSTEMS.obsCategory, code: "vital-signs", display: "Vital Signs" }],
    text: "Vital Signs",
  },
];

const LAB_CATEGORY: CodeableConcept[] = [
  {
    coding: [{ system: SYSTEMS.obsCategory, code: "laboratory", display: "Laboratory" }],
    text: "Laboratory",
  },
];

type VitalKey = "heart_rate" | "systolic" | "diastolic" | "respiratory_rate" | "spo2" | "temperature_c";

export const VITAL_LOINC: {
  key: VitalKey;
  loinc: string;
  display: string;
  unit: string;
  ucum: string;
}[] = [
  { key: "heart_rate", loinc: "8867-4", display: "Heart rate", unit: "beats/min", ucum: "/min" },
  { key: "systolic", loinc: "8480-6", display: "Systolic blood pressure", unit: "mmHg", ucum: "mm[Hg]" },
  { key: "diastolic", loinc: "8462-4", display: "Diastolic blood pressure", unit: "mmHg", ucum: "mm[Hg]" },
  { key: "respiratory_rate", loinc: "9279-1", display: "Respiratory rate", unit: "breaths/min", ucum: "/min" },
  {
    key: "spo2",
    loinc: "59408-5",
    display: "Oxygen saturation in Arterial blood by Pulse oximetry",
    unit: "%",
    ucum: "%",
  },
  { key: "temperature_c", loinc: "8310-5", display: "Body temperature", unit: "°C", ucum: "Cel" },
];

/* ---------------------------------- builder --------------------------------- */

type PatientDb = {
  id: string;
  mrn: string;
  full_name: string;
  date_of_birth: string;
  sex: string;
  phone: string | null;
  blood_group: string | null;
  insurance_provider: string | null;
  insurance_number: string | null;
  created_at: string;
};

type OrderDb = {
  id: string;
  category: string;
  code: string | null;
  name: string;
  status: string;
  priority: string;
  instructions: string | null;
  result_summary: string | null;
  result_values: unknown;
  encounter_id: string | null;
  requested_at: string;
  verified_at: string | null;
  verified_by_label: string | null;
  requested_by_label: string | null;
};

export type BundleResult = {
  bundle: FhirBundle;
  mrn: string;
  patientName: string;
  counts: { type: string; count: number }[];
  issues: ValidationIssue[];
};

function check<T>(result: { data: T | null; error: { message: string } | null }, label: string): T {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return (result.data ?? []) as T;
}

/** Queries the patient's record and returns a validated FHIR R4 collection Bundle. */
export async function buildPatientBundle(patientId: string): Promise<BundleResult> {
  const [patientRes, conditionsRes, allergiesRes, vitalsRes, encountersRes, ordersRes] =
    await Promise.all([
      supabase
        .from("patients")
        .select(
          "id,mrn,full_name,date_of_birth,sex,phone,blood_group,insurance_provider,insurance_number,created_at",
        )
        .eq("id", patientId)
        .maybeSingle(),
      supabase
        .from("conditions")
        .select("id,name,icd10,status,onset_date,created_at")
        .eq("patient_id", patientId)
        .limit(200),
      supabase
        .from("allergies")
        .select("id,substance,reaction,severity,created_at")
        .eq("patient_id", patientId)
        .limit(100),
      supabase
        .from("vitals")
        .select("id,recorded_at,heart_rate,systolic,diastolic,respiratory_rate,spo2,temperature_c")
        .eq("patient_id", patientId)
        .order("recorded_at", { ascending: false })
        .limit(50),
      supabase
        .from("encounters")
        .select("id,stage,priority,chief_complaint,bed_id,started_at,ended_at")
        .eq("patient_id", patientId)
        .order("started_at", { ascending: false })
        .limit(100),
      supabase
        .from("orders")
        .select(
          "id,category,code,name,status,priority,instructions,result_summary,result_values,encounter_id,requested_at,verified_at,verified_by_label,requested_by_label",
        )
        .eq("patient_id", patientId)
        .order("requested_at", { ascending: false })
        .limit(300),
    ]);

  if (patientRes.error) throw new Error(`Patient: ${patientRes.error.message}`);
  const p = patientRes.data as PatientDb | null;
  if (!p) throw new Error("Patient not found");

  const conditions = check(conditionsRes, "Conditions");
  const allergies = check(allergiesRes, "Allergies");
  const vitals = check(vitalsRes, "Vitals");
  const encounters = check(encountersRes, "Encounters");
  const orders = check(ordersRes, "Orders") as unknown as OrderDb[];

  const subject: Reference = { reference: urn(p.id) };
  const displayName = toEthiopianName(p.full_name);
  subject.display = displayName;
  const encounterIds = new Set(encounters.map((e) => e.id));
  const encounterRef = (id: string | null): Reference | undefined =>
    id && encounterIds.has(id) ? { reference: urn(id) } : undefined;

  const resources: FhirResource[] = [];

  /* Patient */
  const nameParts = displayName.trim().split(/\s+/);
  const family = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;
  const given = nameParts.length > 1 ? nameParts.slice(0, -1) : nameParts;
  const patient: FhirPatient = {
    resourceType: "Patient",
    id: p.id,
    meta: { lastUpdated: fhirDateTime(p.created_at) },
    text: narrative(`${displayName} · MRN ${p.mrn}`),
    identifier: [
      {
        use: "usual",
        type: { coding: [{ system: SYSTEMS.v2_0203, code: "MR", display: "Medical record number" }] },
        system: SYSTEMS.mrn,
        value: p.mrn,
      },
    ],
    active: true,
    name: [{ use: "official", text: displayName, family, given }],
    gender: mapGender(p.sex),
    birthDate: fhirDate(p.date_of_birth),
  };
  if (p.phone) patient.telecom = [{ system: "phone", value: p.phone, use: "mobile" }];
  resources.push(patient);

  /* Coverage (insurance) */
  if (p.insurance_provider) {
    resources.push({
      resourceType: "Coverage",
      id: newUuid(),
      status: "active",
      subscriberId: p.insurance_number ?? undefined,
      beneficiary: subject,
      payor: [{ display: p.insurance_provider }],
    });
  }

  /* Blood group */
  if (p.blood_group) {
    resources.push({
      resourceType: "Observation",
      id: newUuid(),
      status: "final",
      category: LAB_CATEGORY,
      code: {
        coding: [{ system: SYSTEMS.loinc, code: "882-1", display: "ABO and Rh group [Type] in Blood" }],
        text: "Blood group",
      },
      subject,
      valueString: p.blood_group,
    });
  }

  /* Conditions */
  for (const c of conditions) {
    const coding: Coding[] = c.icd10
      ? [{ system: SYSTEMS.icd10, code: c.icd10.toUpperCase(), display: c.name }]
      : [];
    const status = mapConditionStatus(c.status);
    resources.push({
      resourceType: "Condition",
      id: c.id,
      clinicalStatus: { coding: [{ system: SYSTEMS.conditionClinical, code: status }] },
      verificationStatus: { coding: [{ system: SYSTEMS.conditionVer, code: "confirmed" }] },
      category: [
        {
          coding: [
            { system: SYSTEMS.conditionCategory, code: "problem-list-item", display: "Problem List Item" },
          ],
        },
      ],
      code: { coding, text: c.name },
      subject,
      onsetDateTime: fhirDate(c.onset_date),
      recordedDate: fhirDateTime(c.created_at),
    });
  }

  /* Allergies */
  for (const a of allergies) {
    const allergy: FhirAllergyIntolerance = {
      resourceType: "AllergyIntolerance",
      id: a.id,
      clinicalStatus: { coding: [{ system: SYSTEMS.allergyClinical, code: "active" }] },
      verificationStatus: { coding: [{ system: SYSTEMS.allergyVer, code: "confirmed" }] },
      criticality: mapCriticality(a.severity),
      code: { text: a.substance },
      patient: subject,
      recordedDate: fhirDateTime(a.created_at),
    };
    if (a.reaction) {
      allergy.reaction = [
        { manifestation: [{ text: a.reaction }], severity: mapReactionSeverity(a.severity) },
      ];
    }
    resources.push(allergy);
  }

  /* Vital signs — one Observation per measured value */
  for (const v of vitals) {
    for (const spec of VITAL_LOINC) {
      const value = v[spec.key];
      if (value === null || value === undefined) continue;
      resources.push({
        resourceType: "Observation",
        id: newUuid(),
        status: "final",
        category: VITAL_SIGNS_CATEGORY,
        code: {
          coding: [{ system: SYSTEMS.loinc, code: spec.loinc, display: spec.display }],
          text: spec.display,
        },
        subject,
        effectiveDateTime: fhirDateTime(v.recorded_at),
        valueQuantity: { value: Number(value), unit: spec.unit, system: SYSTEMS.ucum, code: spec.ucum },
      });
    }
  }

  /* Encounters */
  for (const e of encounters) {
    const isInpatient = Boolean(e.bed_id);
    const encounter: FhirEncounter = {
      resourceType: "Encounter",
      id: e.id,
      status: mapEncounterStatus(e.stage, e.ended_at),
      class: isInpatient
        ? { system: SYSTEMS.actCode, code: "IMP", display: "inpatient encounter" }
        : { system: SYSTEMS.actCode, code: "AMB", display: "ambulatory" },
      subject,
      period: { start: fhirDateTime(e.started_at) ?? e.started_at },
    };
    const end = fhirDateTime(e.ended_at);
    if (end) encounter.period.end = end;
    if (e.priority && e.priority !== "routine") {
      encounter.priority = {
        coding: [
          {
            system: SYSTEMS.actPriority,
            code: e.priority === "critical" ? "EM" : "UR",
            display: e.priority === "critical" ? "emergency" : "urgent",
          },
        ],
      };
    }
    if (e.chief_complaint) encounter.reasonCode = [{ text: e.chief_complaint }];
    resources.push(encounter);
  }

  /* Orders → MedicationRequest / lab Observations + DiagnosticReport / imaging DiagnosticReport */
  for (const o of orders) {
    if (o.category === "medication") {
      const isChemo = (o.code ?? "").startsWith("CHEMO:");
      const med: FhirMedicationRequest = {
        resourceType: "MedicationRequest",
        id: o.id,
        status: mapMedStatus(o.status),
        intent: "order",
        priority: mapPriority(o.priority),
        category: isChemo
          ? [{ text: "chemotherapy" }]
          : [
              {
                coding: [{ system: SYSTEMS.medReqCategory, code: "outpatient", display: "Outpatient" }],
              },
            ],
        medicationCodeableConcept: {
          text: o.name,
          ...(o.code ? { coding: [{ system: SYSTEMS.localOrder, code: o.code }] } : {}),
        },
        subject,
        encounter: encounterRef(o.encounter_id),
        authoredOn: fhirDateTime(o.requested_at),
      };
      if (o.requested_by_label) med.requester = { display: o.requested_by_label };
      if (o.instructions) med.dosageInstruction = [{ text: o.instructions }];
      resources.push(med);
      continue;
    }

    if (o.category === "laboratory") {
      const lab = readLabValues(o.result_values);
      if (!lab) continue;
      const effective = fhirDateTime(o.verified_at ?? o.requested_at);
      const status = o.verified_at ? "final" : "preliminary";
      const resultRefs: Reference[] = [];
      for (const analyte of lab.analytes) {
        if (typeof analyte.value !== "number" || Number.isNaN(analyte.value)) continue;
        const id = newUuid();
        const coding: Coding[] = analyte.loinc
          ? [{ system: SYSTEMS.loinc, code: analyte.loinc, display: analyte.label }]
          : [{ system: SYSTEMS.localLab, code: analyte.code, display: analyte.label }];
        const obs: FhirObservation = {
          resourceType: "Observation",
          id,
          status,
          category: LAB_CATEGORY,
          code: { coding, text: analyte.label },
          subject,
          encounter: encounterRef(o.encounter_id),
          effectiveDateTime: effective,
          valueQuantity: quantity(analyte.value, analyte.unit),
        };
        const interp = INTERPRETATION[analyte.flag];
        if (interp) obs.interpretation = [{ coding: [interp] }];
        if (analyte.ref) obs.referenceRange = [{ text: analyte.ref }];
        resources.push(obs);
        resultRefs.push({ reference: urn(id), display: analyte.label });
      }
      resources.push({
        resourceType: "DiagnosticReport",
        id: o.id,
        status,
        category: [
          { coding: [{ system: SYSTEMS.v2_0074, code: "LAB", display: "Laboratory" }] },
        ],
        code: { text: o.name },
        subject,
        encounter: encounterRef(o.encounter_id),
        effectiveDateTime: effective,
        issued: fhirDateTime(o.verified_at),
        performer: o.verified_by_label ? [{ display: o.verified_by_label }] : undefined,
        result: resultRefs,
        conclusion: lab.comment ?? o.result_summary ?? undefined,
      });
      continue;
    }

    if (o.category === "imaging") {
      const values = o.result_values as Partial<ImagingResultValues> | null;
      const imaging = values && values.kind === "imaging" ? values : null;
      if (!imaging && !o.result_summary) continue;
      const report: FhirDiagnosticReport = {
        resourceType: "DiagnosticReport",
        id: o.id,
        status: o.verified_at ? "final" : "preliminary",
        category: [
          { coding: [{ system: SYSTEMS.v2_0074, code: "RAD", display: "Radiology" }] },
        ],
        code: { text: imaging?.modality ? `${o.name} (${imaging.modality})` : o.name },
        subject,
        encounter: encounterRef(o.encounter_id),
        effectiveDateTime: fhirDateTime(o.verified_at ?? o.requested_at),
        issued: fhirDateTime(o.verified_at),
        conclusion: imaging?.impression || o.result_summary || undefined,
      };
      if (o.verified_by_label) report.performer = [{ display: o.verified_by_label }];
      if (imaging?.findings) report.text = narrative(`Findings: ${imaging.findings}`);
      resources.push(report);
    }
  }

  const clean = resources.map((r) => stripUndefined(r) as FhirResource);
  const now = new Date().toISOString();
  const bundle: FhirBundle = {
    resourceType: "Bundle",
    id: newUuid(),
    meta: { lastUpdated: now, source: "urn:furii:his" },
    identifier: { system: "urn:furii:fhir-export", value: `${p.mrn}-${now.slice(0, 10)}` },
    type: "collection",
    timestamp: now,
    total: clean.length,
    entry: clean.map((resource) => ({ fullUrl: urn(resource.id), resource })),
  };

  return {
    bundle,
    mrn: p.mrn,
    patientName: displayName,
    counts: countByType(bundle),
    issues: validateBundle(bundle),
  };
}

/** Removes `undefined` keys and empty arrays so the JSON is minimal and conformant. */
function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      if (v === undefined) continue;
      if (Array.isArray(v) && v.length === 0) continue;
      const cleaned = stripUndefined(v);
      if (cleaned && typeof cleaned === "object" && !Array.isArray(cleaned)) {
        if (Object.keys(cleaned).length === 0) continue;
      }
      out[key] = cleaned;
    }
    return out;
  }
  return value;
}

export function countByType(bundle: FhirBundle): { type: string; count: number }[] {
  const map = new Map<string, number>();
  for (const entry of bundle.entry) {
    map.set(entry.resource.resourceType, (map.get(entry.resource.resourceType) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

/* -------------------------------- validation -------------------------------- */

export type ValidationIssue = {
  severity: "error" | "warning";
  path: string;
  message: string;
};

const URN_UUID = /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}(-\d{2}(-\d{2})?)?$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

const REQUIRED: Record<string, string[]> = {
  Patient: ["identifier", "name"],
  Condition: ["subject", "code"],
  AllergyIntolerance: ["patient", "code"],
  Observation: ["status", "code", "subject"],
  DiagnosticReport: ["status", "code", "subject"],
  MedicationRequest: ["status", "intent", "subject", "medicationCodeableConcept"],
  Encounter: ["status", "class", "subject"],
  Coverage: ["status", "beneficiary", "payor"],
};

/**
 * Structural checks against the R4 base spec: cardinality of required elements,
 * urn:uuid fullUrls, internal reference resolution, date/dateTime formats and
 * the coding systems the HIS relies on (ICD-10, LOINC, UCUM).
 */
export function validateBundle(bundle: FhirBundle): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (bundle.resourceType !== "Bundle") {
    issues.push({ severity: "error", path: "Bundle", message: "resourceType must be Bundle" });
  }
  if (bundle.type !== "collection") {
    issues.push({ severity: "error", path: "Bundle.type", message: "type must be collection" });
  }
  const fullUrls = new Set<string>();
  bundle.entry.forEach((entry, index) => {
    const path = `Bundle.entry[${index}]`;
    if (!URN_UUID.test(entry.fullUrl)) {
      issues.push({ severity: "error", path: `${path}.fullUrl`, message: "fullUrl must be urn:uuid" });
    }
    if (fullUrls.has(entry.fullUrl)) {
      issues.push({ severity: "error", path: `${path}.fullUrl`, message: "duplicate fullUrl" });
    }
    fullUrls.add(entry.fullUrl);
  });

  bundle.entry.forEach((entry, index) => {
    const r = entry.resource as unknown as Record<string, unknown>;
    const type = String(r["resourceType"] ?? "");
    const path = `Bundle.entry[${index}].resource(${type})`;
    for (const field of REQUIRED[type] ?? []) {
      const value = r[field];
      if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
        issues.push({ severity: "error", path: `${path}.${field}`, message: "required element missing" });
      }
    }
    walk(r, path, (key, value, at) => {
      if (key === "reference" && typeof value === "string" && value.startsWith("urn:uuid:")) {
        if (!fullUrls.has(value)) {
          issues.push({ severity: "error", path: at, message: `unresolved reference ${value}` });
        }
      }
      if ((key === "birthDate" || key === "onsetDate") && typeof value === "string" && !DATE.test(value)) {
        issues.push({ severity: "error", path: at, message: "invalid FHIR date" });
      }
      if (
        ["effectiveDateTime", "authoredOn", "issued", "recordedDate", "start", "end", "lastUpdated"].includes(
          key,
        ) &&
        typeof value === "string" &&
        !DATETIME.test(value)
      ) {
        issues.push({ severity: "error", path: at, message: "invalid FHIR dateTime" });
      }
      if (key === "onsetDateTime" && typeof value === "string" && !DATE.test(value) && !DATETIME.test(value)) {
        issues.push({ severity: "error", path: at, message: "invalid FHIR dateTime" });
      }
    });
    if (type === "Condition") {
      const code = r["code"] as CodeableConcept | undefined;
      if (!code?.coding?.some((c) => c.system === SYSTEMS.icd10)) {
        issues.push({ severity: "warning", path: `${path}.code`, message: "no ICD-10 coding (text only)" });
      }
    }
    if (type === "Observation") {
      const code = r["code"] as CodeableConcept | undefined;
      if (!code?.coding?.some((c) => c.system === SYSTEMS.loinc)) {
        issues.push({ severity: "warning", path: `${path}.code`, message: "no LOINC coding (local code)" });
      }
      const qty = r["valueQuantity"] as Quantity | undefined;
      if (qty && !qty.code) {
        issues.push({
          severity: "warning",
          path: `${path}.valueQuantity`,
          message: `unit "${qty.unit ?? ""}" has no UCUM mapping`,
        });
      }
      if (qty && typeof qty.value !== "number") {
        issues.push({ severity: "error", path: `${path}.valueQuantity.value`, message: "value must be a number" });
      }
    }
  });
  return issues;
}

function walk(
  node: unknown,
  path: string,
  visit: (key: string, value: unknown, path: string) => void,
): void {
  if (Array.isArray(node)) {
    node.forEach((item, i) => walk(item, `${path}[${i}]`, visit));
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      const next = `${path}.${key}`;
      visit(key, value, next);
      walk(value, next, visit);
    }
  }
}
