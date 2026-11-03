import { useQuery } from "@tanstack/react-query";
import { Timer } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  HIS_COLORS,
  axisProps,
  fmtMinutes,
  fmtNumber,
  tooltipStyle,
} from "@/components/hip/his/his-format";
import { EmptyState, QueryBody } from "@/components/hip/his/his-ui";
import { Panel } from "@/components/hip/panel";
import { facilityAnalyticsQuery } from "@/lib/hip/his-queries";

const CATEGORY_LABEL: Record<string, string> = {
  laboratory: "Laboratory",
  imaging: "Imaging",
  medication: "Medication",
  procedure: "Procedure",
};

const CATEGORY_COLOR: Record<string, string> = {
  laboratory: HIS_COLORS.green,
  imaging: HIS_COLORS.teal,
  medication: HIS_COLORS.orange,
  procedure: HIS_COLORS.purple,
};

export function FacilityAnalyticsPanel() {
  const analytics = useQuery(facilityAnalyticsQuery);

  return (
    <QueryBody query={analytics} loadingLabel="Computing facility analytics…">
      {(data) => {
        const totalEncounters = data.encountersByDay.reduce((s, d) => s + d.count, 0);
        return (
          <div className="grid gap-6 xl:grid-cols-3">
            <Panel
              title="Encounters per day"
              subtitle={`Last 14 days · ${fmtNumber(totalEncounters)} total · avg ${(totalEncounters / 14).toFixed(1)}/day`}
              className="xl:col-span-2"
            >
              {totalEncounters === 0 ? (
                <EmptyState title="No encounters in the last 14 days" />
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.encountersByDay}
                      margin={{ top: 8, right: 12, bottom: 0, left: -16 }}
                    >
                      <CartesianGrid vertical={false} stroke={HIS_COLORS.grid} />
                      <XAxis
                        dataKey="label"
                        {...axisProps}
                        interval="preserveStartEnd"
                        minTickGap={16}
                      />
                      <YAxis allowDecimals={false} {...axisProps} />
                      <Tooltip
                        {...tooltipStyle}
                        cursor={{ stroke: HIS_COLORS.grid }}
                        formatter={(v) => [v, "Encounters"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke={HIS_COLORS.blue}
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: HIS_COLORS.blue, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Results turnaround" subtitle="Median requested → verified">
              <div className="space-y-3">
                {data.tat.map((t) => (
                  <div
                    key={t.category}
                    className="flex items-center gap-4 rounded-2xl bg-[#F5F5F7] p-4"
                  >
                    <div
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-white"
                      style={{ background: CATEGORY_COLOR[t.category] }}
                    >
                      <Timer className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">
                        {CATEGORY_LABEL[t.category]}
                      </p>
                      <p className="numeric text-2xl font-extrabold leading-tight tracking-tight text-black">
                        {fmtMinutes(t.medianMinutes)}
                      </p>
                    </div>
                    <span className="numeric shrink-0 text-[11px] font-semibold text-[#86868B]">
                      n = {fmtNumber(t.n)}
                    </span>
                  </div>
                ))}
                <p className="text-[11px] font-semibold text-[#86868B]">
                  Based on the latest {fmtNumber(data.sampledOrders)} orders with a verification
                  timestamp.
                </p>
              </div>
            </Panel>

            <Panel
              title="Orders by category"
              subtitle={`Latest ${fmtNumber(data.sampledOrders)} orders`}
              className="xl:col-span-3"
            >
              {data.sampledOrders === 0 ? (
                <EmptyState title="No orders placed yet" />
              ) : (
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.ordersByCategory.map((d) => ({
                        ...d,
                        label: CATEGORY_LABEL[d.category],
                      }))}
                      margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
                    >
                      <CartesianGrid vertical={false} stroke={HIS_COLORS.grid} />
                      <XAxis dataKey="label" {...axisProps} />
                      <YAxis allowDecimals={false} {...axisProps} />
                      <Tooltip {...tooltipStyle} formatter={(v) => [v, "Orders"]} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={48}>
                        {data.ordersByCategory.map((d) => (
                          <Cell key={d.category} fill={CATEGORY_COLOR[d.category]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
          </div>
        );
      }}
    </QueryBody>
  );
}
