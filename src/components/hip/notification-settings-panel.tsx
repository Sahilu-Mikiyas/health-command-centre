import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Clock, Mail, MonitorSmartphone, Save, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/hip/panel";
import {
  formatHour,
  NOTIFIABLE_ROLES,
  notificationSettingsQuery,
  saveNotificationSettings,
  type NotificationSettings,
} from "@/lib/hip/notifications";
import { ROLE_LABELS } from "@/lib/hip/rbac";

const numberField =
  "w-full rounded-2xl border border-black/10 bg-[#F5F5F7] p-2.5 text-xs font-bold text-black focus:bg-white focus:outline-none";

function Toggle({
  label,
  hint,
  checked,
  onChange,
  icon,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`flex w-full cursor-pointer items-start justify-between gap-3 rounded-2xl border p-3 text-left transition-colors ${
        checked ? "border-[#B6ECC3] bg-[#E8F8EC]" : "border-black/10 bg-[#FAFAFC]"
      }`}
    >
      <span className="flex items-start gap-2.5">
        <span className={checked ? "mt-0.5 text-[#1D8A39]" : "mt-0.5 text-[#86868B]"}>{icon}</span>
        <span className="min-w-0">
          <span className="block text-xs font-extrabold text-black">{label}</span>
          <span className="block text-[10px] font-semibold leading-relaxed text-[#86868B]">{hint}</span>
        </span>
      </span>
      <span
        className={`mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? "bg-[#34C759]" : "bg-[#D2D2D7]"
        }`}
      >
        <span
          className={`size-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : ""}`}
        />
      </span>
    </button>
  );
}

/** HR-owned control panel for licence-expiry alerts: who is notified and when. */
export function NotificationSettingsPanel({ canEdit }: { canEdit: boolean }) {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useQuery(notificationSettingsQuery);
  const [draft, setDraft] = useState<NotificationSettings | null>(null);

  useEffect(() => {
    if (settings) setDraft(settings);
  }, [settings]);

  const save = useMutation({
    mutationFn: async (next: NotificationSettings) => {
      const { id, hospital_id: _hospital, ...patch } = next;
      void _hospital;
      await saveNotificationSettings(id, patch);
    },
    onSuccess: () => {
      toast.success("Notification preferences saved — alert windows applied across the platform");
      void queryClient.invalidateQueries({ queryKey: ["notification-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <Panel title="Licence Alert Preferences" subtitle="Loading notification configuration…">
        <p className="text-xs font-semibold text-[#86868B]">Fetching saved preferences…</p>
      </Panel>
    );
  }

  if (!draft) {
    return (
      <Panel title="Licence Alert Preferences" subtitle="No configuration record found">
        <p className="text-xs font-semibold text-[#86868B]">
          Notification settings have not been initialised for this hospital yet.
        </p>
      </Panel>
    );
  }

  const set = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) =>
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));

  const toggleRole = (role: string) => {
    const has = draft.recipient_roles.includes(role);
    set(
      "recipient_roles",
      has ? draft.recipient_roles.filter((r) => r !== role) : [...draft.recipient_roles, role],
    );
  };

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings);
  const invalid =
    draft.lockout_days >= draft.urgent_warning_days || draft.urgent_warning_days >= draft.first_warning_days;

  return (
    <Panel
      title="Licence Alert Preferences"
      subtitle="Choose who is notified about expiring medical licences, and how early the warnings start"
      action={
        canEdit ? (
          <button
            type="button"
            disabled={!dirty || invalid || save.isPending}
            onClick={() => save.mutate(draft)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-black px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="size-3.5" /> {save.isPending ? "Saving…" : "Save preferences"}
          </button>
        ) : (
          <span className="rounded-full border border-black/10 bg-[#F5F5F7] px-3 py-1 text-[10px] font-bold text-[#86868B]">
            Read-only · admins and HR managers can edit
          </span>
        )
      }
    >
      <fieldset disabled={!canEdit} className="space-y-5">
        <Toggle
          label="Licence expiry alerting"
          hint="Master switch. When off, no banners or HR digests are raised (lockout enforcement still protects patients)."
          checked={draft.enabled}
          onChange={(v) => set("enabled", v)}
          icon={<BellRing className="size-4" />}
        />

        {/* Timing */}
        <div className="space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
            When alerts are raised
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="space-y-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                First notice (days before)
              </span>
              <input
                type="number"
                min={16}
                max={365}
                value={draft.first_warning_days}
                onChange={(e) => set("first_warning_days", Number(e.target.value))}
                className={numberField}
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                Urgent notice (days before)
              </span>
              <input
                type="number"
                min={2}
                max={180}
                value={draft.urgent_warning_days}
                onChange={(e) => set("urgent_warning_days", Number(e.target.value))}
                className={numberField}
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
                Lockout (days before)
              </span>
              <input
                type="number"
                min={0}
                max={90}
                value={draft.lockout_days}
                onChange={(e) => set("lockout_days", Number(e.target.value))}
                className={numberField}
              />
            </label>
          </div>
          {invalid ? (
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-[#D70015]">
              <ShieldAlert className="size-3.5" /> Windows must decrease: first notice &gt; urgent notice &gt;
              lockout.
            </p>
          ) : (
            <p className="text-[10px] font-semibold text-[#86868B]">
              Amber banner from {draft.first_warning_days} days out, red from {draft.urgent_warning_days} days,
              clinical workspaces locked at {draft.lockout_days} days remaining.
            </p>
          )}
        </div>

        {/* Recipients */}
        <div className="space-y-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
            Who receives the HR digest
          </p>
          <div className="flex flex-wrap gap-2">
            {NOTIFIABLE_ROLES.map((role) => {
              const on = draft.recipient_roles.includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => toggleRole(role)}
                  aria-pressed={on}
                  className={`cursor-pointer rounded-2xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                    on
                      ? "border-black bg-black text-white"
                      : "border-black/10 bg-[#F5F5F7] text-[#1D1D1F] hover:bg-white"
                  }`}
                >
                  {ROLE_LABELS[role]}
                </button>
              );
            })}
          </div>
          <Toggle
            label="Notify the staff member directly"
            hint="Shows the affected doctor, nurse, pharmacist or technologist their own countdown banner on every workspace."
            checked={draft.notify_staff_member}
            onChange={(v) => set("notify_staff_member", v)}
            icon={<MonitorSmartphone className="size-4" />}
          />
        </div>

        {/* Channels & schedule */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label="In-app banners & escalation board"
            hint="Live warnings inside the platform for staff and HR."
            checked={draft.in_app_enabled}
            onChange={(v) => set("in_app_enabled", v)}
            icon={<BellRing className="size-4" />}
          />
          <Toggle
            label="Email digest"
            hint="Sends the licence digest to the selected roles' work addresses."
            checked={draft.email_enabled}
            onChange={(v) => set("email_enabled", v)}
            icon={<Mail className="size-4" />}
          />
          <label className="space-y-1">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
              Daily digest time
            </span>
            <select
              value={draft.digest_hour}
              onChange={(e) => set("digest_hour", Number(e.target.value))}
              className={numberField}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {formatHour(h)}
                </option>
              ))}
            </select>
            <span className="flex items-center gap-1 text-[10px] font-semibold text-[#86868B]">
              <Clock className="size-3" /> Hospital local time
            </span>
          </label>
          <Toggle
            label="Stay quiet on weekends"
            hint="Holds non-urgent digests until the next working day."
            checked={draft.quiet_weekends}
            onChange={(v) => set("quiet_weekends", v)}
            icon={<Clock className="size-4" />}
          />
        </div>
      </fieldset>
    </Panel>
  );
}
