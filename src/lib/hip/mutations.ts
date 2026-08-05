import { supabase } from "@/integrations/supabase/client";

/** Append an entry to the append-only hospital event stream. */
export async function emitEvent(input: {
  eventType: string;
  payload?: Record<string, unknown>;
  departmentCode?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  severity?: "info" | "warning" | "critical";
}) {
  const args: {
    _event_type: string;
    _payload?: never;
    _department_code?: string;
    _entity_type?: string;
    _entity_id?: string;
    _severity?: string;
  } = {
    _event_type: input.eventType,
    _payload: (input.payload ?? {}) as never,
    _severity: input.severity ?? "info",
  };
  if (input.departmentCode) args._department_code = input.departmentCode;
  if (input.entityType) args._entity_type = input.entityType;
  if (input.entityId) args._entity_id = input.entityId;

  const { error } = await supabase.rpc("emit_event", args);

  if (error) throw new Error(error.message);
}

async function currentActorLabel() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return data?.full_name ?? auth.user.email ?? null;
}

async function hospitalId() {
  const { data, error } = await supabase
    .from("hospitals")
    .select("id")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "No hospital configured");
  return data.id;
}

export async function registerPatient(input: {
  fullName: string;
  dateOfBirth: string;
  sex: string;
  phone?: string;
  bloodGroup?: string;
  insuranceProvider?: string;
}) {
  const hid = await hospitalId();
  const mrn = `MRN-${Math.floor(100000 + Math.random() * 899999)}`;
  const { data, error } = await supabase
    .from("patients")
    .insert({
      hospital_id: hid,
      mrn,
      full_name: input.fullName,
      date_of_birth: input.dateOfBirth,
      sex: input.sex,
      phone: input.phone ?? null,
      blood_group: input.bloodGroup ?? null,
      insurance_provider: input.insuranceProvider ?? null,
    })
    .select("id,mrn,full_name")
    .single();
  if (error) throw new Error(error.message);
  await emitEvent({
    eventType: "patient.registered",
    departmentCode: "RECEPTION",
    entityType: "patient",
    entityId: data.id,
    payload: { mrn: data.mrn, name: data.full_name },
  });
  return data;
}

export async function bookAppointment(input: {
  patientId: string;
  departmentId: string | null;
  scheduledAt: string;
  reason?: string;
}) {
  const hid = await hospitalId();
  const actor = await currentActorLabel();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      hospital_id: hid,
      patient_id: input.patientId,
      department_id: input.departmentId,
      scheduled_at: new Date(input.scheduledAt).toISOString(),
      reason: input.reason ?? null,
      booked_by_label: actor,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await emitEvent({
    eventType: "appointment.booked",
    departmentCode: "RECEPTION",
    entityType: "appointment",
    entityId: data.id,
    payload: { scheduled_at: input.scheduledAt },
  });
  return data;
}

