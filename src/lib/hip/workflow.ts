import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { toEthiopianName } from "@/lib/hip/ethiopian-names";
import { emitEvent } from "@/lib/hip/mutations";

/* ------------------------------------------------------------------ *
 * Canonical clinical journey — every workspace reads the same stages. *
 * ------------------------------------------------------------------ */

export const JOURNEY_STAGES = [
  "registered",
  "waiting",
  "nurse",
  "doctor",
  "laboratory",
  "ward",
  "pharmacy",
  "billing",
  "complete",
] as const;

export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export const STAGE_LABELS: Record<string, string> = {
  registered: "Registered",
  waiting: "Waiting for Triage",
  nurse: "Nurse Triage",
  doctor: "Doctor Consultation",
  laboratory: "Diagnostics (Lab / Imaging)",
  ward: "Inpatient Ward",
  pharmacy: "Pharmacy Dispensing",
  billing: "Billing & Clearance",
  complete: "Discharged",
};

/** Which role owns the patient at each stage. */
export const STAGE_OWNER: Record<string, string> = {
  registered: "Receptionist",
  waiting: "Receptionist",
  nurse: "Registered Nurse",
  doctor: "Attending Doctor",
  laboratory: "Lab / Radiology",
  ward: "Ward Manager",
  pharmacy: "Clinical Pharmacist",
  billing: "Billing Clerk",
  complete: "Discharged",
};

export const TARIFF: Record<string, number> = {
  consultation: 600,
  laboratory: 450,
  imaging: 2500,
  medication: 380,
  procedure: 1200,
  bed_day: 1500,
};

/* ---------------------------- shared queries ---------------------------- */

export type JourneyRow = {
  id: string;
  patient_id: string;
  stage: string;
  priority: string;
  chief_complaint: string | null;
  started_at: string;
  queue_ticket: string | null;
  wristband_code: string | null;
  bed_id: string | null;
  discharge_ready: boolean;
  patients: {
    full_name: string;
    mrn: string;
    date_of_birth: string;
    egfr: number | null;
    insurance_provider: string | null;
    insurance_coverage_pct: number | null;
  } | null;
  departments: { name: string; code: string } | null;
};

const JOURNEY_SELECT =
  "id,patient_id,stage,priority,chief_complaint,started_at,queue_ticket,wristband_code,bed_id,discharge_ready," +
  "patients(full_name,mrn,date_of_birth,egfr,insurance_provider,insurance_coverage_pct),departments(name,code)";

function mapPatientName<T extends { patients: { full_name: string } | null }>(row: T): T {
  return row.patients
    ? { ...row, patients: { ...row.patients, full_name: toEthiopianName(row.patients.full_name) } }
    : row;
}

/** The single live patient journey board shared by every role workspace. */
export const journeyQuery = queryOptions({
  queryKey: ["workflow", "journey"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("encounters")
      .select(JOURNEY_SELECT)
      .is("ended_at", null)
      .order("started_at");
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as JourneyRow[]).map(mapPatientName);
  },
});

export type WorkOrderRow = {
  id: string;
  patient_id: string;
  encounter_id: string | null;
  category: "laboratory" | "imaging" | "medication" | "procedure";
  name: string;
  priority: string;
  status: string;
  instructions: string | null;
  requested_by_label: string | null;
  requested_at: string;
  result_summary: string | null;
  is_critical: boolean;
  verified_by_label: string | null;
  verified_at: string | null;
  specimen_barcode: string | null;
  analyzer: string | null;
  patients: { full_name: string; mrn: string; egfr: number | null; date_of_birth: string } | null;
};

const WORK_ORDER_SELECT =
  "id,patient_id,encounter_id,category,name,priority,status,instructions,requested_by_label,requested_at," +
  "result_summary,is_critical,verified_by_label,verified_at,specimen_barcode,analyzer," +
  "patients(full_name,mrn,egfr,date_of_birth)";

/** Live work queue for a discipline — this is how doctor orders reach lab/imaging/pharmacy. */
export const workQueueQuery = (category: WorkOrderRow["category"] | "all") =>
  queryOptions({
    queryKey: ["workflow", "queue", category],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select(WORK_ORDER_SELECT)
        .in("status", ["requested", "in_progress", "resulted", "completed"])
        .order("requested_at", { ascending: false })
        .limit(80);
      if (category !== "all") query = query.eq("category", category);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as WorkOrderRow[]).map(mapPatientName);
    },
  });

