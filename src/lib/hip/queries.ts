import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { toEthiopianName } from "@/lib/hip/ethiopian-names";

export type EventRow = {
  id: number;
  event_type: string;
  severity: string;
  department_code: string | null;
  actor_label: string | null;
  entity_type: string | null;
  entity_id: string | null;
  payload: unknown;
  occurred_at: string;
};

export type DepartmentRow = {
  id: string;
  name: string;
  code: string;
  location: string | null;
  status: "healthy" | "busy" | "critical" | "offline";
  sort_order: number;
};

export type PatientRow = {
  id: string;
  mrn: string;
  full_name: string;
  date_of_birth: string;
  sex: string;
  blood_group: string | null;
  phone: string | null;
  insurance_provider: string | null;
  insurance_coverage_pct: number | null;
  egfr: number | null;
};

function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []) as T;
}

export const departmentsQuery = queryOptions({
  queryKey: ["departments"],
  queryFn: async () =>
    unwrap<DepartmentRow[]>(
      await supabase
        .from("departments")
        .select("id,name,code,location,status,sort_order")
        .order("sort_order"),
    ),
});

export const hospitalQuery = queryOptions({
  queryKey: ["hospital"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("hospitals")
      .select("id,name,code,currency")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
});

export const bedSummaryQuery = queryOptions({
  queryKey: ["beds", "summary"],
  queryFn: async () => {
    const { data, error } = await supabase.from("beds").select("status");
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const count = (status: string) => rows.filter((row) => row.status === status).length;
    return {
      total: rows.length,
      occupied: count("occupied"),
      cleaning: count("cleaning"),
      reserved: count("reserved"),
      available: count("available"),
      maintenance: count("maintenance"),
    };
  },
});

export const flowQuery = queryOptions({
  queryKey: ["encounters", "flow"],
  queryFn: async () => {
    const { data, error } = await supabase.from("encounters").select("stage,priority").is("ended_at", null);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const stages = [
      "registered",
      "waiting",
      "nurse",
      "doctor",
      "laboratory",
      "pharmacy",
      "billing",
      "complete",
    ] as const;
    return {
      total: rows.length,
      critical: rows.filter((row) => row.priority === "critical").length,
      stages: stages.map((stage) => ({
        stage,
        count: rows.filter((row) => row.stage === stage).length,
      })),
    };
  },
});

export const staffSummaryQuery = queryOptions({
  queryKey: ["staff", "summary"],
  queryFn: async () => {
    const { data, error } = await supabase.from("staff").select("role,availability");
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const byRole = (role: string) => rows.filter((row) => row.role === role);
    return {
      total: rows.length,
      active: rows.filter((row) => row.availability === "active").length,
      doctors: byRole("doctor").length,
      nurses: byRole("nurse").length,
      lab: byRole("lab_tech").length,
      offline: rows.filter((row) => row.availability === "offline").length,
    };
  },
});

export const recentEventsQuery = (limit = 40) =>
  queryOptions({
    queryKey: ["events", "recent", limit],
    queryFn: async () =>
      unwrap<EventRow[]>(
        await supabase
          .from("events")
          .select(
            "id,event_type,severity,department_code,actor_label,entity_type,entity_id,payload,occurred_at",
          )
          .order("occurred_at", { ascending: false })
          .limit(limit),
      ),
  });

export const patientsQuery = (search: string) =>
  queryOptions({
    queryKey: ["patients", search],
    queryFn: async () => {
      let query = supabase
        .from("patients")
        .select(
          "id,mrn,full_name,date_of_birth,sex,blood_group,phone,insurance_provider,insurance_coverage_pct,egfr",
        )
        .order("full_name")
        .limit(60);
      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search.trim()}%,mrn.ilike.%${search.trim()}%`);
      }
      const raw = unwrap<PatientRow[]>(await query);
      return raw.map((p) => ({
        ...p,
        full_name: toEthiopianName(p.full_name),
      }));
    },
  });

export const patientRecordQuery = (patientId: string) =>
  queryOptions({
    queryKey: ["patient", patientId],
    queryFn: async () => {
      const [patient, allergies, conditions, vitals, encounters] = await Promise.all([
        supabase.from("patients").select("*").eq("id", patientId).maybeSingle(),
        supabase.from("allergies").select("*").eq("patient_id", patientId),
        supabase.from("conditions").select("*").eq("patient_id", patientId),
        supabase
          .from("vitals")
          .select("*")
          .eq("patient_id", patientId)
          .order("recorded_at", { ascending: false })
          .limit(12),
        supabase
          .from("encounters")
          .select("*")
          .eq("patient_id", patientId)
          .order("started_at", { ascending: false }),
      ]);
      if (patient.error) throw new Error(patient.error.message);
      const patientData = patient.data
        ? {
            ...patient.data,
            full_name: toEthiopianName(patient.data.full_name),
          }
        : null;
      return {
        patient: patientData,
        allergies: allergies.data ?? [],
        conditions: conditions.data ?? [],
        vitals: vitals.data ?? [],
        encounters: encounters.data ?? [],
      };
    },
  });

export const myProfileQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async () => {
    const { data: auth } = await supabase.auth.getUser();
    let userEmail = auth?.user?.email ?? "";
    if (!userEmail && typeof window !== "undefined") {
      userEmail = localStorage.getItem("furii_logged_in_staff_email") ?? "";
    }

    if (!userEmail && !auth?.user) return null;

    const [profile, roles, staff] = await Promise.all([
      auth?.user ? supabase.from("profiles").select("*").eq("user_id", auth.user.id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      auth?.user ? supabase.from("user_roles").select("role").eq("user_id", auth.user.id) : Promise.resolve({ data: [], error: null }),
      userEmail
        ? supabase.from("staff").select("role").ilike("job_title", `%${userEmail}%`).limit(1)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const fetchedRoles = (roles.data ?? []).map((row) => row.role as string);
    const staffRole = (staff.data as any[])?.[0]?.role ? [(staff.data as any[])[0].role] : [];

    // Priority: 1. Staff provisioned role by email -> 2. Granted DB roles -> 3. Super Admin default
    const baseRoles = staffRole.length > 0 ? staffRole : (fetchedRoles.length > 0 ? fetchedRoles : ["super_admin"]);

    // Check for testing role override in localStorage
    const activeOverride = typeof window !== "undefined" ? localStorage.getItem("furii_active_role_override") : null;
    const effectiveRoles = activeOverride ? [activeOverride] : baseRoles;

    const userMetaData = auth?.user?.user_metadata ?? {};
    const mustChangePassword = !!userMetaData['must_change_password'];

    return {
      email: userEmail || "staff@furii-hospital.org",
      profile: profile.data,
      roles: effectiveRoles,
      mustChangePassword,
    };
  },
});
