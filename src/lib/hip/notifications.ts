import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_THRESHOLDS, type LicenseThresholds } from "@/lib/hip/license";
import type { AppRole } from "@/lib/hip/rbac";

export type NotificationSettings = {
  id: string;
  hospital_id: string;
  enabled: boolean;
  first_warning_days: number;
  urgent_warning_days: number;
  lockout_days: number;
  notify_staff_member: boolean;
  recipient_roles: string[];
  in_app_enabled: boolean;
  email_enabled: boolean;
  digest_hour: number;
  quiet_weekends: boolean;
};

const COLUMNS =
  "id,hospital_id,enabled,first_warning_days,urgent_warning_days,lockout_days,notify_staff_member,recipient_roles,in_app_enabled,email_enabled,digest_hour,quiet_weekends";

/** Roles that can be picked as licence-alert recipients. */
export const NOTIFIABLE_ROLES: AppRole[] = [
  "hr_manager",
  "super_admin",
  "ceo",
  "medical_director",
  "ward_manager",
];

export const notificationSettingsQuery = queryOptions({
  queryKey: ["notification-settings"],
  queryFn: async (): Promise<NotificationSettings | null> => {
    const { data, error } = await supabase
      .from("notification_settings")
      .select(COLUMNS)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data ?? null) as NotificationSettings | null;
  },
  staleTime: 60_000,
});

/** Licence thresholds derived from the saved settings (falls back to platform defaults). */
export function thresholdsFrom(settings: NotificationSettings | null | undefined): LicenseThresholds {
  if (!settings) return DEFAULT_THRESHOLDS;
  return {
    firstWarningDays: settings.first_warning_days,
    urgentWarningDays: settings.urgent_warning_days,
    lockoutDays: settings.lockout_days,
  };
}

/** True when the signed-in staff member should see their own pre-expiry banner. */
export function staffAlertsOn(settings: NotificationSettings | null | undefined): boolean {
  if (!settings) return true;
  return settings.enabled && settings.in_app_enabled && settings.notify_staff_member;
}

export async function saveNotificationSettings(
  id: string,
  patch: Partial<Omit<NotificationSettings, "id" | "hospital_id">>,
) {
  const { error } = await supabase
    .from("notification_settings")
    .update(patch as never)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export function formatHour(hour: number): string {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}:00 ${suffix}`;
}
