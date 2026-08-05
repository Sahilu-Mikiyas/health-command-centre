import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  Key,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { Panel } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, type AppRole } from "@/lib/hip/rbac";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Super Admin & Staff Provisioning | Meridian HIP" },
      {
        name: "description",
        content: "Super admin cockpit for staff registration, role assignments, and RBAC security controls.",
      },
    ],
  }),
  component: AdminWorkspaceWrapper,
});

function AdminWorkspaceWrapper() {
  return (
    <RouteGuard route="/admin">
      <AdminWorkspace />
    </RouteGuard>
  );
}

function AdminWorkspace() {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("doctor");
  const [department, setDepartment] = useState("Emergency");
  const [licenseNumber, setLicenseNumber] = useState("");

  const { data: staffList, isLoading } = useQuery({
    queryKey: ["admin-staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("id, full_name, role, availability, created_at, license_number")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const registerStaff = useMutation({
    mutationFn: async () => {
      // Create local record for demonstration & database persistence
      const { data, error } = await supabase
        .from("staff")
        .insert([
          {
            full_name: fullName,
            role: selectedRole as any,
            availability: "active",
            license_number: licenseNumber || `LIC-${Math.floor(10000 + Math.random() * 90000)}`,
            hospital_id: "00000000-0000-0000-0000-000000000001",
          },
        ])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Registered ${data.full_name} as ${ROLE_LABELS[selectedRole]}`);
      setFullName("");
      setEmail("");
      setLicenseNumber("");
      queryClient.invalidateQueries({ queryKey: ["admin-staff-list"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const rolesOptions: { role: AppRole; label: string }[] = [
    { role: "super_admin", label: "Super Admin (Full System Access)" },
    { role: "ceo", label: "Chief Executive Officer / Medical Director" },
    { role: "doctor", label: "Attending Physician / Doctor" },
    { role: "nurse", label: "Registered Nurse" },
    { role: "receptionist", label: "Receptionist & Triage" },
    { role: "pharmacist", label: "Clinical Pharmacist" },
    { role: "lab_tech", label: "Laboratory Technologist" },
    { role: "billing_clerk", label: "Billing & Financial Clerk" },
  ];

  return (
    <AppShell
      title="Super Admin & Staff Provisioning"
      subtitle="Register staff, assign RBAC permissions & manage security credentials"
      actions={
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F8EC] border border-[#B6ECC3] px-3.5 py-1 text-xs font-bold text-[#1D8A39]">
            <ShieldCheck className="size-3.5" /> Super Admin Credentials Active
          </span>
        </div>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        {/* Active Staff Roster Table */}
        <div className="space-y-6 min-w-0">
          <Panel title="Hospital Staff Directory" subtitle="Registered staff members and assigned operational roles">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-black/5 bg-[#FAFAFC] text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  <tr>
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Assigned Role</th>
                    <th className="p-3">License Number</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 font-semibold text-[#1D1D1F]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-[#86868B]">Loading staff directory…</td>
                    </tr>
                  ) : (staffList ?? []).map((member) => (
                    <tr key={member.id} className="hover:bg-[#F5F5F7]">
                      <td className="p-3 font-bold text-black flex items-center gap-2">
                        <div className="grid size-7 place-items-center rounded-full bg-black text-white text-[10px] font-bold">
                          {member.full_name.charAt(0)}
                        </div>
                        <span>{member.full_name}</span>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#E8E8ED] border border-black/10 px-2.5 py-0.5 text-[10px] font-extrabold text-black">
                          {ROLE_LABELS[member.role as AppRole] ?? member.role}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-[#86868B]">{member.license_number ?? "—"}</td>
                      <td className="p-3">
                        <StatusPill status={member.availability === "active" ? "healthy" : "offline"} label={member.availability} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>

        {/* Right Sidebar: Provision New Staff Member */}
        <div className="space-y-6">
          <Panel title="Register & Assign Role" subtitle="Provision new staff user account">
            <form
              className="space-y-4 text-xs font-semibold text-black"
              onSubmit={(e) => {
                e.preventDefault();
                registerStaff.mutate();
              }}
            >
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Dr. Dawit Yohannes"
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  Staff Role (RBAC Scope)
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as AppRole)}
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {rolesOptions.map((opt) => (
                    <option key={opt.role} value={opt.role}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                  Medical License / Staff ID
                </label>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. MD-88294"
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <button
                type="submit"
                disabled={registerStaff.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all scale-105 cursor-pointer mt-2"
              >
                <UserPlus className="size-4" /> Provision Staff Account
              </button>
            </form>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
