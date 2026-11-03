import { FlaskConical, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { analyteSeries, FLAG_LABEL, latestAnalyte, panelById, type ResultFlag } from "@/lib/hip/lab-panels";
import { regimenById, type OncologyChart } from "@/lib/hip/oncology";
import { cn } from "@/lib/utils";

import { Chip, EmptyState, fmtDate, relativeDays, SectionCard } from "./shared";

const LINE_COLOR = "#0071E3";
const ULN_COLOR = "#D70015";
const DAY = 86_400_000;

const FLAG_TONE: Record<ResultFlag, "ok" | "warn" | "crit"> = {
  N: "ok",
  L: "warn",
  H: "warn",
  LL: "crit",
  HH: "crit",
};

const shortDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { day: "2-digit", month: "short" });

type MarkerSeries = {
  code: string;
  label: string;
  unit: string;
  uln: number | undefined;
  points: { t: number; value: number }[];
};

function MarkerChart({ series, cycles }: { series: MarkerSeries; cycles: { t: number; label: string }[] }) {
  const { points, uln } = series;
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const minT = first.t === last.t ? first.t - 7 * DAY : first.t;
  const maxT = first.t === last.t ? last.t + 7 * DAY : last.t;
  const pad = (maxT - minT) * 0.04;
  const maxV = Math.max(...points.map((p) => p.value), uln ?? 0);
  const change = points.length > 1 && first.value > 0 ? ((last.value - first.value) / first.value) * 100 : null;
  const aboveUln = uln !== undefined && last.value > uln;
  const visibleCycles = cycles.filter((c) => c.t >= minT - pad && c.t <= maxT + pad);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-3">
      <div className="mb-1 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black text-black">{series.label}</p>
          <p className="text-[10px] font-semibold text-[#86868B]">
            {series.unit}
            {uln !== undefined ? ` · ULN ${uln}` : ""} · {points.length} result{points.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="text-right">
          <p className={cn("numeric text-lg font-extrabold leading-none", aboveUln ? "text-[#D70015]" : "text-black")}>
            {last.value}
          </p>
          {change !== null ? (
            <p className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-[#86868B]">
              {change < 0 ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
              {change > 0 ? "+" : ""}
              {Math.round(change)}% since {shortDate(first.t)}
            </p>
          ) : null}
        </div>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#000" strokeOpacity={0.05} vertical={false} />
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={[minT - pad, maxT + pad]}
              tickFormatter={shortDate}
              tick={{ fontSize: 10, fill: "#86868B" }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis
              domain={[0, Math.ceil(maxV * 1.15) || 1]}
              tick={{ fontSize: 10, fill: "#86868B" }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            {visibleCycles.map((c) => (
              <ReferenceLine key={`${c.label}-${c.t}`} x={c.t} stroke="#86868B" strokeOpacity={0.35} strokeDasharray="2 3" />
            ))}
            {uln !== undefined ? (
              <ReferenceLine
                y={uln}
                stroke={ULN_COLOR}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{ value: "ULN", position: "insideTopRight", fontSize: 9, fill: ULN_COLOR }}
              />
            ) : null}
            <Tooltip
              cursor={{ stroke: "#000", strokeOpacity: 0.15 }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as { t: number; value: number } | undefined;
                if (!active || !p) return null;
                return (
                  <div className="rounded-xl border border-black/10 bg-white px-2.5 py-1.5 text-[11px] shadow-lg">
                    <p className="font-semibold text-[#86868B]">{fmtDate(new Date(p.t).toISOString())}</p>
                    <p className="numeric font-extrabold text-black">
                      {series.label} {p.value} {series.unit}
                      {uln !== undefined && p.value > uln ? (
                        <span className="ml-1 text-[#D70015]">↑ above ULN</span>
                      ) : null}
                    </p>
                  </div>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={LINE_COLOR}
              strokeWidth={2}
              dot={{ r: 4, fill: LINE_COLOR, stroke: "#fff", strokeWidth: 2 }}
              activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const LATEST_GROUPS: { panel: string; title: string; codes: string[] }[] = [
  { panel: "cbc", title: "Full blood count", codes: ["WBC", "ANC", "HGB", "PLT"] },
  { panel: "lft", title: "Liver function", codes: ["TBIL", "ALT", "AST", "ALP", "ALB"] },
  { panel: "rft", title: "Renal function", codes: ["CREA", "UREA", "EGFR"] },
];

export function LabsTab({ chart }: { chart: OncologyChart }) {
  const markerSeries = useMemo<MarkerSeries[]>(() => {
    const panel = panelById("tumour_markers");
    if (!panel) return [];
    return panel.analytes
      .map((a) => ({
        code: a.code,
        label: a.label,
        unit: a.unit,
        uln: a.high,
        points: analyteSeries(chart.orders, a.code).map((p) => ({ t: new Date(p.at).getTime(), value: p.value })),
      }))
      .filter((s) => s.points.length > 0);
  }, [chart.orders]);

  const cycles = useMemo(
    () =>
      chart.cyclesGiven.map((c) => ({
        t: new Date(c.at).getTime(),
        label: `${regimenById(c.regimenId)?.id ?? c.regimenId} C${c.cycle}`,
      })),
    [chart.cyclesGiven],
  );

  const latest = useMemo(
    () =>
      LATEST_GROUPS.map((g) => {
        const panel = panelById(g.panel);
        return {
          ...g,
          rows: g.codes.map((code) => ({
            code,
            def: panel?.analytes.find((a) => a.code === code),
            value: latestAnalyte(chart.orders, code),
          })),
        };
      }),
    [chart.orders],
  );
  const anyLatest = latest.some((g) => g.rows.some((r) => r.value));

  return (
    <div className="space-y-4">
      <SectionCard
        title="Tumour-marker trends"
        icon={<TrendingDown className="size-3.5" />}
        action={
          cycles.length ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#86868B]">
              <span className="h-3 w-px border-l border-dashed border-[#86868B]" /> chemo cycle
              <span className="ml-2 h-px w-3 border-t border-dashed border-[#D70015]" /> ULN
            </span>
          ) : null
        }
      >
        {markerSeries.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {markerSeries.map((s) => (
              <MarkerChart key={s.code} series={s} cycles={cycles} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FlaskConical className="size-5" />}
            title="No tumour-marker results"
            detail="CEA, CA-125, CA 15-3, PSA and AFP trends appear once tumour-marker panels are resulted in the Laboratory."
          />
        )}
      </SectionCard>

      <SectionCard title="Latest haematology & chemistry" icon={<FlaskConical className="size-3.5" />}>
        {anyLatest ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {latest.map((g) => (
              <div key={g.panel} className="min-w-0">
                <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">{g.title}</p>
                <table className="w-full text-xs">
                  <tbody>
                    {g.rows.map(({ code, def, value }) => (
                      <tr key={code} className="border-b border-black/5 last:border-0">
                        <td className="py-2 pr-2">
                          <p className="font-bold text-black">{def?.label ?? code}</p>
                          <p className="text-[10px] font-medium text-[#86868B]">
                            {value?.ref ? `Ref ${value.ref}` : ""}
                            {value?.at ? ` · ${relativeDays(value.at)}` : ""}
                          </p>
                        </td>
                        <td className="py-2 text-right">
                          {value ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span
                                className={cn(
                                  "numeric font-extrabold",
                                  value.flag === "LL" || value.flag === "HH"
                                    ? "text-[#D70015]"
                                    : value.flag === "N"
                                      ? "text-black"
                                      : "text-[#B86200]",
                                )}
                              >
                                {value.value} <span className="text-[10px] font-semibold text-[#86868B]">{value.unit}</span>
                              </span>
                              {value.flag !== "N" ? (
                                <Chip tone={FLAG_TONE[value.flag]}>{FLAG_LABEL[value.flag]}</Chip>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-[#86868B]">Not on file</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No resulted CBC, LFT or RFT"
            detail="Order baseline bloods before the first cycle — the safety gate reads these values."
          />
        )}
      </SectionCard>
    </div>
  );
}
