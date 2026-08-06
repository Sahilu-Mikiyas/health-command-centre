import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  IdCard,
  LogOut,
  MapPin,
  Pill,
  Printer,
  QrCode,
  Search,
  ShieldCheck,
  Stethoscope,
  Ticket,
  UserCheck,
  UserPlus,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";
import { activeEncountersQuery, appointmentsQuery } from "@/lib/hip/clinical-queries";
import {
  bookAppointment,
  checkInAppointment,
  registerPatient,
  updateAppointmentStatus,
} from "@/lib/hip/mutations";
import { departmentsQuery, patientsQuery } from "@/lib/hip/queries";

export const Route = createFileRoute("/_authenticated/reception")({
  head: () => ({
    meta: [
      { title: "Reception & Front Desk | Furii Hospital Prototype" },
      {
        name: "description",
        content:
          "Commercial-grade receptionist workspace: patient registration, appointment calendar, queue ticket printing, waiting room, admissions & discharge.",
      },
    ],
  }),
  component: Reception,
});

function Reception() {
  return (
    <RouteGuard route="/reception">
      <ReceptionContent />
    </RouteGuard>
  );
}

type SubTab =
  | "overview"
  | "registration"
  | "appointments"
  | "checkin"
  | "waiting"
  | "admissions"
  | "discharge";