/** Reception check-in: appointment -> arrived, and a live encounter opens. */
export async function checkInAppointment(appointment: {
  id: string;
  patient_id: string;
  department_id: string | null;
  reason: string | null;
}) {
  const hid = await hospitalId();
  const { error: updateError } = await supabase
    .from("appointments")
    .update({ status: "arrived" })
    .eq("id", appointment.id);
  if (updateError) throw new Error(updateError.message);

  const { data, error } = await supabase
    .from("encounters")
    .insert({
      hospital_id: hid,
      patient_id: appointment.patient_id,
      department_id: appointment.department_id,
      stage: "waiting",
      chief_complaint: appointment.reason,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await emitEvent({
    eventType: "patient.checked_in",
    departmentCode: "RECEPTION",
    entityType: "encounter",
    entityId: data.id,
    payload: { appointment_id: appointment.id },
  });
  return data;
}

export async function updateAppointmentStatus(id: string, status: string) {
  const { error } = await supabase
    .from("appointments")
    .update({ status: status as never })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await emitEvent({
    eventType: `appointment.${status}`,
    departmentCode: "RECEPTION",
    entityType: "appointment",
    entityId: id,
  });
}

export async function setEncounterStage(input: {
  encounterId: string;
  stage: string;
  departmentCode?: string | null;
}) {
  const patch: { stage: string; ended_at?: string } = { stage: input.stage };
  if (input.stage === "complete") patch.ended_at = new Date().toISOString();
  const { error } = await supabase.from("encounters").update(patch).eq("id", input.encounterId);

  if (error) throw new Error(error.message);
  await emitEvent({
    eventType: "encounter.stage_changed",
    departmentCode: input.departmentCode ?? null,
    entityType: "encounter",
    entityId: input.encounterId,
    payload: { stage: input.stage },
  });
}

export async function setEncounterPriority(encounterId: string, priority: string) {
  const { error } = await supabase.from("encounters").update({ priority }).eq("id", encounterId);
  if (error) throw new Error(error.message);
  await emitEvent({
    eventType: "encounter.priority_changed",
    severity: priority === "critical" ? "critical" : "info",
    entityType: "encounter",
    entityId: encounterId,
    payload: { priority },
  });
}

export async function createOrder(input: {
  patientId: string;
  encounterId: string | null;
  category: "laboratory" | "imaging" | "medication" | "procedure";
  name: string;
  priority: string;
  instructions?: string;
}) {
  const hid = await hospitalId();
  const actor = await currentActorLabel();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      hospital_id: hid,
      patient_id: input.patientId,
      encounter_id: input.encounterId,
      category: input.category,
      name: input.name,
      priority: input.priority,
      instructions: input.instructions ?? null,
      requested_by_label: actor,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await emitEvent({
    eventType: `order.${input.category}.requested`,
    severity: input.priority === "stat" ? "warning" : "info",
    entityType: "order",
    entityId: data.id,
    payload: { name: input.name, priority: input.priority },
  });
  return data;
}

export async function cancelOrder(id: string) {
  const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", id);
  if (error) throw new Error(error.message);
  await emitEvent({ eventType: "order.cancelled", entityType: "order", entityId: id });
}

export async function saveNote(input: {
  id?: string;
  patientId: string;
  encounterId: string | null;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  sign: boolean;
}) {
  const actor = await currentActorLabel();
  const payload = {
    patient_id: input.patientId,
    encounter_id: input.encounterId,
    author_label: actor,
    subjective: input.subjective,
    objective: input.objective,
    assessment: input.assessment,
    plan: input.plan,
    signed_at: input.sign ? new Date().toISOString() : null,
  };

  const query = input.id
    ? supabase.from("clinical_notes").update(payload).eq("id", input.id).select("id").single()
    : supabase.from("clinical_notes").insert(payload).select("id").single();

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  await emitEvent({
    eventType: input.sign ? "note.signed" : "note.saved",
    entityType: "clinical_note",
    entityId: data.id,
    payload: { patient_id: input.patientId },
  });
  return data;
}

export async function recordVitals(input: {
  patientId: string;
  temperatureC?: number;
  heartRate?: number;
  systolic?: number;
  diastolic?: number;
  respiratoryRate?: number;
  spo2?: number;
}) {
  const news2 =
    (input.respiratoryRate && input.respiratoryRate >= 25 ? 3 : 0) +
    (input.spo2 && input.spo2 < 92 ? 3 : 0) +
    (input.systolic && input.systolic < 90 ? 3 : 0) +
    (input.heartRate && input.heartRate >= 131 ? 3 : 0) +
    (input.temperatureC && input.temperatureC >= 39.1 ? 2 : 0);

  const { data, error } = await supabase
    .from("vitals")
    .insert({
      patient_id: input.patientId,
      temperature_c: input.temperatureC ?? null,
      heart_rate: input.heartRate ?? null,
      systolic: input.systolic ?? null,
      diastolic: input.diastolic ?? null,
      respiratory_rate: input.respiratoryRate ?? null,
      spo2: input.spo2 ?? null,
      news2,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await emitEvent({
    eventType: "vitals.recorded",
    severity: news2 >= 5 ? "critical" : news2 >= 3 ? "warning" : "info",
    entityType: "patient",
    entityId: input.patientId,
    payload: { news2 },
  });
  return { id: data.id, news2 };
}
