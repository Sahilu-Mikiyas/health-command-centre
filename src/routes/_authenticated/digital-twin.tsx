import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  BedDouble,
  Building2,
  Cpu,
  Eye,
  HeartPulse,
  Layers,
  ShieldCheck,
  Stethoscope,
  Users,
  Zap,
} from "lucide-react";

import { AppShell } from "@/components/hip/app-shell";
import { Panel } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";

export const Route = createFileRoute("/_authenticated/digital-twin")({
  head: () => ({
    meta: [
      { title: "Digital Twin & Hospital Floorplan | Meridian HIP" },
      {
        name: "description",
        content: "Live 3D-styled hospital digital twin with ward, room, and bed-level operational intelligence.",
      },
    ],
  }),
  component: DigitalTwinWorkspace,
});

function DigitalTwinWorkspace() {
  return (
    <RouteGuard route="/digital-twin">
      <DigitalTwinContent />
    </RouteGuard>
  );
}

function DigitalTwinContent() {
  const [selectedWard, setSelectedWard] = useState("ICU");

  const wards = [
    { name: "Emergency Department", code: "ED", occupied: 42, total: 50, status: "busy", barColor: "bg-[#FF9500]" },
    { name: "Intensive Care Unit", code: "ICU", occupied: 18, total: 20, status: "critical", barColor: "bg-[#FF3B30]" },
    { name: "General Medical Ward A", code: "WARD-A", occupied: 85, total: 100, status: "healthy", barColor: "bg-[#34C759]" },
    { name: "Surgical Suite & OT", code: "OT", occupied: 6, total: 8, status: "busy", barColor: "bg-[#FF9500]" },
  ];

  const icuBeds = [
    { id: "ICU-01", patient: "Abebech Tadesse", status: "Occupied", vitals: "HR 74 · BP 124/82 · NEWS2 1", mrn: "MRN-8829" },
    { id: "ICU-02", patient: "Dawit Yohannes", status: "Occupied", vitals: "HR 88 · BP 138/90 · NEWS2 3", mrn: "MRN-4410" },
    { id: "ICU-03", patient: "Available", status: "Cleaning", vitals: "Sterilization in progress", mrn: "—" },
    { id: "ICU-04", patient: "Available", status: "Vacant", vitals: "Ready for admission", mrn: "—" },
  ];

  return (
    <AppShell
      title="Hospital Isometric Digital Twin"
      subtitle="Spatial floorplan telemetry · Ward occupancy · Real-time bed allocation grid"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8E8ED] border border-black/10 px-3.5 py-1 text-xs font-bold text-black shadow-2xs">
            <Cpu className="size-3.5 text-black" /> 520 Sensor Nodes Active
          </span>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* Central Spatial Digital Twin Visual Floorplan Grid */}
        <div className="space-y-6">
          <div className="apple-card p-8">
            <div className="flex items-center justify-between border-b border-black/5 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#86868B]">Live Spatial Digital Twin</span>
                <h3 className="text-2xl font-black tracking-tight text-black">Furii Hospital Tower 1</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3.5 py-1 text-xs font-bold text-[#1D8A39]">
                  <span className="size-2 rounded-full bg-[#34C759] animate-pulse" /> Live Telemetry
                </span>
              </div>
            </div>

            {/* Pure Apple Light Ward Grid Cards */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {wards.map((ward) => (
                <div
                  key={ward.code}
                  onClick={() => setSelectedWard(ward.code)}
                  className={`group cursor-pointer rounded-2xl border p-5 transition-all duration-200 ${
                    selectedWard === ward.code
                      ? "border-black bg-white shadow-md scale-[1.02]"
                      : "border-black/5 bg-[#F5F5F7] hover:border-black/20 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white border border-black/10 px-2.5 py-0.5 text-[10px] font-bold text-black uppercase shadow-2xs">
                      {ward.code}
                    </span>
                    <span className={`size-2.5 rounded-full ${ward.status === "critical" ? "bg-[#FF3B30]" : ward.status === "busy" ? "bg-[#FF9500]" : "bg-[#34C759]"} animate-pulse`} />
                  </div>
                  <h4 className="mt-3 text-lg font-black text-black">{ward.name}</h4>
                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[#515154]">
                    <span>Occupancy: {ward.occupied}/{ward.total} Beds</span>
                    <span className="text-black font-extrabold">{Math.round((ward.occupied / ward.total) * 100)}%</span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#E8E8ED]">
                    <div
                      className={`h-full ${ward.barColor}`}
                      style={{ width: `${(ward.occupied / ward.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ward Bed Level Grid Detail */}
          <Panel title={`Bed Level Matrix — ${selectedWard} Ward`} subtitle="Click bed cell for patient CV profile link">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {icuBeds.map((bed) => (
                <div key={bed.id} className="rounded-2xl border border-black/5 bg-[#F5F5F7] p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-black">{bed.id}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${bed.status === "Occupied" ? "bg-[#E5F1FF] text-[#0066CC] border border-[#B8DAFF]" : bed.status === "Cleaning" ? "bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2]" : "bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3]"}`}>
                      {bed.status}
                    </span>
                  </div>
                  <h4 className="mt-2 font-bold text-black">{bed.patient}</h4>
                  <p className="text-[11px] font-semibold text-[#86868B] mt-1">{bed.vitals}</p>
                  {bed.status === "Occupied" ? (
                    <Link
                      to="/patients"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-black hover:underline"
                    >
                      <Eye className="size-3" /> View Patient Record
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right Sidebar: Spatial Capacity & Resource Metrics */}
        <div className="space-y-4">
          <Panel title="Capacity Summary" subtitle="Total hospital bed metrics">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <span className="text-xs font-bold text-[#86868B]">Total Monitored Beds</span>
                <span className="text-xl font-black text-black numeric">520</span>
              </div>
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <span className="text-xs font-bold text-[#86868B]">Occupied</span>
                <span className="text-xl font-black text-black numeric">412</span>
              </div>
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <span className="text-xs font-bold text-[#86868B]">Available</span>
                <span className="text-xl font-black text-[#34C759] numeric">88</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#86868B]">In Cleaning / Prep</span>
                <span className="text-xl font-black text-[#FF9500] numeric">20</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