/** Critical values broadcast back to the ordering physician. */
export const criticalResultsQuery = queryOptions({
  queryKey: ["workflow", "critical"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(WORK_ORDER_SELECT)
      .eq("is_critical", true)
      .in("status", ["resulted", "completed"])
      .order("verified_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as WorkOrderRow[]).map(mapPatientName);
  },
});

export type BedRow = {
  id: string;
  label: string;
  status: string;
  patient_id: string | null;
  rooms: { name: string; wards: { name: string; floor: number } | null } | null;
};

export const bedBoardQuery = queryOptions({
  queryKey: ["workflow", "beds"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("beds")
      .select("id,label,status,patient_id,rooms(name,wards(name,floor))")
      .order("label")
      .limit(400);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as BedRow[];
  },
});

export type InvoiceRow = {
  id: string;
  patient_id: string;
  encounter_id: string | null;
  status: string;
  subtotal: number;
  insurance_pct: number;
  insurance_covered: number;
  patient_due: number;
  paid_amount: number;
  payment_method: string | null;
  receipt_no: string | null;
  tin_number: string;
  created_at: string;
  patients: { full_name: string; mrn: string; insurance_provider: string | null } | null;
  invoice_items: { id: string; category: string; description: string; quantity: number; amount: number }[];
};

export const invoicesQuery = queryOptions({
  queryKey: ["workflow", "invoices"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select(
        "id,patient_id,encounter_id,status,subtotal,insurance_pct,insurance_covered,patient_due,paid_amount," +
          "payment_method,receipt_no,tin_number,created_at,patients(full_name,mrn,insurance_provider)," +
          "invoice_items(id,category,description,quantity,amount)",
      )
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return ((data ?? []) as unknown as InvoiceRow[]).map(mapPatientName);
  },
});

/* --------------------------- handoff mutations --------------------------- */

async function setStage(encounterId: string, stage: JourneyStage, patch: Record<string, unknown> = {}) {
  const body: Record<string, unknown> = { stage, ...patch };
  if (stage === "complete") body["ended_at"] = new Date().toISOString();
  const { error } = await supabase.from("encounters").update(body as never).eq("id", encounterId);
  if (error) throw new Error(error.message);
}

/** Step 1 — Reception: wristband + queue ticket, patient handed to Nurse Triage. */
export async function receptionHandoff(encounterId: string, patientLabel: string) {
  const ticket = `Q-${String(Math.floor(100 + Math.random() * 899))}`;
  const band = `WB-${Date.now().toString().slice(-8)}`;
  await setStage(encounterId, "nurse", { queue_ticket: ticket, wristband_code: band });
  await emitEvent({
    eventType: "reception.wristband_issued",
    departmentCode: "RECEPTION",
    entityType: "encounter",
    entityId: encounterId,
    payload: { queue_ticket: ticket, wristband_code: band, patient: patientLabel, next: "nurse" },
  });
  return { ticket, band };
}

/** Step 2 — Nurse: triage complete (NEWS2 already recorded), handed to Doctor. */
export async function nurseHandoff(encounterId: string, news2: number) {
  const priority = news2 >= 5 ? "critical" : news2 >= 3 ? "urgent" : "routine";
  await setStage(encounterId, "doctor", { priority });
  await emitEvent({
    eventType: "nurse.triage_complete",
    severity: news2 >= 5 ? "critical" : news2 >= 3 ? "warning" : "info",
    departmentCode: "TRIAGE",
    entityType: "encounter",
    entityId: encounterId,
    payload: { news2, priority, next: "doctor" },
  });
}

/** Step 3 — Doctor: orders placed, patient handed to Diagnostics. */
export async function doctorHandoff(encounterId: string, orderCount: number) {
  await setStage(encounterId, orderCount > 0 ? "laboratory" : "pharmacy");
  await emitEvent({
    eventType: "doctor.consultation_complete",
    entityType: "encounter",
    entityId: encounterId,
    payload: { orders: orderCount, next: orderCount > 0 ? "laboratory" : "pharmacy" },
  });
}

/** Step 4/5 — Lab & Radiology: accept the order off the doctor's queue. */
export async function acceptWork(order: WorkOrderRow, analyzer: string) {
  const barcode = `SPC-${Date.now().toString().slice(-7)}`;
  const { error } = await supabase
    .from("orders")
    .update({ status: "in_progress", specimen_barcode: barcode, analyzer })
    .eq("id", order.id);
  if (error) throw new Error(error.message);
  await emitEvent({
    eventType: `${order.category}.accepted`,
    departmentCode: order.category === "imaging" ? "RADIOLOGY" : "LABORATORY",
    entityType: "order",
    entityId: order.id,
    payload: { name: order.name, analyzer, specimen_barcode: barcode },
  });
  return barcode;
}

/** Step 4/5 — Lab & Radiology: verified result flows back to the ordering doctor. */
export async function publishResult(input: {
  order: WorkOrderRow;
  summary: string;
  values?: Record<string, unknown>;
  isCritical: boolean;
  verifiedBy: string;
}) {
  const { error } = await supabase
    .from("orders")
    .update({
      status: "resulted",
      result_summary: input.summary,
      result_values: (input.values ?? {}) as never,
      is_critical: input.isCritical,
      verified_by_label: input.verifiedBy,
      verified_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      unit_price: TARIFF[input.order.category] ?? 0,
    })
    .eq("id", input.order.id);
  if (error) throw new Error(error.message);

  await emitEvent({
    eventType: input.isCritical ? `${input.order.category}.critical_value` : `${input.order.category}.resulted`,
    severity: input.isCritical ? "critical" : "info",
    departmentCode: input.order.category === "imaging" ? "RADIOLOGY" : "LABORATORY",
    entityType: "order",
    entityId: input.order.id,
    payload: {
      name: input.order.name,
      summary: input.summary,
      ordering_doctor: input.order.requested_by_label,
      escalated_to: "doctor",
    },
  });

  if (input.order.encounter_id) {
    const { data } = await supabase
      .from("orders")
      .select("id,status")
      .eq("encounter_id", input.order.encounter_id)
      .in("category", ["laboratory", "imaging", "procedure"]);
    const pending = (data ?? []).filter((o) => o.status === "requested" || o.status === "in_progress");
    if (pending.length === 0) {
      await setStage(input.order.encounter_id, "ward");
      await emitEvent({
        eventType: "diagnostics.complete",
        entityType: "encounter",
        entityId: input.order.encounter_id,
        payload: { next: "ward" },
      });
    }
  }
}

/** Step 6 — Ward Manager: allocate an inpatient bed. */
export async function allocateBed(input: { encounterId: string; patientId: string; bedId: string; isolation: boolean }) {
  const { error: bedError } = await supabase
    .from("beds")
    .update({ status: "occupied", patient_id: input.patientId })
    .eq("id", input.bedId);
  if (bedError) throw new Error(bedError.message);
  await setStage(input.encounterId, "ward", { bed_id: input.bedId });
  await emitEvent({
    eventType: "ward.bed_allocated",
    severity: input.isolation ? "warning" : "info",
    departmentCode: "WARD",
    entityType: "encounter",
    entityId: input.encounterId,
    payload: { bed_id: input.bedId, isolation: input.isolation },
  });
}

/** Step 6 — Ward Manager: step patient down and hand to Pharmacy. */
export async function wardHandoff(input: { encounterId: string; bedId: string | null }) {
  if (input.bedId) {
    const { error } = await supabase
      .from("beds")
      .update({ status: "cleaning", patient_id: null })
      .eq("id", input.bedId);
    if (error) throw new Error(error.message);
  }
  await setStage(input.encounterId, "pharmacy", { discharge_ready: true, bed_id: null });
  await emitEvent({
    eventType: "ward.discharge_prepared",
    departmentCode: "WARD",
    entityType: "encounter",
    entityId: input.encounterId,
    payload: { next: "pharmacy" },
  });
}

/** Step 7 — Pharmacy: dispense a medication order. */
export async function dispenseMedication(order: WorkOrderRow, pharmacistLabel: string) {
  const { error } = await supabase
    .from("orders")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      verified_by_label: pharmacistLabel,
      verified_at: new Date().toISOString(),
      unit_price: TARIFF["medication"] ?? 0,
    })
    .eq("id", order.id);
  if (error) throw new Error(error.message);
  await emitEvent({
    eventType: "pharmacy.dispensed",
    departmentCode: "PHARMACY",
    entityType: "order",
    entityId: order.id,
    payload: { name: order.name, counselling: "English + አማርኛ", pharmacist: pharmacistLabel },
  });
}

