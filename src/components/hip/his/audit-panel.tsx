import { useQuery } from "@tanstack/react-query";
import { Fingerprint, History, Lock, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { HIS_COLORS, axisProps, fmtNumber, tooltipStyle } from "@/components/hip/his/his-format";
import { EmptyState, PatientPicker, QueryBody, SectionIntro } from "@/components/hip/his/his-ui";
import { Panel } from "@/components/hip/panel";
import { StatusDot } from "@/components/hip/status-pill";
import { Timeline } from "@/components/hip/timeline";
import {
  eventTypeCountsQuery,
  patientTrailQuery,
  provenanceSummaryQuery,
  viewersFrom,
  type TrailItem,
} from "@/lib/hip/his-queries";
import { recentEventsQuery, type PatientRow } from "@/lib/hip/queries";
import { cn } from "@/lib/utils";

const SEVERITIES = ["all", "info", "warning", "critical"] as const;
type Severity = (typeof SEVERITIES)[number];

const SOURCE_STYLE: Record<TrailItem["source"], string> = {
  event: "badge-info",
  audit: "badge-ai",
  provenance: "badge-ok",
};

function stamp(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AuditPanel({
  patient,
  onPatientChange,
}: {
  patient: PatientRow | null;
  onPatientChange: (patient: PatientRow | null) => void;
}) {
  const [severity, setSeverity] = useState<Severity>("all");
  const events = useQuery({ ...recentEventsQuery(120), refetchInterval: 10_000 });
  const typeCounts = useQuery(eventTypeCountsQuery);
  const provenance = useQuery(provenanceSummaryQuery);
  const trail = useQuery(patientTrailQuery(patient?.id ?? ""));

  const feed = useMemo(
    () => (events.data ?? []).filter((e) => severity === "all" || e.severity === severity),
    [events.data, severity],
  );

  return (
    <div className="space-y-6">
      <SectionIntro icon={<Lock className="size-4" />} title="Append-only event ledger">
        Every clinical and operational action — registration, orders, results, dispensing, billing —
        is written once to the <span className="font-semibold text-[#1D1D1F]">events</span> ledger
        with actor, department, entity and timestamp. Staff accounts are granted only SELECT and
        INSERT, and a database trigger rejects any UPDATE or DELETE — so the history cannot be
        silently rewritten. Field-level{" "}
        <span className="font-semibold text-[#1D1D1F]">data provenance</span> records where each
        value came from and whether it was verified.
      </SectionIntro>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel
          title="Live event feed"
          subtitle={`${feed.length} events · refreshes every 10 s`}
          action={
            <div className="flex flex-wrap items-center gap-1.5">
              {SEVERITIES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSeverity(option)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                    option === severity
                      ? "border-black bg-black text-white"
                      : "border-black/10 text-[#86868B] hover:text-black",
                  )}
                >
                  {option}
                </button>
              ))}
              {events.isFetching ? (
                <RefreshCw className="ml-1 size-3.5 animate-spin text-[#86868B]" />
              ) : null}
            </div>
          }
          bodyClassName="max-h-[520px] overflow-y-auto"
        >
          <QueryBody query={events} loadingLabel="Connecting to event ledger…">
            {() =>
              feed.length === 0 ? (
                <EmptyState title="No events for this filter" hint="Try another severity level." />
              ) : (
                <Timeline
                  items={feed.map((event) => ({
                    id: event.id,
                    time: stamp(event.occurred_at),
                    title: event.event_type.replace(/[._]/g, " "),
                    detail: [event.department_code, event.actor_label, event.entity_type]
                      .filter(Boolean)
                      .join(" · "),
                    tone:
                      event.severity === "critical"
                        ? "crit"
                        : event.severity === "warning"
                          ? "warn"
                          : "default",
                  }))}
                />
              )
            }
          </QueryBody>
        </Panel>

        <div className="space-y-6">
          <Panel title="Activity by event type" subtitle="Top 8 across the latest 1,000 events">
            <QueryBody query={typeCounts}>
              {(data) =>
                data.top.length === 0 ? (
                  <EmptyState title="Ledger is empty" />
                ) : (
                  <>
                    <div className="mb-3 flex flex-wrap gap-4 text-xs font-semibold text-[#86868B]">
                      <span className="flex items-center gap-1.5">
                        <StatusDot status="info" pulse={false} /> {fmtNumber(data.sampled)} sampled
                      </span>
                      <span className="flex items-center gap-1.5">
                        <StatusDot status="busy" pulse={false} /> {fmtNumber(data.warning)} warning
                      </span>
                      <span className="flex items-center gap-1.5">
                        <StatusDot status="critical" pulse={false} /> {fmtNumber(data.critical)}{" "}
                        critical
                      </span>
                    </div>
                    <div style={{ height: data.top.length * 30 + 30 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data.top.map((d) => ({
                            ...d,
                            label: d.type.replace(/[._]/g, " "),
                          }))}
                          layout="vertical"
                          margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                        >
                          <CartesianGrid horizontal={false} stroke={HIS_COLORS.grid} />
                          <XAxis type="number" allowDecimals={false} {...axisProps} />
                          <YAxis type="category" dataKey="label" width={130} {...axisProps} />
                          <Tooltip {...tooltipStyle} formatter={(v) => [v, "Events"]} />
                          <Bar
                            dataKey="count"
                            fill={HIS_COLORS.ink}
                            radius={[0, 6, 6, 0]}
                            barSize={14}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )
              }
            </QueryBody>
          </Panel>

          <Panel title="Data provenance" subtitle="Field-level source attribution">
            <QueryBody query={provenance}>
              {(data) =>
                data.total === 0 ? (
                  <EmptyState
                    icon={<Fingerprint className="size-5 text-[#86868B]" />}
                    title="No provenance records yet"
                    hint="Provenance is captured when values are entered from devices, imports or manual entry."
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold text-[#1D1D1F]">
                        {fmtNumber(data.total)} attributed fields
                      </span>
                      <span className="numeric text-xs font-bold text-[#1D8A39]">
                        {Math.round((data.verified / data.total) * 100)}% verified
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {data.sources.map((s) => (
                        <span
                          key={s.source}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F7] px-3 py-1 text-[11px] font-bold text-[#1D1D1F]"
                        >
                          {s.source}
                          <span className="numeric text-[#86868B]">{s.count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )
              }
            </QueryBody>
          </Panel>
        </div>
      </div>

      <Panel
        title="Patient access & activity trail"
        subtitle="Events, audit entries and provenance touching a patient, their encounters and orders"
        action={<History className="size-4 text-[#86868B]" />}
      >
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <PatientPicker value={patient} onChange={onPatientChange} />
          <div className="min-w-0">
            {!patient ? (
              <EmptyState
                title="Select a patient"
                hint="See exactly who did what to this patient's record, and when — the basis for privacy audits and medico-legal review."
              />
            ) : (
              <QueryBody query={trail} loadingLabel="Reconstructing trail…">
                {(items) => (
                  <div className="space-y-3">
                    <ViewersSummary items={items} />
                    {items.length === 0 ? (
                      <EmptyState
                        title="No recorded activity"
                        hint="No ledger entries reference this patient yet."
                      />
                    ) : (
                      <ol className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
                        {items.map((item) => (
                          <li
                            key={item.id}
                            className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white px-3 py-2.5"
                          >
                            <span className="numeric w-24 shrink-0 pt-0.5 text-[11px] font-semibold text-[#86868B]">
                              {stamp(item.at)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p
                                className={cn(
                                  "truncate text-xs font-bold capitalize",
                                  item.severity === "critical"
                                    ? "text-[#D70015]"
                                    : item.severity === "warning"
                                      ? "text-[#B86200]"
                                      : "text-[#1D1D1F]",
                                )}
                              >
                                {item.title}
                              </p>
                              {item.detail ? (
                                <p className="truncate text-[11px] text-[#86868B]">{item.detail}</p>
                              ) : null}
                            </div>
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider",
                                SOURCE_STYLE[item.source],
                              )}
                            >
                              {item.source}
                            </span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </QueryBody>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ViewersSummary({ items }: { items: TrailItem[] }) {
  const viewers = viewersFrom(items);
  return (
    <div className="rounded-2xl border border-black/5 bg-[#FAFAFC] p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
        Who viewed this record
      </p>
      {viewers.length === 0 ? (
        <p className="mt-1 text-xs font-semibold text-[#86868B]">
          No chart views recorded yet. Every time someone opens this chart or reads it through the
          FHIR API, it is logged here.
        </p>
      ) : (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {viewers.map((v) => (
            <li
              key={v.actor}
              className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-bold text-[#1D1D1F]"
              title={`Last viewed ${stamp(v.lastAt)}`}
            >
              {v.actor} · {v.views}×{v.viaApi ? " · API" : ""}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
