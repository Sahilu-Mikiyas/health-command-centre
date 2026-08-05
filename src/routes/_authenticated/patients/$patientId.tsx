import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/hip/app-shell";
import { Panel, Stat } from "@/components/hip/panel";
import { Timeline } from "@/components/hip/timeline";
import { notesQuery, ordersQuery } from "@/lib/hip/clinical-queries";
import { patientRecordQuery } from "@/lib/hip/queries";

export const Route = createFileRoute("/_authenticated/patients/$patientId")({
  head: () => ({
    meta: [
      { title: "Patient Record | Meridian HIP" },
      {
        name: "description",
        content:
          "Longitudinal patient record: allergies, conditions, vitals trend, visits, orders and signed clinical notes.",
      },
      { property: "og:title", content: "Patient Record | Meridian HIP" },
      {
        property: "og:description",
        content: "Allergies, conditions, vitals, visits, orders and signed notes in one record.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PatientRecord,
});

function PatientRecord() {
  const { patientId } = Route.useParams();
  const record = useQuery(patientRecordQuery(patientId));
  const orders = useQuery(ordersQuery(patientId));
  const notes = useQuery(notesQuery(patientId));

  const patient = record.data?.patient;
  const latestVitals = record.data?.vitals?.[0];

  return (
    <AppShell
      title={patient?.full_name ?? "Patient record"}
      subtitle={patient ? `${patient.mrn} · ${patient.sex} · born ${patient.date_of_birth}` : "Loading…"}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Panel>
              <Stat label="NEWS2" value={latestVitals?.news2 ?? "—"} tone={(latestVitals?.news2 ?? 0) >= 5 ? "crit" : (latestVitals?.news2 ?? 0) >= 3 ? "warn" : "ok"} />
            </Panel>
            <Panel>
              <Stat
                label="Blood pressure"
                value={
                  latestVitals?.systolic
                    ? `${latestVitals.systolic}/${latestVitals.diastolic ?? "—"}`
                    : "—"
                }
              />
            </Panel>
            <Panel>
              <Stat label="SpO₂" value={latestVitals?.spo2 ? `${latestVitals.spo2}%` : "—"} />
            </Panel>
            <Panel>
              <Stat label="eGFR" value={patient?.egfr ?? "—"} hint="Renal dosing signal" />
            </Panel>
          </div>

          <Panel title="Safety" subtitle="Allergies and active conditions">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Allergies
                </p>
                <ul className="space-y-1 text-sm">
                  {(record.data?.allergies ?? []).map((allergy) => (
                    <li key={allergy.id} className="text-crit">
                      {allergy.substance}
                      <span className="text-muted-foreground"> — {allergy.reaction ?? allergy.severity}</span>
                    </li>
                  ))}
                  {record.data?.allergies?.length === 0 ? (
                    <li className="text-muted-foreground">No known allergies</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Conditions
                </p>
                <ul className="space-y-1 text-sm">
                  {(record.data?.conditions ?? []).map((condition) => (
                    <li key={condition.id}>
                      {condition.name}
                      <span className="text-muted-foreground"> · {condition.status}</span>
                    </li>
                  ))}
                  {record.data?.conditions?.length === 0 ? (
                    <li className="text-muted-foreground">None recorded</li>
                  ) : null}
                </ul>
              </div>
            </div>
          </Panel>

          <Panel title="Clinical notes" subtitle="Signed notes are immutable">
            <div className="space-y-3">
              {(notes.data ?? []).map((note) => (
                <article key={note.id} className="rounded-md border border-border p-3 text-sm">
                  <header className="flex flex-wrap items-baseline gap-2 text-xs text-muted-foreground">
                    <span className="numeric">{new Date(note.created_at).toLocaleString()}</span>
                    <span>{note.author_label ?? "—"}</span>
                    <span className={note.signed_at ? "text-ok" : "text-warn"}>
                      {note.signed_at ? "signed" : "draft"}
                    </span>
                  </header>
                  <dl className="mt-2 space-y-1">
                    {(
                      [
                        ["S", note.subjective],
                        ["O", note.objective],
                        ["A", note.assessment],
                        ["P", note.plan],
                      ] as const
                    )
                      .filter(([, value]) => value)
                      .map(([key, value]) => (
                        <div key={key} className="flex gap-2">
                          <dt className="w-4 shrink-0 text-muted-foreground">{key}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                  </dl>
                </article>
              ))}
              {notes.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes recorded.</p>
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Orders" subtitle="Lab, imaging, medication, procedure">
            <ul className="space-y-2 text-sm">
              {(orders.data ?? []).map((order) => (
                <li key={order.id} className="rounded-md border border-border px-3 py-2">
                  <p className="font-medium">{order.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.category} · {order.priority} · {order.status}
                  </p>
                </li>
              ))}
              {orders.data?.length === 0 ? (
                <li className="text-muted-foreground">No orders yet.</li>
              ) : null}
            </ul>
          </Panel>

          <Panel title="Visit history">
            <Timeline
              items={(record.data?.encounters ?? []).map((encounter) => ({
                id: encounter.id,
                time: new Date(encounter.started_at).toLocaleDateString(),
                title: encounter.chief_complaint ?? "Visit",
                detail: `${encounter.stage} · ${encounter.priority}`,
                tone: encounter.priority === "critical" ? "crit" : "default",
              }))}
            />
          </Panel>

          <Panel title="Vitals trend">
            <Timeline
              items={(record.data?.vitals ?? []).map((vital) => ({
                id: vital.id,
                time: new Date(vital.recorded_at).toLocaleString([], {
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                title: `NEWS2 ${vital.news2 ?? "—"}`,
                detail: `HR ${vital.heart_rate ?? "—"} · BP ${vital.systolic ?? "—"}/${vital.diastolic ?? "—"} · SpO₂ ${vital.spo2 ?? "—"}%`,
                tone: (vital.news2 ?? 0) >= 5 ? "crit" : (vital.news2 ?? 0) >= 3 ? "warn" : "ok",
              }))}
            />
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
