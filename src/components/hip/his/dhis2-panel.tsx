import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, FileJson2, Landmark, Loader2, Send, XCircle } from "lucide-react";
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
  toDataValueSet,
  toDataValueSetJson,
  type Dhis2Report,
} from "@/lib/hip/dhis2";
import { dhis2Status, pushDhis2Report } from "@/lib/hip/dhis2.functions";
import type { Dhis2PushResult } from "@/lib/hip/dhis2.server";
import { formatEthiopianMonth } from "@/lib/hip/ethiopian-calendar";
import { downloadText } from "@/lib/hip/his-queries";
import { emitEvent } from "@/lib/hip/mutations";
import { myProfileQuery } from "@/lib/hip/queries";

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
                {periodRange(p).label} · {ethiopianSpan(p)}
                {p === periods[0] ? " · month to date" : ""}
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
        {(data) => (
          <div className="space-y-6">
            <SubmitPanel report={data} />
            <ReportBody report={data} />
          </div>
        )}
      </QueryBody>
    </div>
  );
}

/** "Tikimt–Hidar 2019 EC": a Gregorian month spans two Ethiopian months. */
function ethiopianSpan(period: string): string {
  const { start, end } = periodRange(period);
  const first = formatEthiopianMonth(new Date(start));
  const last = formatEthiopianMonth(new Date(new Date(end).getTime() - 86_400_000));
  const [m1, y1] = [first.split(" ")[0], first.split(" ")[1]];
  return y1 === last.split(" ")[1] ? `${m1}–${last}` : `${first} – ${last}`;
}

const SUBMIT_ROLES = ["super_admin", "ceo", "medical_director"];

function SubmitPanel({ report }: { report: Dhis2Report }) {
  const me = useQuery(myProfileQuery);
  const status = useQuery({
    queryKey: ["his", "dhis2-status"],
    queryFn: () => dhis2Status(),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const [result, setResult] = useState<Dhis2PushResult | null>(null);
  const canSubmit = (me.data?.baseRoles ?? []).some((r) => SUBMIT_ROLES.includes(r));
  const push = useMutation({
    mutationFn: async (dryRun: boolean) => {
      const res = await pushDhis2Report({ data: { payload: toDataValueSet(report), dryRun } });
      if (res.ok && !dryRun) {
        await emitEvent({
          eventType: "dhis2.report_submitted",
          departmentCode: "HIS",
          payload: {
            period: report.period,
            org_unit: report.orgUnit,
            values: report.dataValues.length,
            imported: res.imported,
            updated: res.updated,
          },
        }).catch(() => undefined);
      }
      return res;
    },
    onSuccess: setResult,
    onError: (err: Error) =>
      setResult({
        ok: false,
        dryRun: true,
        status: "ERROR",
        imported: 0,
        updated: 0,
        ignored: 0,
        conflicts: [],
        message: err.message,
      }),
  });
  const configured = status.data?.configured ?? false;
  const disabled = !configured || !canSubmit || push.isPending || report.dataValues.length === 0;

  return (
    <Panel
      title="Send to DHIS2"
      subtitle={
        status.isLoading
          ? "Checking DHIS2 connection…"
          : configured
            ? `Connected to ${status.data?.host}`
            : "No DHIS2 server configured yet: download the file above instead"
      }
      bodyClassName="space-y-3"
    >
      <p className="text-xs leading-relaxed text-[#86868B]">
        Run a <strong className="text-black">dry run</strong> first: DHIS2 checks every code and
        value without saving anything. Then submit. Only the Super Admin, CEO or Medical Director
        can submit, and every submission is recorded in the event ledger.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => push.mutate(true)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs font-bold text-black hover:bg-[#F5F5F7] disabled:cursor-default disabled:opacity-40"
        >
          {push.isPending && push.variables === true ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-3.5" />
          )}
          Dry run
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (window.confirm(`Submit ${report.periodLabel} to DHIS2 for ${report.orgUnit}?`)) {
              push.mutate(false);
            }
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-black px-3 py-2.5 text-xs font-bold text-white hover:bg-[#1D1D1F] disabled:cursor-default disabled:opacity-40"
        >
          {push.isPending && push.variables === false ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
          Submit report
        </button>
      </div>
      {!canSubmit && me.data ? (
        <p className="text-[11px] font-semibold text-[#86868B]">
          Your role can view and download the report; submission is for leadership.
        </p>
      ) : null}
      {result ? (
        <div
          role="status"
          className={
            result.ok
              ? "rounded-2xl border border-[#B6ECC3] bg-[#E8F8EC] p-3 text-xs text-[#1D8A39]"
              : "rounded-2xl border border-[#F9BDBD] bg-[#FDE8E7] p-3 text-xs text-[#D70015]"
          }
        >
          <p className="flex items-center gap-1.5 font-bold">
            {result.ok ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
            {result.dryRun ? "Dry run: " : ""}
            {result.message}
          </p>
          {result.ok ? (
            <p className="mt-1 font-semibold">
              {result.imported} imported · {result.updated} updated · {result.ignored} ignored
            </p>
          ) : null}
          {result.conflicts.length ? (
            <ul className="mt-1 list-disc pl-4">
              {result.conflicts.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Panel>
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
