import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

export type AppointmentRow = {
  id: string;
  patient_id: string;
  department_id: string | null;
  scheduled_at: string;
  reason: string | null;
  status: "booked" | "arrived" | "in_progress" | "completed" | "cancelled" | "no_show";
  booked_by_label: string | null;
  patients: { full_name: string; mrn: string; date_of_birth: string } | null;
  departments: { name: string; code: string } | null;
};

export type EncounterRow = {
  id: string;
  patient_id: string;
  department_id: string | null;
  stage: string;
  priority: string;
  chief_complaint: string | null;
  started_at: string;
  patients: { full_name: string; mrn: string; date_of_birth: string; blood_group: string | null } | null;
  departments: { name: string; code: string } | null;
};

export type OrderRow = {
  id: string;
  patient_id: string;
  encounter_id: string | null;
  category: "laboratory" | "imaging" | "medication" | "procedure";
  name: string;
  code: string | null;
  priority: string;
  status: "draft" | "requested" | "in_progress" | "resulted" | "completed" | "cancelled";
  instructions: string | null;
  requested_by_label: string | null;
  requested_at: string;
};

export type NoteRow = {
  id: string;
  encounter_id: string | null;
  patient_id: string;
  author_label: string | null;
  note_type: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  signed_at: string | null;
  created_at: string;
};

const APPOINTMENT_SELECT =
  "id,patient_id,department_id,scheduled_at,reason,status,booked_by_label,patients(full_name,mrn,date_of_birth),departments(name,code)";

const ENCOUNTER_SELECT =
  "id,patient_id,department_id,stage,priority,chief_complaint,started_at,patients(full_name,mrn,date_of_birth,blood_group),departments(name,code)";

/** Appointments for a given calendar day (local day bounds). */
export const appointmentsQuery = (dayISO: string) =>
  queryOptions({
    queryKey: ["appointments", dayISO],
    queryFn: async () => {
      const start = new Date(`${dayISO}T00:00:00`);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from("appointments")
        .select(APPOINTMENT_SELECT)
        .gte("scheduled_at", start.toISOString())
        .lt("scheduled_at", end.toISOString())
        .order("scheduled_at");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AppointmentRow[];
    },
  });

/** Live encounters — the shared queue every clinical workspace reads. */
export const activeEncountersQuery = queryOptions({
  queryKey: ["encounters", "active"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("encounters")
      .select(ENCOUNTER_SELECT)
      .is("ended_at", null)
      .order("started_at");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as EncounterRow[];
  },
});

export const encounterQuery = (encounterId: string) =>
  queryOptions({
    queryKey: ["encounter", encounterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("encounters")
        .select(ENCOUNTER_SELECT)
        .eq("id", encounterId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as EncounterRow | null;
    },
  });

export const ordersQuery = (patientId: string) =>
  queryOptions({
    queryKey: ["orders", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,patient_id,encounter_id,category,name,code,priority,status,instructions,requested_by_label,requested_at",
        )
        .eq("patient_id", patientId)
        .order("requested_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as OrderRow[];
    },
  });

export const notesQuery = (patientId: string) =>
  queryOptions({
    queryKey: ["notes", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinical_notes")
        .select(
          "id,encounter_id,patient_id,author_label,note_type,subjective,objective,assessment,plan,signed_at,created_at",
        )
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as NoteRow[];
    },
  });
