import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Fingerprint, UserCheck } from "lucide-react";
import { useMemo, useState } from "react";

import { fmtDate, fmtNumber } from "@/components/hip/his/his-format";
import { EmptyState, QueryBody, SectionIntro } from "@/components/hip/his/his-ui";
import { Panel } from "@/components/hip/panel";
import {
  mpiQuery,
  type DuplicatePair,
  type IdentityRecord,
  type MatchLevel,
  type MpiSummary,
} from "@/lib/hip/mpi";
import { cn } from "@/lib/utils";

const LEVEL_STYLE: Record<MatchLevel, string> = {
  definite: "bg-[#FDE8E7] text-[#D70015]",
  probable: "bg-[#FFF5E6] text-[#B86200]",
  possible: "bg-[#F5F5F7] text-[#515154]",
};

function pct(n: number, d: number) {
  return d ? Math.round((n / d) * 100) : 0;
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-[#F5F5F7] p-4">
      <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[#86868B]">
        {label}
      </p>
      <p className="numeric mt-1 text-2xl font-extrabold leading-none tracking-tight text-black">
        {value}
      </p>
      <p className="mt-1 truncate text-[11px] font-semibold text-[#86868B]">{hint}</p>
    </div>
  );
}

function RecordCell({ r }: { r: IdentityRecord }) {
  return (
    <div className="min-w-0">
      <Link
        to="/patients/$patientId"
        params={{ patientId: r.id }}
        className="font-bold text-[#1D1D1F] hover:underline"
      >
        {r.name}
      </Link>
      <p className="numeric text-[11px] font-semibold text-[#86868B]">
        {r.mrn} · DOB {fmtDate(r.dateOfBirth)}
        {r.nationalId ? ` · ID ${r.nationalId}` : ""}
      </p>
    </div>
  );
}

export function IdentityPanel() {
  const mpi = useQuery(mpiQuery);
  const [filter, setFilter] = useState<MatchLevel | "all">("all");

  return (
    <div className="space-y-6">
      <SectionIntro icon={<Fingerprint className="size-4" />} title="Master Patient Index">
        One person, one record. Every registration is checked against existing patients by national
        ID (Fayda), phone number, date of birth and name similarity, tuned for Ethiopian naming
        (given · father · grandfather) and spelling variants. Each suspected duplicate shows the
        evidence so records staff can review it. Records are never merged automatically.
      </SectionIntro>

      <QueryBody query={mpi} loadingLabel="Checking patient identities…">
        {(data) => <IdentityBody data={data} filter={filter} setFilter={setFilter} />}
      </QueryBody>
    </div>
  );
}

function IdentityBody({
  data,
  filter,
  setFilter,
}: {
  data: MpiSummary;
  filter: MatchLevel | "all";
  setFilter: (f: MatchLevel | "all") => void;
}) {
  const counts = useMemo(() => {
    const c: Record<MatchLevel, number> = { definite: 0, probable: 0, possible: 0 };
    for (const p of data.pairs) c[p.level]++;
    return c;
  }, [data.pairs]);
  const shown: DuplicatePair[] =
    filter === "all" ? data.pairs : data.pairs.filter((p) => p.level === filter);
  const duplicateRate = pct(counts.definite + counts.probable, data.patients);

  if (data.patients === 0) {
    return (
      <EmptyState
        title="No patients registered yet"
        hint="Identity checks start once patients are on record."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Patients indexed"
          value={fmtNumber(data.patients)}
          hint={data.truncated ? "First 5,000 checked" : "All registered patients"}
        />
        <Kpi
          label="National ID recorded"
          value={`${pct(data.withNationalId, data.patients)}%`}
          hint={`${fmtNumber(data.withNationalId)} with Fayda / passport no.`}
        />
        <Kpi
          label="Reachable by phone"
          value={`${pct(data.withPhone, data.patients)}%`}
          hint={`${fmtNumber(data.withPhone)} with a valid number`}
        />
        <Kpi
          label="Suspected duplicates"
          value={fmtNumber(counts.definite + counts.probable)}
          hint={`${duplicateRate}% of records · ${counts.possible} possible`}
        />
      </div>

      <Panel
        title="Duplicate review queue"
        subtitle={`${shown.length} candidate pair${shown.length === 1 ? "" : "s"}`}
        bodyClassName="p-0"
        action={
          <div className="flex flex-wrap gap-1.5">
            {(["all", "definite", "probable", "possible"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  "cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold capitalize",
                  filter === f
                    ? "bg-black text-white"
                    : "border border-black/10 bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]",
                )}
              >
                {f}
                {f !== "all" ? ` · ${counts[f]}` : ""}
              </button>
            ))}
          </div>
        }
      >
        {shown.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={<UserCheck className="size-6 text-[#1D8A39]" />}
              title="No suspected duplicates"
              hint="Every patient appears to have exactly one record."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead>
                <tr className="border-b border-black/5 bg-[#FAFAFC] text-[10px] font-bold uppercase tracking-wider text-[#86868B]">
                  <th className="px-4 py-2.5">Match</th>
                  <th className="px-3 py-2.5">Record A</th>
                  <th className="px-3 py-2.5">Record B</th>
                  <th className="px-4 py-2.5">Evidence</th>
                </tr>
              </thead>
              <tbody>
                {shown.slice(0, 200).map((p) => (
                  <tr
                    key={`${p.a.id}-${p.b.id}`}
                    className="border-b border-black/5 align-top last:border-b-0 hover:bg-[#F5F5F7]/60"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase",
                          LEVEL_STYLE[p.level],
                        )}
                      >
                        {p.level}
                      </span>
                      <p className="numeric mt-1 text-[11px] font-semibold text-[#86868B]">
                        score {p.score}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <RecordCell r={p.a} />
                    </td>
                    <td className="px-3 py-3">
                      <RecordCell r={p.b} />
                    </td>
                    <td className="px-4 py-3 text-[11px] font-semibold text-[#1D1D1F]">
                      {p.reasons.join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
