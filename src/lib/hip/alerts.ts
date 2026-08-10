import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { toEthiopianName } from "@/lib/hip/ethiopian-names";
import { emitEvent } from "@/lib/hip/mutations";
import type { AppRole } from "@/lib/hip/rbac";

/* --------------------------------------------------------------- *
 * Hospital-wide notification feed. Every role-aware surface reads  *
 * the same append-only `events` stream and filters it by audience. *
 * --------------------------------------------------------------- */

export type HospitalEvent = {
  id: number;
  event_type: string;
  severity: string;
  department_code: string | null;
  entity_type: string | null;
  entity_id: string | null;
  actor_label: string | null;
  payload: Record<string, unknown> | null;
  occurred_at: string;
};

const OVERSIGHT_ROLES: AppRole[] = ["super_admin", "ceo", "medical_director"];

/** Which roles should be notified for a given event type. */
const AUDIENCE: { match: RegExp; roles: AppRole[] }[] = [
  { match: /^patient\.registered/, roles: ["receptionist", "nurse"] },
  { match: /^reception\./, roles: ["receptionist", "nurse"] },
  { match: /^appointment\./, roles: ["receptionist", "doctor", "nurse"] },
  { match: /^nurse\./, roles: ["nurse", "doctor"] },
  { match: /^vitals\./, roles: ["nurse", "doctor"] },
  { match: /^doctor\.referral/, roles: ["doctor", "receptionist"] },
  { match: /^doctor\./, roles: ["doctor", "nurse", "lab_tech", "radiologist", "pharmacist"] },
  { match: /^order\.laboratory/, roles: ["lab_tech", "doctor"] },
  { match: /^order\.imaging/, roles: ["radiologist", "doctor"] },
  { match: /^order\.medication/, roles: ["pharmacist", "doctor"] },
  { match: /^order\.procedure/, roles: ["doctor", "nurse"] },
  { match: /^order\./, roles: ["doctor", "nurse"] },
  { match: /^laboratory\./, roles: ["lab_tech", "doctor", "nurse"] },
  { match: /^imaging\./, roles: ["radiologist", "doctor", "nurse"] },
  { match: /^procedure\./, roles: ["doctor", "nurse"] },
  { match: /^diagnostics\./, roles: ["doctor", "ward_manager", "nurse"] },
  { match: /^ward\./, roles: ["ward_manager", "nurse", "doctor", "pharmacist"] },
  { match: /^pharmacy\./, roles: ["pharmacist", "doctor", "billing_clerk"] },
  { match: /^billing\./, roles: ["billing_clerk", "receptionist"] },
  { match: /^(staff|license|hr)\./, roles: ["hr_manager"] },
];

export function audienceFor(eventType: string): AppRole[] {
  const hit = AUDIENCE.find((entry) => entry.match.test(eventType));
  const roles = hit?.roles ?? [];
  return [...new Set([...roles, ...OVERSIGHT_ROLES])];
}

/** True when a signed-in user with these roles should see the event. */
export function isForRoles(eventType: string, roles: string[] | undefined): boolean {
  const effective = !roles || roles.length === 0 ? ["super_admin"] : roles;
  if (effective.includes("super_admin")) return true;
  const audience = audienceFor(eventType);
  return effective.some((role) => audience.includes(role as AppRole));
}

/** Where a role should go to act on the event. */
export function routeForEvent(eventType: string): string {
  if (/^reception\.|^patient\.registered|^appointment\./.test(eventType)) return "/reception";
  if (/^nurse\.|^vitals\./.test(eventType)) return "/nurse";
  if (/^laboratory\./.test(eventType)) return "/laboratory";
  if (/^imaging\./.test(eventType)) return "/radiology";
  if (/^ward\./.test(eventType)) return "/ward";
  if (/^pharmacy\./.test(eventType)) return "/pharmacy";
  if (/^billing\./.test(eventType)) return "/billing";
  if (/^order\.laboratory/.test(eventType)) return "/laboratory";
  if (/^order\.imaging/.test(eventType)) return "/radiology";
  if (/^order\.medication/.test(eventType)) return "/pharmacy";
  if (/^(staff|license|hr)\./.test(eventType)) return "/hr";
  return "/doctor";
}

