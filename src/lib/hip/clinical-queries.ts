import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { toEthiopianName } from "@/lib/hip/ethiopian-names";
import { fetchAll } from "@/lib/hip/paginate";

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
  patients: {
    full_name: string;
    mrn: string;
    date_of_birth: string;
    blood_group: string | null;
  } | null;
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
  result_summary: string | null;
  is_critical: boolean;
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

      const mapped = ((data ?? []) as any[]).map((row) => ({
        ...row,
        patients: row.patients
          ? {
              ...row.patients,
              full_name: toEthiopianName(row.patients.full_name),
            }
          : null,
      }));

      return mapped as unknown as AppointmentRow[];
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

    const mapped = ((data ?? []) as any[]).map((row) => ({
      ...row,
      patients: row.patients
        ? {
            ...row.patients,
            full_name: toEthiopianName(row.patients.full_name),
          }
        : null,
    }));

    return mapped as unknown as EncounterRow[];
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

      if (!data) return null;
      const row = data as any;
      const mapped = {
        ...row,
        patients: row.patients
          ? {
              ...row.patients,
              full_name: toEthiopianName(row.patients.full_name),
            }
          : null,
      };

      return mapped as unknown as EncounterRow;
    },
  });

export const ordersQuery = (patientId: string) =>
  queryOptions({
    queryKey: ["orders", patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,patient_id,encounter_id,category,name,code,priority,status,instructions,requested_by_label,requested_at," +
            "result_summary,is_critical",
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

/* ----------------------- bed occupancy (ward / twin) ----------------------- */

export type BedStatus = "available" | "occupied" | "cleaning" | "reserved" | "maintenance";

export type OccupancyBed = {
  id: string;
  label: string;
  status: BedStatus;
  patient_id: string | null;
  room: string | null;
  ward_id: string | null;
  patient: {
    id: string;
    full_name: string;
    mrn: string;
    date_of_birth: string;
    sex: string;
  } | null;
  chief_complaint: string | null;
  admitted_at: string | null;
};

export type BedCounts = {
  total: number;
  occupied: number;
  available: number;
  cleaning: number;
  reserved: number;
  maintenance: number;
  /** occupied / total, 0–100, rounded (same definition as the status ribbon). */
  occupancyPct: number;
};

export type WardOccupancy = BedCounts & {
  id: string;
  name: string;
  floor: number;
  beds: OccupancyBed[];
};

export function countBeds(beds: { status: string }[]): BedCounts {
  const count = (status: BedStatus) => beds.filter((bed) => bed.status === status).length;
  const total = beds.length;
  const occupied = count("occupied");
  return {
    total,
    occupied,
    available: count("available"),
    cleaning: count("cleaning"),
    reserved: count("reserved"),
    maintenance: count("maintenance"),
    occupancyPct: total > 0 ? Math.round((occupied / total) * 100) : 0,
  };
}

type RawBed = {
  id: string;
  label: string;
  status: BedStatus;
  patient_id: string | null;
  rooms: { name: string; wards: { id: string; name: string; floor: number } | null } | null;
};

/**
 * Every bed in the hospital grouped by ward, with the occupying patient where one is linked
 * (beds.patient_id or an open encounter's bed_id). Single source for ward + digital-twin screens.
 */
export const wardOccupancyQuery = queryOptions({
  queryKey: ["beds", "by-ward"],
  queryFn: async () => {
    const [bedsRes, encountersRes] = await Promise.all([
      fetchAll((from, to) =>
        supabase
          .from("beds")
          .select("id,label,status,patient_id,rooms(name,wards(id,name,floor))")
          .order("label")
          .order("id")
          .range(from, to),
      ),
      supabase
        .from("encounters")
        .select("bed_id,patient_id,chief_complaint,started_at")
        .not("bed_id", "is", null)
        .is("ended_at", null),
    ]);
    if (bedsRes.error) throw new Error(bedsRes.error.message);
    const rawBeds = (bedsRes.data ?? []) as unknown as RawBed[];
    const encounters = (encountersRes.data ?? []) as {
      bed_id: string | null;
      patient_id: string;
      chief_complaint: string | null;
      started_at: string;
    }[];
    const encounterByBed = new Map(encounters.map((e) => [e.bed_id, e]));

    const patientIds = new Set<string>();
    for (const bed of rawBeds) {
      const pid = bed.patient_id ?? encounterByBed.get(bed.id)?.patient_id ?? null;
      if (pid) patientIds.add(pid);
    }
    const patientById = new Map<string, NonNullable<OccupancyBed["patient"]>>();
    if (patientIds.size > 0) {
      const { data } = await supabase
        .from("patients")
        .select("id,full_name,mrn,date_of_birth,sex")
        .in("id", [...patientIds]);
      for (const p of data ?? []) {
        patientById.set(p.id, { ...p, full_name: toEthiopianName(p.full_name) });
      }
    }

    const beds: OccupancyBed[] = rawBeds.map((bed) => {
      const encounter = encounterByBed.get(bed.id);
      const pid = bed.patient_id ?? encounter?.patient_id ?? null;
      return {
        id: bed.id,
        label: bed.label,
        status: bed.status,
        patient_id: pid,
        room: bed.rooms?.name ?? null,
        ward_id: bed.rooms?.wards?.id ?? null,
        patient: pid ? (patientById.get(pid) ?? null) : null,
        chief_complaint: encounter?.chief_complaint ?? null,
        admitted_at: encounter?.started_at ?? null,
      };
    });

    const wardMap = new Map<
      string,
      { id: string; name: string; floor: number; beds: OccupancyBed[] }
    >();
    rawBeds.forEach((raw, index) => {
      const bed = beds[index]!;
      const ward = raw.rooms?.wards;
      const key = ward?.id ?? "unassigned";
      if (!wardMap.has(key)) {
        wardMap.set(key, {
          id: key,
          name: ward?.name ?? "Unassigned",
          floor: ward?.floor ?? 0,
          beds: [],
        });
      }
      wardMap.get(key)!.beds.push(bed);
    });

    const wards: WardOccupancy[] = [...wardMap.values()]
      .map((ward) => ({ ...ward, ...countBeds(ward.beds) }))
      .sort((a, b) => a.floor - b.floor || a.name.localeCompare(b.name));

    return { beds, wards, totals: countBeds(beds) };
  },
});
