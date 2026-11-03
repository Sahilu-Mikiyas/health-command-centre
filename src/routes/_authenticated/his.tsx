import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, FileJson2, Fingerprint, Ribbon, ShieldCheck, Tags } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/hip/app-shell";
import { AuditPanel } from "@/components/hip/his/audit-panel";
import { CancerRegistryPanel } from "@/components/hip/his/cancer-registry-panel";
import { DataQualityPanel } from "@/components/hip/his/data-quality-panel";
import { FacilityAnalyticsPanel } from "@/components/hip/his/facility-analytics-panel";
import { FhirExportPanel } from "@/components/hip/his/fhir-export-panel";
import { InteropReadiness } from "@/components/hip/his/interop-readiness";
import { HisKpiStrip } from "@/components/hip/his/kpi-strip";
import { RouteGuard } from "@/components/hip/route-guard";
import { pageTitle, useFacility } from "@/lib/hip/facility";
import type { PatientRow } from "@/lib/hip/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/his")({
  head: () => ({
    meta: [
      { title: pageTitle("HIS & Interoperability") },
      {
        name: "description",
        content:
          "Health information system hub: HL7 FHIR R4 export, ICD-10 & LOINC coding quality, cancer registry, append-only audit ledger and facility analytics — all from live clinical data.",
      },
      { property: "og:title", content: pageTitle("HIS & Interoperability") },
    ],
  }),
  component: HisPage,
});

type TabId = "fhir" | "quality" | "registry" | "audit" | "analytics";

const TABS: { id: TabId; label: string; icon: typeof FileJson2 }[] = [
  { id: "fhir", label: "FHIR Interoperability", icon: FileJson2 },
  { id: "quality", label: "Coding & Data Quality", icon: Tags },
  { id: "registry", label: "Cancer Registry", icon: Ribbon },
  { id: "audit", label: "Audit & Provenance", icon: Fingerprint },
  { id: "analytics", label: "Facility Analytics", icon: BarChart3 },
];

function HisPage() {
  return (
    <RouteGuard route="/his">
      <HisContent />
    </RouteGuard>
  );
}

function HisContent() {
  const facility = useFacility();
  const [tab, setTab] = useState<TabId>("fhir");
  // One selected patient shared by the FHIR export and the audit trail.
  const [patient, setPatient] = useState<PatientRow | null>(null);

  const tabs =
    facility.id === "oncology" ? [TABS[0]!, TABS[2]!, TABS[1]!, TABS[3]!, TABS[4]!] : TABS;

  return (
    <AppShell
      title="HIS & Interoperability"
      subtitle={`${facility.shortName} · Standards-based data exchange, clinical coding, registries & audit`}
      actions={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B6ECC3] bg-[#E8F8EC] px-3.5 py-1 text-xs font-bold text-[#1D8A39]">
          <ShieldCheck className="size-3.5" /> HL7 FHIR R4 · ICD-10 · LOINC
        </span>
      }
    >
      <div className="space-y-6">
        <HisKpiStrip />

        <div
          role="tablist"
          aria-label="HIS sections"
          className="-mx-1 flex items-center gap-2 overflow-x-auto border-b border-black/5 px-1 pb-4"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all",
                tab === t.id
                  ? "bg-black text-white shadow-md"
                  : "border border-black/5 bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]",
              )}
            >
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "fhir" ? (
          <div className="space-y-6">
            <FhirExportPanel patient={patient} onPatientChange={setPatient} />
            <InteropReadiness />
          </div>
        ) : null}
        {tab === "quality" ? <DataQualityPanel /> : null}
        {tab === "registry" ? <CancerRegistryPanel /> : null}
        {tab === "audit" ? <AuditPanel patient={patient} onPatientChange={setPatient} /> : null}
        {tab === "analytics" ? <FacilityAnalyticsPanel /> : null}
      </div>
    </AppShell>
  );
}