const TITLES: Record<string, string> = {
  "patient.registered": "New patient registered",
  "reception.wristband_issued": "Patient checked in — triage needed",
  "nurse.triage_complete": "Triage complete — ready for doctor",
  "doctor.consultation_complete": "Consultation complete — orders dispatched",
  "doctor.referral_issued": "Specialist referral issued",
  "doctor.result_acknowledged": "Doctor acknowledged a result",
  "diagnostics.complete": "All diagnostics complete",
  "ward.bed_allocated": "Inpatient bed allocated",
  "ward.discharge_prepared": "Patient prepared for discharge",
  "pharmacy.dispensed": "Medication dispensed",
  "pharmacy.handoff_billing": "Handed to billing",
  "billing.invoice_compiled": "Invoice compiled",
  "billing.payment_received": "Payment received",
  "billing.discharge_cleared": "Financial clearance issued — patient discharged",
  "order.laboratory.requested": "New lab order received",
  "order.imaging.requested": "New imaging order received",
  "order.medication.requested": "New prescription received",
  "order.procedure.requested": "New procedure order received",
  "order.cancelled": "Order cancelled by the physician",
};

export function titleForEvent(event: HospitalEvent): string {
  if (TITLES[event.event_type]) return TITLES[event.event_type]!;
  if (/critical_value$/.test(event.event_type)) return "CRITICAL result — physician review required";
  if (/\.resulted$/.test(event.event_type)) return "Result returned to ordering doctor";
  if (/\.accepted$/.test(event.event_type)) return "Order accepted by department";
  return event.event_type.replace(/[._]/g, " ");
}

export function detailForEvent(event: HospitalEvent): string {
  const p = event.payload ?? {};
  const parts: string[] = [];
  for (const key of ["patient", "name", "summary", "next", "method", "receipt_no", "queue_ticket", "priority"]) {
    const value = p[key];
    if (typeof value === "string" || typeof value === "number") parts.push(`${key.replace(/_/g, " ")}: ${value}`);
  }
  if (event.department_code) parts.unshift(event.department_code);
  return parts.join(" · ");
}

const EVENT_SELECT =
  "id,event_type,severity,department_code,entity_type,entity_id,actor_label,payload,occurred_at";

/** Latest hospital events — the raw feed behind every notification surface. */
export const notificationFeedQuery = queryOptions({
  queryKey: ["events", "feed"],
  queryFn: async (): Promise<HospitalEvent[]> => {
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_SELECT)
      .order("occurred_at", { ascending: false })
      .limit(80);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as HospitalEvent[];
  },
  staleTime: 5_000,
});

/* ------------------------- doctor result inbox ------------------------- */

export type ResultInboxRow = {
  id: string;
  patient_id: string;
  encounter_id: string | null;
  category: string;
  name: string;
  priority: string;
  status: string;
  result_summary: string | null;
  is_critical: boolean;
  verified_by_label: string | null;
  verified_at: string | null;
  requested_by_label: string | null;
  analyzer: string | null;
  patients: { full_name: string; mrn: string; egfr: number | null } | null;
};

/** Results that have come back from lab / imaging / procedures, newest first. */
export const resultInboxQuery = queryOptions({
  queryKey: ["orders", "result-inbox"],
  queryFn: async (): Promise<ResultInboxRow[]> => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id,patient_id,encounter_id,category,name,priority,status,result_summary,is_critical," +
          "verified_by_label,verified_at,requested_by_label,analyzer,patients(full_name,mrn,egfr)",
      )
      .in("status", ["resulted", "completed"])
      .order("verified_at", { ascending: false })
      .limit(40);
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as ResultInboxRow[]).map((row) =>
      row.patients ? { ...row, patients: { ...row.patients, full_name: toEthiopianName(row.patients.full_name) } } : row,
    );
  },
});

/** Doctor closes the loop on a returned result. */
export async function acknowledgeResult(row: ResultInboxRow, doctorLabel: string) {
  const { error } = await supabase
    .from("orders")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", row.id);
  if (error) throw new Error(error.message);
  await emitEvent({
    eventType: "doctor.result_acknowledged",
    severity: row.is_critical ? "warning" : "info",
    entityType: "order",
    entityId: row.id,
    payload: { name: row.name, patient: row.patients?.full_name ?? null, reviewed_by: doctorLabel },
  });
}

/** Doctor refers the patient onward to a specialist / external facility. */
export async function issueReferral(input: {
  patientId: string;
  encounterId: string | null;
  specialty: string;
  reason: string;
  doctorLabel: string;
}) {
  const { data: hospital } = await supabase
    .from("hospitals")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!hospital) throw new Error("No hospital configured");

  const { data, error } = await supabase
    .from("orders")
    .insert({
      hospital_id: hospital.id,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      category: "procedure",
      name: `Specialist referral — ${input.specialty}`,
      priority: "routine",
      status: "requested",
      instructions: input.reason,
      requested_by_label: input.doctorLabel,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await emitEvent({
    eventType: "doctor.referral_issued",
    entityType: "order",
    entityId: data.id,
    payload: { specialty: input.specialty, reason: input.reason, referring_doctor: input.doctorLabel },
  });
  return data.id;
}
