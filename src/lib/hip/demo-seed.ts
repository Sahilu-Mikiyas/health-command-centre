/**
 * Pitch demo data — realistic internal-medicine and oncology cases inserted from
 * the browser by a signed-in super admin (RLS lets authenticated staff write the
 * clinical tables). Every row follows the same conventions the workspaces read:
 *   - lab results    → orders category "laboratory", result_values built by buildLabResult
 *   - imaging        → orders category "imaging", result_values { kind: "imaging", ... }
 *   - cancer staging → clinical_notes "oncology_staging" (Staging JSON in objective)
 *   - chemotherapy   → medication orders coded with chemoCode(), doses from calculateDoses()
 *   - next cycle     → appointments reason "Chemo <regimen> C<n>", status "booked"
 * All demo patients carry an MRN starting with "DEMO-" so they can be removed in one go
 * (every clinical child table references patients ON DELETE CASCADE).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { buildLabResult, panelById } from "@/lib/hip/lab-panels";
import { emitEvent } from "@/lib/hip/mutations";
import { computeNews2 } from "@/lib/hip/news2";
import {
  bsaMosteller,
  calculateDoses,
  chemoCode,
  regimenById,
  stagingSummary,
  type Staging,
} from "@/lib/hip/oncology";

export type DemoResult = { created: number; skipped: number; removed?: number };
type Progress = ((msg: string) => void) | undefined;

/* --------------------------------- helpers --------------------------------- */

const DAY_MS = 86_400_000;
const LAB_PRICE = 450;
const IMAGING_PRICE = 2500;

const DR_IM = "Dr Dawit Yohannes";
const DR_ONC = "Dr Bethlehem Tadesse";
const NURSE = "Nurse Tigist Alemu";
const LAB_SCI = "Lab Sci. Kebede Worku";
const RADIOLOGIST = "Dr Getachew Reda";
const PHARMACIST = "Pharm. Eleni Assefa";