/** Step 7 — Pharmacy: hand the encounter to Billing. */
export async function pharmacyHandoff(encounterId: string) {
  await setStage(encounterId, "billing");
  await emitEvent({
    eventType: "pharmacy.handoff_billing",
    departmentCode: "PHARMACY",
    entityType: "encounter",
    entityId: encounterId,
    payload: { next: "billing" },
  });
}

/** Step 8 — Billing: compile the itemised ledger from everything the other roles did. */
export async function buildInvoice(journey: JourneyRow) {
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("encounter_id", journey.id)
    .maybeSingle();
  if (existing) return existing.id;

  const [{ data: hospital }, { data: orders }] = await Promise.all([
    supabase.from("hospitals").select("id").order("created_at").limit(1).maybeSingle(),
    supabase
      .from("orders")
      .select("id,category,name,status")
      .eq("encounter_id", journey.id)
      .in("status", ["resulted", "completed"]),
  ]);
  if (!hospital) throw new Error("No hospital configured");

  const items = [
    {
      category: "consultation",
      description: "Attending physician consultation",
      quantity: 1,
      unit_price: TARIFF["consultation"] ?? 0,
      amount: TARIFF["consultation"] ?? 0,
      source_order_id: null as string | null,
    },
    ...(orders ?? []).map((o) => ({
      category: o.category as string,
      description: o.name,
      quantity: 1,
      unit_price: TARIFF[o.category] ?? 0,
      amount: TARIFF[o.category] ?? 0,
      source_order_id: o.id as string | null,
    })),
  ];

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const pct = journey.patients?.insurance_coverage_pct ?? 0;
  const covered = Math.round(subtotal * (pct / 100) * 100) / 100;

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      hospital_id: hospital.id,
      patient_id: journey.patient_id,
      encounter_id: journey.id,
      status: "awaiting_payment",
      subtotal,
      insurance_pct: pct,
      insurance_covered: covered,
      patient_due: Math.round((subtotal - covered) * 100) / 100,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: itemError } = await supabase
    .from("invoice_items")
    .insert(items.map((item) => ({ ...item, invoice_id: invoice.id })));
  if (itemError) throw new Error(itemError.message);

  await emitEvent({
    eventType: "billing.invoice_compiled",
    departmentCode: "BILLING",
    entityType: "invoice",
    entityId: invoice.id,
    payload: { subtotal, insurance_pct: pct, patient_due: subtotal - covered },
  });
  return invoice.id;
}

