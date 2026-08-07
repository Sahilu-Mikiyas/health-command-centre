import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, KeyRound, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { StaffRecord } from "@/lib/hip/hr-queries";
import { ROLE_LABELS, type AppRole } from "@/lib/hip/rbac";
import { updateStaff } from "@/lib/hip/staff.functions";

const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as AppRole[];

const field =
  "w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-3 text-xs font-bold text-black focus:bg-white focus:outline-none";
const labelCls = "text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]";

/** Full staff record editor — every field HR or an admin may need to change. */
export function StaffEditor({ staff, onClose }: { staff: StaffRecord; onClose: () => void }) {
  const queryClient = useQueryClient();
  const saveStaff = useServerFn(updateStaff);
  const [draft, setDraft] = useState<StaffRecord>(staff);
  const [newPassword, setNewPassword] = useState("");

  const set = <K extends keyof StaffRecord>(key: K, value: StaffRecord[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const save = useMutation({
    mutationFn: async () =>
      saveStaff({
        data: {
          id: draft.id,
          fullName: draft.full_name,
          role: draft.role as never,
          availability: draft.availability,
          licenseNumber: draft.license_number ?? "",
          licenseExpiry: draft.license_expiry ?? null,
          boardCertification: draft.board_certification ?? "",
          cmeCredits: Number(draft.cme_credits) || 0,
          cmeRequired: Number(draft.cme_required) || 30,
          jobTitle: draft.job_title,
          email: draft.email ?? "",
          phone: draft.phone ?? "",
          shiftPattern: draft.shift_pattern ?? "",
          notes: draft.notes ?? "",
          ...(newPassword.trim() ? { newPassword: newPassword.trim() } : {}),
        },
      }),
    onSuccess: () => {
      toast.success(`${draft.full_name} updated${newPassword.trim() ? " · password reset" : ""}`);
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-staff-list"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <div className="apple-card my-8 w-full max-w-2xl space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-black/5 pb-3">
          <div>
            <p className="text-xs font-black uppercase text-black">Edit Staff Record</p>
            <p className="text-[11px] font-medium text-[#86868B]">
              {draft.full_name} · {ROLE_LABELS[draft.role as AppRole] ?? draft.role}
            </p>
          </div>
          <button onClick={onClose} className="text-[#86868B] hover:text-black" aria-label="Close editor">
            <X className="size-4" />
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={labelCls}>Full Name</label>
              <input className={field} required value={draft.full_name} onChange={(e) => set("full_name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Work Email</label>
              <input className={field} type="email" value={draft.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Phone</label>
              <input className={field} value={draft.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Role &amp; Permissions</label>
              <select className={field} value={draft.role} onChange={(e) => set("role", e.target.value)}>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Job Title</label>
              <input className={field} value={draft.job_title} onChange={(e) => set("job_title", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Availability</label>
              <select className={field} value={draft.availability} onChange={(e) => set("availability", e.target.value)}>
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="suspended">Suspended</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Medical Licence / Staff ID</label>
              <input
                className={field}
                value={draft.license_number ?? ""}
                onChange={(e) => set("license_number", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Licence Expiry Date</label>
              <input
                className={field}
                type="date"
                value={draft.license_expiry ?? ""}
                onChange={(e) => set("license_expiry", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Board Certification</label>
              <input
                className={field}
                value={draft.board_certification ?? ""}
                onChange={(e) => set("board_certification", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Shift Pattern</label>
              <input
                className={field}
                value={draft.shift_pattern ?? ""}
                onChange={(e) => set("shift_pattern", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>CME Credits Earned</label>
              <input
                className={field}
                type="number"
                min={0}
                value={draft.cme_credits}
                onChange={(e) => set("cme_credits", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>CME Credits Required</label>
              <input
                className={field}
                type="number"
                min={1}
                value={draft.cme_required}
                onChange={(e) => set("cme_required", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>HR Notes</label>
            <textarea
              className={`${field} min-h-20`}
              value={draft.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          <div className="space-y-1 rounded-2xl border border-black/10 bg-[#FAFAFC] p-3">
            <label className={`${labelCls} flex items-center gap-1.5`}>
              <KeyRound className="size-3" /> Reset Login Password (optional)
            </label>
            <input
              className={`${field} font-mono`}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
            />
          </div>

          <button
            type="submit"
            disabled={save.isPending}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-800"
          >
            <CheckCircle2 className="size-4" /> {save.isPending ? "Saving…" : "Save Staff Record"}
          </button>
        </form>
      </div>
    </div>
  );
}
