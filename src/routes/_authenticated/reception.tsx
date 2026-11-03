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
  Download,
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
import { HandoffBoard } from "@/components/hip/handoff-board";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";
import { supabase } from "@/integrations/supabase/client";
import { activeEncountersQuery, appointmentsQuery } from "@/lib/hip/clinical-queries";
import { toEthiopianName } from "@/lib/hip/ethiopian-names";
import { staffDirectoryQuery } from "@/lib/hip/hr-queries";
import {
  bookAppointment,
  checkInAppointment,
  checkInWalkIn,
  emitEvent,
  getEncounterSlip,
  registerPatient,
  updateAppointmentStatus,
} from "@/lib/hip/mutations";
import { departmentsQuery, patientsQuery } from "@/lib/hip/queries";
import {
  generateAdmissionSlip,
  generateAppointmentSlip,
  generateQueueTicket,
} from "@/lib/hip/pdf-engine";
import { allocateBed, invoicesQuery, journeyQuery, type JourneyRow } from "@/lib/hip/workflow";

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

function ageFromDob(dob: string | null | undefined) {
  if (!dob) return "—";
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return `${age}y`;
}

const AVAILABILITY_LABEL: Record<string, string> = {
  active: "Available",
  busy: "In Consultation",
  on_call: "On Call",
  on_leave: "On Leave",
  offline: "Offline",
};

