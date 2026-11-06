import { useSyncExternalStore } from "react";

/**
 * Interface language. English is the source text; Amharic covers navigation,
 * roles and the patient-facing registration form. Anything without a
 * translation falls back to English, so a missing string never blanks a screen.
 * Translations should be reviewed by a native-speaking clinician before go-live.
 */
export type Language = "en" | "am";

const STORAGE_KEY = "furii_language";
const listeners = new Set<() => void>();

function read(): Language {
  if (typeof window === "undefined") return "en";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "am" ? "am" : "en";
  } catch {
    return "en";
  }
}

export function setLanguage(lang: Language) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* storage unavailable: language lasts for this page only */
  }
  if (typeof document !== "undefined") document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

export function useLanguage(): Language {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "en",
  );
}

const AM: Record<string, string> = {
  // navigation
  "Executive Cockpit": "የሥራ አስፈጻሚ ዳሽቦርድ",
  "Command Centre": "የዕዝ ማዕከል",
  "Digital Twin": "ዲጂታል መንትያ",
  "Event Ledger": "የክስተቶች መዝገብ",
  "Patient Records": "የታካሚ መዝገቦች",
  "Reception & Triage": "እንግዳ መቀበያ እና ልየታ",
  "Nurse Workspace": "የነርስ የሥራ ቦታ",
  "Doctor Workspace": "የሐኪም የሥራ ቦታ",
  "Ward & Bed Manager": "ክፍልና አልጋ አስተዳደር",
  "Observation & Short-stay": "ክትትልና አጭር ቆይታ",
  "Day-care & Inpatient Ward": "የቀን ሕክምናና ተኝቶ ሕክምና",
  Laboratory: "ላቦራቶሪ",
  "Radiology & Imaging": "ራዲዮሎጂ እና ምስል",
  "AI Pharmacy": "ፋርማሲ",
  "Billing & Ledger": "ክፍያ እና ሂሳብ",
  "HR & Staff Operations": "የሰው ሀብት",
  "Super Admin": "ዋና አስተዳዳሪ",
  "Oncology Workspace": "የካንሰር ሕክምና",
  "HIS & Interoperability": "የጤና መረጃ ሥርዓት",
  "Quick Access": "ፈጣን መዳረሻ",
  "Diagnostics & Informatics": "ምርመራና መረጃ",
  "Oncology & Informatics": "ካንሰርና መረጃ",
  "No role assigned": "ሚና አልተሰጠም",
  // roles
  "Chief Executive Officer": "ዋና ሥራ አስፈጻሚ",
  "Medical Director": "የሕክምና ዳይሬክተር",
  "Attending Doctor": "ሐኪም",
  "Registered Nurse": "ነርስ",
  "Receptionist & Triage": "እንግዳ ተቀባይ",
  "Clinical Pharmacist": "ፋርማሲስት",
  "Lab Technologist": "የላቦራቶሪ ባለሙያ",
  "Radiology Specialist": "የራዲዮሎጂ ባለሙያ",
  "Billing & Financial Clerk": "የክፍያ ሠራተኛ",
  // registration
  "Full Legal Name *": "ሙሉ ስም *",
  "Date of Birth *": "የትውልድ ቀን *",
  "Sex at Birth *": "ፆታ *",
  Female: "ሴት",
  Male: "ወንድ",
  "Phone Number": "ስልክ ቁጥር",
  "National ID / Passport Number": "ብሔራዊ መታወቂያ / ፓስፖርት ቁጥር",
  "Insurance Provider": "የጤና መድን",
  "Patient Consent & Privacy Agreement": "የታካሚ ፈቃድና የግላዊነት ስምምነት",
  "Patient consents to digital health data recording under hospital privacy guidelines.":
    "ታካሚው የጤና መረጃው በሆስፒታሉ የግላዊነት መመሪያ መሠረት በዲጂታል እንዲመዘገብ ይስማማል።",
  "Save Registration & Generate MRN": "ምዝገባውን አስቀምጥና የካርድ ቁጥር ስጥ",
  "Ethiopian calendar": "የኢትዮጵያ ዘመን አቆጣጠር",
  Day: "ቀን",
  Month: "ወር",
  Year: "ዓመት",
};

/** Translate a source (English) string for the current language. */
export function translate(text: string, lang: Language): string {
  return lang === "am" ? (AM[text] ?? text) : text;
}

export function useT(): (text: string) => string {
  const lang = useLanguage();
  return (text: string) => translate(text, lang);
}
