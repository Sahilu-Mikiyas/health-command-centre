import { useSyncExternalStore } from "react";

/**
 * Facility profile — one platform, configured per client. The profile drives
 * branding (sidebar, sign-in, splash, PDF letterhead, page titles) and which
 * workspaces are promoted in navigation.
 *
 * Switch with a link (`?facility=oncology` / `?facility=im`) or from Super Admin.
 */
export type FacilityId = "internal_medicine" | "oncology";

export type FacilityProfile = {
  id: FacilityId;
  name: string;
  shortName: string;
  tagline: string;
  pdfSubtitle: string;
  monogram: string;
  /** Where clinical leadership lands after sign-in. */
  executiveLanding: string;
  /** Routes promoted to the top of the sidebar for clinical & executive roles. */
  featured: string[];
  featuredLabel: string;
  wardLabel: string;
};

export const FACILITIES: Record<FacilityId, FacilityProfile> = {
  internal_medicine: {
    id: "internal_medicine",
    name: "Furii Internal Medicine & Diagnostic Centre",
    shortName: "Furii IM & Diagnostics",
    tagline: "Integrated outpatient care, laboratory and imaging",
    pdfSubtitle: "Internal Medicine · Laboratory · Imaging",
    monogram: "F",
    executiveLanding: "/command-centre",
    featured: ["/laboratory", "/radiology", "/his"],
    featuredLabel: "Diagnostics & Informatics",
    wardLabel: "Observation & Short-stay",
  },
  oncology: {
    id: "oncology",
    name: "Furii Cancer Care Centre",
    shortName: "Furii Cancer Care",
    tagline: "Comprehensive oncology care, chemotherapy and cancer registry",
    pdfSubtitle: "Medical Oncology · Chemotherapy · Cancer Registry",
    monogram: "F",
    executiveLanding: "/oncology",
    featured: ["/oncology", "/his"],
    featuredLabel: "Oncology & Informatics",
    wardLabel: "Day-care & Inpatient Ward",
  },
};

const STORAGE_KEY = "furii_facility_profile";
const listeners = new Set<() => void>();

function readStored(): FacilityId {
  if (typeof window === "undefined") return "internal_medicine";
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "oncology" || value === "internal_medicine" ? value : "internal_medicine";
  } catch {
    return "internal_medicine";
  }
}

export function getFacility(): FacilityProfile {
  return FACILITIES[readStored()];
}

export function setFacility(id: FacilityId) {
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage unavailable — profile stays default */
  }
  listeners.forEach((listener) => listener());
}

/** Applies `?facility=oncology|im|internal_medicine` from the current URL, if present. */
export function applyFacilityFromUrl() {
  if (typeof window === "undefined") return;
  const param = new URLSearchParams(window.location.search).get("facility")?.toLowerCase();
  if (!param) return;
  if (param === "oncology" || param === "onc") setFacility("oncology");
  else if (param === "im" || param === "internal_medicine" || param === "internal-medicine")
    setFacility("internal_medicine");
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Reactive facility profile; renders the default on the server, then hydrates. */
export function useFacility(): FacilityProfile {
  const id = useSyncExternalStore(subscribe, readStored, () => "internal_medicine" as FacilityId);
  return FACILITIES[id];
}

/** Page `<title>` helper. */
export function pageTitle(page: string) {
  return `${page} | Furii Health`;
}
