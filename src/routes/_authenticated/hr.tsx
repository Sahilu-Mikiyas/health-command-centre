import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Edit2,
  GraduationCap,
  Lock,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/hip/app-shell";
import { Panel, Stat } from "@/components/hip/panel";
import { RouteGuard } from "@/components/hip/route-guard";
import { StaffEditor } from "@/components/hip/staff-editor";
import { StatusPill } from "@/components/hip/status-pill";
import { bucketStaff, staffDirectoryQuery, type StaffRecord } from "@/lib/hip/hr-queries";
import { classifyLicense, formatExpiry, LICENSE_LABEL, LICENSED_ROLES } from "@/lib/hip/license";
import { ROLE_LABELS, type AppRole } from "@/lib/hip/rbac";
import { deleteStaff } from "@/lib/hip/staff.functions";

export const Route = createFileRoute("/_authenticated/hr")({
  head: () => ({
    meta: [
      { title: "HR & Staff Operations | Furii Hospital Intelligence Platform" },
      {
        name: "description",
        content:
          "Live HR workspace: medical licence expiry tracking, automatic lockout enforcement, credentialing, CME credits and full staff record editing.",
      },
      { property: "og:title", content: "HR & Staff Operations | Furii HIP" },
      {
        property: "og:description",
        content: "Licence expiry classification, renewal alerts and full staff record management.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
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

const FILTERS = [
  { id: "all", label: "All Personnel" },
  { id: "locked", label: "Expired · Locked Out" },
  { id: "critical", label: "Under 30 Days" },
  { id: "expiring", label: "Under 90 Days" },
  { id: "valid", label: "Compliant" },
  { id: "unknown", label: "No Licence On File" },
] as const;

function HRContent() {
  const queryClient = useQueryClient();
  const removeStaff = useServerFn(deleteStaff);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [editing, setEditing] = useState<StaffRecord | null>(null);

  const { data: staff = [], isLoading } = useQuery(staffDirectoryQuery);
  const buckets = bucketStaff(staff);

  const removeMut = useMutation({
    mutationFn: async (id: string) => removeStaff({ data: { id } }),
    onSuccess: () => {
      toast.success("Staff member and their login removed");
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const pool = filter === "all" ? staff : buckets[filter];
  const rows = pool.filter((s) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      s.full_name.toLowerCase().includes(term) ||
      (s.email ?? "").toLowerCase().includes(term) ||
      (s.license_number ?? "").toLowerCase().includes(term) ||
      s.role.toLowerCase().includes(term)
    );
  });

  const licensedCount = staff.filter((s) => LICENSED_ROLES.includes(s.role as AppRole)).length;
  const cmeCompliant = staff.filter((s) => s.cme_credits >= s.cme_required).length;
  const cmeRate = staff.length ? Math.round((cmeCompliant / staff.length) * 100) : 0;

  return (
    <AppShell
      title="HR & Staff Operations Mission Control"
      subtitle="Live roster · Medical licence expiry classification · Automatic lockout enforcement · CME compliance"
      actions={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B6ECC3] bg-[#E8F8EC] px-3.5 py-1 text-xs font-bold text-[#1D8A39]">
          <UserCheck className="size-3.5" /> {staff.length} Personnel · {licensedCount} Licensed
        </span>
      }
    >
      {editing ? <StaffEditor staff={editing} onClose={() => setEditing(null)} /> : null}

      <div className="space-y-6">
        {/* Compliance metrics */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Panel className="min-w-0">
            <Stat label="Total Staff Members" value={`${staff.length} Staff`} hint={`${licensedCount} regulated roles`} tone="ok" />
          </Panel>
          <Panel className="min-w-0">
            <Stat
              label="Locked Out (Expired)"
              value={`${buckets.locked.length} Members`}
              hint="Workspace access suspended"
              tone={buckets.locked.length ? "crit" : "ok"}
            />
          </Panel>
          <Panel className="min-w-0">
            <Stat
              label="Renewals Due"
              value={`${buckets.critical.length + buckets.expiring.length} Members`}
              hint="Within 90 days"
              tone={buckets.critical.length ? "warn" : "ok"}
            />
          </Panel>
          <Panel className="min-w-0">
            <Stat label="CME Compliance Rate" value={`${cmeRate}%`} hint="Annual target > 90%" tone={cmeRate >= 90 ? "ok" : "warn"} />
          </Panel>
        </div>

        {/* Lockout escalation board */}
        {buckets.locked.length + buckets.critical.length > 0 && (
          <Panel
            title="Licence Escalation Board"
            subtitle="Staff at or past the 15-day lockout threshold, and those inside the 30-day urgent window"
          >
            <ul className="space-y-2">
              {[...buckets.locked, ...buckets.critical].map((s) => {
                const { state, days } = classifyLicense(s.license_expiry);
                const locked = state === "locked";
                return (
                  <li
                    key={s.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 text-xs font-semibold ${
                      locked ? "border-[#F9BDBD] bg-[#FDE8E7]" : "border-[#FFE0B2] bg-[#FFF4E5]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {locked ? (
                        <Lock className="size-4 text-[#D70015]" />
                      ) : (
                        <AlertTriangle className="size-4 text-[#B86200]" />
                      )}
                      <div>
                        <p className="font-bold text-black">{s.full_name}</p>
                        <p className="text-[10px] text-[#86868B]">
                          {ROLE_LABELS[s.role as AppRole] ?? s.role} · {s.license_number ?? "no licence"} ·{" "}
                          {formatExpiry(s.license_expiry)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${locked ? "text-[#D70015]" : "text-[#B86200]"}`}>
                        {locked
                          ? (days ?? 0) < 0
                            ? `Expired ${Math.abs(days ?? 0)}d ago — locked out`
                            : `${days}d left — locked out`
                          : `${days} days remaining`}
                      </span>
                      <button
                        onClick={() => setEditing(s)}
                        className="shadow-2xs cursor-pointer rounded-xl border border-black/10 bg-white px-3 py-1 text-xs font-bold text-black transition-colors hover:bg-black hover:text-white"
                      >
                        Record Renewal
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}

        {/* Directory */}
        <Panel
          title="Medical Personnel Credentialing Directory"
          subtitle="Live staff roster — every field editable, including licence expiry"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 size-3.5 text-[#86868B]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, licence…"
                  className="rounded-2xl border border-black/10 bg-[#F5F5F7] py-1.5 pl-9 pr-3 text-xs font-bold text-black focus:bg-white focus:outline-none"
                />
              </div>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="rounded-2xl border border-black/10 bg-[#F5F5F7] px-3 py-1.5 text-xs font-bold text-black focus:bg-white focus:outline-none"
              >
                {FILTERS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
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
                  <th className="p-3">Role</th>
                  <th className="p-3">Licence</th>
                  <th className="p-3">Expiry</th>
                  <th className="p-3">Licence Status</th>
                  <th className="p-3">CME</th>
                  <th className="p-3">Availability</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 font-semibold text-[#1D1D1F]">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-[#86868B]">
                      Loading live staff roster…
                    </td>
                  </tr>
                ) : (
                  rows.map((s) => {
                    const { state, days } = classifyLicense(s.license_expiry);
                    const licensed = LICENSED_ROLES.includes(s.role as AppRole);
                    return (
                      <tr key={s.id} className="hover:bg-[#F5F5F7]">
                        <td className="p-3">
                          <p className="font-bold text-black">{s.full_name}</p>
                          <p className="text-[10px] text-[#86868B]">{s.email ?? s.job_title}</p>
                        </td>
                        <td className="p-3">{ROLE_LABELS[s.role as AppRole] ?? s.role}</td>
                        <td className="p-3 font-mono text-[#86868B]">{s.license_number ?? "—"}</td>
                        <td className="p-3 font-mono">{formatExpiry(s.license_expiry)}</td>
                        <td className="p-3">
                          {licensed || state === "locked" ? (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                                state === "locked"
                                  ? "bg-[#FDE8E7] text-[#D70015]"
                                  : state === "critical" || state === "expiring"
                                    ? "bg-[#FFF4E5] text-[#B86200]"
                                    : "bg-[#E8F8EC] text-[#1D8A39]"
                              }`}
                            >
                              {state === "locked" ? <Lock className="size-3" /> : <BadgeCheck className="size-3" />}
                              {LICENSE_LABEL[state]}
                              {days !== null ? ` · ${days}d` : ""}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-[#86868B]">Non-clinical role</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={s.cme_credits >= s.cme_required ? "font-bold text-[#1D8A39]" : "font-bold text-[#B86200]"}>
                            {s.cme_credits} / {s.cme_required}
                          </span>
                        </td>
                        <td className="p-3">
                          <StatusPill status={s.availability === "active" ? "healthy" : "offline"} label={s.availability} />
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditing(s)}
                              title="Edit full staff record"
                              className="cursor-pointer rounded-xl border border-black/10 bg-white p-2 text-[#515154] transition-colors hover:bg-black hover:text-white"
                            >
                              <Edit2 className="size-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Remove ${s.full_name} from the roster and revoke their login?`)) {
                                  removeMut.mutate(s.id);
                                }
                              }}
                              title="Remove staff member"
                              className="cursor-pointer rounded-xl border border-[#F9BDBD] bg-[#FDE8E7] p-2 text-[#D70015] transition-colors hover:bg-[#D70015] hover:text-white"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}

                {!isLoading && rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs font-semibold text-[#86868B]">
                      No staff match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Policy explainer */}
        <div className="grid gap-4 md:grid-cols-3">
          <Panel title="Renewal Notice" subtitle="90 days out">
            <p className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-[#515154]">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-[#B86200]" />
              Staff see an amber banner on every workspace they open from three months before expiry.
            </p>
          </Panel>
          <Panel title="Automatic Lockout" subtitle="15 days out">
            <p className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-[#515154]">
              <Lock className="mt-0.5 size-4 shrink-0 text-[#D70015]" />
              At 15 days remaining the workspace is replaced by a renewal notice — clinical access resumes the
              moment HR records a new expiry date here.
            </p>
          </Panel>
          <Panel title="CME Credits" subtitle="Annual cycle">
            <p className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-[#515154]">
              <GraduationCap className="mt-0.5 size-4 shrink-0 text-[#1D8A39]" />
              Credits earned versus required per member; anything below target is flagged amber for follow-up.
            </p>
          </Panel>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-white p-4 text-xs font-semibold text-[#515154]">
          <ShieldCheck className="size-4 text-[#34C759]" />
          HR managers and administrators are exempt from lockout so a lapsed licence can always be fixed.
        </div>
      </div>
    </AppShell>
  );
}