/** ISO timestamp `days` days ago (negative = in the future) at a local clock time. */
function at(days: number, hour = 9, minute = 0): string {
  const d = new Date(Date.now() - days * DAY_MS);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** ISO timestamp `minutes` minutes ago. */
function minutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/** Local YYYY-MM-DD `days` days ago. */
function dateOnly(days: number): string {
  const d = new Date(Date.now() - days * DAY_MS);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function dobForAge(age: number, monthDay: string): string {
  return `${new Date().getFullYear() - age}-${monthDay}`;
}

function fail(context: string, error: { message: string } | null): asserts error is null {
  if (error) throw new Error(`${context}: ${error.message}`);
}

async function hospitalId(): Promise<string> {
  const { data, error } = await supabase
    .from("hospitals")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not read hospitals: ${error.message}`);
  if (!data) throw new Error("No hospital configured — create a hospital before loading demo data");
  return data.id;
}

async function departmentIds(hid: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("departments")
    .select("id,code")
    .eq("hospital_id", hid);
  if (error) throw new Error(`Could not read departments: ${error.message}`);
  return Object.fromEntries((data ?? []).map((d) => [d.code, d.id]));
}

/* ---------------------------------- specs ---------------------------------- */

type LabSpec = {
  panel: string;
  values: Record<string, string>;
  days: number;
  hour?: number;
  name?: string;
  comment?: string;
  /** Verified this many minutes ago (overrides days/hour) — for same-day results. */
  minutesAgo?: number;
  /** Attach to the case's open encounter. */
  inEncounter?: boolean;
};

type ImagingSpec = {
  name: string;
  modality: string;
  findings: string;
  impression: string;
  days: number;
  hour?: number;
  minutesAgo?: number;
  inEncounter?: boolean;
};

type PendingOrderSpec = {
  category: "laboratory" | "imaging";
  name: string;
  priority: string;
  instructions: string;
  minutesAgo: number;
};

type VitalSpec = {
  /** Minutes ago (takes precedence) or days ago. */
  minutesAgo?: number;
  days?: number;
  temp: number;
  hr: number;
  sys: number;
  dia: number;
  rr: number;
  spo2: number;
  onO2?: boolean;
};

type NoteSpec = {
  noteType: string;
  author: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  days: number;
  hour?: number;
  minutesAgo?: number;
  inEncounter?: boolean;
};

type ChemoSpec = {
  regimenId: string;
  heightCm: number;
  weightKg: number;
  cyclesGiven: number;
  /** Days from today until the next (booked) cycle; earlier cycles are back-dated from it. */
  nextCycleInDays: number;
};

type AppointmentSpec = {
  days: number;
  hour?: number;
  reason: string;
  status: "booked" | "completed";
  dept?: string;
};

type MedicationSpec = {
  name: string;
  instructions: string;
  days: number;
  status: "requested" | "completed";
};

type DemoCase = {
  mrn: string;
  fullName: string;
  age: number;
  monthDay: string;
  sex: "male" | "female";
  phone: string;
  bloodGroup: string;
  insurance: string | null;
  coveragePct: number | null;
  egfr: number | null;
  conditions: { name: string; icd10: string; onsetDays: number }[];
  allergies: { substance: string; reaction: string; severity: "mild" | "moderate" | "severe" }[];
  vitals: VitalSpec[];
  labs: LabSpec[];
  imaging?: ImagingSpec[];
  encounter?: {
    stage: "nurse" | "doctor" | "laboratory";
    priority: "routine" | "urgent" | "critical";
    complaint: string;
    dept: string;
    startedMinutesAgo: number;
    queueTicket: string;
    pending?: PendingOrderSpec[];
  };
  notes?: NoteSpec[];
  staging?: { staging: Staging; days: number };
  tumourBoard?: {
    days: number;
    summary: string;
    attendees: string[];
    discussion: string;
    recommendation: string;
  };
  chemo?: ChemoSpec;
  medications?: MedicationSpec[];
  appointments?: AppointmentSpec[];
};

/* ----------------------------- shared lab shapes ----------------------------- */

const cbc = (days: number, v: { WBC: number; ANC: number; HGB: number; PLT: number }): LabSpec => ({
  panel: "cbc",
  days,
  hour: 8,
  values: { WBC: `${v.WBC}`, ANC: `${v.ANC}`, HGB: `${v.HGB}`, PLT: `${v.PLT}` },
});

const lft = (
  days: number,
  v: { ALT: number; AST: number; ALP: number; TBIL: number; ALB: number },
): LabSpec => ({
  panel: "lft",
  days,
  hour: 8,
  values: {
    ALT: `${v.ALT}`,
    AST: `${v.AST}`,
    ALP: `${v.ALP}`,
    TBIL: `${v.TBIL}`,
    ALB: `${v.ALB}`,
  },
});

const marker = (code: string, label: string, value: number, days: number): LabSpec => ({
  panel: "tumour_markers",
  name: `Tumour marker — ${label}`,
  days,
  hour: 8,
  values: { [code]: `${value}` },
});

/* ---------------------------- internal medicine ---------------------------- */

const INTERNAL_MEDICINE: DemoCase[] = [
  {
    mrn: "DEMO-IM-0001",
    fullName: "Tesfaye Girma",
    age: 58,
    monthDay: "03-14",
    sex: "male",
    phone: "+251 911 402 318",
    bloodGroup: "O+",
    insurance: "Ethiopian Health Insurance Agency",
    coveragePct: 80,
    egfr: 74,
    conditions: [
      { name: "Type 2 diabetes mellitus without complications", icd10: "E11.9", onsetDays: 2900 },
      { name: "Essential (primary) hypertension", icd10: "I10", onsetDays: 2200 },
    ],
    allergies: [{ substance: "Penicillin", reaction: "Rash", severity: "moderate" }],
    vitals: [
      { days: 30, temp: 36.7, hr: 80, sys: 148, dia: 92, rr: 16, spo2: 98 },
      { days: 1, temp: 36.6, hr: 82, sys: 152, dia: 94, rr: 16, spo2: 97 },
    ],
    labs: [
      { panel: "glucose", days: 1, values: { GLU: "186", HBA1C: "9.1" } },
      { panel: "lipids", days: 1, values: { CHOL: "248", LDL: "162", HDL: "38", TG: "230" } },
      { panel: "rft", days: 1, values: { CREA: "1.1", UREA: "18", EGFR: "74" } },
    ],
    notes: [
      {
        noteType: "consultation",
        author: DR_IM,
        days: 1,
        hour: 11,
        subjective:
          "58-year-old man with T2DM (8 yrs) and hypertension. Reports polyuria and nocturia x2 for 3 months. Adherent to metformin 1 g BD; ran out of amlodipine 2 weeks ago. No chest pain, no visual change.",
        objective:
          "BP 152/94, HR 82, BMI 29.4. Feet: intact sensation, pulses present. HbA1c 9.1 %, fasting glucose 186 mg/dL, LDL-C 162 mg/dL, HDL 38, TG 230. eGFR 74.",
        assessment:
          "Poorly controlled T2DM (HbA1c 9.1 %) with uncontrolled hypertension and mixed dyslipidaemia — high ASCVD risk.",
        plan: "Add gliclazide MR 60 mg OD; continue metformin. Restart amlodipine 10 mg OD and add lisinopril 10 mg OD. Start atorvastatin 40 mg nocte. Diabetes education, retinal screening referral. Review with repeat HbA1c in 3 months.",
      },
    ],
    appointments: [
      { days: -14, hour: 10, reason: "Diabetes & BP follow-up", status: "booked", dept: "OPD" },
    ],
  },
  {
    mrn: "DEMO-IM-0002",
    fullName: "Meseret Alemayehu",
    age: 64,
    monthDay: "07-02",
    sex: "female",
    phone: "+251 912 775 046",
    bloodGroup: "A+",
    insurance: "Nyala Insurance",
    coveragePct: 70,
    egfr: 38,
    conditions: [
      { name: "Chronic kidney disease, stage 3b", icd10: "N18.3", onsetDays: 900 },
      { name: "Essential (primary) hypertension", icd10: "I10", onsetDays: 3600 },
    ],
    allergies: [
      { substance: "Sulfa drugs", reaction: "Stevens–Johnson syndrome", severity: "severe" },
    ],
    vitals: [{ minutesAgo: 75, temp: 36.5, hr: 76, sys: 148, dia: 88, rr: 16, spo2: 97 }],
    labs: [
      { panel: "rft", days: 7, values: { CREA: "1.9", UREA: "38", EGFR: "38" } },
      { panel: "electrolytes", days: 7, values: { NA: "138", K: "5.0", CL: "103" } },
      cbc(7, { WBC: 6.4, ANC: 3.9, HGB: 10.9, PLT: 238 }),
    ],
    encounter: {
      stage: "laboratory",
      priority: "routine",
      complaint: "CKD 3b review — repeat renal profile before ACE-inhibitor titration",
      dept: "LAB",
      startedMinutesAgo: 95,
      queueTicket: "Q-214",
      pending: [
        {
          category: "laboratory",
          name: "Renal function (RFT) — repeat",
          priority: "routine",
          instructions: "Creatinine, urea, eGFR. Lisinopril titration pending result.",
          minutesAgo: 30,
        },
      ],
    },
    appointments: [
      { days: -28, hour: 9, reason: "Nephrology clinic review", status: "booked", dept: "OPD" },
    ],
  },
  {
    mrn: "DEMO-IM-0003",
    fullName: "Dereje Tsegaye",
    age: 47,
    monthDay: "11-21",
    sex: "male",
    phone: "+251 913 118 902",
    bloodGroup: "B+",
    insurance: "Awash Insurance",
    coveragePct: 90,
    egfr: 88,
    conditions: [{ name: "Pneumonia, unspecified organism", icd10: "J18.9", onsetDays: 3 }],
    allergies: [],
    vitals: [{ minutesAgo: 70, temp: 38.6, hr: 104, sys: 118, dia: 72, rr: 22, spo2: 94 }],
    labs: [
      {
        ...cbc(0, { WBC: 15.8, ANC: 13.2, HGB: 13.9, PLT: 312 }),
        minutesAgo: 60,
        inEncounter: true,
      },
    ],
    imaging: [
      {
        name: "Chest X-ray (PA)",
        modality: "Digital Radiography (CR)",
        findings:
          "Dense airspace opacification of the right lower lobe with air bronchograms. Right costophrenic angle preserved. No pleural effusion or pneumothorax. Heart size normal.",
        impression:
          "Right lower lobe consolidation — consistent with community-acquired pneumonia.",
        days: 0,
        minutesAgo: 45,
        inEncounter: true,
      },
    ],
    encounter: {
      stage: "doctor",
      priority: "critical",
      complaint: "Fever, productive cough and right-sided pleuritic chest pain x3 days",
      dept: "ED",
      startedMinutesAgo: 110,
      queueTicket: "Q-207",
    },
    notes: [
      {
        noteType: "consultation",
        author: DR_IM,
        days: 0,
        minutesAgo: 10,
        inEncounter: true,
        subjective:
          "3 days of fever, rigors, productive cough with rusty sputum and right-sided pleuritic chest pain. No recent travel or hospital admission. Non-smoker.",
        objective:
          "T 38.6 °C, HR 104, BP 118/72, RR 22, SpO2 94 % on air — NEWS2 5. Bronchial breathing right base. WBC 15.8 (ANC 13.2). CXR: RLL consolidation.",
        assessment:
          "Community-acquired pneumonia, CURB-65 score 1 (RR not ≥30, age < 65). NEWS2 5 — medium clinical risk.",
        plan: "Ceftriaxone 1 g IV OD + azithromycin 500 mg PO OD (penicillin-tolerant). Paracetamol, oral fluids. Repeat NEWS2 hourly; escalate if ≥7. Consider admission to Ward A for 24–48 h observation.",
      },
    ],
  },
  {
    mrn: "DEMO-IM-0004",
    fullName: "Hirut Wolde",
    age: 32,
    monthDay: "05-09",
    sex: "female",
    phone: "+251 914 560 771",
    bloodGroup: "O-",
    insurance: null,
    coveragePct: null,
    egfr: 112,
    conditions: [{ name: "Iron deficiency anaemia, unspecified", icd10: "D50.9", onsetDays: 20 }],
    allergies: [],
    vitals: [{ days: 2, temp: 36.6, hr: 98, sys: 108, dia: 66, rr: 18, spo2: 98 }],
    labs: [cbc(2, { WBC: 6.1, ANC: 3.4, HGB: 8.2, PLT: 452 })],
    appointments: [
      { days: -21, hour: 11, reason: "Anaemia review — repeat CBC", status: "booked", dept: "OPD" },
    ],
  },
  {
    mrn: "DEMO-IM-0005",
    fullName: "Getnet Ayele",
    age: 61,
    monthDay: "09-30",
    sex: "male",
    phone: "+251 915 233 680",
    bloodGroup: "A-",
    insurance: "Ethiopian Health Insurance Agency",
    coveragePct: 80,
    egfr: 66,
    conditions: [
      { name: "Hypertensive urgency", icd10: "I16.0", onsetDays: 0 },
      { name: "Essential (primary) hypertension", icd10: "I10", onsetDays: 1800 },
    ],
    allergies: [{ substance: "Aspirin", reaction: "Bronchospasm", severity: "moderate" }],
    vitals: [{ minutesAgo: 12, temp: 36.8, hr: 92, sys: 186, dia: 112, rr: 18, spo2: 97 }],
    labs: [],
    encounter: {
      stage: "nurse",
      priority: "urgent",
      complaint: "Severe occipital headache; BP 186/112 at community pharmacy check",
      dept: "OPD",
      startedMinutesAgo: 25,
      queueTicket: "Q-219",
    },
  },
  {
    mrn: "DEMO-IM-0006",
    fullName: "Zenebech Mekonnen",
    age: 70,
    monthDay: "01-17",
    sex: "female",
    phone: "+251 916 804 125",
    bloodGroup: "B-",
    insurance: "Nyala Insurance",
    coveragePct: 70,
    egfr: 41,
    conditions: [
      { name: "Hyperkalaemia", icd10: "E87.5", onsetDays: 0 },
      { name: "Essential (primary) hypertension", icd10: "I10", onsetDays: 4000 },
    ],
    allergies: [{ substance: "Sulfa drugs", reaction: "Urticaria", severity: "severe" }],
    vitals: [{ minutesAgo: 140, temp: 36.5, hr: 48, sys: 138, dia: 80, rr: 18, spo2: 96 }],
    labs: [
      {
        panel: "electrolytes",
        days: 0,
        minutesAgo: 50,
        values: { NA: "134", K: "6.8", CL: "101" },
        comment: "Non-haemolysed sample; phoned to ward",
      },
      {
        panel: "rft",
        days: 0,
        minutesAgo: 50,
        values: { CREA: "1.6", UREA: "42", EGFR: "41" },
      },
    ],
  },
];

/* --------------------------------- oncology --------------------------------- */

const ONCOLOGY: DemoCase[] = [
  {
    mrn: "DEMO-ONC-0001",
    fullName: "Selamawit Tesfaye",
    age: 46,
    monthDay: "04-12",
    sex: "female",
    phone: "+251 911 630 245",
    bloodGroup: "A+",
    insurance: "Ethiopian Health Insurance Agency",
    coveragePct: 80,
    egfr: 92,
    conditions: [{ name: "Invasive ductal carcinoma of breast", icd10: "C50.9", onsetDays: 120 }],
    allergies: [{ substance: "Penicillin", reaction: "Rash", severity: "moderate" }],
    vitals: [{ days: 1, temp: 36.6, hr: 78, sys: 118, dia: 74, rr: 16, spo2: 98 }],
    labs: [
      marker("CA153", "CA 15-3", 62, 104),
      marker("CA153", "CA 15-3", 41, 42),
      marker("CA153", "CA 15-3", 28, 1),
      cbc(1, { WBC: 5.2, ANC: 2.6, HGB: 11.8, PLT: 214 }),
      lft(1, { ALT: 28, AST: 24, ALP: 88, TBIL: 0.7, ALB: 4.1 }),
    ],
    staging: {
      days: 110,
      staging: {
        primarySite: "Breast",
        icd10: "C50.9",
        histology: "Invasive ductal carcinoma",
        t: "T2",
        n: "N1",
        m: "M0",
        stage: "IIB",
        grade: "2",
        ecog: 0,
        intent: "adjuvant",
        biomarkers: { ER: "positive (90%)", PR: "positive (70%)", HER2: "negative (IHC 1+)" },
        diagnosedOn: dateOnly(120),
      },
    },
    tumourBoard: {
      days: 100,
      summary:
        "46F, left breast IDC T2N1M0 Stage IIB, ER+/PR+/HER2−, post wide local excision + axillary clearance.",
      attendees: [
        DR_ONC,
        "Dr Solomon Worku (Surgery)",
        "Dr Getachew Reda (Radiology)",
        "Dr Almaz Tefera (Pathology)",
      ],
      discussion:
        "Node-positive, hormone-receptor positive disease. Fit for anthracycline-based adjuvant chemotherapy; LVEF 62 %.",
      recommendation:
        "Adjuvant AC x4 → weekly paclitaxel x12, then whole-breast RT and tamoxifen 5 years.",
    },
    chemo: { regimenId: "AC", heightCm: 158, weightKg: 64, cyclesGiven: 3, nextCycleInDays: 1 },
  },
  {
    mrn: "DEMO-ONC-0002",
    fullName: "Rahel Gebremedhin",
    age: 39,
    monthDay: "08-25",
    sex: "female",
    phone: "+251 912 487 331",
    bloodGroup: "O+",
    insurance: "Awash Insurance",
    coveragePct: 90,
    egfr: 104,
    conditions: [{ name: "Invasive ductal carcinoma of breast", icd10: "C50.9", onsetDays: 12 }],
    allergies: [{ substance: "Latex", reaction: "Contact dermatitis", severity: "mild" }],
    vitals: [{ days: 2, temp: 36.7, hr: 74, sys: 112, dia: 70, rr: 14, spo2: 99 }],
    labs: [
      cbc(2, { WBC: 6.8, ANC: 4.1, HGB: 12.9, PLT: 265 }),
      lft(2, { ALT: 22, AST: 19, ALP: 74, TBIL: 0.5, ALB: 4.4 }),
      marker("CA153", "CA 15-3", 34, 2),
    ],
    staging: {
      days: 5,
      staging: {
        primarySite: "Breast",
        icd10: "C50.9",
        histology: "Invasive ductal carcinoma",
        t: "T2",
        n: "N0",
        m: "M0",
        stage: "IIA",
        grade: "3",
        ecog: 0,
        intent: "neoadjuvant",
        biomarkers: { ER: "negative", PR: "negative", HER2: "positive (IHC 3+)" },
        diagnosedOn: dateOnly(12),
      },
    },
    appointments: [
      {
        days: -2,
        hour: 14,
        reason: "Tumour board — HER2+ breast, neoadjuvant plan",
        status: "booked",
        dept: "OPD",
      },
    ],
  },
  {
    mrn: "DEMO-ONC-0003",
    fullName: "Kebede Wolde",
    age: 57,
    monthDay: "02-03",
    sex: "male",
    phone: "+251 913 925 470",
    bloodGroup: "O+",
    insurance: "Ethiopian Health Insurance Agency",
    coveragePct: 80,
    egfr: 81,
    conditions: [
      { name: "Adenocarcinoma of colon", icd10: "C18.9", onsetDays: 110 },
      { name: "Type 2 diabetes mellitus without complications", icd10: "E11.9", onsetDays: 1500 },
    ],
    allergies: [],
    vitals: [{ days: 1, temp: 36.8, hr: 84, sys: 128, dia: 80, rr: 16, spo2: 97 }],
    labs: [
      marker("CEA", "CEA", 18.4, 95),
      marker("CEA", "CEA", 9.2, 42),
      marker("CEA", "CEA", 4.1, 1),
      cbc(1, { WBC: 4.6, ANC: 2.1, HGB: 11.4, PLT: 168 }),
      lft(1, { ALT: 34, AST: 31, ALP: 102, TBIL: 0.9, ALB: 3.8 }),
    ],
    staging: {
      days: 100,
      staging: {
        primarySite: "Colon",
        icd10: "C18.9",
        histology: "Adenocarcinoma",
        t: "T3",
        n: "N1",
        m: "M0",
        stage: "IIIB",
        grade: "2",
        ecog: 1,
        intent: "adjuvant",
        biomarkers: { MMR: "proficient (pMMR)", KRAS: "wild-type" },
        diagnosedOn: dateOnly(110),
      },
    },
    tumourBoard: {
      days: 90,
      summary:
        "57M, sigmoid adenocarcinoma pT3N1M0 Stage IIIB after laparoscopic resection; 2/18 nodes positive.",
      attendees: [DR_ONC, "Dr Solomon Worku (Surgery)", "Dr Almaz Tefera (Pathology)"],
      discussion:
        "Stage III, pMMR. Adjuvant oxaliplatin-based chemotherapy indicated; neuropathy counselling given.",
      recommendation: "Adjuvant mFOLFOX6 x12 (6 months). CEA every 3 cycles; CT CAP at completion.",
    },
    chemo: {
      regimenId: "FOLFOX6",
      heightCm: 170,
      weightKg: 68,
      cyclesGiven: 5,
      nextCycleInDays: 1,
    },
  },
  {
    mrn: "DEMO-ONC-0004",
    fullName: "Birtukan Assefa",
    age: 44,
    monthDay: "06-18",
    sex: "female",
    phone: "+251 914 312 908",
    bloodGroup: "B+",
    insurance: null,
    coveragePct: null,
    egfr: 52,
    conditions: [
      { name: "Squamous cell carcinoma of cervix uteri", icd10: "C53.9", onsetDays: 75 },
    ],
    allergies: [{ substance: "Metronidazole", reaction: "Nausea and vomiting", severity: "mild" }],
    vitals: [{ days: 1, temp: 36.9, hr: 88, sys: 116, dia: 72, rr: 16, spo2: 98 }],
    labs: [
      cbc(1, { WBC: 4.9, ANC: 2.4, HGB: 10.6, PLT: 182 }),
      lft(1, { ALT: 25, AST: 22, ALP: 81, TBIL: 0.6, ALB: 3.7 }),
      { panel: "rft", days: 1, hour: 8, values: { CREA: "1.3", UREA: "24", EGFR: "52" } },
    ],
    staging: {
      days: 65,
      staging: {
        primarySite: "Cervix uteri",
        icd10: "C53.9",
        histology: "Squamous cell carcinoma",
        t: "T2b",
        n: "N0",
        m: "M0",
        stage: "IIB (FIGO 2018)",
        grade: "2",
        ecog: 1,
        intent: "curative",
        biomarkers: { HPV: "16 positive", HIV: "negative" },
        diagnosedOn: dateOnly(75),
      },
    },
    tumourBoard: {
      days: 58,
      summary:
        "44F, cervical SCC FIGO IIB with parametrial involvement, no hydronephrosis. eGFR 52.",
      attendees: [
        DR_ONC,
        "Dr Selam Hailemariam (Gynae-oncology)",
        "Dr Yohannes Mamo (Radiation oncology)",
        "Dr Getachew Reda (Radiology)",
      ],
      discussion:
        "Not a surgical candidate (parametrial invasion). Cisplatin relatively contraindicated with eGFR 52 — carboplatin-based alternative agreed.",
      recommendation:
        "Concurrent pelvic EBRT 50.4 Gy + HDR brachytherapy with 3-weekly carboplatin AUC5 + paclitaxel 175 mg/m² x6.",
    },
    chemo: {
      regimenId: "CARBO-PAC",
      heightCm: 155,
      weightKg: 52,
      cyclesGiven: 2,
      nextCycleInDays: 2,
    },
  },
  {
    mrn: "DEMO-ONC-0005",
    fullName: "Alemayehu Tadesse",
    age: 68,
    monthDay: "12-05",
    sex: "male",
    phone: "+251 915 708 432",
    bloodGroup: "A+",
    insurance: "Ethiopian Health Insurance Agency",
    coveragePct: 80,
    egfr: 63,
    conditions: [
      { name: "Adenocarcinoma of prostate", icd10: "C61", onsetDays: 180 },
      { name: "Essential (primary) hypertension", icd10: "I10", onsetDays: 3000 },
    ],
    allergies: [{ substance: "Iodinated contrast", reaction: "Urticaria", severity: "moderate" }],
    vitals: [{ days: 3, temp: 36.5, hr: 72, sys: 134, dia: 82, rr: 16, spo2: 97 }],
    labs: [
      marker("PSA", "PSA", 48.2, 175),
      marker("PSA", "PSA", 11.6, 90),
      marker("PSA", "PSA", 1.9, 3),
      cbc(3, { WBC: 6.2, ANC: 3.8, HGB: 13.1, PLT: 221 }),
      lft(3, { ALT: 21, AST: 23, ALP: 96, TBIL: 0.8, ALB: 4.0 }),
    ],
    staging: {
      days: 170,
      staging: {
        primarySite: "Prostate",
        icd10: "C61",
        histology: "Acinar adenocarcinoma",
        t: "T3a",
        n: "N0",
        m: "M0",
        stage: "IIIB",
        grade: "Gleason 4+4=8 (GG4)",
        ecog: 1,
        intent: "curative",
        biomarkers: { "PSA at diagnosis": "48.2 ng/mL", "Bone scan": "negative" },
        diagnosedOn: dateOnly(180),
      },
    },
    tumourBoard: {
      days: 160,
      summary: "68M, high-risk localised prostate cancer cT3aN0M0, GG4, PSA 48.2.",
      attendees: [DR_ONC, "Dr Kebede Bekele (Urology)", "Dr Yohannes Mamo (Radiation oncology)"],
      discussion: "High-risk disease; radical prostatectomy declined by patient.",
      recommendation:
        "Long-course ADT (goserelin 3-monthly, 24 months) with radical EBRT to prostate. PSA every 3 months.",
    },
    medications: [
      {
        name: "Goserelin 10.8 mg SC",
        instructions:
          "3-monthly depot · ADT for high-risk prostate cancer (bicalutamide flare cover given)",
        days: 84,
        status: "completed",
      },
    ],
    appointments: [
      {
        days: -6,
        hour: 10,
        reason: "ADT depot — goserelin 10.8 mg",
        status: "booked",
        dept: "OPD",
      },
    ],
  },
  {
    mrn: "DEMO-ONC-0006",
    fullName: "Mulu Kassahun",
    age: 55,
    monthDay: "10-11",
    sex: "female",
    phone: "+251 916 241 587",
    bloodGroup: "O+",
    insurance: "Nyala Insurance",
    coveragePct: 70,
    egfr: 84,
    conditions: [{ name: "High-grade serous carcinoma of ovary", icd10: "C56.9", onsetDays: 95 }],
    allergies: [{ substance: "Codeine", reaction: "Severe vomiting", severity: "moderate" }],
    vitals: [{ days: 1, temp: 36.6, hr: 80, sys: 122, dia: 76, rr: 16, spo2: 98 }],
    labs: [
      marker("CA125", "CA-125", 410, 80),
      marker("CA125", "CA-125", 120, 40),
      marker("CA125", "CA-125", 38, 1),
      cbc(1, { WBC: 4.4, ANC: 1.9, HGB: 11.0, PLT: 176 }),
      lft(1, { ALT: 30, AST: 27, ALP: 90, TBIL: 0.6, ALB: 3.6 }),
    ],
    staging: {
      days: 85,
      staging: {
        primarySite: "Ovary",
        icd10: "C56.9",
        histology: "High-grade serous carcinoma",
        t: "T3c",
        n: "N1",
        m: "M0",
        stage: "IIIC (FIGO)",
        grade: "High",
        ecog: 1,
        intent: "adjuvant",
        biomarkers: { BRCA1: "pending", "CA-125 at diagnosis": "410 U/mL" },
        diagnosedOn: dateOnly(95),
      },
    },
    tumourBoard: {
      days: 70,
      summary: "55F, HGSOC FIGO IIIC after optimal primary debulking (R0).",
      attendees: [DR_ONC, "Dr Selam Hailemariam (Gynae-oncology)", "Dr Almaz Tefera (Pathology)"],
      discussion: "Optimal cytoreduction achieved. BRCA testing sent for maintenance planning.",
      recommendation:
        "Adjuvant carboplatin AUC5 + paclitaxel 175 mg/m² 3-weekly x6; CA-125 each cycle.",
    },
    chemo: {
      regimenId: "CARBO-PAC",
      heightCm: 160,
      weightKg: 61,
      cyclesGiven: 3,
      nextCycleInDays: 3,
    },
  },
  {
    mrn: "DEMO-ONC-0007",
    fullName: "Yonas Berhane",
    age: 49,
    monthDay: "03-27",
    sex: "male",
    phone: "+251 917 556 019",
    bloodGroup: "AB+",
    insurance: "Awash Insurance",
    coveragePct: 90,
    egfr: 96,
    conditions: [{ name: "Diffuse large B-cell lymphoma", icd10: "C83.3", onsetDays: 40 }],
    allergies: [],
    vitals: [{ days: 1, temp: 36.9, hr: 86, sys: 124, dia: 78, rr: 16, spo2: 98 }],
    labs: [
      cbc(1, { WBC: 5.8, ANC: 3.1, HGB: 12.2, PLT: 204 }),
      lft(1, { ALT: 26, AST: 29, ALP: 110, TBIL: 0.8, ALB: 3.9 }),
    ],
    staging: {
      days: 32,
      staging: {
        primarySite: "Lymph nodes",
        icd10: "C83.3",
        histology: "Diffuse large B-cell lymphoma (GCB type)",
        t: "",
        n: "",
        m: "",
        stage: "IIIA (Ann Arbor)",
        grade: "High",
        ecog: 1,
        intent: "curative",
        biomarkers: { CD20: "positive", IPI: "2 (LDH ↑, stage III)", HBsAg: "negative" },
        diagnosedOn: dateOnly(40),
      },
    },
    tumourBoard: {
      days: 28,
      summary: "49M, DLBCL Ann Arbor IIIA, IPI 2. HBV and HIV negative, LVEF 64 %.",
      attendees: [DR_ONC, "Dr Haile Yilma (Haematology)", "Dr Almaz Tefera (Pathology)"],
      discussion:
        "Standard first-line chemo-immunotherapy; interim PET-CT after cycle 4 where available.",
      recommendation: "R-CHOP 21 x6. Allopurinol for TLS prophylaxis during cycle 1.",
    },
    chemo: { regimenId: "RCHOP", heightCm: 175, weightKg: 72, cyclesGiven: 1, nextCycleInDays: 0 },
  },
  {
    mrn: "DEMO-ONC-0008",
    fullName: "Fikru Negash",
    age: 63,
    monthDay: "07-14",
    sex: "male",
    phone: "+251 918 377 254",
    bloodGroup: "O-",
    insurance: "Ethiopian Health Insurance Agency",
    coveragePct: 80,
    egfr: 66,
    conditions: [
      { name: "Adenocarcinoma of lung", icd10: "C34.9", onsetDays: 60 },
      { name: "Chronic obstructive pulmonary disease", icd10: "J44.9", onsetDays: 2500 },
    ],
    allergies: [{ substance: "Penicillin", reaction: "Anaphylaxis", severity: "severe" }],
    vitals: [{ minutesAgo: 180, temp: 37.1, hr: 96, sys: 112, dia: 70, rr: 20, spo2: 93 }],
    labs: [
      cbc(1, { WBC: 3.9, ANC: 1.6, HGB: 10.1, PLT: 85 }),
      lft(1, { ALT: 38, AST: 41, ALP: 145, TBIL: 1.0, ALB: 3.2 }),
    ],
    staging: {
      days: 52,
      staging: {
        primarySite: "Lung / bronchus",
        icd10: "C34.9",
        histology: "Adenocarcinoma",
        t: "T3",
        n: "N2",
        m: "M1c",
        stage: "IVB",
        grade: "3",
        ecog: 2,
        intent: "palliative",
        biomarkers: { EGFR: "wild-type", ALK: "negative", "PD-L1": "10%" },
        diagnosedOn: dateOnly(60),
      },
    },
    tumourBoard: {
      days: 45,
      summary: "63M, lung adenocarcinoma cT3N2M1c (bone + adrenal), ECOG 2, no actionable driver.",
      attendees: [
        DR_ONC,
        "Dr Getachew Reda (Radiology)",
        "Dr Haile Yilma (Pulmonology)",
        "Palliative care team",
      ],
      discussion:
        "Incurable disease. Fit for doublet chemotherapy with close monitoring; immunotherapy not accessible.",
      recommendation:
        "Palliative carboplatin AUC5 + paclitaxel 3-weekly x4–6; single-fraction RT to painful T10 metastasis; palliative care co-management.",
    },
    chemo: {
      regimenId: "CARBO-PAC",
      heightCm: 168,
      weightKg: 54,
      cyclesGiven: 1,
      nextCycleInDays: 0,
    },
  },
];

/* ------------------------------ case insertion ------------------------------ */

type Ctx = { hid: string; depts: Record<string, string> };

async function insertCase(c: DemoCase, ctx: Ctx): Promise<void> {
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .insert({
      hospital_id: ctx.hid,
      mrn: c.mrn,
      full_name: c.fullName,
      date_of_birth: dobForAge(c.age, c.monthDay),
      sex: c.sex,
      phone: c.phone,
      blood_group: c.bloodGroup,
      insurance_provider: c.insurance,
      insurance_coverage_pct: c.coveragePct,
      egfr: c.egfr,
    })
    .select("id")
    .single();
  fail(`${c.mrn} patient`, patientError);
  const patientId = patient.id;

  try {
    await insertChildren(c, patientId, ctx);
  } catch (err) {
    // Roll back the half-built case so the next run re-creates it cleanly.
    await supabase.from("patients").delete().eq("id", patientId);
    throw err;
  }
}

async function insertChildren(c: DemoCase, patientId: string, ctx: Ctx): Promise<void> {
  const { hid, depts } = ctx;

  /* encounter first — other rows may reference it */
  let encounterId: string | null = null;
  if (c.encounter) {
    const e = c.encounter;
    const { data, error } = await supabase
      .from("encounters")
      .insert({
        hospital_id: hid,
        patient_id: patientId,
        department_id: depts[e.dept] ?? null,
        stage: e.stage,
        priority: e.priority,
        chief_complaint: e.complaint,
        started_at: minutesAgo(e.startedMinutesAgo),
        queue_ticket: e.queueTicket,
        wristband_code: `WB-${c.mrn.replace(/\D/g, "").padStart(8, "0")}`,
        ended_at: null,
      })
      .select("id")
      .single();
    fail(`${c.mrn} encounter`, error);
    encounterId = data.id;
  }

  /* orders: labs, imaging, pending, medications, chemo */
  type OrderInsert = {
    hospital_id: string;
    patient_id: string;
    encounter_id: string | null;
    category: "laboratory" | "imaging" | "medication" | "procedure";
    code?: string | null;
    name: string;
    priority: string;
    status: "requested" | "resulted" | "completed";
    instructions?: string | null;
    requested_by_label: string;
    requested_at: string;
    completed_at?: string | null;
    result_summary?: string | null;
    result_values?: Json | null;
    is_critical?: boolean;
    verified_by_label?: string | null;
    verified_at?: string | null;
    analyzer?: string | null;
    specimen_barcode?: string | null;
    unit_price?: number | null;
  };
  const orders: OrderInsert[] = [];
  const doctor = c.mrn.startsWith("DEMO-ONC") ? DR_ONC : DR_IM;

  c.labs.forEach((lab, i) => {
    const panel = panelById(lab.panel);
    if (!panel) throw new Error(`Unknown lab panel "${lab.panel}"`);
    const analyzer = lab.panel === "cbc" ? "Sysmex XN-1000" : "Roche Cobas 8000";
    const result = buildLabResult(panel, lab.values, { analyzer, comment: lab.comment });
    const hour = lab.hour ?? 8;
    const requested =
      lab.minutesAgo !== undefined
        ? minutesAgo(lab.minutesAgo + 45)
        : at(lab.days, Math.max(hour - 1, 0), 15);
    const verified =
      lab.minutesAgo !== undefined ? minutesAgo(lab.minutesAgo) : at(lab.days, hour, 40);
    orders.push({
      hospital_id: hid,
      patient_id: patientId,
      encounter_id: lab.inEncounter ? encounterId : null,
      category: "laboratory",
      code: panel.id.toUpperCase(),
      name: lab.name ?? panel.label,
      priority: result.isCritical ? "urgent" : "routine",
      status: "resulted",
      requested_by_label: doctor,
      requested_at: requested,
      completed_at: verified,
      result_summary: result.summary,
      result_values: result.values as unknown as Json,
      is_critical: result.isCritical,
      verified_by_label: LAB_SCI,
      verified_at: verified,
      analyzer,
      specimen_barcode: `SPC-${c.mrn.replace(/\D/g, "").slice(-4)}${String(i).padStart(3, "0")}`,
      unit_price: LAB_PRICE,
    });
  });

  for (const img of c.imaging ?? []) {
    const hour = img.hour ?? 10;
    const verified =
      img.minutesAgo !== undefined ? minutesAgo(img.minutesAgo) : at(img.days, hour, 30);
    orders.push({
      hospital_id: hid,
      patient_id: patientId,
      encounter_id: img.inEncounter ? encounterId : null,
      category: "imaging",
      code: null,
      name: img.name,
      priority: "urgent",
      status: "resulted",
      requested_by_label: doctor,
      requested_at:
        img.minutesAgo !== undefined
          ? minutesAgo(img.minutesAgo + 40)
          : at(img.days, Math.max(hour - 1, 0), 5),
      completed_at: verified,
      result_summary: img.impression,
      result_values: {
        kind: "imaging",
        modality: img.modality,
        findings: img.findings,
        impression: img.impression,
      },
      is_critical: false,
      verified_by_label: RADIOLOGIST,
      verified_at: verified,
      analyzer: img.modality,
      unit_price: IMAGING_PRICE,
    });
  }

  for (const p of c.encounter?.pending ?? []) {
    orders.push({
      hospital_id: hid,
      patient_id: patientId,
      encounter_id: encounterId,
      category: p.category,
      name: p.name,
      priority: p.priority,
      status: "requested",
      instructions: p.instructions,
      requested_by_label: doctor,
      requested_at: minutesAgo(p.minutesAgo),
    });
  }

  for (const m of c.medications ?? []) {
    orders.push({
      hospital_id: hid,
      patient_id: patientId,
      encounter_id: null,
      category: "medication",
      name: m.name,
      priority: "routine",
      status: m.status,
      instructions: m.instructions,
      requested_by_label: doctor,
      requested_at: at(m.days, 9),
      completed_at: m.status === "completed" ? at(m.days, 11) : null,
      verified_by_label: m.status === "completed" ? PHARMACIST : null,
      verified_at: m.status === "completed" ? at(m.days, 10) : null,
    });
  }

  const appointments: {
    hospital_id: string;
    patient_id: string;
    department_id: string | null;
    scheduled_at: string;
    reason: string;
    status: "booked" | "completed";
    booked_by_label: string;
  }[] = (c.appointments ?? []).map((a) => ({
    hospital_id: hid,
    patient_id: patientId,
    department_id: a.dept ? (depts[a.dept] ?? null) : null,
    scheduled_at: at(a.days, a.hour ?? 9),
    reason: a.reason,
    status: a.status,
    booked_by_label: doctor,
  }));

  if (c.chemo) {
    const spec = c.chemo;
    const regimen = regimenById(spec.regimenId);
    if (!regimen) throw new Error(`Unknown regimen "${spec.regimenId}"`);
    const bsa = bsaMosteller(spec.heightCm, spec.weightKg);
    const doses = calculateDoses({ regimen, bsa, egfr: c.egfr, reductionPct: 0 });
    const cycleDaysAgo = (cycle: number) =>
      (spec.cyclesGiven - cycle + 1) * regimen.cycleDays - spec.nextCycleInDays;

    for (let cycle = 1; cycle <= spec.cyclesGiven; cycle++) {
      const days = cycleDaysAgo(cycle);
      const startDate = dateOnly(days);
      for (const d of doses) {
        // Same order shape and instruction string as prescribeCycle() in oncology.ts.
        orders.push({
          hospital_id: hid,
          patient_id: patientId,
          encounter_id: null,
          category: "medication",
          code: chemoCode({ regimenId: regimen.id, cycle, drugCode: d.code }),
          name: `${d.drug} ${d.dose} ${d.unit} ${d.route}`,
          priority: "urgent",
          status: "completed",
          instructions:
            `${regimen.name} · Cycle ${cycle} of ${regimen.cycles} · ${d.schedule} · ` +
            `${d.formula}${d.capped ? " · capped" : ""} · ` +
            `BSA ${bsa} m² (Ht ${spec.heightCm} cm, Wt ${spec.weightKg} kg) · Start ${startDate} · ` +
            `CHEMO — independent double-check required`,
          requested_by_label: DR_ONC,
          requested_at: at(days + 1, 15),
          verified_by_label: PHARMACIST,
          verified_at: at(days, 8, 30),
          completed_at: at(days, 13),
        });
      }
      if (cycle > 1) {
        appointments.push({
          hospital_id: hid,
          patient_id: patientId,
          department_id: depts["OPD"] ?? null,
          scheduled_at: at(days, 9),
          reason: `Chemo ${regimen.id} C${cycle}`,
          status: "completed",
          booked_by_label: DR_ONC,
        });
      }
    }
    if (spec.cyclesGiven < regimen.cycles) {
      appointments.push({
        hospital_id: hid,
        patient_id: patientId,
        department_id: depts["OPD"] ?? null,
        scheduled_at: at(-spec.nextCycleInDays, 9),
        reason: `Chemo ${regimen.id} C${spec.cyclesGiven + 1}`,
        status: "booked",
        booked_by_label: DR_ONC,
      });
    }
  }

  /* clinical notes */
  const notes: {
    patient_id: string;
    encounter_id: string | null;
    author_label: string;
    note_type: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    signed_at: string;
    created_at: string;
  }[] = (c.notes ?? []).map((n) => ({
    patient_id: patientId,
    encounter_id: n.inEncounter ? encounterId : null,
    author_label: n.author,
    note_type: n.noteType,
    subjective: n.subjective,
    objective: n.objective,
    assessment: n.assessment,
    plan: n.plan,
    signed_at: n.minutesAgo !== undefined ? minutesAgo(n.minutesAgo) : at(n.days, n.hour ?? 11, 30),
    created_at:
      n.minutesAgo !== undefined ? minutesAgo(n.minutesAgo + 15) : at(n.days, n.hour ?? 11, 10),
  }));

  if (c.staging) {
    const s = c.staging.staging;
    notes.push({
      patient_id: patientId,
      encounter_id: null,
      author_label: DR_ONC,
      note_type: "oncology_staging",
      subjective: `Cancer staging — ${s.primarySite}`,
      objective: JSON.stringify(s),
      assessment: stagingSummary(s),
      plan: `Treatment intent: ${s.intent}`,
      signed_at: at(c.staging.days, 14, 20),
      created_at: at(c.staging.days, 14),
    });
  }

  if (c.tumourBoard) {
    const tb = c.tumourBoard;
    notes.push({
      patient_id: patientId,
      encounter_id: null,
      author_label: DR_ONC,
      note_type: "tumour_board",
      subjective: tb.summary,
      objective: JSON.stringify({ attendees: tb.attendees }),
      assessment: tb.discussion,
      plan: tb.recommendation,
      signed_at: at(tb.days, 16, 30),
      created_at: at(tb.days, 16),
    });
  }

  /* vitals with NEWS2 computed the same way the nurse workspace does */
  const vitals = c.vitals.map((v) => ({
    patient_id: patientId,
    recorded_at: v.minutesAgo !== undefined ? minutesAgo(v.minutesAgo) : at(v.days ?? 0, 8, 45),
    temperature_c: v.temp,
    heart_rate: v.hr,
    systolic: v.sys,
    diastolic: v.dia,
    respiratory_rate: v.rr,
    spo2: v.spo2,
    news2: computeNews2({
      respiratoryRate: v.rr,
      spo2: v.spo2,
      supplementalO2: v.onO2 ?? false,
      systolic: v.sys,
      pulse: v.hr,
      consciousness: "A",
      temperatureC: v.temp,
    }).score,
  }));

  const conditions = c.conditions.map((cond) => ({
    patient_id: patientId,
    name: cond.name,
    icd10: cond.icd10,
    status: "active",
    onset_date: dateOnly(cond.onsetDays),
  }));

  const allergies = c.allergies.map((a) => ({ patient_id: patientId, ...a }));

  const writes: PromiseLike<{ error: { message: string } | null }>[] = [];
  const labels: string[] = [];
  const queue = (label: string, p: PromiseLike<{ error: { message: string } | null }>) => {
    labels.push(label);
    writes.push(p);
  };
  if (conditions.length) queue("conditions", supabase.from("conditions").insert(conditions));
  if (allergies.length) queue("allergies", supabase.from("allergies").insert(allergies));
  if (vitals.length) queue("vitals", supabase.from("vitals").insert(vitals));
  if (orders.length) queue("orders", supabase.from("orders").insert(orders));
  if (notes.length) queue("clinical notes", supabase.from("clinical_notes").insert(notes));
  if (appointments.length)
    queue("appointments", supabase.from("appointments").insert(appointments));

  const results = await Promise.all(writes);
  results.forEach((r, i) => fail(`${c.mrn} ${labels[i]}`, r.error));
}

/* ------------------------------- public API ------------------------------- */

async function seedPack(
  pack: "internal_medicine" | "oncology",
  cases: DemoCase[],
  onProgress: Progress,
) {
  const log = (msg: string) => onProgress?.(msg);
  log(`Preparing ${cases.length} ${pack === "oncology" ? "oncology" : "internal-medicine"} cases…`);

  const hid = await hospitalId();
  const depts = await departmentIds(hid);

  const { data: existing, error } = await supabase
    .from("patients")
    .select("mrn")
    .in(
      "mrn",
      cases.map((c) => c.mrn),
    );
  if (error) throw new Error(`Could not check existing demo patients: ${error.message}`);
  const existingMrns = new Set((existing ?? []).map((p) => p.mrn));

  let created = 0;
  let skipped = 0;
  for (const c of cases) {
    if (existingMrns.has(c.mrn)) {
      skipped++;
      log(`↷ ${c.mrn} ${c.fullName} already exists — skipped`);
      continue;
    }
    log(`+ ${c.mrn} ${c.fullName}…`);
    await insertCase(c, { hid, depts });
    created++;
    log(`✓ ${c.mrn} ${c.fullName} created`);
  }

  try {
    await emitEvent({
      eventType: "demo.data_loaded",
      entityType: "demo",
      payload: { pack, created, skipped, mrns: cases.map((c) => c.mrn) },
    });
  } catch (err) {
    log(`(event stream not updated: ${err instanceof Error ? err.message : String(err)})`);
  }

  log(`Done — ${created} created, ${skipped} skipped.`);
  return { created, skipped };
}

/** Six internal-medicine & diagnostics cases (T2DM, CKD, CAP, IDA, hypertensive urgency, K⁺ 6.8). */
export function seedInternalMedicineDemo(onProgress?: (msg: string) => void): Promise<DemoResult> {
  return seedPack("internal_medicine", INTERNAL_MEDICINE, onProgress);
}

/** Eight oncology cases with staging, tumour boards, chemo cycles and tumour-marker trends. */
export function seedOncologyDemo(onProgress?: (msg: string) => void): Promise<DemoResult> {
  return seedPack("oncology", ONCOLOGY, onProgress);
}

/**
 * Deletes every patient whose MRN starts with "DEMO-". allergies, conditions, vitals,
 * encounters, appointments, clinical_notes, orders and invoices all reference
 * patients ON DELETE CASCADE, so their rows go with the patient.
 */
export async function removeDemoData(onProgress?: (msg: string) => void): Promise<DemoResult> {
  const log = (msg: string) => onProgress?.(msg);
  log("Looking for demo patients (MRN DEMO-*)…");
  const { data, error } = await supabase.from("patients").select("id,mrn").like("mrn", "DEMO-%");
  if (error) throw new Error(`Could not list demo patients: ${error.message}`);
  const ids = (data ?? []).map((p) => p.id);
  if (!ids.length) {
    log("No demo patients found.");
    return { created: 0, skipped: 0, removed: 0 };
  }

  let removed = 0;
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    const { error: delError, count } = await supabase
      .from("patients")
      .delete({ count: "exact" })
      .in("id", chunk);
    if (delError) throw new Error(`Could not remove demo patients: ${delError.message}`);
    if (count !== null && count < chunk.length) {
      throw new Error(
        `Only ${removed + count} of ${ids.length} demo patients could be removed — check delete permissions on patients`,
      );
    }
    removed += chunk.length;
    log(`− removed ${removed} / ${ids.length} demo patients (with their clinical records)`);
  }

  try {
    await emitEvent({
      eventType: "demo.data_removed",
      entityType: "demo",
      payload: { removed },
    });
  } catch {
    /* non-fatal */
  }

  log(`Done — ${removed} demo patients removed.`);
  return { created: 0, skipped: 0, removed };
}
