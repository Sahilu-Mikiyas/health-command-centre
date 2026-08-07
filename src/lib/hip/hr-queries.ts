import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { classifyLicense, LICENSED_ROLES } from "@/lib/hip/license";
import type { AppRole } from "@/lib/hip/rbac";

export type StaffRecord = {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: string;
  job_title: string;
  availability: string;
  license_number: string | null;
  license_expiry: string | null;
  cme_credits: number;
  cme_required: number;
  board_certification: string | null;
  shift_pattern: string | null;
  notes: string | null;
  department_id: string | null;
  last_seen_at: string | null;
  created_at: string;
};

export const staffDirectoryQuery = queryOptions({
  queryKey: ["staff", "directory"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("staff")
      .select(
        "id,user_id,full_name,email,phone,role,job_title,availability,license_number,license_expiry,cme_credits,cme_required,board_certification,shift_pattern,notes,department_id,last_seen_at,created_at",
      )
      .order("full_name");
    if (error) throw new Error(error.message);
    return (data ?? []) as StaffRecord[];
  },
  refetchInterval: 30_000,
});

export type LicenseBucket = "locked" | "critical" | "expiring" | "valid" | "unknown";

export function bucketStaff(rows: StaffRecord[]) {
  const buckets: Record<LicenseBucket, StaffRecord[]> = {
    locked: [],
    critical: [],
    expiring: [],
    valid: [],
    unknown: [],
  };
  for (const row of rows) {
    const licensed = LICENSED_ROLES.includes(row.role as AppRole);
    const { state } = classifyLicense(row.license_expiry);
    if (!licensed && state !== "locked") {
      buckets[state === "unknown" ? "unknown" : "valid"].push(row);
      continue;
    }
    buckets[state as LicenseBucket].push(row);
  }
  return buckets;
}
