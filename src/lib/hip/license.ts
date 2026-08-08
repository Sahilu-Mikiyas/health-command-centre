import type { AppRole } from "@/lib/hip/rbac";

export type LicenseState = "unknown" | "valid" | "expiring" | "critical" | "locked";

/** Roles that carry a regulated medical/professional licence. */
export const LICENSED_ROLES: AppRole[] = [
  "doctor",
  "nurse",
  "pharmacist",
  "lab_tech",
  "radiologist",
  "medical_director",
];

/** Roles that can never be locked out — they are the ones who fix licences. */
export const LOCKOUT_EXEMPT_ROLES: AppRole[] = ["super_admin", "hr_manager"];

export const WARNING_WINDOW_DAYS = 90;
export const LOCKOUT_WINDOW_DAYS = 15;

/** Configurable alert windows — owned by HR via notification settings. */
export type LicenseThresholds = {
  firstWarningDays: number;
  urgentWarningDays: number;
  lockoutDays: number;
};

export const DEFAULT_THRESHOLDS: LicenseThresholds = {
  firstWarningDays: WARNING_WINDOW_DAYS,
  urgentWarningDays: 30,
  lockoutDays: LOCKOUT_WINDOW_DAYS,
};

export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const target = new Date(`${date}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function classifyLicense(
  expiry: string | null | undefined,
  thresholds: LicenseThresholds = DEFAULT_THRESHOLDS,
): {
  state: LicenseState;
  days: number | null;
} {
  const days = daysUntil(expiry);
  if (days === null) return { state: "unknown", days: null };
  if (days <= thresholds.lockoutDays) return { state: "locked", days };
  if (days <= thresholds.urgentWarningDays) return { state: "critical", days };
  if (days <= thresholds.firstWarningDays) return { state: "expiring", days };
  return { state: "valid", days };
}

export const LICENSE_TONE: Record<LicenseState, "ok" | "warn" | "crit" | "muted"> = {
  unknown: "muted",
  valid: "ok",
  expiring: "warn",
  critical: "warn",
  locked: "crit",
};

export const LICENSE_LABEL: Record<LicenseState, string> = {
  unknown: "Not Registered",
  valid: "Valid",
  expiring: "Renewal Due",
  critical: "Urgent Renewal",
  locked: "Expired / Locked",
};

/** True when this staff member must be blocked from their clinical workspace. */
export function isLockedOut(roles: string[] | undefined, expiry: string | null | undefined): boolean {
  const list = (roles ?? []) as AppRole[];
  if (list.some((role) => LOCKOUT_EXEMPT_ROLES.includes(role))) return false;
  if (!list.some((role) => LICENSED_ROLES.includes(role))) return false;
  return classifyLicense(expiry).state === "locked";
}

export function formatExpiry(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
