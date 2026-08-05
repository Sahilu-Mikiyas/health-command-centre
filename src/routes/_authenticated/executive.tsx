import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Award,
  Banknote,
  Building2,
  CheckCircle2,
  Clock,
  Cpu,
  DollarSign,
  FileCheck,
  FileSpreadsheet,
  HeartPulse,
  LineChart,
  PieChart,
  Radio,
  ShieldCheck,
  Stethoscope,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";

export const Route = createFileRoute("/_authenticated/executive")({
  head: () => ({
    meta: [
      { title: "Executive Cockpit & CEO | Furii Hospital Prototype" },
      {
        name: "description",
        content:
          "Commercial CEO & Medical Director cockpit: hospital-wide financial KPIs, bed occupancy, clinical mortality metrics & departmental strategic performance.",
      },
    ],
  }),
  component: ExecutiveWorkspace,
});

function ExecutiveWorkspace() {
  return (
    <RouteGuard route="/executive">
      <ExecutiveContent />
    </RouteGuard>
  );
}

function ExecutiveContent() {
  return (
    <AppShell
      title="Chief Executive Officer & Medical Director Cockpit"
      subtitle="Enterprise healthcare analytics · Hospital revenue KPIs · Inpatient bed occupancy · Clinical safety governance"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E5F1FF] border border-[#B8DAFF] px-3.5 py-1 text-xs font-bold text-[#0066CC]">
            <TrendingUp className="size-3.5" /> Enterprise Hospital Performance: EXCELLENT
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Executive High-Level KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Panel className="min-w-0">
            <Stat label="Total Monthly Revenue" value="1,420,000 ETB" hint="+12.4% vs last month" tone="ok" />
          </Panel>
          <Panel className="min-w-0">
            <Stat label="Average Length of Stay (ALOS)" value="3.2 Days" hint="Target < 4.0 Days" tone="ok" />
          </Panel>
          <Panel className="min-w-0">
            <Stat label="30-Day Readmission Rate" value="2.1%" hint="Benchmark < 5.0%" tone="ok" />
          </Panel>
          <Panel className="min-w-0">
            <Stat label="Patient Satisfaction Score" value="96.4 / 100" hint="Press Ganey Index" tone="ok" />
          </Panel>
        </div>

        {/* Strategic Operational Performance Grid */}
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          {/* Departmental KPI Overview */}
          <Panel title="Departmental Performance Matrix" subtitle="Hospital division operational KPIs">
            <div className="space-y-3 text-xs font-semibold">
              {[
                { dept: "Emergency Department (ED)", throughput: "142 Patients / Day", wait: "12 Mins Avg Wait", revenue: "420,000 ETB", status: "Optimal" },
                { dept: "Inpatient Wards & ICU", throughput: "61 Occupied Beds (76%)", wait: "ALOS 3.2 Days", revenue: "650,000 ETB", status: "Optimal" },
                { dept: "Laboratory & Diagnostics", throughput: "180 Tests / Day", wait: "18 Mins Turnaround", revenue: "180,000 ETB", status: "Optimal" },
                { dept: "Radiology & PACS Imaging", throughput: "28 Scans / Day", wait: "14 Mins Turnaround", revenue: "170,000 ETB", status: "Optimal" },
              ].map((d) => (
                <div key={d.dept} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-black/5 bg-[#F5F5F7] p-4">
                  <div>
                    <h4 className="font-black text-black text-sm">{d.dept}</h4>
                    <p className="text-xs text-[#86868B] mt-0.5">{d.throughput} · {d.wait}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-black text-sm block numeric">{d.revenue}</span>
                    <StatusPill status="healthy" label={d.status} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Clinical Quality & Governance */}
          <Panel title="Clinical Quality & Governance" subtitle="Safety metrics & audit compliance">
            <div className="space-y-4 text-xs font-semibold text-[#1D1D1F]">
              <div className="rounded-2xl border border-[#B6ECC3] bg-[#E8F8EC] p-4 space-y-1">
                <span className="font-bold text-[#1D8A39] flex items-center gap-1.5">
                  <ShieldCheck className="size-4" /> Hospital-Acquired Infection Rate
                </span>
                <p className="text-[#1D8A39] text-[11px]">0.0% (Zero HAIs recorded in ICU or Ward A over last 90 days).</p>
              </div>

              <div className="rounded-2xl border border-black/5 bg-[#FAFAFC] p-4 space-y-1">
                <span className="font-bold text-black flex items-center gap-1.5">
                  <FileCheck className="size-4" /> Medical Audit Compliance
                </span>
                <p className="text-[#86868B] text-[11px]">100% of SOAP notes digitally signed and time-stamped in immutable log.</p>
              </div>

              <Link
                to="/command-centre"
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                Open Real-Time Hospital Command Centre →
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