function todayISO() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function ReceptionContent() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SubTab>("overview");
  const [day, setDay] = useState(todayISO());
  const [patientSearch, setPatientSearch] = useState("");

  // Modals & Ticket State
  const [printedTicket, setPrintedTicket] = useState<{
    ticketNo: string;
    patientName: string;
    mrn: string;
    dept: string;
    time: string;
  } | null>(null);

  const [admissionWristband, setAdmissionWristband] = useState<{
    patientName: string;
    mrn: string;
    ward: string;
    bed: string;
    bloodGroup: string;
    admDate: string;
  } | null>(null);

  const [dischargeDoc, setDischargeDoc] = useState<{
    patientName: string;
    mrn: string;
    doctor: string;
    billingStatus: string;
    pharmacyStatus: string;
  } | null>(null);

  // Queries
  const appointments = useQuery({ ...appointmentsQuery(day), refetchInterval: 15000 });
  const encounters = useQuery({ ...activeEncountersQuery, refetchInterval: 15000 });
  const departments = useQuery(departmentsQuery);
  const patients = useQuery(patientsQuery(patientSearch));

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["encounters"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["patients"] });
  };

  // Mutations
  const registerMut = useMutation({
    mutationFn: registerPatient,
    onSuccess: (data) => {
      toast.success(`Registered ${data.full_name} with MRN ${data.mrn}`);
      invalidate();
      setActiveTab("checkin");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const bookMut = useMutation({
    mutationFn: bookAppointment,
    onSuccess: () => {
      toast.success("Appointment booked successfully");
      invalidate();
      setActiveTab("appointments");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const checkInMut = useMutation({
    mutationFn: checkInAppointment,
    onSuccess: (_data, variables) => {
      const pName = patients.data?.find((p) => p.id === variables.patient_id)?.full_name ?? "Patient";
      const ticketNum = `T-${Math.floor(100 + Math.random() * 900)}`;
      setPrintedTicket({
        ticketNo: ticketNum,
        patientName: pName,
        mrn: "MRN-8829",
        dept: "General Consultation",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      toast.success(`Checked in ${pName}. Ticket ${ticketNum} issued.`);
      invalidate();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const markStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateAppointmentStatus(id, status),
    onSuccess: invalidate,
    onError: (err: Error) => toast.error(err.message),
  });

  const apptList = appointments.data ?? [];
  const waitingList = (encounters.data ?? []).filter((e) => e.stage === "waiting");
  const inConsultationList = (encounters.data ?? []).filter((e) => ["nurse", "doctor"].includes(e.stage));

  const doctorsList = [
    { name: "Dr. Bethlehem Tadesse", spec: "Internal Medicine", status: "Available", room: "Room 101" },
    { name: "Dr. Getachew Reda", spec: "General Surgery", status: "In Consultation", room: "Room 104" },
    { name: "Dr. Almaz Tefera", spec: "Pediatrics", status: "On Call", room: "Ward B" },
  ];

  return (
    <AppShell
      title="Receptionist & Front Desk Workspace"
      subtitle="Complete Patient Arrival, Registration, Check-in, Admissions & Discharge Suite"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("registration")}
            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all scale-105 cursor-pointer"
          >
            <UserPlus className="size-3.5" /> Register New Patient
          </button>
        </div>
      }
    >
      {/* Printable Ticket Modal */}
      {printedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="apple-card max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <span className="text-xs font-black uppercase text-black">Queue Ticket Issued</span>
              <button onClick={() => setPrintedTicket(null)} className="text-[#86868B] hover:text-black">
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-black/10 bg-[#FAFAFC] p-6 space-y-3">
              <span className="rounded-full bg-black text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                Furii Hospital Queue
              </span>
              <h2 className="text-4xl font-black text-black numeric">{printedTicket.ticketNo}</h2>
              <p className="text-sm font-bold text-black">{printedTicket.patientName}</p>
              <p className="text-xs font-semibold text-[#86868B]">{printedTicket.dept} · {printedTicket.time}</p>
              <div className="pt-2 border-t border-black/5 flex items-center justify-center gap-2 text-[10px] font-bold text-[#86868B]">
                <QrCode className="size-8 text-black" />
                <span>Scan for Live Queue Position</span>
              </div>
            </div>

            <button
              onClick={() => {
                toast.success("Printing queue ticket...");
                setPrintedTicket(null);
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Printer className="size-4" /> Print Ticket & Hand to Patient
            </button>
          </div>
        </div>
      )}

      {/* Printable Wristband Modal */}
      {admissionWristband && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="apple-card max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <span className="text-xs font-black uppercase text-black">Inpatient Barcode Wristband</span>
              <button onClick={() => setAdmissionWristband(null)} className="text-[#86868B] hover:text-black">
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-2xl border-2 border-dashed border-black/20 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-black text-black text-base">{admissionWristband.patientName}</span>
                <span className="rounded-full bg-black text-white px-2.5 py-0.5 text-[10px] font-bold">
                  {admissionWristband.mrn}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs font-bold text-[#1D1D1F]">
                <div><span className="text-[#86868B] text-[10px] block">WARD</span>{admissionWristband.ward}</div>
                <div><span className="text-[#86868B] text-[10px] block">BED</span>{admissionWristband.bed}</div>
                <div><span className="text-[#86868B] text-[10px] block">BLOOD</span>{admissionWristband.bloodGroup}</div>
              </div>
              <div className="pt-2 border-t border-black/5 flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#86868B]">Admitted: {admissionWristband.admDate}</span>
                <QrCode className="size-10 text-black" />
              </div>
            </div>

            <button
              onClick={() => {
                toast.success("Printing wristband on thermal printer...");
                setAdmissionWristband(null);
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Printer className="size-4" /> Print Thermal Wristband
            </button>
          </div>
        </div>
      )}

      {/* Discharge Summary Modal */}
      {dischargeDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="apple-card max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <span className="text-xs font-black uppercase text-black">Official Discharge Clearance</span>
              <button onClick={() => setDischargeDoc(null)} className="text-[#86868B] hover:text-black">
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
              <div className="rounded-2xl bg-[#FAFAFC] border border-black/5 p-4 space-y-2">
                <p className="text-sm font-bold text-black">{dischargeDoc.patientName} ({dischargeDoc.mrn})</p>
                <p className="text-[#86868B]">Attending Physician: {dischargeDoc.doctor}</p>
                <div className="pt-2 flex flex-col gap-1.5 border-t border-black/5">
                  <div className="flex justify-between items-center">
                    <span>Financial Ledger Status:</span>
                    <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2 py-0.5 text-[10px] font-bold">
                      {dischargeDoc.billingStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Pharmacy Dispensing:</span>
                    <span className="rounded-full bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3] px-2 py-0.5 text-[10px] font-bold">
                      {dischargeDoc.pharmacyStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                toast.success("Discharge summary printed. Patient cleared.");
                setDischargeDoc(null);
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Printer className="size-4" /> Print Full Discharge Packet
            </button>
          </div>
        </div>
      )}

      {/* Commercial 7-SubTab Navigation Rail */}
      <div className="flex flex-wrap items-center gap-2 border-b border-black/5 pb-4 overflow-x-auto">
        {[
          { id: "overview", label: "Front Desk Dashboard", icon: Building2 },
          { id: "registration", label: "Patient Registration", icon: UserPlus },
          { id: "appointments", label: "Appointments & Calendar", icon: CalendarDays },
          { id: "checkin", label: "Check-In & Tickets", icon: Ticket },
          { id: "waiting", label: "Waiting Room", icon: Clock },
          { id: "admissions", label: "Admissions & Wristband", icon: IdCard },
          { id: "discharge", label: "Discharge Desk", icon: FileCheck },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as SubTab)}
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === tab.id
                ? "bg-black text-white shadow-md scale-105"
                : "bg-white text-[#1D1D1F] border border-black/5 hover:bg-[#F5F5F7]"
            }`}
          >
            <tab.icon className="size-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SUB-TAB 1: FRONT DESK DASHBOARD */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Panel className="min-w-0">
              <Stat label="Today's Appointments" value={apptList.length} hint={day} />
            </Panel>
            <Panel className="min-w-0">
              <Stat
                label="Arrived & Checked In"
                value={apptList.filter((a) => a.status === "arrived").length}
                tone="ok"
              />
            </Panel>
            <Panel className="min-w-0">
              <Stat label="Waiting for Doctor" value={waitingList.length} tone="warn" />
            </Panel>
            <Panel className="min-w-0">
              <Stat
                label="No-Shows"
                value={apptList.filter((a) => a.status === "no_show").length}
                tone="crit"
              />
            </Panel>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            {/* Live Doctor Availability Matrix */}
            <Panel title="Attending Doctor Availability Matrix" subtitle="Real-time consultation status">
              <div className="grid gap-3 sm:grid-cols-3">
                {doctorsList.map((doc) => (
                  <div key={doc.name} className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-black">{doc.room}</span>
                      <StatusPill
                        status={doc.status === "Available" ? "healthy" : doc.status === "In Consultation" ? "busy" : "info"}
                        label={doc.status}
                      />
                    </div>
                    <h4 className="font-bold text-black truncate">{doc.name}</h4>
                    <p className="text-[11px] font-semibold text-[#86868B]">{doc.spec}</p>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Quick Announcement Ticker */}
            <Panel title="Front Desk Announcements" subtitle="Broadcast operational alerts">
              <div className="space-y-3 text-xs font-semibold text-[#1D1D1F]">
                <div className="rounded-2xl border border-[#FFE0B2] bg-[#FFF4E5] p-3.5 space-y-1">
                  <p className="font-bold text-[#B86200] flex items-center gap-1.5">
                    <AlertCircle className="size-4" /> ICU Bed Capacity Notice
                  </p>
                  <p className="text-[11px] text-[#B86200]">ICU currently at 90% capacity. Coordinate elective admissions with Ward Manager.</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-3.5 space-y-1">
                  <p className="font-bold text-black flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-[#34C759]" /> Specialist Clinic Shift
                  </p>
                  <p className="text-[11px] text-[#86868B]">Dr. Getachew Reda starting afternoon clinic at 02:00 PM in Consultation Room 104.</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PATIENT REGISTRATION */}
      {activeTab === "registration" && (
        <div className="mx-auto max-w-4xl space-y-6">
          <Panel title="Comprehensive Patient Registration" subtitle="Creates the permanent digital MRN record">
            <form
              className="space-y-5 text-xs font-semibold text-black"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                registerMut.mutate({
                  fullName: String(form.get("fullName")),
                  dateOfBirth: String(form.get("dateOfBirth")),
                  sex: String(form.get("sex") || "female"),
                  phone: String(form.get("phone") || ""),
                  insuranceProvider: String(form.get("insurance") || ""),
                });
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Full Legal Name *
                  </label>
                  <input
                    name="fullName"
                    type="text"
                    required
                    placeholder="e.g. Abebech Tadesse"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Date of Birth *
                  </label>
                  <input
                    name="dateOfBirth"
                    type="date"
                    required
                    defaultValue="1988-04-12"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Sex at Birth *
                  </label>
                  <select
                    name="sex"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    type="text"
                    placeholder="+251 91 123 4567"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    National ID / Passport Number
                  </label>
                  <input
                    name="nationalId"
                    type="text"
                    placeholder="ETH-9920184"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Insurance Provider
                  </label>
                  <input
                    name="insurance"
                    type="text"
                    placeholder="e.g. Aetna Platinum / Self-Pay"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-black/5 bg-[#FAFAFC] p-4 space-y-2">
                <span className="text-xs font-bold text-black flex items-center gap-2">
                  <FileText className="size-4 text-black" /> Patient Consent & Privacy Agreement
                </span>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#515154] cursor-pointer">
                  <input type="checkbox" required defaultChecked className="rounded border-black/20" />
                  Patient consents to digital health data recording under hospital privacy guidelines.
                </label>
              </div>

              <button
                type="submit"
                disabled={registerMut.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all scale-105 cursor-pointer"
              >
                <UserPlus className="size-4" /> Save Registration & Generate MRN
              </button>
            </form>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 3: APPOINTMENT MANAGEMENT */}
      {activeTab === "appointments" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <Panel
            title="Booked Appointments Calendar"
            subtitle="Scheduled consultations"
            action={
              <input
                type="date"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="rounded-2xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-xs font-bold text-black"
              />
            }
          >
            <div className="divide-y divide-black/5">
              {apptList.map((appointment) => (
                <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="numeric font-black text-black text-sm w-16">
                      {new Date(appointment.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div className="min-w-0">
                      <Link
                        to="/patients/$patientId"
                        params={{ patientId: appointment.patient_id }}
                        className="font-bold text-black hover:underline truncate block text-sm"
                      >
                        {appointment.patients?.full_name ?? "Unknown Patient"}
                      </Link>
                      <p className="text-xs font-medium text-[#86868B] truncate">
                        {appointment.patients?.mrn} · {appointment.departments?.name ?? "General"}
                        {appointment.reason ? ` · ${appointment.reason}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusPill status={appointment.status === "booked" ? "healthy" : "busy"} label={appointment.status} />
                    {appointment.status === "booked" && (
                      <button
                        onClick={() =>
                          checkInMut.mutate({
                            id: appointment.id,
                            patient_id: appointment.patient_id,
                            department_id: appointment.department_id,
                            reason: appointment.reason,
                          })
                        }
                        className="rounded-full bg-black px-3 py-1 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs"
                      >
                        Check In
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {apptList.length === 0 && (
                <p className="py-8 text-center text-xs font-semibold text-[#86868B]">
                  No appointments scheduled for {day}.
                </p>
              )}
            </div>
          </Panel>

          {/* Book New Appointment Sidebar */}
          <Panel title="Schedule New Appointment" subtitle="Book consult time slot">
            <form
              className="space-y-4 text-xs font-semibold text-black"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const pId = String(form.get("patientId"));
                if (!pId) {
                  toast.error("Select a patient");
                  return;
                }
                bookMut.mutate({
                  patientId: pId,
                  departmentId: String(form.get("departmentId")) || null,
                  scheduledAt: String(form.get("scheduledAt")),
                  reason: String(form.get("reason") || ""),
                });
              }}
            >
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  Search & Select Patient *
                </label>
                <select
                  name="patientId"
                  required
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                >
                  <option value="">Select Patient…</option>
                  {(patients.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  Target Department
                </label>
                <select
                  name="departmentId"
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                >
                  <option value="">General Consultation</option>
                  {(departments.data ?? []).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  Date & Time *
                </label>
                <input
                  name="scheduledAt"
                  type="datetime-local"
                  required
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  Reason / Chief Complaint
                </label>
                <input
                  name="reason"
                  type="text"
                  placeholder="e.g. Follow-up consultation, Migraine"
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={bookMut.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                <Calendar className="size-4" /> Confirm Appointment Booking
              </button>
            </form>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 4: CHECK-IN & QUEUE TICKET */}
      {activeTab === "checkin" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="Patient Arrival & Queue Ticket Issuance" subtitle="Identity verification & ticket printing">
            <div className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  Lookup Arriving Patient (Name or MRN)
                </label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 size-4 text-[#86868B]" />
                  <input
                    type="text"
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    placeholder="Type Abebech Tadesse or MRN-8829..."
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] pl-10 p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {(patients.data ?? []).slice(0, 5).map((patient) => (
                  <div
                    key={patient.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#FAFAFC] p-4"
                  >
                    <div>
                      <h4 className="font-extrabold text-black text-sm">{patient.full_name}</h4>
                      <p className="text-xs font-medium text-[#86868B]">
                        MRN: {patient.mrn} · Insured: {patient.insurance_provider ?? "Self-Pay"}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        checkInMut.mutate({
                          id: `walkin-${Date.now()}`,
                          patient_id: patient.id,
                          department_id: null,
                          reason: "Walk-in Triage & Consultation",
                        })
                      }
                      className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all scale-105 cursor-pointer shrink-0"
                    >
                      <Ticket className="size-4" /> Issue Ticket & Check In
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 5: LIVE WAITING ROOM */}
      {activeTab === "waiting" && (
        <div className="space-y-6">
          <Panel title="Live Waiting Room Tracker" subtitle="Patients checked in and awaiting clinician review">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {waitingList.map((encounter) => (
                <div key={encounter.id} className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-[#E5F1FF] text-[#0066CC] border border-[#B8DAFF] px-2.5 py-0.5 text-[10px] font-bold">
                      Waiting Room
                    </span>
                    <span className="text-[10px] font-bold text-[#86868B]">
                      Checked in {new Date(encounter.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-black text-sm">{encounter.patients?.full_name ?? "Patient"}</h4>
                    <p className="text-xs font-semibold text-[#86868B]">{encounter.patients?.mrn}</p>
                  </div>

                  <button
                    onClick={() => {
                      toast.success(`Broadcasting call to ${encounter.patients?.full_name} to Room 101`);
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white py-2 text-xs font-bold text-black hover:bg-[#F5F5F7] shadow-2xs cursor-pointer"
                  >
                    <Volume2 className="size-3.5 text-black" /> Announce Call to Consultation Room
                  </button>
                </div>
              ))}

              {waitingList.length === 0 && (
                <p className="col-span-full py-8 text-center text-xs font-semibold text-[#86868B]">
                  Waiting room clear. All checked-in patients are in consultation.
                </p>
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 6: INPATIENT ADMISSIONS & WRISTBAND */}
      {activeTab === "admissions" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="Hospital Inpatient Admissions & Wristband Generator" subtitle="Assign ward & bed">
            <form
              className="space-y-4 text-xs font-semibold text-black"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const pId = String(form.get("patientId"));
                const pObj = (patients.data ?? []).find((p) => p.id === pId);
                const ward = String(form.get("ward"));
                const bed = String(form.get("bed"));

                setAdmissionWristband({
                  patientName: pObj?.full_name ?? "Abebech Tadesse",
                  mrn: pObj?.mrn ?? "MRN-8829",
                  ward,
                  bed,
                  bloodGroup: pObj?.blood_group ?? "O+",
                  admDate: new Date().toLocaleDateString(),
                });

                toast.success(`Admitted to ${ward} - Bed ${bed}`);
              }}
            >
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  Patient for Admission *
                </label>
                <select
                  name="patientId"
                  required
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                >
                  {(patients.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name} ({p.mrn})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Assign Ward *
                  </label>
                  <select
                    name="ward"
                    required
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                  >
                    <option value="Intensive Care Unit (ICU)">Intensive Care Unit (ICU)</option>
                    <option value="General Medical Ward A">General Medical Ward A</option>
                    <option value="Emergency Ward">Emergency Ward</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Assign Bed Number *
                  </label>
                  <input
                    name="bed"
                    type="text"
                    required
                    defaultValue="Bed-04"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                <IdCard className="size-4" /> Process Admission & Generate Wristband
              </button>
            </form>
          </Panel>
        </div>
      )}

      {/* SUB-TAB 7: DISCHARGE DESK */}
      {activeTab === "discharge" && (
        <div className="mx-auto max-w-3xl space-y-6">
          <Panel title="Discharge Desk & Financial Clearance" subtitle="Verify clearance prior to patient exit">
            <div className="space-y-4">
              <div className="rounded-2xl border border-black/5 bg-[#FAFAFC] p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-black text-sm">Abebech Tadesse (MRN-8829)</h4>
                  <p className="text-xs font-semibold text-[#86868B]">Attending: Dr. Bethlehem Tadesse · Discharged Today</p>
                </div>

                <button
                  onClick={() =>
                    setDischargeDoc({
                      patientName: "Abebech Tadesse",
                      mrn: "MRN-8829",
                      doctor: "Dr. Bethlehem Tadesse",
                      billingStatus: "Copay Paid ($189.00)",
                      pharmacyStatus: "Medications Dispensed (Sumatriptan 50mg)",
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                >
                  <FileCheck className="size-4" /> Verify Clearance & Print Packet
                </button>
              </div>
            </div>
          </Panel>
        </div>
      )}
    </AppShell>
  );
}
