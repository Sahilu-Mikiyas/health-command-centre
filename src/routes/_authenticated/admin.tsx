import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Key,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { Panel } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StatusPill } from "@/components/hip/status-pill";
import { supabase } from "@/integrations/supabase/client";
import { getDefaultRedirect, ROLE_LABELS, type AppRole } from "@/lib/hip/rbac";
import { deleteStaff, provisionStaff, updateStaff } from "@/lib/hip/staff.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Super Admin Staff Operations | Furii Hospital Prototype" },
      {
        name: "description",
        content: "Super admin cockpit for staff management, full CRUD operations, role assignments, and role testing.",
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

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
  availability: string;
  department_id?: string | null;
  license_number?: string | null;
  phone?: string | null;
  job_title?: string | null;
  created_at?: string;
}

function AdminWorkspace() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const provision = useServerFn(provisionStaff);
  const saveStaff = useServerFn(updateStaff);
  const removeStaff = useServerFn(deleteStaff);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Create Staff Form State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("StaffPass123!");
  const [selectedRole, setSelectedRole] = useState<AppRole>("doctor");
  const [department, setDepartment] = useState("Emergency Department");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [shiftPattern, setShiftPattern] = useState("Morning (08:00 - 16:00)");
  const [status, setStatus] = useState("active");
  const [notes, setNotes] = useState("");

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Queries
  const { data: staffList, isLoading } = useQuery({
    queryKey: ["admin-staff-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as StaffMember[];
    },
  });

  // Create Staff Mutation
  const createStaffMut = useMutation({
    mutationFn: async () => {
      return provision({
        data: {
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim() || "StaffPass123!",
          role: selectedRole as never,
          phone: phone.trim(),
          jobTitle: `${ROLE_LABELS[selectedRole]} · ${department}`,
          departmentName: department,
          licenseNumber: licenseNumber.trim(),
          shiftPattern: shiftPattern,
          availability: status,
          notes: notes.trim(),
        },
      });
    },
    onSuccess: (result) => {
      toast.success(
        `${fullName.trim()} can now sign in as ${ROLE_LABELS[selectedRole]} — email ${result.email}, password ${password.trim() || "StaffPass123!"}`,
      );
      setIsAddOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["admin-staff-list"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Update Staff Mutation
  const updateStaffMut = useMutation({
    mutationFn: async (updated: Partial<StaffMember> & { id: string }) =>
      saveStaff({
        data: {
          id: updated.id,
          fullName: updated.full_name ?? "",
          role: (updated.role ?? "nurse") as never,
          availability: updated.availability ?? "active",
          licenseNumber: updated.license_number ?? "",
        },
      }),
    onSuccess: (result) => {
      toast.success(
        result.hadLogin
          ? "Staff profile and login role updated"
          : "Staff profile updated (no login account linked yet)",
      );
      setEditingStaff(null);
      queryClient.invalidateQueries({ queryKey: ["admin-staff-list"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // Delete Staff Mutation
  const deleteStaffMut = useMutation({
    mutationFn: async (id: string) => removeStaff({ data: { id } }),
    onSuccess: (result) => {
      toast.success(
        result.removedLogin ? "Staff member and their login account removed" : "Staff member removed from roster",
      );
      queryClient.invalidateQueries({ queryKey: ["admin-staff-list"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setLicenseNumber("");
    setNotes("");
  };

  // Switch Active Testing Role Helper
  const switchTestingRole = (targetRole: string | null) => {
    if (targetRole) {
      localStorage.setItem("furii_active_role_override", targetRole);
      toast.success(`Switched perspective to: ${ROLE_LABELS[targetRole as AppRole] ?? targetRole}`);
      const landing = getDefaultRedirect([targetRole]);
      void router.navigate({ to: landing });
    } else {
      localStorage.removeItem("furii_active_role_override");
      toast.success("Reset perspective to Super Admin");
    }
    queryClient.invalidateQueries();
  };

  const filteredStaff = (staffList ?? []).filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.license_number ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || s.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const rolesOptions: { role: AppRole; label: string }[] = [
    { role: "super_admin", label: "Super Admin (Full System Access)" },
    { role: "ceo", label: "Chief Executive Officer / Medical Director" },
    { role: "doctor", label: "Attending Doctor" },
    { role: "nurse", label: "Registered Nurse" },
    { role: "receptionist", label: "Receptionist & Triage" },
    { role: "pharmacist", label: "Clinical Pharmacist" },
    { role: "lab_tech", label: "Laboratory Technologist" },
    { role: "radiologist", label: "Radiology Specialist" },
    { role: "billing_clerk", label: "Billing & Financial Clerk" },
  ];

  return (
    <AppShell
      title="Super Admin & Staff CRUD Operations"
      subtitle="Provision staff members, manage roles, perform CRUD operations & test role perspectives"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all scale-105 cursor-pointer"
          >
            <UserPlus className="size-3.5" /> Provision New Staff Member
          </button>
        </div>
      }
    >
      {/* Active Role Testing Dock */}
      <div className="rounded-2xl border border-black/10 bg-white p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 pb-2">
          <div>
            <span className="text-xs font-extrabold text-black flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-[#34C759]" /> Role Testing Dock & Perspective Switcher
            </span>
            <p className="text-[11px] font-medium text-[#86868B]">
              Instantly test finished role workspaces (Receptionist, Nurse, Doctor, Pharmacist, Lab Tech, Billing Clerk)
            </p>
          </div>
          <button
            onClick={() => switchTestingRole(null)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F7] border border-black/10 px-3 py-1 text-xs font-bold text-black hover:bg-white transition-all cursor-pointer"
          >
            <RefreshCw className="size-3.5" /> Reset to Super Admin
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {[
            { role: "receptionist", label: "Test as Receptionist", to: "/reception" },
            { role: "nurse", label: "Test as Nurse", to: "/nurse" },
            { role: "doctor", label: "Test as Doctor", to: "/doctor" },
            { role: "lab_tech", label: "Test as Lab Tech", to: "/laboratory" },
            { role: "radiologist", label: "Test as Radiologist", to: "/radiology" },
            { role: "ward_manager", label: "Test as Ward Manager", to: "/ward" },
            { role: "pharmacist", label: "Test as Pharmacist", to: "/pharmacy" },
            { role: "billing_clerk", label: "Test as Billing Clerk", to: "/billing" },
            { role: "hr_manager", label: "Test as HR Operations", to: "/hr" },
            { role: "ceo", label: "Test as CEO / Executive", to: "/executive" },
          ].map((item) => (
            <button
              key={item.role}
              onClick={() => switchTestingRole(item.role)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#F5F5F7] border border-black/10 px-3 py-1.5 text-xs font-bold text-[#1D1D1F] hover:bg-black hover:text-white transition-all cursor-pointer"
            >
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="apple-card max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <span className="text-xs font-black uppercase text-black">Edit Staff Member Profile</span>
              <button onClick={() => setEditingStaff(null)} className="text-[#86868B] hover:text-black">
                <X className="size-4" />
              </button>
            </div>

            <form
              className="space-y-4 text-xs font-semibold text-black"
              onSubmit={(e) => {
                e.preventDefault();
                updateStaffMut.mutate(editingStaff);
              }}
            >
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStaff.full_name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, full_name: e.target.value })}
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Assigned Role</label>
                <select
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                >
                  {rolesOptions.map((r) => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Medical License / Staff ID</label>
                <input
                  type="text"
                  value={editingStaff.license_number ?? ""}
                  onChange={(e) => setEditingStaff({ ...editingStaff, license_number: e.target.value })}
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Availability Status</label>
                <select
                  value={editingStaff.availability}
                  onChange={(e) => setEditingStaff({ ...editingStaff, availability: e.target.value })}
                  className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                >
                  <option value="active">Active</option>
                  <option value="on_leave">On Leave</option>
                  <option value="offline">Offline</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={updateStaffMut.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
              >
                <CheckCircle2 className="size-4" /> Save Updated Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Staff Comprehensive Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="apple-card max-w-2xl w-full p-6 space-y-4 my-8 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <span className="text-xs font-black uppercase text-black">Provision New Staff Member Account</span>
              <button onClick={() => setIsAddOpen(false)} className="text-[#86868B] hover:text-black">
                <X className="size-4" />
              </button>
            </div>

            <form
              className="space-y-4 text-xs font-semibold text-black"
              onSubmit={(e) => {
                e.preventDefault();
                createStaffMut.mutate();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Dawit Yohannes"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Work Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dawit.yohannes@furii-hospital.org"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+251 91 234 5678"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Initial Login Password *</label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="StaffPass123!"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Staff Role (RBAC Permissions) *</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as AppRole)}
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                  >
                    {rolesOptions.map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Department *</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                  >
                    <option value="Emergency Department">Emergency Department (ED)</option>
                    <option value="Intensive Care Unit">Intensive Care Unit (ICU)</option>
                    <option value="General Surgery">General Surgery</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Clinical Pharmacy">Clinical Pharmacy</option>
                    <option value="Laboratory & Diagnostics">Laboratory & Diagnostics</option>
                    <option value="Radiology & Imaging">Radiology & Imaging</option>
                    <option value="Billing & Finance">Billing & Finance</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">Medical License / Staff ID</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="LIC-88291"
                    className="w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createStaffMut.isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer mt-2"
              >
                <UserPlus className="size-4" /> Save & Provision Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Staff Roster Directory */}
      <Panel
        title="Hospital Staff Roster & Member CRUD Directory"
        subtitle="Manage all staff members, roles, and status"
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-[#86868B]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search staff by name or role..."
                className="rounded-2xl border border-black/10 bg-[#F5F5F7] pl-9 pr-3 py-1.5 text-xs font-bold text-black focus:bg-white focus:outline-none"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-2xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-xs font-bold text-black focus:bg-white focus:outline-none"
            >
              <option value="all">All Roles</option>
              {rolesOptions.map((r) => (
                <option key={r.role} value={r.role}>
                  {ROLE_LABELS[r.role]}
                </option>
              ))}
            </select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-black/5 bg-[#FAFAFC] text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
              <tr>
                <th className="p-3">Staff Member</th>
                <th className="p-3">Assigned Role</th>
                <th className="p-3">License / Staff ID</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 font-semibold text-[#1D1D1F]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-[#86868B]">Loading staff directory…</td>
                </tr>
              ) : (filteredStaff ?? []).map((member) => (
                <tr key={member.id} className="hover:bg-[#F5F5F7] transition-colors">
                  <td className="p-3 font-bold text-black flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-full bg-black text-white text-xs font-bold shadow-2xs">
                      {member.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-black">{member.full_name}</p>
                      <p className="text-[10px] font-medium text-[#86868B]">{member.job_title ?? "Staff Member"}</p>
                    </div>
                  </td>

                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#E8E8ED] border border-black/10 px-3 py-0.5 text-[10px] font-extrabold text-black">
                      {ROLE_LABELS[member.role as AppRole] ?? member.role}
                    </span>
                  </td>

                  <td className="p-3 font-mono text-[#86868B]">{member.license_number ?? "—"}</td>

                  <td className="p-3">
                    <StatusPill status={member.availability === "active" ? "healthy" : "offline"} label={member.availability} />
                  </td>

                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setEditingStaff(member)}
                        className="rounded-xl border border-black/10 bg-white p-2 text-[#515154] hover:bg-black hover:text-white transition-colors cursor-pointer"
                        title="Edit staff details"
                      >
                        <Edit2 className="size-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Remove ${member.full_name} from Furii Hospital staff roster?`)) {
                            deleteStaffMut.mutate(member.id);
                          }
                        }}
                        className="rounded-xl border border-[#F9BDBD] bg-[#FDE8E7] p-2 text-[#D70015] hover:bg-[#D70015] hover:text-white transition-colors cursor-pointer"
                        title="Delete staff account"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs font-semibold text-[#86868B]">
                    No staff members match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