type CheckInSlip = Awaited<ReturnType<typeof getEncounterSlip>>;

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
    age: string;
    gender: string;
    diagnosis: string;
    isolation: boolean;
  } | null>(null);

  const [walkInDeptId, setWalkInDeptId] = useState("");
  const [admitWardId, setAdmitWardId] = useState("");

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
  const journey = useQuery({ ...journeyQuery, refetchInterval: 15000 });
  const staff = useQuery(staffDirectoryQuery);
  const wards = useQuery({
    queryKey: ["wards"],
    queryFn: async () => {
      const { data, error } = await supabase.from("wards").select("id,name,floor").order("name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const selectedWardId = admitWardId || wards.data?.[0]?.id || "";
  const availableBeds = useQuery({
    queryKey: ["beds", "available", selectedWardId],
    enabled: !!selectedWardId,
    queryFn: async () => {
      const { data: rooms, error: roomError } = await supabase
        .from("rooms")
        .select("id,name")
        .eq("ward_id", selectedWardId);
      if (roomError) throw new Error(roomError.message);
      const roomIds = (rooms ?? []).map((r) => r.id);
      if (roomIds.length === 0) return [];
      const { data, error } = await supabase
        .from("beds")
        .select("id,label")
        .eq("status", "available")
        .in("room_id", roomIds)
        .order("label")
        .limit(200);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["appointments"] });
    queryClient.invalidateQueries({ queryKey: ["encounters"] });
    queryClient.invalidateQueries({ queryKey: ["events"] });
    queryClient.invalidateQueries({ queryKey: ["patients"] });
    queryClient.invalidateQueries({ queryKey: ["workflow"] });
    queryClient.invalidateQueries({ queryKey: ["beds"] });
  };

  // Mutations
  const registerMut = useMutation({
    mutationFn: async ({
      nationalId,
      consent,
      ...input
    }: Parameters<typeof registerPatient>[0] & { nationalId: string; consent: boolean }) => {
      const patient = await registerPatient(input);
      // patients has no national-ID column: the consent record (and ID) lives on the audit stream.
      await emitEvent({
        eventType: "patient.consent_recorded",
        departmentCode: "RECEPTION",
        entityType: "patient",
        entityId: patient.id,
        payload: {
          mrn: patient.mrn,
          national_id: nationalId || null,
          data_recording_consent: consent,
          consent_text:
            "Patient consents to digital health data recording under hospital privacy guidelines.",
          recorded_at: new Date().toISOString(),
        },
      });
      return patient;
    },
    onSuccess: (data) => {
      toast.success(`Registered ${data.full_name} with MRN ${data.mrn}`);
      invalidate();
      setPatientSearch(data.mrn);
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

  // The slip is read back from the stored encounter so ticket + MRN match the database.
  const showCheckInSlip = (slip: CheckInSlip) => {
    const pName = toEthiopianName(slip.patients?.full_name ?? "Patient");
    const ticketNo = slip.queue_ticket ?? "—";
    setPrintedTicket({
      ticketNo,
      patientName: pName,
      mrn: slip.patients?.mrn ?? "—",
      dept: slip.departments?.name ?? "General Consultation",
      time: new Date(slip.started_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
    toast.success(`Checked in ${pName}. Ticket ${ticketNo} issued.`);
    invalidate();
  };

  const checkInMut = useMutation({
    mutationFn: async (appointment: Parameters<typeof checkInAppointment>[0]) =>
      getEncounterSlip((await checkInAppointment(appointment)).id),
    onSuccess: showCheckInSlip,
    onError: (err: Error) => toast.error(err.message),
  });

  const walkInMut = useMutation({
    mutationFn: async (input: Parameters<typeof checkInWalkIn>[0]) =>
      getEncounterSlip((await checkInWalkIn(input)).id),
    onSuccess: showCheckInSlip,
    onError: (err: Error) => toast.error(err.message),
  });

  const announceMut = useMutation({
    mutationFn: async (input: {
      encounterId: string;
      ticket: string | null;
      patientName: string;
      mrn: string | null;
      destination: string;
    }) => {
      await emitEvent({
        eventType: "queue.called",
        departmentCode: "RECEPTION",
        entityType: "encounter",
        entityId: input.encounterId,
        payload: {
          ticket: input.ticket,
          patient: input.patientName,
          mrn: input.mrn,
          destination: input.destination,
        },
      });
      return input;
    },
    onSuccess: (input) => {
      toast.success(
        `Calling ${input.ticket ? `ticket ${input.ticket} — ` : ""}${input.patientName} to ${input.destination}`,
      );
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const admitMut = useMutation({
    mutationFn: async (input: {
      encounterId: string;
      patientId: string;
      bedId: string;
      bedLabel: string;
      wardName: string;
      isolation: boolean;
      chiefComplaint: string | null;
    }) => {
      await allocateBed({
        encounterId: input.encounterId,
        patientId: input.patientId,
        bedId: input.bedId,
        isolation: input.isolation,
      });
      const { data: patient, error } = await supabase
        .from("patients")
        .select("full_name,mrn,sex,date_of_birth,blood_group")
        .eq("id", input.patientId)
        .single();
      if (error) throw new Error(error.message);
      return { input, patient };
    },
    onSuccess: ({ input, patient }) => {
      setAdmissionWristband({
        patientName: toEthiopianName(patient.full_name),
        mrn: patient.mrn,
        ward: input.wardName,
        bed: input.bedLabel,
        bloodGroup: patient.blood_group ?? "Unknown",
        admDate: new Date().toLocaleDateString(),
        age: ageFromDob(patient.date_of_birth),
        gender: patient.sex,
        diagnosis: input.chiefComplaint ?? "—",
        isolation: input.isolation,
      });
      toast.success(`Admitted to ${input.wardName} · ${input.bedLabel}`);
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

  const deptName = (id: string | null | undefined) =>
    (departments.data ?? []).find((d) => d.id === id)?.name ?? null;

  const doctorsList = (staff.data ?? [])
    .filter((s) => s.role === "doctor")
    .slice(0, 6)
    .map((s) => ({
      id: s.id,
      name: s.full_name,
      spec: s.job_title,
      status: AVAILABILITY_LABEL[s.availability] ?? s.availability,
      room: deptName(s.department_id) ?? "Clinic",
    }));

  const journeyById = new Map((journey.data ?? []).map((j) => [j.id, j]));
  // Admission candidates: live encounters not yet holding a bed.
  const admissionCandidates = (journey.data ?? []).filter(
    (j) => !j.bed_id && j.stage !== "complete" && j.stage !== "billing",
  );
  const nextSlipAppointment = apptList.find((a) => a.status === "booked") ?? apptList[0] ?? null;

  return (
    <AppShell
      title="Receptionist & Front Desk Workspace"
      subtitle="Complete Patient Arrival, Registration, Check-in, Admissions & Discharge Suite"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (!nextSlipAppointment) {
                toast.error(`No appointments on ${day} to print a slip for.`);
                return;
              }
              const when = new Date(nextSlipAppointment.scheduled_at);
              generateAppointmentSlip({
                patientName: nextSlipAppointment.patients?.full_name ?? "Patient",
                mrn: nextSlipAppointment.patients?.mrn ?? "—",
                appointmentDate: when.toLocaleDateString(),
                appointmentTime: when.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                department: nextSlipAppointment.departments?.name ?? "General Consultation",
                physician: "Assigned at triage",
                room: "Reception will direct you",
                ...(nextSlipAppointment.reason ? { notes: nextSlipAppointment.reason } : {}),
              });
            }}
            title={
              nextSlipAppointment
                ? `Slip for ${nextSlipAppointment.patients?.full_name ?? "next patient"}`
                : "No appointments for this day"
            }
            className="inline-flex items-center gap-1.5 rounded-2xl border border-black/10 bg-[#F5F5F7] px-3.5 py-2 text-xs font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
          >
            <Download className="size-3.5" /> Download Slip PDF
          </button>
          <button
            onClick={() => setActiveTab("registration")}
            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all scale-105 cursor-pointer"
          >
            <UserPlus className="size-3.5" /> Register New Patient
          </button>
        </div>
      }
    >
      <HandoffBoard role="reception" />
      {/* Printable Ticket Modal */}
      {printedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="apple-card max-w-sm w-full p-6 text-center space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <span className="text-xs font-black uppercase text-black">Queue Ticket Issued</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    generateQueueTicket({
                      ticketNumber: printedTicket.ticketNo,
                      patientName: printedTicket.patientName,
                      mrn: printedTicket.mrn,
                      department: printedTicket.dept,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                  title="Download PDF"
                >
                  <Download className="size-3" /> PDF
                </button>
                <button onClick={() => setPrintedTicket(null)} className="text-[#86868B] hover:text-black">
                  <X className="size-4" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-black/10 bg-[#FAFAFC] p-6 space-y-3">
              <span className="rounded-full bg-black text-white px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                Furii Hospital Queue
              </span>
              <h2 className="text-4xl font-black text-black numeric">{printedTicket.ticketNo}</h2>
              <p className="text-sm font-bold text-black">{printedTicket.patientName}</p>
              <p className="text-xs font-semibold text-[#86868B]">
                {printedTicket.mrn} · {printedTicket.dept} · {printedTicket.time}
              </p>
              <div className="pt-2 border-t border-black/5 flex items-center justify-center gap-2 text-[10px] font-bold text-[#86868B]">
                <QrCode className="size-8 text-black" />
                <span>Scan for Live Queue Position</span>
              </div>
            </div>

            <button
              onClick={() => {
                generateQueueTicket({
                  ticketNumber: printedTicket.ticketNo,
                  patientName: printedTicket.patientName,
                  mrn: printedTicket.mrn,
                  department: printedTicket.dept,
                });
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
                generateAdmissionSlip({
                  patientName: admissionWristband.patientName,
                  mrn: admissionWristband.mrn,
                  age: admissionWristband.age,
                  gender: admissionWristband.gender,
                  ward: admissionWristband.ward,
                  bed: admissionWristband.bed,
                  admittingDoctor: "Per encounter record",
                  primaryNurse: "Ward duty nurse",
                  admissionDate: admissionWristband.admDate,
                  diagnosis: admissionWristband.diagnosis,
                  isolation: admissionWristband.isolation ? "Isolation required" : "None",
                });
                setAdmissionWristband(null);
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Printer className="size-4" /> Print Admission Slip & Wristband
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
                {doctorsList.length === 0 && (
                  <p className="col-span-full py-6 text-center text-xs font-semibold text-[#86868B]">
                    {staff.isLoading
                      ? "Loading doctor roster…"
                      : "No doctors on the staff roster yet."}
                  </p>
                )}
                {doctorsList.map((doc) => (
                  <div
                    key={doc.id}
                    className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-black truncate">{doc.room}</span>
                      <StatusPill
                        status={
                          doc.status === "Available"
                            ? "healthy"
                            : doc.status === "Offline" || doc.status === "On Leave"
                              ? "offline"
                              : "busy"
                        }
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
                  nationalId: String(form.get("nationalId") || "").trim(),
                  consent: form.get("consent") === "on",
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
                  <input
                    name="consent"
                    type="checkbox"
                    required
                    defaultChecked
                    className="rounded border-black/20"
                  />
                  Patient consents to digital health data recording under hospital privacy
                  guidelines.
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
                    <button
                      onClick={() => {
                        const apt = appointment as any;
                        generateAppointmentSlip({
                          patientName: apt.patient_name || apt.patients?.full_name || apt.name || "Patient",
                          mrn: apt.mrn || apt.patients?.mrn || "N/A",
                          appointmentDate: apt.date || apt.scheduled_date || (apt.scheduled_at ? new Date(apt.scheduled_at).toLocaleDateString() : day),
                          appointmentTime: apt.time || (apt.scheduled_at ? new Date(apt.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""),
                          department: apt.department || apt.departments?.name || "",
                          physician: apt.doctor || apt.physician || "",
                          room: apt.room || "TBD",
                        });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                      title="Download PDF"
                    >
                      <Download className="size-3" /> PDF
                    </button>
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
                    placeholder="Type patient name or MRN…"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] pl-10 p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  Walk-in Department
                </label>
                <select
                  value={walkInDeptId}
                  onChange={(e) => setWalkInDeptId(e.target.value)}
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

              <div className="space-y-3">
                {!patients.isLoading && (patients.data ?? []).length === 0 && (
                  <div className="rounded-2xl border border-dashed border-black/10 bg-[#FAFAFC] p-5 text-center space-y-3">
                    <p className="text-xs font-semibold text-[#86868B]">
                      No registered patient matches “{patientSearch}”. Walk-ins must be registered
                      before a ticket can be issued.
                    </p>
                    <button
                      onClick={() => setActiveTab("registration")}
                      className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
                    >
                      <UserPlus className="size-4" /> Register New Patient
                    </button>
                  </div>
                )}
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
                        walkInMut.mutate({
                          patientId: patient.id,
                          departmentId: walkInDeptId || null,
                          reason: "Walk-in Triage & Consultation",
                        })
                      }
                      disabled={walkInMut.isPending}
                      className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all scale-105 cursor-pointer shrink-0 disabled:opacity-50"
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
              {waitingList.map((encounter) => {
                const ticket = journeyById.get(encounter.id)?.queue_ticket ?? null;
                const destination = encounter.departments?.name ?? "Nurse Triage";
                return (
                  <div
                    key={encounter.id}
                    className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-[#E5F1FF] text-[#0066CC] border border-[#B8DAFF] px-2.5 py-0.5 text-[10px] font-bold">
                        {ticket ? `Ticket ${ticket}` : "Waiting Room"}
                      </span>
                      <span className="text-[10px] font-bold text-[#86868B]">
                        Checked in{" "}
                        {new Date(encounter.started_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-black text-sm">
                        {encounter.patients?.full_name ?? "Patient"}
                      </h4>
                      <p className="text-xs font-semibold text-[#86868B]">
                        {encounter.patients?.mrn}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        announceMut.mutate({
                          encounterId: encounter.id,
                          ticket,
                          patientName: encounter.patients?.full_name ?? "Patient",
                          mrn: encounter.patients?.mrn ?? null,
                          destination,
                        })
                      }
                      disabled={announceMut.isPending}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-black/10 bg-white py-2 text-xs font-bold text-black hover:bg-[#F5F5F7] shadow-2xs cursor-pointer disabled:opacity-50"
                    >
                      <Volume2 className="size-3.5 text-black" /> Announce Call to {destination}
                    </button>
                  </div>
                );
              })}

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
                const encounterId = String(form.get("encounterId") || "");
                const bedId = String(form.get("bedId") || "");
                const enc = admissionCandidates.find((j) => j.id === encounterId);
                const bed = (availableBeds.data ?? []).find((b) => b.id === bedId);
                const ward = (wards.data ?? []).find((w) => w.id === selectedWardId);
                if (!enc || !bed || !ward) {
                  toast.error("Select a checked-in patient, a ward and an available bed");
                  return;
                }
                admitMut.mutate({
                  encounterId: enc.id,
                  patientId: enc.patient_id,
                  bedId: bed.id,
                  bedLabel: bed.label,
                  wardName: ward.name,
                  isolation: form.get("isolation") === "on",
                  chiefComplaint: enc.chief_complaint,
                });
              }}
            >
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  Patient for Admission *
                </label>
                <select
                  name="encounterId"
                  required
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                >
                  <option value="">Select checked-in patient…</option>
                  {admissionCandidates.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.patients?.full_name ?? "Patient"} ({j.patients?.mrn ?? "—"}) · {j.stage}
                    </option>
                  ))}
                </select>
                {!journey.isLoading && admissionCandidates.length === 0 && (
                  <p className="text-[11px] font-medium text-[#86868B]">
                    No checked-in patients without a bed. Check the patient in first.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Assign Ward *
                  </label>
                  <select
                    name="wardId"
                    required
                    value={selectedWardId}
                    onChange={(e) => setAdmitWardId(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                  >
                    {(wards.data ?? []).map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} · Floor {w.floor}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                    Available Bed * ({(availableBeds.data ?? []).length} free)
                  </label>
                  <select
                    key={selectedWardId}
                    name="bedId"
                    required
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                  >
                    <option value="">
                      {availableBeds.isLoading ? "Loading beds…" : "Select bed…"}
                    </option>
                    {(availableBeds.data ?? []).map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-[#515154] cursor-pointer">
                <input name="isolation" type="checkbox" className="rounded border-black/20" />
                Isolation precautions required
              </label>

              <button
                type="submit"
                disabled={admitMut.isPending}
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
          <Panel
            title="Discharge Desk & Financial Clearance"
            subtitle="Verify clearance prior to patient exit"
          >
            <DischargeDeskList journey={journey.data ?? []} onOpen={setDischargeDoc} />
          </Panel>
        </div>
      )}
    </AppShell>
  );
}

/* ------------------------------ Discharge desk ------------------------------ */

type DischargeDocInput = {
  patientName: string;
  mrn: string;
  doctor: string;
  billingStatus: string;
  pharmacyStatus: string;
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Awaiting Payment",
  paid: "Paid",
  cleared: "Cleared & Discharged",
  draft: "Draft",
};

const etbAmount = (value: number) =>
  `${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })} ETB`;

/** Real encounters at billing / discharge, with their invoice amounts in ETB. */
function DischargeDeskList({
  journey,
  onOpen,
}: {
  journey: JourneyRow[];
  onOpen: (doc: DischargeDocInput) => void;
}) {
  const invoices = useQuery({ ...invoicesQuery, refetchInterval: 15000 });
  const invoiceRows = invoices.data ?? [];
  const invoicedEncounters = new Set(invoiceRows.map((inv) => inv.encounter_id).filter(Boolean));
  const openByEncounter = new Map(journey.map((row) => [row.id, row]));

  const awaitingInvoice = journey.filter(
    (row) => row.stage === "billing" && !invoicedEncounters.has(row.id),
  );
  const invoiceItems = invoiceRows.filter((inv) => {
    const encounter = inv.encounter_id ? openByEncounter.get(inv.encounter_id) : undefined;
    return (
      inv.status === "cleared" || encounter?.stage === "billing" || encounter?.stage === "complete"
    );
  });

  if (invoices.isLoading) {
    return (
      <p className="text-xs font-semibold text-[#86868B]">Loading billing & discharge queue…</p>
    );
  }
  if (invoiceItems.length === 0 && awaitingInvoice.length === 0) {
    return (
      <p className="text-xs font-semibold text-[#86868B]">
        No patients at billing or discharge right now.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {invoiceItems.map((inv) => {
        const balance = Math.max(Number(inv.patient_due || 0) - Number(inv.paid_amount || 0), 0);
        const statusLabel = INVOICE_STATUS_LABEL[inv.status] ?? inv.status;
        const name = inv.patients?.full_name ?? "Unknown patient";
        const mrn = inv.patients?.mrn ?? "—";
        return (
          <div
            key={inv.id}
            className="rounded-2xl border border-black/5 bg-[#FAFAFC] p-4 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <h4 className="font-extrabold text-black text-sm">
                {name} ({mrn})
              </h4>
              <p className="text-xs font-semibold text-[#86868B]">
                {statusLabel} · Patient due {etbAmount(inv.patient_due)} · Paid{" "}
                {etbAmount(inv.paid_amount)}
                {balance > 0 ? ` · Balance ${etbAmount(balance)}` : ""}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onOpen({
                  patientName: name,
                  mrn,
                  doctor: "See clinical record",
                  billingStatus: `${statusLabel} (${etbAmount(inv.paid_amount)} of ${etbAmount(inv.patient_due)} paid)`,
                  pharmacyStatus: "Pharmacy handoff complete",
                })
              }
              className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer shrink-0"
            >
              <FileCheck className="size-4" /> Verify Clearance & Print Packet
            </button>
          </div>
        );
      })}

      {awaitingInvoice.map((row) => (
        <div
          key={row.id}
          className="rounded-2xl border border-black/5 bg-[#FAFAFC] p-4 flex items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <h4 className="font-extrabold text-black text-sm">
              {row.patients?.full_name ?? "Unknown patient"} ({row.patients?.mrn ?? "—"})
            </h4>
            <p className="text-xs font-semibold text-[#86868B]">
              At billing · Invoice not yet generated
              {row.departments ? ` · ${row.departments.name}` : ""}
            </p>
          </div>
          <StatusPill status="busy" label="Awaiting invoice" />
        </div>
      ))}
    </div>
  );
}