/** Step 8 — Billing: Telebirr / CBE Birr payment + thermal tax receipt. */
export async function recordPayment(input: { invoice: InvoiceRow; method: string }) {
  const receipt = `FS-${Math.floor(100000 + Math.random() * 899999)}`;
  const { error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_amount: input.invoice.patient_due,
      payment_method: input.method,
      receipt_no: receipt,
      paid_at: new Date().toISOString(),
    })
    .eq("id", input.invoice.id);
  if (error) throw new Error(error.message);
  await emitEvent({
    eventType: "billing.payment_received",
    departmentCode: "BILLING",
    entityType: "invoice",
    entityId: input.invoice.id,
    payload: { method: input.method, amount: input.invoice.patient_due, receipt_no: receipt },
  });
  return receipt;
}

/** Step 8 — Billing: financial clearance closes the encounter. */
export async function clearForDischarge(invoice: InvoiceRow) {
  const { error } = await supabase
    .from("invoices")
    .update({ status: "cleared", cleared_at: new Date().toISOString() })
    .eq("id", invoice.id);
  if (error) throw new Error(error.message);
  if (invoice.encounter_id) {
    await setStage(invoice.encounter_id, "complete", { disposition: "discharged", cleared_at: new Date().toISOString() });
  }
  await emitEvent({
    eventType: "billing.discharge_cleared",
    departmentCode: "BILLING",
    entityType: "invoice",
    entityId: invoice.id,
    payload: { receipt_no: invoice.receipt_no },
  });
}
