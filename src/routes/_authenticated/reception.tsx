import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { Panel, Stat } from "@/components/hip/panel";
import { StatusPill } from "@/components/hip/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appointmentsQuery, activeEncountersQuery } from "@/lib/hip/clinical-queries";
import { departmentsQuery, patientsQuery } from "@/lib/hip/queries";
import {
  bookAppointment,
  checkInAppointment,
  registerPatient,
  updateAppointmentStatus,
} from "@/lib/hip/mutations";

const statusTone = {
  booked: "healthy",
  arrived: "busy",
  in_progress: "busy",
  completed: "healthy",
  cancelled: "offline",
  no_show: "critical",
} as const;

export const Route = createFileRoute("/_authenticated/reception")({
  head: () => ({
    meta: [
      { title: "Reception Workspace | Meridian HIP" },
      {
        name: "description",
        content:
          "Register patients, book appointments and check arrivals into the live hospital queue from one reception desk view.",
      },
      { property: "og:title", content: "Reception Workspace | Meridian HIP" },
      {
        property: "og:description",
        content: "Register patients, book appointments and check arrivals into the live queue.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reception,
});

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function Reception() {
  const queryClient = useQueryClient();
  const [day, setDay] = useState(todayISO());
  const [search, setSearch] = useState("");

  const appointments = useQuery({ ...appointmentsQuery(day), refetchInterval: 20000 });
  const encounters = useQuery({ ...activeEncountersQuery, refetchInterval: 20000 });
  const departments = useQuery(departmentsQuery);
  const patients = useQuery(patientsQuery(search));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["encounters"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["patients"] });
  };

  const register = useMutation({
    mutationFn: registerPatient,
    onSuccess: (data) => {
      toast.success(`${data.full_name} registered as ${data.mrn}`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const book = useMutation({
    mutationFn: bookAppointment,
    onSuccess: () => {
      toast.success("Appointment booked");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const checkIn = useMutation({
    mutationFn: checkInAppointment,
    onSuccess: () => {
      toast.success("Patient checked in — now in the clinical queue");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const markStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateAppointmentStatus(id, status),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const list = appointments.data ?? [];
  const waiting = (encounters.data ?? []).filter((e) => e.stage === "waiting");

  return (
    <AppShell
      title="Reception"
      subtitle="Registration, scheduling and arrivals — the front door of the hospital"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4 min-w-0">
          <div className="grid gap-4 sm:grid-cols-4 min-w-0">
            <Panel className="min-w-0">
              <Stat label="Scheduled" value={list.length} hint={day} />
            </Panel>
            <Panel className="min-w-0">
              <Stat
                label="Arrived"
                value={list.filter((a) => a.status === "arrived").length}
                tone="ok"
              />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Waiting to be seen" value={waiting.length} tone="warn" />
            </Panel>
            <Panel className="min-w-0">
              <Stat
                label="No-shows"
                value={list.filter((a) => a.status === "no_show").length}
                tone="crit"
              />
            </Panel>
          </div>

          <Panel
            title="Appointment book"
            subtitle="Check patients in to open a live encounter"
            className="min-w-0"
            action={
              <Input
                type="date"
                value={day}
                onChange={(event) => setDay(event.target.value)}
                className="h-8 w-40 rounded-2xl border-black/10 bg-[#F5F5F7] text-black"
              />
            }
            bodyClassName="p-0"
          >
            <div className="divide-y divide-black/5 min-w-0">
              {list.map((appointment) => (
                <div key={appointment.id} className="flex flex-wrap items-center gap-3 px-4 py-3 min-w-0">
                  <span className="numeric w-14 text-sm text-[#86868B] truncate">
                    {new Date(appointment.scheduled_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/patients/$patientId"
                      params={{ patientId: appointment.patient_id }}
                      className="truncate text-sm font-medium text-black hover:text-black hover:underline block"
                    >
                      {appointment.patients?.full_name ?? "Unknown patient"}
                    </Link>
                    <p className="numeric truncate text-xs text-[#86868B]">
                      {appointment.patients?.mrn} · {appointment.departments?.name ?? "Unassigned"}
                      {appointment.reason ? ` · ${appointment.reason}` : ""}
                    </p>
                  </div>
                  <StatusPill
                    status={statusTone[appointment.status] ?? "healthy"}
                    label={appointment.status.replace("_", " ")}
                  />
                  {appointment.status === "booked" ? (
                    <div className="flex gap-2 min-w-0">
                      <Button
                        size="sm"
                        className="rounded-2xl truncate"
                        disabled={checkIn.isPending}
                        onClick={() =>
                          checkIn.mutate({
                            id: appointment.id,
                            patient_id: appointment.patient_id,
                            department_id: appointment.department_id,
                            reason: appointment.reason,
                          })
                        }
                      >
                        Check in
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-2xl truncate"
                        onClick={() => markStatus.mutate({ id: appointment.id, status: "no_show" })}
                      >
                        No show
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
              {list.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[#86868B] truncate">
                  No appointments booked for this day.
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel title="Waiting room" subtitle="Checked-in patients awaiting clinical review" className="min-w-0">
            <div className="grid gap-2 sm:grid-cols-2 min-w-0">
              {waiting.map((encounter) => (
                <Link
                  key={encounter.id}
                  to="/patients/$patientId"
                  params={{ patientId: encounter.patient_id }}
                  className="rounded-2xl border border-black/5 px-3 py-2 transition-colors hover:bg-[#F5F5F7] min-w-0 block"
                >
                  <p className="truncate text-sm font-medium text-black">
                    {encounter.patients?.full_name ?? "Unknown"}
                  </p>
                  <p className="truncate text-xs text-[#86868B]">
                    waiting since{" "}
                    {new Date(encounter.started_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </Link>
              ))}
              {waiting.length === 0 ? (
                <p className="text-sm text-[#86868B] truncate">Waiting room clear.</p>
              ) : null}
            </div>
          </Panel>
        </div>

        <div className="space-y-4 min-w-0">
          <Panel title="Register patient" subtitle="Creates the permanent MRN" className="min-w-0">
            <form
              className="space-y-3 min-w-0"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                register.mutate({
                  fullName: String(form.get("fullName")),
                  dateOfBirth: String(form.get("dateOfBirth")),
                  sex: String(form.get("sex") || "unknown"),
                  phone: String(form.get("phone") || ""),
                  insuranceProvider: String(form.get("insurance") || ""),
                });
                event.currentTarget.reset();
              }}
            >
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="fullName" className="text-black truncate block">Full name</Label>
                <Input id="fullName" name="fullName" required className="rounded-2xl border-black/10 bg-[#F5F5F7] text-black" />
              </div>
              <div className="grid grid-cols-2 gap-3 min-w-0">
                <div className="space-y-1.5 min-w-0">
                  <Label htmlFor="dateOfBirth" className="text-black truncate block">Date of birth</Label>
                  <Input id="dateOfBirth" name="dateOfBirth" type="date" required className="rounded-2xl border-black/10 bg-[#F5F5F7] text-black" />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label htmlFor="sex" className="text-black truncate block">Sex</Label>
                  <select
                    id="sex"
                    name="sex"
                    className="h-9 w-full rounded-2xl border border-black/10 bg-[#F5F5F7] px-2 text-sm text-black"
                  >
                    <option value="female">female</option>
                    <option value="male">male</option>
                    <option value="unknown">unknown</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="phone" className="text-black truncate block">Phone</Label>
                <Input id="phone" name="phone" className="rounded-2xl border-black/10 bg-[#F5F5F7] text-black" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="insurance" className="text-black truncate block">Insurance provider</Label>
                <Input id="insurance" name="insurance" placeholder="Self-pay if blank" className="rounded-2xl border-black/10 bg-[#F5F5F7] text-black" />
              </div>
              <Button type="submit" className="w-full rounded-2xl truncate" disabled={register.isPending}>
                Register patient
              </Button>
            </form>
          </Panel>

          <Panel title="Book appointment" subtitle="Search an existing patient first" className="min-w-0">
            <form
              className="space-y-3 min-w-0"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const patientId = String(form.get("patientId") || "");
                if (!patientId) {
                  toast.error("Select a patient");
                  return;
                }
                book.mutate({
                  patientId,
                  departmentId: String(form.get("departmentId") || "") || null,
                  scheduledAt: String(form.get("scheduledAt")),
                  reason: String(form.get("reason") || ""),
                });
                event.currentTarget.reset();
              }}
            >
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="patientSearch" className="text-black truncate block">Find patient</Label>
                <Input
                  id="patientSearch"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name or MRN"
                  className="rounded-2xl border-black/10 bg-[#F5F5F7] text-black"
                />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="patientId" className="text-black truncate block">Patient</Label>
                <select
                  id="patientId"
                  name="patientId"
                  className="h-9 w-full rounded-2xl border border-black/10 bg-[#F5F5F7] px-2 text-sm text-black"
                >
                  <option value="">Select…</option>
                  {(patients.data ?? []).slice(0, 40).map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.full_name} — {patient.mrn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="departmentId" className="text-black truncate block">Department</Label>
                <select
                  id="departmentId"
                  name="departmentId"
                  className="h-9 w-full rounded-2xl border border-black/10 bg-[#F5F5F7] px-2 text-sm text-black"
                >
                  <option value="">Unassigned</option>
                  {(departments.data ?? []).map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="scheduledAt" className="text-black truncate block">When</Label>
                <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required className="rounded-2xl border-black/10 bg-[#F5F5F7] text-black" />
              </div>
              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="reason" className="text-black truncate block">Reason</Label>
                <Input id="reason" name="reason" placeholder="Follow-up, chest pain…" className="rounded-2xl border-black/10 bg-[#F5F5F7] text-black" />
              </div>
              <Button type="submit" className="w-full rounded-2xl truncate" disabled={book.isPending}>
                Book appointment
              </Button>
            </form>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
