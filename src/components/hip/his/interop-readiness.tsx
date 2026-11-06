import { Network } from "lucide-react";

import { Panel } from "@/components/hip/panel";
import { StatusPill, type OpStatus } from "@/components/hip/status-pill";

type Item = {
  standard: string;
  scope: string;
  status: "live" | "roadmap";
  detail: string;
};

const ITEMS: Item[] = [
  {
    standard: "HL7 FHIR R4 API",
    scope: "Live data exchange",
    status: "live",
    detail:
      "Read-only REST API: metadata, Patient search by MRN or national ID, Patient read and $everything. Staff token required; row-level security and audit logging on every read.",
  },
  {
    standard: "HL7 FHIR R4 export",
    scope: "Patient record download",
    status: "live",
    detail:
      "Per-patient Bundle: Patient, Encounter, Condition, AllergyIntolerance, Observation, DiagnosticReport, MedicationRequest, Coverage.",
  },
  {
    standard: "HL7 v2.5.1 ADT",
    scope: "Admission / discharge feeds",
    status: "live",
    detail:
      "A04 / A01 / A03 messages generated from encounters for legacy systems; downloadable batch. A live network (MLLP) interface is configured per site.",
  },
  {
    standard: "DHIS2",
    scope: "National aggregate reporting",
    status: "live",
    detail:
      "Monthly dataValueSet by sex and age with ICD-10 morbidity. Download, or send directly (dry run first) once the facility's DHIS2 server and token are configured.",
  },
  {
    standard: "ICD-10",
    scope: "Diagnosis coding",
    status: "live",
    detail:
      "Problem list and cancer diagnoses coded at point of care; coverage on the Data Quality tab.",
  },
  {
    standard: "ICD-O-3",
    scope: "Cancer registry coding",
    status: "live",
    detail:
      "Topography, morphology, behaviour and basis of diagnosis at staging; registry export and FHIR Condition carry the codes; MV% tracked.",
  },
  {
    standard: "LOINC + UCUM",
    scope: "Laboratory & vital signs",
    status: "live",
    detail:
      "Structured lab panels carry LOINC per analyte; vitals mapped to LOINC with UCUM units.",
  },
  {
    standard: "WHO ATC",
    scope: "Medication coding",
    status: "live",
    detail:
      "Medication orders coded to ATC (essential-medicines subset, incl. oncology) in the FHIR export; coverage on the Data Quality tab.",
  },
  {
    standard: "Master Patient Index",
    scope: "Patient identity",
    status: "live",
    detail:
      "National ID (Fayda) at registration and as a FHIR identifier; duplicate check at registration plus a review queue.",
  },
  {
    standard: "Ethiopian calendar · Amharic",
    scope: "Local fit",
    status: "live",
    detail:
      "Dates of birth entered and shown in the Ethiopian calendar, Ethiopian dates on reports, Amharic navigation and registration.",
  },
  {
    standard: "PACS / DICOM",
    scope: "Imaging archive",
    status: "roadmap",
    detail:
      "Radiology reports are structured today; DICOM image storage and viewer integration planned.",
  },
];

const TONE: Record<Item["status"], { status: OpStatus; label: string }> = {
  live: { status: "healthy", label: "Live" },
  roadmap: { status: "offline", label: "Roadmap" },
};

export function InteropReadiness() {
  const live = ITEMS.filter((i) => i.status === "live").length;
  return (
    <Panel
      title="Interoperability readiness"
      subtitle={`${live} of ${ITEMS.length} standards live today — roadmap items are labelled honestly`}
      action={<Network className="size-4 text-[#86868B]" />}
    >
      <ul className="divide-y divide-black/5">
        {ITEMS.map((item) => (
          <li
            key={item.standard}
            className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4"
          >
            <div className="w-44 shrink-0">
              <p className="text-sm font-bold text-[#1D1D1F]">{item.standard}</p>
              <p className="text-[11px] font-semibold text-[#86868B]">{item.scope}</p>
            </div>
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-[#86868B]">{item.detail}</p>
            <StatusPill
              status={TONE[item.status].status}
              label={TONE[item.status].label}
              className="shrink-0 self-start"
            />
          </li>
        ))}
      </ul>
    </Panel>
  );
}
