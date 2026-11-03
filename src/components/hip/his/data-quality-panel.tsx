import { useQuery } from "@tanstack/react-query";
import { Tags } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { HIS_COLORS, axisProps, fmtNumber, tooltipStyle } from "@/components/hip/his/his-format";
import { EmptyState, QueryBody } from "@/components/hip/his/his-ui";
import { MetricRing } from "@/components/hip/metric-ring";
import { Panel } from "@/components/hip/panel";
import { dataQualityQuery, type QualityMetric } from "@/lib/hip/his-queries";

function barTone(pct: number) {
  if (pct >= 90) return HIS_COLORS.green;
  if (pct >= 70) return HIS_COLORS.orange;
  return HIS_COLORS.red;
}

function MetricBar({ metric }: { metric: QualityMetric }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-xs font-bold text-[#1D1D1F]">{metric.label}</span>
        <span className="numeric shrink-0 text-xs font-bold text-[#86868B]">
          <span className="text-[#1D1D1F]">{metric.denominator ? `${metric.pct}%` : "n/a"}</span> ·{" "}
          {fmtNumber(metric.numerator)}/{fmtNumber(metric.denominator)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#E8E8ED]">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{ width: `${metric.pct}%`, background: barTone(metric.pct) }}
        />
      </div>
    </div>
  );
}

export function DataQualityPanel() {
  const quality = useQuery(dataQualityQuery);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Panel
        title="Clinical data quality"
        subtitle="Completeness of the master patient index & clinical coding"
      >
        <QueryBody query={quality}>
          {(data) =>
            data.sampled.patients === 0 ? (
              <EmptyState
                title="No patients registered yet"
                hint="Data-quality scoring starts once patients are on record."
              />
            ) : (
              <div className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                <div className="flex flex-col items-center gap-2">
                  <MetricRing
                    value={data.score}
                    size={148}
                    thickness={12}
                    tone={data.score >= 90 ? "ok" : data.score >= 70 ? "warn" : "crit"}
                    label="Data-quality score"
                    caption={`Average of ${data.metrics.filter((m) => m.denominator > 0).length} indicators`}
                  />
                </div>
                <div className="min-w-0 space-y-3.5">
                  {data.metrics.map((m) => (
                    <MetricBar key={m.key} metric={m} />
                  ))}
                  <p className="pt-1 text-[11px] font-semibold text-[#86868B]">
                    Computed live over {fmtNumber(data.sampled.patients)} patients,{" "}
                    {fmtNumber(data.sampled.conditions)} diagnoses and{" "}
                    {fmtNumber(data.sampled.labs)} resulted lab orders. Green ≥ 90%, amber ≥ 70%.
                  </p>
                </div>
              </div>
            )
          }
        </QueryBody>
      </Panel>

      <Panel
        title="Top 10 ICD-10 diagnoses"
        subtitle="Coded problem-list entries across all patients"
      >
        <QueryBody query={quality}>
          {(data) =>
            data.topIcd10.length === 0 ? (
              <EmptyState
                icon={<Tags className="size-5 text-[#86868B]" />}
                title="No ICD-10 coded diagnoses yet"
                hint="Diagnoses entered with an ICD-10 code appear here."
              />
            ) : (
              <div style={{ height: Math.max(220, data.topIcd10.length * 34 + 40) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.topIcd10.map((d) => ({ ...d, label: d.code }))}
                    layout="vertical"
                    margin={{ top: 4, right: 24, bottom: 4, left: 4 }}
                  >
                    <CartesianGrid horizontal={false} stroke={HIS_COLORS.grid} />
                    <XAxis type="number" allowDecimals={false} {...axisProps} />
                    <YAxis type="category" dataKey="label" width={64} {...axisProps} />
                    <Tooltip
                      {...tooltipStyle}
                      formatter={(value) => [value, "Patients / entries"]}
                      labelFormatter={(label) => {
                        const row = data.topIcd10.find((d) => d.code === label);
                        return row ? `${row.code} · ${row.name}` : String(label);
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill={HIS_COLORS.blue}
                      radius={[0, 6, 6, 0]}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )
          }
        </QueryBody>
      </Panel>
    </div>
  );
}
