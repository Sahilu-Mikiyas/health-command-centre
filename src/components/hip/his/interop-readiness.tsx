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
    standard: "HL7 FHIR R4",
    scope: "Patient data exchange",
    status: "live",
    detail:
      "Per-patient Bundle export: Patient, Encounter, Condition, AllergyIntolerance, Observation, DiagnosticReport, MedicationRequest, Coverage.",
  },
  {
    standard: "ICD-10",
    scope: "Diagnosis coding",
    status: "live",
    detail:
      "Problem list and cancer diagnoses coded at point of care; coverage measured on the Data Quality tab.",
  },
  {
    standard: "LOINC",
    scope: "Laboratory & vital signs",
    status: "live",
    detail:
      "Structured lab panels carry LOINC per analyte; vitals mapped to LOINC with UCUM units.",
  },
  {
    standard: "DHIS2",
    scope: "Aggregate national reporting",
    status: "roadmap",
    detail: "Monthly aggregate data-set push (e.g. HMIS indicators) from the same coded data.",
  },
  {
    standard: "PACS / DICOM",
    scope: "Imaging archive",
    status: "roadmap",
    detail:
      "Radiology reports are structured today; DICOM image storage & viewer integration planned.",
  },
  {
    standard: "HL7 v2 ADT",
    scope: "Admission / discharge feeds",
    status: "roadmap",
    detail:
      "A01/A03/A08 messages to legacy systems, derived from encounter events already in the ledger.",
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
