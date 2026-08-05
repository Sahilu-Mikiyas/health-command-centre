import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { Panel, Stat } from "@/components/hip/panel";
import { StatusPill } from "@/components/hip/status-pill";
import { Timeline } from "@/components/hip/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { activeEncountersQuery, notesQuery, ordersQuery } from "@/lib/hip/clinical-queries";
import { patientRecordQuery } from "@/lib/hip/queries";
import {
  cancelOrder,
  createOrder,
  saveNote,
  setEncounterPriority,
  setEncounterStage,
} from "@/lib/hip/mutations";

const categories = ["laboratory", "imaging", "medication", "procedure"] as const;

export const Route = createFileRoute("/_authenticated/doctor")({
  head: () => ({
    meta: [
      { title: "Doctor Workspace | Meridian HIP" },
      {
        name: "description",
        content:
          "Consultation cockpit: live patient queue, safety context, SOAP notes and lab, imaging and medication ordering in one screen.",
      },
      { property: "og:title", content: "Doctor Workspace | Meridian HIP" },
      {
        property: "og:description",
        content: "Live queue, safety context, SOAP notes and clinical ordering in one screen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DoctorWorkspace,
});

function DoctorWorkspace() {
  const queryClient = useQueryClient();
  const encounters = useQuery({ ...activeEncountersQuery, refetchInterval: 20000 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const queue = (encounters.data ?? []).filter((e) =>
    ["waiting", "nurse", "doctor"].includes(e.stage),
  );
  const selected = queue.find((e) => e.id === selectedId) ?? queue[0] ?? null;
  const patientId = selected?.patient_id ?? "";

  const record = useQuery({ ...patientRecordQuery(patientId), enabled: Boolean(patientId) });
  const orders = useQuery({ ...ordersQuery(patientId), enabled: Boolean(patientId) });
  const notes = useQuery({ ...notesQuery(patientId), enabled: Boolean(patientId) });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["encounters"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["notes"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const stage = useMutation({
    mutationFn: setEncounterStage,
    onSuccess: () => {
      toast.success("Encounter moved");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const priority = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) => setEncounterPriority(id, value),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const order = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      toast.success("Order sent to the receiving department");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dropOrder = useMutation({
    mutationFn: cancelOrder,
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const note = useMutation({
    mutationFn: saveNote,
    onSuccess: (_data, variables) => {
      toast.success(variables.sign ? "Note signed" : "Draft saved");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const latestVitals = record.data?.vitals?.[0];
  const allergies = record.data?.allergies ?? [];

  return (
    <AppShell
      title="Doctor Workspace"
      subtitle="Consult, document and order without leaving the patient"
    >
      <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <Panel title="Live queue" subtitle={`${queue.length} patients`} bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {queue.map((encounter) => (
              <li key={encounter.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(encounter.id)}
                  className={
                    selected?.id === encounter.id
                      ? "w-full bg-surface-raised px-4 py-3 text-left"
                      : "w-full px-4 py-3 text-left transition-colors hover:bg-surface-raised"
                  }
                >
                  <p className="truncate text-sm font-medium">
                    {encounter.patients?.full_name ?? "Unknown"}
                  </p>
                  <p className="numeric truncate text-xs text-muted-foreground">
                    {encounter.patients?.mrn} · {encounter.stage}
                  </p>
                  {encounter.priority !== "routine" ? (
                    <span className="mt-1 inline-block text-[10px] uppercase tracking-widest text-warn">
                      {encounter.priority}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
            {queue.length === 0 ? (
              <li className="px-4 py-6 text-sm text-muted-foreground">
                No patients waiting. Check them in from Reception.
              </li>
            ) : null}
          </ul>
        </Panel>

        {selected ? (
          <div className="space-y-4">
            <Panel
              title="Consultation"
              subtitle={selected.patients?.full_name ?? "Patient"}
              action={
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      priority.mutate({
                        id: selected.id,
                        value: selected.priority === "critical" ? "routine" : "critical",
                      })
                    }
                  >
                    {selected.priority === "critical" ? "Clear critical" : "Flag critical"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => stage.mutate({ encounterId: selected.id, stage: "doctor" })}
                  >
                    Start consult
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => stage.mutate({ encounterId: selected.id, stage: "complete" })}
                  >
                    Complete
                  </Button>
                </div>
              }
            >
              <div className="grid gap-4 sm:grid-cols-4">
                <Stat
                  label="NEWS2"
                  value={latestVitals?.news2 ?? "—"}
                  tone={
                    (latestVitals?.news2 ?? 0) >= 5
                      ? "crit"
                      : (latestVitals?.news2 ?? 0) >= 3
                        ? "warn"
                        : "ok"
                  }
                />
                <Stat
                  label="BP"
                  value={
                    latestVitals?.systolic
                      ? `${latestVitals.systolic}/${latestVitals.diastolic ?? "—"}`
                      : "—"
                  }
                />
                <Stat label="SpO₂" value={latestVitals?.spo2 ? `${latestVitals.spo2}%` : "—"} />
                <Stat label="eGFR" value={record.data?.patient?.egfr ?? "—"} hint="Dosing signal" />
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusPill
                  status={selected.priority === "critical" ? "critical" : "healthy"}
                  label={`${selected.stage} · ${selected.priority}`}
                />
                {allergies.length > 0 ? (
                  <span className="rounded-full border border-crit/50 px-3 py-1 text-xs text-crit">
                    Allergies: {allergies.map((a) => a.substance).join(", ")}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">No known allergies</span>
                )}
                <Link
                  to="/patients/$patientId"
                  params={{ patientId: selected.patient_id }}
                  className="text-xs text-accent hover:underline"
                >
                  Full record
                </Link>
              </div>

              {selected.chief_complaint ? (
                <p className="mt-4 text-sm">
                  <span className="text-muted-foreground">Presenting: </span>
                  {selected.chief_complaint}
                </p>
              ) : null}
            </Panel>

            <Panel title="Clinical note" subtitle="SOAP — signing makes it immutable">
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const sign = (event.nativeEvent as SubmitEvent).submitter?.dataset['sign'] === "1";
                  note.mutate({
                    patientId: selected.patient_id,
                    encounterId: selected.id,
                    subjective: String(form.get("subjective") || ""),
                    objective: String(form.get("objective") || ""),
                    assessment: String(form.get("assessment") || ""),
                    plan: String(form.get("plan") || ""),
                    sign,
                  });
                  event.currentTarget.reset();
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="subjective">Subjective</Label>
                    <Textarea id="subjective" name="subjective" rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="objective">Objective</Label>
                    <Textarea id="objective" name="objective" rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="assessment">Assessment</Label>
                    <Textarea id="assessment" name="assessment" rows={3} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="plan">Plan</Label>
                    <Textarea id="plan" name="plan" rows={3} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" variant="outline" disabled={note.isPending}>
                    Save draft
                  </Button>
                  <Button type="submit" data-sign="1" disabled={note.isPending}>
                    Sign note
                  </Button>
                </div>
              </form>

              <div className="mt-4">
                <Timeline
                  items={(notes.data ?? []).slice(0, 6).map((row) => ({
                    id: row.id,
                    time: new Date(row.created_at).toLocaleString([], {
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                    title: row.signed_at ? "Signed note" : "Draft note",
                    detail: row.assessment ?? row.subjective ?? row.author_label ?? "",
                    tone: row.signed_at ? "ok" : "warn",
                  }))}
                />
              </div>
            </Panel>
          </div>
        ) : (
          <Panel title="Consultation">
            <p className="text-sm text-muted-foreground">
              Select a patient from the live queue to begin.
            </p>
          </Panel>
        )}

        <div className="space-y-4">
          <Panel title="Place order" subtitle="Routes straight to the receiving department">
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (!selected) {
                  toast.error("Select a patient first");
                  return;
                }
                const form = new FormData(event.currentTarget);
                order.mutate({
                  patientId: selected.patient_id,
                  encounterId: selected.id,
                  category: String(form.get("category")) as (typeof categories)[number],
                  name: String(form.get("name")),
                  priority: String(form.get("priority") || "routine"),
                  instructions: String(form.get("instructions") || ""),
                });
                event.currentTarget.reset();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  name="category"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Order</Label>
                <Input id="name" name="name" required placeholder="Full blood count" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  name="priority"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  <option value="routine">routine</option>
                  <option value="urgent">urgent</option>
                  <option value="stat">stat</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea id="instructions" name="instructions" rows={2} />
              </div>
              <Button type="submit" className="w-full" disabled={order.isPending}>
                Send order
              </Button>
            </form>
          </Panel>

          <Panel title="Active orders" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {(orders.data ?? [])
                .filter((row) => row.status !== "cancelled")
                .map((row) => (
                  <li key={row.id} className="flex items-center gap-2 px-4 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{row.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {row.category} · {row.priority} · {row.status}
                      </p>
                    </div>
                    {row.status === "requested" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => dropOrder.mutate(row.id)}
                        disabled={dropOrder.isPending}
                      >
                        Cancel
                      </Button>
                    ) : null}
                  </li>
                ))}
              {orders.data?.length === 0 ? (
                <li className="px-4 py-6 text-sm text-muted-foreground">No orders yet.</li>
              ) : null}
            </ul>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
