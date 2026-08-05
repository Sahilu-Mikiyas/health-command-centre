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
  const [selectedWard, setSelectedWard] = useState("ICU");

  const wards = [
    { name: "Emergency Department", code: "ED", occupied: 42, total: 50, status: "busy", tone: "amber" },
    { name: "Intensive Care Unit", code: "ICU", occupied: 18, total: 20, status: "critical", tone: "rose" },
    { name: "General Medical Ward A", code: "WARD-A", occupied: 85, total: 100, status: "healthy", tone: "emerald" },
    { name: "Surgical Suite & OT", code: "OT", occupied: 6, total: 8, status: "busy", tone: "amber" },
  ];

  const icuBeds = [
    { id: "ICU-01", patient: "Elena Rostova", status: "Occupied", vitals: "HR 74 · BP 124/82 · NEWS2 1", mrn: "MRN-8829" },
    { id: "ICU-02", patient: "Marcus Vance", status: "Occupied", vitals: "HR 88 · BP 138/90 · NEWS2 3", mrn: "MRN-4410" },
    { id: "ICU-03", patient: "Available", status: "Cleaning", vitals: "Sterilization in progress", mrn: "—" },
    { id: "ICU-04", patient: "Available", status: "Vacant", vitals: "Ready for admission", mrn: "—" },
  ];

  return (
    <AppShell
      title="Hospital Isometric Digital Twin"
      subtitle="3D floorplan telemetry · Ward occupancy · Real-time bed allocation grid"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 border border-indigo-200">
            <Cpu className="size-3.5" /> 520 Sensor Nodes Active
          </span>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        {/* Central 3D Digital Twin Visual Floorplan Grid */}
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 p-8 text-white shadow-xl min-h-[460px]">
            {/* Grid canvas overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
            
            <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Live Spatial Digital Twin</span>
                <h3 className="text-2xl font-black tracking-tight">Meridian Hospital Tower 1</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" /> Live Telemetry
                </span>
              </div>
            </div>

            {/* 3D-styled Ward Grid Cards */}
            <div className="relative z-10 mt-8 grid gap-4 sm:grid-cols-2">
              {wards.map((ward) => (
                <div
                  key={ward.code}
                  onClick={() => setSelectedWard(ward.code)}
                  className={`group cursor-pointer rounded-2xl border p-5 transition-all duration-200 ${
                    selectedWard === ward.code
                      ? "border-cyan-400 bg-cyan-950/60 shadow-lg shadow-cyan-500/10 scale-[1.02]"
                      : "border-slate-800 bg-slate-800/60 hover:border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-slate-700/80 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase">
                      {ward.code}
                    </span>
                    <span className={`size-2.5 rounded-full ${ward.status === "critical" ? "bg-rose-500" : ward.status === "busy" ? "bg-amber-400" : "bg-emerald-400"} animate-pulse`} />
                  </div>
                  <h4 className="mt-3 text-lg font-bold">{ward.name}</h4>
                  <div className="mt-4 flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Occupancy: {ward.occupied}/{ward.total} Beds</span>
                    <span className="text-cyan-400">{Math.round((ward.occupied / ward.total) * 100)}%</span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                    <div
                      className={`h-full ${ward.status === "critical" ? "bg-rose-500" : ward.status === "busy" ? "bg-amber-400" : "bg-emerald-400"}`}
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
                <div key={bed.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{bed.id}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${bed.status === "Occupied" ? "bg-indigo-100 text-indigo-800" : bed.status === "Cleaning" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                      {bed.status}
                    </span>
                  </div>
                  <h4 className="mt-2 font-bold text-slate-900">{bed.patient}</h4>
                  <p className="text-[11px] font-medium text-slate-500 mt-1">{bed.vitals}</p>
                  {bed.status === "Occupied" ? (
                    <Link
                      to="/patients/pat-1"
                      className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
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
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-600">Total Monitored Beds</span>
                <span className="text-xl font-black text-slate-900 numeric">520</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-600">Occupied</span>
                <span className="text-xl font-black text-indigo-600 numeric">412</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-600">Available</span>
                <span className="text-xl font-black text-emerald-600 numeric">88</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">In Cleaning / Prep</span>
                <span className="text-xl font-black text-amber-600 numeric">20</span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
