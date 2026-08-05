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
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6 min-w-0">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Panel className="min-w-0">
              <div className="flex items-center justify-between gap-3 min-w-0">
                <MetricRing value={Math.round(occupancy * 100)} size={72} thickness={7} />
                <div className="space-y-0.5 text-xs font-semibold min-w-0 text-right">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#86868B]">Occupancy</p>
                  <p className="numeric text-[#1D1D1F] font-black text-sm">{beds.data?.occupied ?? 0} occupied</p>
                  <p className="text-[#34C759] font-bold text-[11px]">{beds.data?.available ?? 0} available</p>
                  <p className="text-[#86868B] text-[10px]">{beds.data?.cleaning ?? 0} cleaning</p>
                </div>
              </div>
            </Panel>
            <Panel className="min-w-0">
              <Stat
                label="Patients in flow"
                value={flow.data?.total ?? 0}
                hint={`${flow.data?.critical ?? 0} flagged critical`}
                tone={(flow.data?.critical ?? 0) > 0 ? "warn" : "ok"}
              />
            </Panel>
            <Panel className="min-w-0">
              <Stat
                label="Staff on shift"
                value={staff.data?.active ?? 0}
                hint={`${staff.data?.doctors ?? 0} doctors · ${staff.data?.nurses ?? 0} nurses`}
              />
            </Panel>
            <Panel className="min-w-0">
              <Stat
                label="Departments critical"
                value={criticalDepartments.length}
                hint={`${departments.data?.length ?? 0} monitored`}
                tone={criticalDepartments.length > 0 ? "crit" : "ok"}
              />
            </Panel>
          </div>

          <Panel title="Patient flow" subtitle="Live stage distribution">
            <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
              {(flow.data?.stages ?? []).map((stage) => (
                <div key={stage.stage} className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-2.5 text-center min-w-0">
                  <p className="numeric text-lg font-black text-black">{stage.count}</p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase tracking-tight text-[#86868B] truncate" title={stage.stage}>
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(departments.data ?? []).map((department) => (
                <div
                  key={department.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#F5F5F7] p-3.5 min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-black">{department.name}</p>
                    <p className="truncate text-xs font-medium text-[#86868B]">
                      {department.location ?? department.code}
                    </p>
                  </div>
                  <StatusPill status={department.status} label={department.status} />
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-6 min-w-0">
          <HospitalBrainPanel />

          {criticalDepartments.length > 0 ? (
            <AlertCard
              severity="critical"
              title={`${criticalDepartments.length} department(s) critical`}
              meta="Live department status"
            >
              {criticalDepartments.map((d) => d.name).join(", ")}
            </AlertCard>
          ) : null}

          <Panel
            title="Event stream"
            subtitle="Append-only hospital ledger"
            action={<DrillDownLink to="/events">All events</DrillDownLink>}
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
