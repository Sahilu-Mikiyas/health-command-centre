import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/hip/app-shell";
import { KpiStrip } from "@/components/hip/oncology/kpi-strip";
import { PatientChart, type ChartTab } from "@/components/hip/oncology/patient-chart";
import { PatientList } from "@/components/hip/oncology/patient-list";
import { RouteGuard } from "@/components/hip/route-guard";
import { oncologyPatientsQuery } from "@/lib/hip/oncology";

export const Route = createFileRoute("/_authenticated/oncology")({
  head: () => ({
    meta: [
      { title: "Oncology Workspace | Furii Cancer Care Centre" },
      {
        name: "description",
        content:
          "Cancer registry, TNM staging, BSA-based chemotherapy planning with pre-chemo safety gate, tumour-marker trends and multidisciplinary tumour board.",
      },
    ],
  }),
  component: OncologyPage,
});

function OncologyPage() {
  return (
    <RouteGuard route="/oncology">
      <OncologyWorkspace />
    </RouteGuard>
  );
}

function OncologyWorkspace() {
  const { data: rows = [], isLoading, error } = useQuery(oncologyPatientsQuery);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<ChartTab>("summary");
  const chartRef = useRef<HTMLDivElement>(null);

  // Open the first registry patient by default so the workspace is never blank.
  useEffect(() => {
    if (!selectedId && rows[0]) setSelectedId(rows[0].patient.id);
  }, [rows, selectedId]);

  const reveal = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      requestAnimationFrame(() =>
        chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    }
  };

  const select = (id: string) => {
    if (id !== selectedId) setTab("summary");
    setSelectedId(id);
    reveal();
  };

  const addPatient = (id: string) => {
    setSelectedId(id);
    setTab("staging");
    reveal();
  };

  return (
    <AppShell
      title="Oncology Workspace"
      subtitle="Cancer registry · TNM staging · Chemotherapy planning & safety gate · Tumour markers · MDT tumour board"
      actions={
        <span className="hidden items-center gap-1.5 rounded-full border border-[#B6ECC3] bg-[#E8F8EC] px-3.5 py-1 text-xs font-bold text-[#1D8A39] sm:inline-flex">
          <ShieldCheck className="size-3.5" /> Pre-chemo safety gate active
        </span>
      }
    >
      <div className="space-y-6">
        <KpiStrip rows={rows} loading={isLoading} />

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
          <div className="lg:sticky lg:top-4">
            <PatientList
              rows={rows}
              isLoading={isLoading}
              error={error}
              selectedId={selectedId}
              onSelect={select}
              onAddPatient={addPatient}
            />
          </div>
          <div ref={chartRef} className="min-w-0 scroll-mt-4">
            <PatientChart patientId={selectedId} tab={tab} onTabChange={setTab} />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
