import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Database,
  FileJson2,
  FlaskConical,
  Stethoscope,
  Tags,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { fmtNumber } from "@/components/hip/his/his-format";
import { hisKpiQuery } from "@/lib/hip/his-queries";

function Tile({
  icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint: string;
  tone?: "default" | "ok" | "warn";
}) {
  const valueTone =
    tone === "ok" ? "text-[#1D8A39]" : tone === "warn" ? "text-[#B86200]" : "text-black";
  return (
    <div className="apple-card flex min-w-0 flex-col gap-2 p-4">
      <div className="flex items-center gap-2 text-[#86868B]">
        {icon}
        <span className="truncate text-[10px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <span className={`numeric text-2xl font-extrabold leading-none tracking-tight ${valueTone}`}>
        {value}
      </span>
      <span className="truncate text-[11px] font-semibold text-[#86868B]">{hint}</span>
    </div>
  );
}

export function HisKpiStrip() {
  const kpis = useQuery(hisKpiQuery);
  const k = kpis.data;
  const placeholder = kpis.isLoading ? "…" : kpis.error ? "—" : undefined;
  const v = (n: number | undefined) => placeholder ?? fmtNumber(n);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <Tile
        icon={<Users className="size-3.5" />}
        label="Patients on record"
        value={v(k?.patients)}
        hint="Master patient index"
      />
      <Tile
        icon={<Stethoscope className="size-3.5" />}
        label="Encounters · 30 d"
        value={v(k?.encounters30d)}
        hint="OPD, ED & inpatient"
      />
      <Tile
        icon={<Tags className="size-3.5" />}
        label="Coded diagnoses"
        value={placeholder ?? `${k?.codedPct ?? 0}%`}
        hint={
          k
            ? `${fmtNumber(k.codedConditions)} of ${fmtNumber(k.conditions)} ICD-10`
            : "ICD-10 coverage"
        }
        tone={k ? (k.codedPct >= 90 ? "ok" : "warn") : "default"}
      />
      <Tile
        icon={<FlaskConical className="size-3.5" />}
        label="Structured lab results"
        value={v(k?.structuredLabs)}
        hint="LOINC-coded analytes"
      />
      <Tile
        icon={<Activity className="size-3.5" />}
        label="Events · 24 h"
        value={v(k?.events24h)}
        hint="Append-only ledger"
      />
      <Tile
        icon={<FileJson2 className="size-3.5" />}
        label="FHIR-ready records"
        value={v(k?.fhirRecords)}
        hint="Mappable to R4 resources"
      />
      {kpis.error ? (
        <div className="col-span-full flex items-center gap-2 text-xs font-semibold text-[#D70015]">
          <Database className="size-3.5" /> KPI query failed: {(kpis.error as Error).message}
        </div>
      ) : null}
    </div>
  );
}
