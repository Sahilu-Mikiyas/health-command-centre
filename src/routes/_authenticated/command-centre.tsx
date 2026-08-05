import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/hip/app-shell";
import { AlertCard } from "@/components/hip/alert-card";
import { HospitalBrainPanel } from "@/components/hip/hospital-brain-panel";
import { MetricRing } from "@/components/hip/metric-ring";
import { Panel, Stat } from "@/components/hip/panel";
import { StatusPill, statusFromRatio } from "@/components/hip/status-pill";
import { Timeline } from "@/components/hip/timeline";
import { DrillDownLink } from "@/components/hip/drill-down-link";
import {
  bedSummaryQuery,
  departmentsQuery,
  flowQuery,
  hospitalQuery,
  recentEventsQuery,
  staffSummaryQuery,
} from "@/lib/hip/queries";

export const Route = createFileRoute("/_authenticated/command-centre")({
  head: () => ({
    meta: [
      { title: "Command Centre | Meridian HIP" },
      {
        name: "description",
        content:
          "Live hospital digital twin: occupancy, patient flow, department status, staffing and critical alerts in one operational view.",
      },
      { property: "og:title", content: "Command Centre | Meridian HIP" },
      {
        property: "og:description",
        content: "Live hospital digital twin: occupancy, flow, staffing and critical alerts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommandCentre,
});

function CommandCentre() {
  const hospital = useQuery(hospitalQuery);
  const beds = useQuery(bedSummaryQuery);
  const flow = useQuery(flowQuery);
  const staff = useQuery(staffSummaryQuery);
  const departments = useQuery(departmentsQuery);
  const events = useQuery(recentEventsQuery(25));

  const occupancy = beds.data && beds.data.total > 0 ? beds.data.occupied / beds.data.total : 0;
  const criticalDepartments = (departments.data ?? []).filter((d) => d.status === "critical");

  return (
    <AppShell
      title="Hospital Command Centre"
      subtitle={hospital.data ? `${hospital.data.name} · live digital twin` : "Loading hospital…"}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Panel>
              <div className="flex items-center gap-4">
                <MetricRing value={Math.round(occupancy * 100)} label="Occupancy" />
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p className="numeric text-foreground">{beds.data?.occupied ?? 0} occupied</p>
                  <p>{beds.data?.available ?? 0} available</p>
                  <p>{beds.data?.cleaning ?? 0} in cleaning</p>
                </div>
              </div>
            </Panel>
            <Panel>
              <Stat
                label="Patients in flow"
                value={flow.data?.total ?? 0}
                hint={`${flow.data?.critical ?? 0} flagged critical`}
                tone={(flow.data?.critical ?? 0) > 0 ? "warn" : "ok"}
              />
            </Panel>
            <Panel>
              <Stat
                label="Staff on shift"
                value={staff.data?.active ?? 0}
                hint={`${staff.data?.doctors ?? 0} doctors · ${staff.data?.nurses ?? 0} nurses`}
              />
            </Panel>
            <Panel>
              <Stat
                label="Departments critical"
                value={criticalDepartments.length}
                hint={`${departments.data?.length ?? 0} monitored`}
                tone={criticalDepartments.length > 0 ? "crit" : "ok"}
              />
            </Panel>
          </div>

          <Panel title="Patient flow" subtitle="Live stage distribution">
            <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {(flow.data?.stages ?? []).map((stage) => (
                <div key={stage.stage} className="rounded-md border border-border p-3">
                  <p className="numeric text-xl font-semibold">{stage.count}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {stage.stage}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Departments"
            subtitle="Operational status"
            action={<DrillDownLink to="/patients">Patient index</DrillDownLink>}
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {(departments.data ?? []).map((department) => (
                <div
                  key={department.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{department.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {department.location ?? department.code}
                    </p>
                  </div>
                  <StatusPill status={department.status} label={department.status} />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <HospitalBrainPanel />

          {criticalDepartments.length > 0 ? (
            <AlertCard
              severity="critical"
              title={`${criticalDepartments.length} department(s) critical`}
              detail={criticalDepartments.map((d) => d.name).join(", ")}
            />
          ) : null}

          <Panel
            title="Event stream"
            subtitle="Append-only hospital ledger"
            action={<DrillDownLink to="/events" label="All events" />}
          >
            <Timeline
              items={(events.data ?? []).slice(0, 12).map((event) => ({
                id: event.id,
                time: new Date(event.occurred_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                title: event.event_type.replace(/[._]/g, " "),
                detail: [event.department_code, event.actor_label].filter(Boolean).join(" · "),
                tone:
                  event.severity === "critical"
                    ? "crit"
                    : event.severity === "warning"
                      ? "warn"
                      : "default",
              }))}
            />
          </Panel>

          <Panel title="Capacity signal">
            <StatusPill status={statusFromRatio(occupancy)} label={`${Math.round(occupancy * 100)}% beds in use`} />
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
