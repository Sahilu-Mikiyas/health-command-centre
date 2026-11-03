import { useQuery } from "@tanstack/react-query";
import { Download, FileJson2, Landmark } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { fmtNumber } from "@/components/hip/his/his-format";
import { EmptyState, QueryBody, SectionIntro } from "@/components/hip/his/his-ui";
import { Panel } from "@/components/hip/panel";
import { supabase } from "@/integrations/supabase/client";
import {
  DATA_ELEMENTS,
  dhis2ReportQuery,
  periodRange,
  recentPeriods,
  toDataValueCsv,
  toDataValueSetJson,
  type Dhis2Report,
} from "@/lib/hip/dhis2";
import { downloadText } from "@/lib/hip/his-queries";

const ORG_UNIT_KEY = "furii_dhis2_org_unit";

function readOrgUnit(): string {
  try {
    return window.localStorage.getItem(ORG_UNIT_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveOrgUnit(value: string) {
  try {
    window.localStorage.setItem(ORG_UNIT_KEY, value);
  } catch {
    /* storage unavailable — value lasts for this visit only */
  }
}

const hospitalCodeQuery = {
  queryKey: ["his", "hospital-code"],
  queryFn: async (): Promise<string> => {
    const { data } = await supabase.from("hospitals").select("code").limit(1).maybeSingle();
    return data?.code ?? "";
  },
  staleTime: Infinity,
};

const GROUPS = ["Service utilisation", "Diagnostics", "Inpatient", "Oncology"] as const;

export function Dhis2Panel() {
  const periods = useMemo(() => recentPeriods(12), []);
  const [period, setPeriod] = useState(periods[0]!);
  const [orgUnit, setOrgUnit] = useState("");
  const hospitalCode = useQuery(hospitalCodeQuery);

  useEffect(() => {
    setOrgUnit((current) => current || readOrgUnit());
  }, []);
  useEffect(() => {
    if (hospitalCode.data) setOrgUnit((current) => current || hospitalCode.data);
  }, [hospitalCode.data]);

  const effectiveOrgUnit = orgUnit.trim() || "FACILITY";
  const report = useQuery(dhis2ReportQuery(period, effectiveOrgUnit));

  return (
    <div className="space-y-6">
      <SectionIntro icon={<Landmark className="size-4" />} title="DHIS2 monthly reporting">
        The monthly HMIS report is generated from the coded clinical record, so nobody has to count
        by hand. Choose the month, check the figures, then download a file that imports into DHIS2
        through the Import/Export app. Codes are used for data elements, disaggregations and the
        facility, and are mapped to the national HMIS codes once at go-live.
      </SectionIntro>

      <Panel
        title="Report settings"
        subtitle="Reporting month and DHIS2 organisation unit"
        bodyClassName="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
      >
        <label className="space-y-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
            Period (monthly)
          </span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
          >
            {periods.map((p) => (
              <option key={p} value={p}>
                {periodRange(p).label} ({p}){p === periods[0] ? " · month to date" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
            Org unit code
          </span>
          <input
            value={orgUnit}
            onChange={(e) => {
              setOrgUnit(e.target.value);
              saveOrgUnit(e.target.value);
            }}
            placeholder="Facility code in DHIS2"
            className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 font-mono text-xs font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
          />
        </label>
        <DownloadButtons report={report.data} />
      </Panel>

      <QueryBody query={report} loadingLabel="Compiling monthly report…">
        {(data) => <ReportBody report={data} />}
      </QueryBody>
    </div>
  );
}

function DownloadButtons({ report }: { report: Dhis2Report | undefined }) {
  const disabled = !report || report.dataValues.length === 0;
  const base = report ? `dhis2-${report.orgUnit}-${report.period}` : "dhis2";
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          report && downloadText(`${base}.json`, toDataValueSetJson(report), "application/json")
        }
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-black px-3 py-2.5 text-xs font-bold text-white hover:bg-[#1D1D1F] disabled:cursor-default disabled:opacity-40"
      >
        <FileJson2 className="size-3.5" /> dataValueSet JSON
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          report && downloadText(`${base}.csv`, toDataValueCsv(report), "text/csv;charset=utf-8")
        }
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs font-bold text-black hover:bg-[#F5F5F7] disabled:cursor-default disabled:opacity-40"
      >
        <Download className="size-3.5" /> CSV
      </button>
    </div>
  );
}

function ReportBody({ report }: { report: Dhis2Report }) {
  if (report.dataValues.length === 0) {
    return (
      <EmptyState
        title={`No activity recorded for ${report.periodLabel}`}
        hint="Pick another month. Figures appear as soon as encounters, orders or diagnoses exist for the period."
      />
    );
  }
  const disaggregated = new Set(DATA_ELEMENTS.filter((d) => d.disaggregated).map((d) => d.code));
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Panel
        title={`${report.periodLabel} · aggregate indicators`}
        subtitle={`${report.dataValues.length} data values for org unit ${report.orgUnit}`}
        bodyClassName="p-0"
      >
        <table className="w-full text-left text-xs">
          <tbody>
            {GROUPS.map((group) => (
              <GroupRows
                key={group}
                group={group}
                rows={report.totals.filter((t) => t.group === group)}
                disaggregated={disaggregated}
              />
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel
        title="Morbidity (ICD-10 categories)"
        subtitle={`${report.morbidity.length} diagnosis categories recorded this month`}
        bodyClassName="p-0"
      >
        {report.morbidity.length === 0 ? (
          <div className="p-6">
            <EmptyState title="No coded diagnoses this month" />
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-black/5 bg-[#FAFAFC] text-[10px] font-bold uppercase tracking-wider text-[#86868B]">
                <th className="px-4 py-2.5">ICD-10</th>
                <th className="px-3 py-2.5">Diagnosis</th>
                <th className="px-4 py-2.5 text-right">Cases</th>
              </tr>
            </thead>
            <tbody>
              {report.morbidity.slice(0, 15).map((m) => (
                <tr key={m.icd10} className="border-b border-black/5 last:border-b-0">
                  <td className="px-4 py-2.5 font-mono font-bold text-[#1D1D1F]">{m.icd10}</td>
                  <td className="max-w-56 truncate px-3 py-2.5 text-[#1D1D1F]">{m.name}</td>
                  <td className="numeric px-4 py-2.5 text-right font-bold">{fmtNumber(m.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </div>
  );
}

function GroupRows({
  group,
  rows,
  disaggregated,
}: {
  group: string;
  rows: Dhis2Report["totals"];
  disaggregated: Set<string>;
}) {
  return (
    <>
      <tr className="border-b border-black/5 bg-[#FAFAFC]">
        <th
          colSpan={2}
          className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-[#86868B]"
        >
          {group}
        </th>
      </tr>
      {rows.map((r) => (
        <tr key={r.code} className="border-b border-black/5 last:border-b-0">
          <td className="px-4 py-2.5">
            <p className="font-semibold text-[#1D1D1F]">{r.name}</p>
            <p className="font-mono text-[10px] text-[#86868B]">
              {r.code}
              {disaggregated.has(r.code) ? " · by sex & age" : ""}
            </p>
          </td>
          <td className="numeric px-4 py-2.5 text-right text-sm font-extrabold text-black">
            {fmtNumber(r.value)}
          </td>
        </tr>
      ))}
    </>
  );
}
