import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/hip/app-shell";
import { Panel } from "@/components/hip/panel";
import { Input } from "@/components/ui/input";
import { patientsQuery } from "@/lib/hip/queries";

function age(dob: string) {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
}

export const Route = createFileRoute("/_authenticated/patients/")({
  head: () => ({
    meta: [
      { title: "Patient Index | Meridian HIP" },
      {
        name: "description",
        content:
          "Search the hospital patient index by name or medical record number and open a longitudinal patient record.",
      },
      { property: "og:title", content: "Patient Index | Meridian HIP" },
      {
        property: "og:description",
        content: "Search patients by name or MRN and open the longitudinal record.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PatientsPage,
});

function PatientsPage() {
  const [search, setSearch] = useState("");
  const patients = useQuery(patientsQuery(search));

  return (
    <AppShell title="Patient Index" subtitle="One record per human, across every department">
      <Panel
        title="Patients"
        subtitle={`${patients.data?.length ?? 0} shown`}
        action={
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or MRN"
            className="h-8 w-48"
          />
        }
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {(patients.data ?? []).map((patient) => (
            <Link
              key={patient.id}
              to="/patients/$patientId"
              params={{ patientId: patient.id }}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-raised"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{patient.full_name}</p>
                <p className="numeric truncate text-xs text-muted-foreground">
                  {patient.mrn} · {age(patient.date_of_birth)}y · {patient.sex}
                </p>
              </div>
              <div className="hidden text-right text-xs text-muted-foreground sm:block">
                <p>{patient.blood_group ?? "—"}</p>
                <p>{patient.insurance_provider ?? "Self-pay"}</p>
              </div>
            </Link>
          ))}
          {patients.data?.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No patients matched.</p>
          ) : null}
        </div>
      </Panel>
    </AppShell>
  );
}
