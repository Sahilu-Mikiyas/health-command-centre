import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  DoorOpen,
  FileCheck,
  HeartPulse,
  Printer,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { HandoffBoard } from "@/components/hip/handoff-board";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";

export const Route = createFileRoute("/_authenticated/ward")({
  head: () => ({
    meta: [
      { title: "Ward & Bed Management | Furii Hospital Prototype" },
      {
        name: "description",
        content:
          "Commercial ward manager workspace: bed occupancy matrix, inpatient admissions, isolation flags, nurse shift roster & bed transfers.",
      },
    ],
  }),
  component: WardWorkspace,
});

function WardWorkspace() {
  return (
    <RouteGuard route="/ward">
      <WardContent />
    </RouteGuard>
  );
}

function WardContent() {
  const [selectedWard, setSelectedWard] = useState("ICU Tower 1");

  const wards = [
    { name: "ICU Tower 1", totalBeds: 10, occupied: 8, isolation: 1, nurseRatio: "1:2" },
    { name: "Surgical Ward A", totalBeds: 24, occupied: 18, isolation: 2, nurseRatio: "1:5" },
    { name: "Pediatric Ward B", totalBeds: 16, occupied: 10, isolation: 0, nurseRatio: "1:4" },
    { name: "General Medical Ward C", totalBeds: 30, occupied: 25, isolation: 3, nurseRatio: "1:6" },
  ];

  const beds = [
    { bedNo: "ICU-01", patient: "Abebech Tadesse", mrn: "MRN-8829", status: "Occupied", diagnosis: "Acute Migraine & CKD Stage 3a", nurse: "Nurse Tigist", isolation: false },
    { bedNo: "ICU-02", patient: "Dawit Yohannes", mrn: "MRN-4410", status: "Occupied", diagnosis: "Post-Op Appendectomy", nurse: "Nurse Dawit", isolation: true },
    { bedNo: "ICU-03", patient: "Available", mrn: "—", status: "Cleaned & Ready", diagnosis: "—", nurse: "Unassigned", isolation: false },
    { bedNo: "ICU-04", patient: "Available", mrn: "—", status: "Cleaned & Ready", diagnosis: "—", nurse: "Unassigned", isolation: false },
  ];

  return (
    <AppShell
      title="Ward & Bed Operations Mission Control"
      subtitle="Inpatient bed occupancy matrix · Infection isolation flags · Nurse shift assignments · Discharge preparation"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3.5 py-1 text-xs font-bold text-[#1D8A39]">
            <Building2 className="size-3.5" /> 82% Overall Bed Occupancy
          </span>
        </div>
      }
    >
      <HandoffBoard role="ward" />
      <div className="space-y-6">
        {/* Ward Overview Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Panel className="min-w-0">
            <Stat label="Total Beds Occupied" value="61 / 80" hint="76.2% Rate" tone="ok" />
          </Panel>
          <Panel className="min-w-0">
            <Stat label="Clean & Available" value="19 Beds" hint="Immediate admission" tone="ok" />
          </Panel>
          <Panel className="min-w-0">
            <Stat label="Infection Isolation" value="6 Patients" hint="Negative pressure rooms" tone="warn" />
          </Panel>
          <Panel className="min-w-0">
            <Stat label="Pending Transfers" value="2 Patients" hint="ICU → General Ward" />
          </Panel>
        </div>

        {/* Ward Selection & Bed Matrix Grid */}
        <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
          <Panel title="Hospital Units & Wards" subtitle="Select active inpatient unit">
            <div className="space-y-2">
              {wards.map((w) => (
                <button
                  key={w.name}
                  onClick={() => setSelectedWard(w.name)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                    selectedWard === w.name
                      ? "border-black bg-black text-white shadow-md scale-105"
                      : "border-black/5 bg-[#FAFAFC] text-black hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm">{w.name}</span>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      selectedWard === w.name ? "bg-white text-black" : "bg-black/10 text-black"
                    }`}>
                      {w.occupied}/{w.totalBeds} Beds
                    </span>
                  </div>
                  <p className={`text-xs mt-1 font-semibold ${selectedWard === w.name ? "text-slate-300" : "text-[#86868B]"}`}>
                    Nurse Ratio: {w.nurseRatio} · Isolation: {w.isolation}
                  </p>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title={`${selectedWard} Bed Occupancy Matrix`} subtitle="Bed status, patient assignments & nurse coverage">
            <div className="grid gap-4 sm:grid-cols-2">
              {beds.map((b) => (
                <div key={b.bedNo} className="rounded-2xl border border-black/10 bg-white p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-black text-white px-3 py-1 text-xs font-bold">
                      {b.bedNo}
                    </span>
                    <StatusPill status={b.status === "Occupied" ? "busy" : "healthy"} label={b.status} />
                  </div>

                  <div>
                    <h4 className="font-black text-black text-base">{b.patient}</h4>
                    <p className="text-xs font-semibold text-[#86868B]">{b.mrn}</p>
                  </div>

                  <div className="rounded-xl bg-[#F5F5F7] p-3 text-xs space-y-1 font-semibold">
                    <p className="text-black">Diagnosis: {b.diagnosis}</p>
                    <p className="text-[#86868B]">Assigned Nurse: {b.nurse}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => toast.success(`Bed transfer requested for ${b.patient} (${b.bedNo}).`)}
                      className="flex-1 rounded-xl bg-black py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs"
                    >
                      Transfer Bed
                    </button>
                    <button
                      onClick={() => toast.success(`Printed bed tag label for ${b.bedNo}.`)}
                      className="rounded-xl border border-black/10 bg-[#F5F5F7] p-2 text-black hover:bg-white transition-colors"
                      title="Print Bed Tag"
                    >
                      <Printer className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
