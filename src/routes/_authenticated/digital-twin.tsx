import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Cpu, Loader2 } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/hip/app-shell";
import { Panel } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { statusFromRatio } from "@/components/hip/status-pill";
import { wardOccupancyQuery, type BedStatus } from "@/lib/hip/clinical-queries";

export const Route = createFileRoute("/_authenticated/digital-twin")({
  head: () => ({
    meta: [
      { title: "Digital Twin & Hospital Floorplan | Meridian HIP" },
      {
        name: "description",
        content:
          "Live 3D-styled hospital digital twin with ward, room, and bed-level operational intelligence.",
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

const BED_TILE: Record<BedStatus, { label: string; tile: string; badge: string }> = {
  occupied: {
    label: "Occupied",
    tile: "bg-[#E5F1FF] border-[#B8DAFF]",
    badge: "bg-[#E5F1FF] text-[#0066CC] border border-[#B8DAFF]",
  },
  available: {
    label: "Available",
    tile: "bg-[#E8F8EC] border-[#B6ECC3]",
    badge: "bg-[#E8F8EC] text-[#1D8A39] border border-[#B6ECC3]",
  },
  cleaning: {
    label: "Cleaning",
    tile: "bg-[#FFF4E5] border-[#FFE0B2]",
    badge: "bg-[#FFF4E5] text-[#B86200] border border-[#FFE0B2]",
  },
  reserved: {
    label: "Reserved",
    tile: "bg-[#F5E8FF] border-[#E4BEFF]",
    badge: "bg-[#F5E8FF] text-[#8922C7] border border-[#E4BEFF]",
  },
  maintenance: {
    label: "Maintenance",
    tile: "bg-[#E8E8ED] border-black/10",
    badge: "bg-[#E8E8ED] text-[#515154] border border-black/10",
  },
};

const STATUS_BAR = {
  critical: "bg-[#FF3B30]",
  busy: "bg-[#FF9500]",
  healthy: "bg-[#34C759]",
} as const;

function DigitalTwinContent() {
  const occupancy = useQuery(wardOccupancyQuery);
  const wards = occupancy.data?.wards ?? [];
  const totals = occupancy.data?.totals;
  const [selectedWardId, setSelectedWardId] = useState<string | null>(null);
  const selectedWard = wards.find((w) => w.id === selectedWardId) ?? wards[0] ?? null;

  return (
    <AppShell
      title="Hospital Isometric Digital Twin"
      subtitle="Spatial floorplan telemetry · Ward occupancy · Real-time bed allocation grid"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8E8ED] border border-black/10 px-3.5 py-1 text-xs font-bold text-black shadow-2xs">
            <Cpu className="size-3.5 text-black" />{" "}
            {totals ? `${totals.total} Beds Monitored` : "Loading beds…"}
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
                <span className="text-xs font-bold uppercase tracking-wider text-[#86868B]">
                  Live Spatial Digital Twin
                </span>
                <h3 className="text-2xl font-black tracking-tight text-black">Ward Floorplan</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3.5 py-1 text-xs font-bold text-[#1D8A39]">
                  <span className="size-2 rounded-full bg-[#34C759] animate-pulse" /> Live Bed Data
                </span>
              </div>
            </div>

            {occupancy.isLoading ? (
              <p className="mt-8 flex items-center gap-2 text-sm font-semibold text-[#86868B]">
                <Loader2 className="size-4 animate-spin" /> Loading wards…
              </p>
            ) : occupancy.isError ? (
              <p className="mt-8 text-sm font-semibold text-[#D70015]">
                Could not load beds: {occupancy.error.message}
              </p>
            ) : wards.length === 0 ? (
              <p className="mt-8 text-sm font-semibold text-[#86868B]">No wards configured</p>
            ) : (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {wards.map((ward) => {
                  const ratio = ward.total > 0 ? ward.occupied / ward.total : 0;
                  const status = statusFromRatio(ratio) as keyof typeof STATUS_BAR;
                  return (
                    <button
                      type="button"
                      key={ward.id}
                      onClick={() => setSelectedWardId(ward.id)}
                      className={`group cursor-pointer rounded-2xl border p-5 text-left transition-all duration-200 ${
                        selectedWard?.id === ward.id
                          ? "border-black bg-white shadow-md scale-[1.02]"
                          : "border-black/5 bg-[#F5F5F7] hover:border-black/20 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-white border border-black/10 px-2.5 py-0.5 text-[10px] font-bold text-black uppercase shadow-2xs">
                          Floor {ward.floor}
                        </span>
                        <span
                          className={`size-2.5 rounded-full ${STATUS_BAR[status]} animate-pulse`}
                        />
                      </div>
                      <h4 className="mt-3 text-lg font-black text-black">{ward.name}</h4>
                      <div className="mt-4 flex items-center justify-between text-xs font-semibold text-[#515154]">
                        <span>
                          Occupancy: {ward.occupied}/{ward.total} Beds
                        </span>
                        <span className="text-black font-extrabold">{ward.occupancyPct}%</span>
                      </div>
                      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[#E8E8ED]">
                        <div
                          className={`h-full ${STATUS_BAR[status]}`}
                          style={{ width: `${ratio * 100}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ward Bed Level Grid Detail */}
          <Panel
            title={selectedWard ? `Bed Level Matrix — ${selectedWard.name}` : "Bed Level Matrix"}
            subtitle="Coloured by live bed status · click a linked patient for their record"
          >
            <div className="mb-4 flex flex-wrap gap-2">
              {(Object.keys(BED_TILE) as BedStatus[]).map((status) => (
                <span
                  key={status}
                  className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${BED_TILE[status].badge}`}
                >
                  {BED_TILE[status].label} {selectedWard ? selectedWard[status] : 0}
                </span>
              ))}
            </div>
            {!selectedWard ? (
              <p className="text-xs font-semibold text-[#86868B]">
                {occupancy.isLoading ? "Loading beds…" : "No ward selected"}
              </p>
            ) : selectedWard.beds.length === 0 ? (
              <p className="text-xs font-semibold text-[#86868B]">No beds in this ward</p>
            ) : (
              <div className="grid max-h-[560px] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-6">
                {selectedWard.beds.map((bed) => (
                  <div
                    key={bed.id}
                    title={`${bed.label} · ${BED_TILE[bed.status].label}`}
                    className={`rounded-xl border p-2.5 shadow-2xs ${BED_TILE[bed.status].tile}`}
                  >
                    <p className="truncate text-[10px] font-bold text-black">
                      {bed.label.replace(`${selectedWard.name} `, "")}
                    </p>
                    <p className="mt-0.5 text-[10px] font-semibold uppercase text-[#515154]">
                      {BED_TILE[bed.status].label}
                    </p>
                    {bed.patient ? (
                      <Link
                        to="/patients/$patientId"
                        params={{ patientId: bed.patient.id }}
                        className="mt-1 block truncate text-[11px] font-bold text-black hover:underline"
                      >
                        {bed.patient.full_name}
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Right Sidebar: Spatial Capacity & Resource Metrics */}
        <div className="space-y-4">
          <Panel title="Capacity Summary" subtitle="Total hospital bed metrics">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <span className="text-xs font-bold text-[#86868B]">Total Monitored Beds</span>
                <span className="text-xl font-black text-black numeric">
                  {totals?.total ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <span className="text-xs font-bold text-[#86868B]">Occupied</span>
                <span className="text-xl font-black text-black numeric">
                  {totals ? `${totals.occupied} (${totals.occupancyPct}%)` : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <span className="text-xs font-bold text-[#86868B]">Available</span>
                <span className="text-xl font-black text-[#34C759] numeric">
                  {totals?.available ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <span className="text-xs font-bold text-[#86868B]">In Cleaning / Prep</span>
                <span className="text-xl font-black text-[#FF9500] numeric">
                  {totals?.cleaning ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#86868B]">Reserved / Maintenance</span>
                <span className="text-xl font-black text-[#8922C7] numeric">
                  {totals ? `${totals.reserved} / ${totals.maintenance}` : "—"}
                </span>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
