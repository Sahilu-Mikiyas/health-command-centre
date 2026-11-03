import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Download, Ribbon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  HIS_COLORS,
  SERIES,
  axisProps,
  fmtDate,
  tooltipStyle,
} from "@/components/hip/his/his-format";
import { EmptyState, ErrorState, LoadingState } from "@/components/hip/his/his-ui";
import { Panel } from "@/components/hip/panel";
import { Input } from "@/components/ui/input";
import {
  buildRegistry,
  downloadText,
  firstChemoQuery,
  median,
  registryCsv,
  type RegistryRow,
} from "@/lib/hip/his-queries";
import { MICROSCOPIC_BASIS } from "@/lib/hip/icdo3";
import { oncologyPatientsQuery } from "@/lib/hip/oncology";

const STAGE_ORDER: RegistryRow["stageGroup"][] = ["0", "I", "II", "III", "IV", "Unstaged"];
const STAGE_COLORS: Record<RegistryRow["stageGroup"], string> = {
  "0": HIS_COLORS.teal,
  I: HIS_COLORS.green,
  II: HIS_COLORS.blue,
  III: HIS_COLORS.orange,
  IV: HIS_COLORS.red,
  Unstaged: HIS_COLORS.slate,
};

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

export function CancerRegistryPanel() {
  const cases = useQuery(oncologyPatientsQuery);
  const firstChemo = useQuery(firstChemoQuery);
  const [search, setSearch] = useState("");

  const registry = useMemo(
    () => (cases.data ? buildRegistry(cases.data, firstChemo.data ?? {}) : []),
    [cases.data, firstChemo.data],
  );

  const stats = useMemo(() => {
    const bySite = new Map<string, number>();
    const byStage = new Map<RegistryRow["stageGroup"], number>();
    const byIntent = new Map<string, number>();
    for (const r of registry) {
      bySite.set(r.site, (bySite.get(r.site) ?? 0) + 1);
      byStage.set(r.stageGroup, (byStage.get(r.stageGroup) ?? 0) + 1);
      const intent = r.intent ? r.intent[0]!.toUpperCase() + r.intent.slice(1) : "Not recorded";
      byIntent.set(intent, (byIntent.get(intent) ?? 0) + 1);
    }
    const days = registry.map((r) => r.daysToTreatment).filter((d): d is number => d !== null);
    return {
      sites: [...bySite.entries()]
        .map(([site, count]) => ({ site, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      stages: STAGE_ORDER.map((stage) => ({ stage, count: byStage.get(stage) ?? 0 })).filter(
        (s) => s.count > 0 || s.stage !== "0",
      ),
      intents: [...byIntent.entries()].map(([intent, count]) => ({ intent, count })),
      staged: registry.filter((r) => r.stageGroup !== "Unstaged").length,
      treated: registry.filter((r) => r.firstTreatment).length,
      medianDays: median(days),
      daysN: days.length,
      morphCoded: registry.filter((r) => r.icdo3Morphology).length,
      basisKnown: registry.filter((r) => r.basis && r.basis !== "9").length,
      microscopic: registry.filter((r) => MICROSCOPIC_BASIS.has(r.basis)).length,
    };
  }, [registry]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return registry;
    return registry.filter((r) =>
      `${r.mrn} ${r.name} ${r.site} ${r.icd10} ${r.icdo3Topography} ${r.icdo3Morphology} ${r.histology} ${r.stage} ${r.regimen}`
        .toLowerCase()
        .includes(term),
    );
  }, [registry, search]);

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadText(
      `cancer-registry-${stamp}.csv`,
      `\uFEFF${registryCsv(registry)}`,
      "text/csv;charset=utf-8",
    );
  };

  if (cases.isLoading) {
    return (
      <Panel title="Cancer registry">
        <LoadingState label="Loading cancer registry…" />
      </Panel>
    );
  }
  if (cases.error) {
    return (
      <Panel title="Cancer registry">
        <ErrorState error={cases.error} />
      </Panel>
    );
  }
  if (registry.length === 0) {
    return (
      <Panel title="Cancer registry" subtitle="Hospital-based cancer registry (ICD-10 C00–D09)">
        <EmptyState
          icon={<Ribbon className="size-6 text-[#86868B]" />}
          title="No cancer cases registered yet"
          hint="Any patient with an ICD-10 C or D0 diagnosis is enrolled automatically. Stage them from the Oncology workspace to populate TNM, stage and intent."
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi
          label="Registered cases"
          value={registry.length.toLocaleString()}
          hint="ICD-10 C00–D09"
        />
        <Kpi
          label="Staged (TNM)"
          value={`${Math.round((stats.staged / registry.length) * 100)}%`}
          hint={`${stats.staged} of ${registry.length} with stage group`}
        />
        <Kpi
          label="Started systemic therapy"
          value={stats.treated.toLocaleString()}
          hint="≥ 1 chemotherapy order"
        />
        <Kpi
          label="Median diagnosis → chemo"
          value={stats.medianDays === null ? "—" : `${Math.round(stats.medianDays)} d`}
          hint={stats.daysN ? `n = ${stats.daysN} treated cases` : "No dated first cycles yet"}
        />
        <Kpi
          label="ICD-O-3 morphology"
          value={`${Math.round((stats.morphCoded / registry.length) * 100)}%`}
          hint={`${stats.morphCoded} of ${registry.length} coded or suggested`}
        />
        <Kpi
          label="Microscopically verified"
          value={
            stats.basisKnown ? `${Math.round((stats.microscopic / stats.basisKnown) * 100)}%` : "—"
          }
          hint={
            stats.basisKnown
              ? `MV% · ${stats.basisKnown} with basis recorded`
              : "Record basis of diagnosis when staging"
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Cases by primary site" subtitle="Top 10 sites" className="xl:col-span-1">
          <div style={{ height: Math.max(200, stats.sites.length * 30 + 40) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.sites}
                layout="vertical"
                margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
              >
                <CartesianGrid horizontal={false} stroke={HIS_COLORS.grid} />
                <XAxis type="number" allowDecimals={false} {...axisProps} />
                <YAxis type="category" dataKey="site" width={110} {...axisProps} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, "Cases"]} />
                <Bar dataKey="count" fill={HIS_COLORS.purple} radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Stage at diagnosis" subtitle="AJCC stage group">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.stages} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid vertical={false} stroke={HIS_COLORS.grid} />
                <XAxis dataKey="stage" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v) => [v, "Cases"]}
                  labelFormatter={(l) => `Stage ${l}`}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={36}>
                  {stats.stages.map((s) => (
                    <Cell key={s.stage} fill={STAGE_COLORS[s.stage]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Treatment intent" subtitle="From staging record">
          <div className="flex h-[240px] items-center gap-4">
            <div className="h-full min-w-0 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.intents}
                    dataKey="count"
                    nameKey="intent"
                    innerRadius="58%"
                    outerRadius="88%"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {stats.intents.map((entry, i) => (
                      <Cell
                        key={entry.intent}
                        fill={
                          entry.intent === "Not recorded"
                            ? HIS_COLORS.slate
                            : SERIES[i % SERIES.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="w-32 shrink-0 space-y-2">
              {stats.intents.map((entry, i) => (
                <li key={entry.intent} className="flex items-center gap-2 text-xs">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      background:
                        entry.intent === "Not recorded"
                          ? HIS_COLORS.slate
                          : SERIES[i % SERIES.length],
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate font-semibold text-[#1D1D1F]">
                    {entry.intent}
                  </span>
                  <span className="numeric font-bold text-[#86868B]">{entry.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <Panel
        title="Registry"
        subtitle={`${filtered.length} of ${registry.length} cases`}
        bodyClassName="p-0"
        action={
          <div className="flex items-center gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter…"
              className="hidden h-8 w-40 sm:block"
              aria-label="Filter registry"
            />
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-1.5 rounded-xl bg-black px-3 py-2 text-xs font-bold text-white hover:bg-[#1D1D1F]"
            >
              <Download className="size-3.5" /> Export registry CSV
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-xs">
            <thead>
              <tr className="border-b border-black/5 bg-[#FAFAFC] text-[10px] font-bold uppercase tracking-wider text-[#86868B]">
                <th className="px-4 py-2.5">Patient</th>
                <th className="px-3 py-2.5">Sex / age</th>
                <th className="px-3 py-2.5">Site · ICD-10</th>
                <th className="px-3 py-2.5">Histology · ICD-O-3</th>
                <th className="px-3 py-2.5">TNM · stage</th>
                <th className="px-3 py-2.5">Intent</th>
                <th className="px-3 py-2.5">Diagnosed</th>
                <th className="px-3 py-2.5">First chemo</th>
                <th className="px-4 py-2.5">Regimen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.patientId}
                  className="border-b border-black/5 last:border-b-0 hover:bg-[#F5F5F7]/60"
                >
                  <td className="px-4 py-3">
                    <Link
                      to="/patients/$patientId"
                      params={{ patientId: r.patientId }}
                      className="font-bold text-[#1D1D1F] hover:underline"
                    >
                      {r.name}
                    </Link>
                    <p className="numeric text-[11px] font-semibold text-[#86868B]">{r.mrn}</p>
                  </td>
                  <td className="px-3 py-3 font-semibold text-[#1D1D1F]">
                    {r.sex} · {r.age ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-[#1D1D1F]">{r.site}</p>
                    <p className="font-mono text-[11px] text-[#86868B]">{r.icd10 || "—"}</p>
                  </td>
                  <td className="max-w-48 px-3 py-3">
                    <p className="truncate text-[#1D1D1F]">{r.histology || "—"}</p>
                    <p
                      className="font-mono text-[11px] text-[#86868B]"
                      title={
                        r.icdo3Inferred
                          ? "Partly inferred from ICD-10 / histology text; confirm when restaging"
                          : r.basisLabel
                      }
                    >
                      {r.icdo3Topography || "—"} · {r.icdo3Morphology || "—"}
                      {r.icdo3Inferred ? "*" : ""}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="font-mono text-[11px] text-[#86868B]">{r.tnm || "—"}</span>{" "}
                    <span
                      className="ml-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black text-white"
                      style={{ background: STAGE_COLORS[r.stageGroup] }}
                    >
                      {r.stage ? `Stage ${r.stage}` : "Unstaged"}
                    </span>
                  </td>
                  <td className="px-3 py-3 capitalize text-[#1D1D1F]">{r.intent || "—"}</td>
                  <td className="numeric px-3 py-3 text-[#1D1D1F]">{fmtDate(r.diagnosisDate)}</td>
                  <td className="numeric px-3 py-3 text-[#1D1D1F]">
                    {fmtDate(r.firstTreatment)}
                    {r.daysToTreatment !== null ? (
                      <span className="ml-1 text-[11px] font-semibold text-[#86868B]">
                        +{r.daysToTreatment} d
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-48 truncate px-4 py-3 text-[#1D1D1F]">{r.regimen || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
