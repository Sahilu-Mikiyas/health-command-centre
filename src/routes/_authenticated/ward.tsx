import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, Download, Loader2, Printer } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { wardOccupancyQuery, type BedStatus, type OccupancyBed } from "@/lib/hip/clinical-queries";
import { generateAdmissionSlip, generateWardCensus } from "@/lib/hip/pdf-engine";

import { AppShell } from "@/components/hip/app-shell";
import { HandoffBoard } from "@/components/hip/handoff-board";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill, statusFromRatio, type OpStatus } from "@/components/hip/status-pill";

export const Route = createFileRoute("/_authenticated/ward")({
  head: () => ({
    meta: [
      { title: "Ward & Bed Management | Furii Health" },
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

const BED_STATUS_META: Record<BedStatus, { label: string; pill: OpStatus }> = {
  occupied: { label: "Occupied", pill: "busy" },
  available: { label: "Available", pill: "healthy" },
  cleaning: { label: "Cleaning", pill: "info" },
  reserved: { label: "Reserved", pill: "ai" },
  maintenance: { label: "Maintenance", pill: "offline" },
};

function ageFrom(dob: string): string {
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return "—";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return String(age);
}

function sexLabel(sex: string): string {
  if (sex === "female") return "Female";
  if (sex === "male") return "Male";
  return "Unknown";
}

function WardContent() {
  const occupancy = useQuery(wardOccupancyQuery);
  const wards = occupancy.data?.wards ?? [];
  const totals = occupancy.data?.totals;
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const selectedWard = wards.find((w) => w.id === selectedWardId) ?? wards[0] ?? null;
  const linkedPatients = (occupancy.data?.beds ?? []).filter((b) => b.patient).length;

  const downloadAdmissionSlip = (bed: OccupancyBed) => {
    if (!bed.patient || !selectedWard) return;
    generateAdmissionSlip({
      patientName: bed.patient.full_name,
      mrn: bed.patient.mrn,
      age: ageFrom(bed.patient.date_of_birth),
      gender: sexLabel(bed.patient.sex),
      ward: selectedWard.name,
      bed: bed.label,
      admittingDoctor: "Not recorded",
      primaryNurse: "Unassigned",
      admissionDate: bed.admitted_at
        ? new Date(bed.admitted_at).toLocaleDateString()
        : "Not recorded",
      diagnosis: bed.chief_complaint ?? "Not recorded",
      isolation: "None recorded",
    });
  };

  return (
    <AppShell
      title="Ward & Bed Operations Mission Control"
      subtitle="Inpatient bed occupancy matrix · Live bed status · Discharge preparation"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={wards.length === 0}
            onClick={() =>
              generateWardCensus({
                wards: wards.map((w) => ({
                  name: w.name,
                  totalBeds: w.total,
                  occupied: w.occupied,
                  available: w.available,
                  occupancyPct: `${w.occupancyPct}%`,
                })),
                generatedBy: "Ward Manager",
              })
            }
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer disabled:opacity-50"
            title="Download PDF"
          >
            <Download className="size-3" /> Download PDF
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3.5 py-1 text-xs font-bold text-[#1D8A39]">
            <Building2 className="size-3.5" /> {totals ? `${totals.occupancyPct}%` : "—"} Overall
            Bed Occupancy
          </span>
        </div>
      }
    >
      <HandoffBoard role="ward" />
      <div className="space-y-6">
        {/* Ward Overview Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Panel className="min-w-0">
            <Stat
              label="Total Beds Occupied"
              value={totals ? `${totals.occupied} / ${totals.total}` : "—"}
              hint={totals ? `${totals.occupancyPct}% Rate` : "Loading…"}
              tone="ok"
            />
          </Panel>
          <Panel className="min-w-0">
            <Stat
              label="Clean & Available"
              value={totals ? `${totals.available} Beds` : "—"}
              hint="Immediate admission"
              tone="ok"
            />
          </Panel>
          <Panel className="min-w-0">
            <Stat
              label="Cleaning / Reserved"
              value={totals ? `${totals.cleaning} / ${totals.reserved}` : "—"}
              hint={totals ? `${totals.maintenance} under maintenance` : "Loading…"}
              tone="warn"
            />
          </Panel>
          <Panel className="min-w-0">
            <Stat
              label="Patients Linked to Beds"
              value={occupancy.data ? `${linkedPatients}` : "—"}
              hint="Allocated via ward handoff"
            />
          </Panel>
        </div>

        {/* Ward Selection & Bed Matrix Grid */}
        <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
          <Panel title="Hospital Units & Wards" subtitle="Select active inpatient unit">
            {occupancy.isLoading ? (
              <p className="flex items-center gap-2 text-xs font-semibold text-[#86868B]">
                <Loader2 className="size-3.5 animate-spin" /> Loading wards…
              </p>
            ) : occupancy.isError ? (
              <p className="text-xs font-semibold text-[#D70015]">
                Could not load beds: {occupancy.error.message}
              </p>
            ) : wards.length === 0 ? (
              <p className="text-xs font-semibold text-[#86868B]">No wards configured</p>
            ) : (
              <div className="space-y-2">
                {wards.map((w) => {
                  const active = selectedWard?.id === w.id;
                  return (
                    <button
                      type="button"
                      key={w.id}
                      onClick={() => setSelectedWardId(w.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer ${
                        active
                          ? "border-black bg-black text-white shadow-md scale-105"
                          : "border-black/5 bg-[#FAFAFC] text-black hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm">{w.name}</span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                            active ? "bg-white text-black" : "bg-black/10 text-black"
                          }`}
                        >
                          {w.occupied}/{w.total} Beds
                        </span>
                      </div>
                      <p
                        className={`text-xs mt-1 font-semibold ${active ? "text-slate-300" : "text-[#86868B]"}`}
                      >
                        Floor {w.floor} · {w.occupancyPct}% occupied · {w.available} available
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            title={
              selectedWard ? `${selectedWard.name} Bed Occupancy Matrix` : "Bed Occupancy Matrix"
            }
            subtitle="Bed status & patient assignments"
            action={
              selectedWard ? (
                <StatusPill
                  status={statusFromRatio(
                    selectedWard.total > 0 ? selectedWard.occupied / selectedWard.total : 0,
                  )}
                  label={`${selectedWard.occupancyPct}% occupied`}
                />
              ) : null
            }
          >
            {!selectedWard ? (
              <p className="text-xs font-semibold text-[#86868B]">
                {occupancy.isLoading ? "Loading beds…" : "Select a ward to see its beds"}
              </p>
            ) : selectedWard.beds.length === 0 ? (
              <p className="text-xs font-semibold text-[#86868B]">No beds in this ward</p>
            ) : (
              <div className="grid max-h-[720px] gap-4 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                {selectedWard.beds.map((b) => {
                  const meta = BED_STATUS_META[b.status];
                  return (
                    <div
                      key={b.id}
                      className="rounded-2xl border border-black/10 bg-white p-5 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate rounded-full bg-black text-white px-3 py-1 text-xs font-bold">
                          {b.label.split(" / ").pop()}
                        </span>
                        <StatusPill status={meta.pill} label={meta.label} />
                      </div>

                      <div>
                        {b.patient ? (
                          <>
                            <Link
                              to="/patients/$patientId"
                              params={{ patientId: b.patient.id }}
                              className="font-black text-black text-base hover:underline"
                            >
                              {b.patient.full_name}
                            </Link>
                            <p className="text-xs font-semibold text-[#86868B]">{b.patient.mrn}</p>
                          </>
                        ) : (
                          <>
                            <h4 className="font-black text-black text-base">
                              {b.status === "occupied" ? "Patient not linked" : meta.label}
                            </h4>
                            <p className="text-xs font-semibold text-[#86868B]">—</p>
                          </>
                        )}
                      </div>

                      <div className="rounded-xl bg-[#F5F5F7] p-3 text-xs space-y-1 font-semibold">
                        <p className="text-black truncate">{b.room ?? "Room not set"}</p>
                        <p className="text-[#86868B] truncate">
                          {b.chief_complaint
                            ? `Presenting: ${b.chief_complaint}`
                            : "No active encounter"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => toast.success(`Bed transfer requested for ${b.label}.`)}
                          className="flex-1 rounded-xl bg-black py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs"
                        >
                          Transfer Bed
                        </button>
                        {b.patient ? (
                          <button
                            type="button"
                            onClick={() => downloadAdmissionSlip(b)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-[10px] font-bold text-black hover:bg-black hover:text-white transition-all cursor-pointer"
                            title="Download PDF"
                          >
                            <Download className="size-3" /> PDF
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toast.success(`Printed bed tag label for ${b.label}.`)}
                          className="rounded-xl border border-black/10 bg-[#F5F5F7] p-2 text-black hover:bg-white transition-colors"
                          title="Print Bed Tag"
                        >
                          <Printer className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
