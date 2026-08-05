import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  FileSpreadsheet,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";

export const Route = createFileRoute("/_authenticated/hr")({
  head: () => ({
    meta: [
      { title: "HR & Staff Operations | Furii Hospital Prototype" },
      {
        name: "description",
        content:
          "Commercial HR workspace: medical license verification, credentialing, shift scheduling, CME credits tracking & attendance.",
      },
    ],
  }),
  component: HRWorkspace,
});

function HRWorkspace() {
  return (
    <RouteGuard route="/hr">
      <HRContent />
    </RouteGuard>
  );
}

function HRContent() {
  const [selectedTab, setSelectedTab] = useState("roster");

  const staffRoster = [
    { name: "Dr. Dawit Yohannes", role: "Attending Physician", dept: "Emergency", license: "MD-88294", expiry: "2028-09", cme: "45 / 50 Credits", status: "Active" },
    { name: "Dr. Bethlehem Tadesse", role: "Attending Physician", dept: "Internal Medicine", license: "MD-88291", expiry: "2027-12", cme: "50 / 50 Credits", status: "Active" },
    { name: "Nurse Tigist Alemu", role: "Registered Nurse", dept: "ICU Tower 1", license: "RN-44102", expiry: "2026-11", cme: "30 / 30 Credits", status: "Active" },
    { name: "Pharm. Getachew Reda", role: "Clinical Pharmacist", dept: "Pharmacy", license: "RPH-90211", expiry: "2026-09", cme: "28 / 30 Credits", status: "Renewal Due" },
  ];

  return (
    <AppShell
      title="HR & Staff Operations Mission Control"
      subtitle="Medical credentialing · License renewal tracking · Attendance & Shift duty rosters · CME credits compliance"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3.5 py-1 text-xs font-bold text-[#1D8A39]">
            <UserCheck className="size-3.5" /> 142 Active Hospital Personnel
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Panel className="min-w-0">
            <Stat label="Total Staff Members" value="142 Staff" hint="98% Active" tone="ok" />
          </Panel>
          <Panel className="min-w-0">
            <Stat label="License Renewals Due" value="2 Members" hint="Next 30 Days" tone="warn" />
          </Panel>
          <Panel className="min-w-0">
            <Stat label="CME Compliance Rate" value="94.6%" hint="Annual Target > 90%" tone="ok" />
          </Panel>
          <Panel className="min-w-0">
            <Stat label="Shift Coverage" value="100%" hint="All Wards Staffed" tone="ok" />
          </Panel>
        </div>

        {/* Credentialing & Staff Compliance Table */}
        <Panel
          title="Medical Personnel Credentialing Directory"
          subtitle="Verification of medical licenses, board certifications, and CME compliance"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-black/5 bg-[#FAFAFC] text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                <tr>
                  <th className="p-3">Staff Name & Department</th>
                  <th className="p-3">Role Title</th>
                  <th className="p-3">Medical License</th>
                  <th className="p-3">Expiry Date</th>
                  <th className="p-3">CME Credits</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-semibold text-[#1D1D1F]">
                {staffRoster.map((s) => (
                  <tr key={s.license} className="hover:bg-[#F5F5F7]">
                    <td className="p-3">
                      <p className="font-bold text-black">{s.name}</p>
                      <p className="text-[10px] text-[#86868B]">{s.dept}</p>
                    </td>
                    <td className="p-3">{s.role}</td>
                    <td className="p-3 font-mono text-[#86868B]">{s.license}</td>
                    <td className="p-3 font-mono">{s.expiry}</td>
                    <td className="p-3 font-bold text-[#1D8A39]">{s.cme}</td>
                    <td className="p-3">
                      <StatusPill status={s.status === "Active" ? "healthy" : "busy"} label={s.status} />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => toast.success(`Issued CME & Credentialing Certificate for ${s.name}.`)}
                        className="rounded-xl border border-black/10 bg-white px-3 py-1 text-xs font-bold text-black hover:bg-black hover:text-white transition-colors cursor-pointer shadow-2xs"
                      >
                        Verify Credentials
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
