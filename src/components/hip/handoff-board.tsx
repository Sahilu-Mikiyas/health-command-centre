import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Loader2, Radio, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/hip/panel";
import { StatusPill } from "@/components/hip/status-pill";
import { useWorkflowSync } from "@/hooks/use-workflow-sync";
import { supabase } from "@/integrations/supabase/client";
import { myProfileQuery } from "@/lib/hip/queries";
import {
  acceptWork,
  allocateBed,
  bedBoardQuery,
  buildInvoice,
  clearForDischarge,
  criticalResultsQuery,
  dispenseMedication,
  doctorHandoff,
  invoicesQuery,
  journeyQuery,
  nurseHandoff,
  pharmacyHandoff,
  publishResult,
  receptionHandoff,
  recordPayment,
  STAGE_LABELS,
  wardHandoff,
  workQueueQuery,
  type InvoiceRow,
  type JourneyRow,
  type WorkOrderRow,
} from "@/lib/hip/workflow";

export type HandoffRole =
  | "reception"
  | "nurse"
  | "doctor"
  | "laboratory"
  | "radiology"
  | "ward"
  | "pharmacy"
  | "billing";

const CHAIN: Record<HandoffRole, { from: string; to: string; title: string }> = {
  reception: { from: "Patient arrival", to: "Nurse Triage", title: "Front Desk Handoff Queue" },
  nurse: { from: "Reception", to: "Attending Doctor", title: "Triage Handoff Queue" },
  doctor: { from: "Nurse Triage", to: "Laboratory & Radiology", title: "Consultation Handoff Queue" },
  laboratory: { from: "Doctor orders", to: "Ordering Doctor", title: "Inbound Laboratory Orders" },
  radiology: { from: "Doctor orders", to: "Ordering Doctor", title: "Inbound Imaging Orders" },
  ward: { from: "Diagnostics", to: "Pharmacy", title: "Bed Allocation Handoff Queue" },
  pharmacy: { from: "Ward / Doctor", to: "Billing", title: "Inbound Prescriptions" },
  billing: { from: "Pharmacy", to: "Discharge", title: "Financial Clearance Queue" },
};

function Row({
  title,
  meta,
  badge,
  children,
}: {
  title: string;
  meta: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="truncate text-sm font-extrabold text-black">{title}</h4>
          {badge}
        </div>
        <p className="mt-0.5 truncate text-[11px] font-semibold text-[#86868B]">{meta}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Action({
  label,
  onClick,
  pending,
  tone = "dark",
}: {
  label: string;
  onClick: () => void;
  pending?: boolean;
  tone?: "dark" | "crit" | "light";
}) {
  const cls =
    tone === "crit"
      ? "bg-[#FF3B30] text-white hover:bg-[#D70015]"
      : tone === "light"
        ? "bg-[#F5F5F7] text-black border border-black/10 hover:bg-white"
        : "bg-black text-white hover:bg-slate-800";
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-bold shadow-2xs transition-all disabled:opacity-50 cursor-pointer ${cls}`}
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
      {label}
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-black/10 bg-[#FAFAFC] p-5 text-center text-[11px] font-semibold text-[#86868B]">
      {text}
    </p>
  );
}

/**
 * The live cross-role handoff board. Every workspace mounts this with its own
 * role: work arrives from the previous role and one click passes it to the next.
 */
export function HandoffBoard({ role }: { role: HandoffRole }) {
  useWorkflowSync();
  const queryClient = useQueryClient();
  const chain = CHAIN[role];

  const journey = useQuery({ ...journeyQuery, refetchInterval: 20000 });
  const me = useQuery(myProfileQuery);
  const actor = me.data?.profile?.full_name ?? me.data?.email ?? "Staff";

  const labQueue = useQuery({ ...workQueueQuery("laboratory"), enabled: role === "laboratory" });
  const imagingQueue = useQuery({ ...workQueueQuery("imaging"), enabled: role === "radiology" });
  const medQueue = useQuery({ ...workQueueQuery("medication"), enabled: role === "pharmacy" });
  const critical = useQuery({ ...criticalResultsQuery, enabled: role === "doctor" });
  const beds = useQuery({ ...bedBoardQuery, enabled: role === "ward" });
  const invoices = useQuery({ ...invoicesQuery, enabled: role === "billing" });

  const patientIds = (journey.data ?? []).map((row) => row.patient_id);
  const vitals = useQuery({
    queryKey: ["workflow", "latest-vitals", patientIds.join(",")],
    enabled: role === "nurse" && patientIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vitals")
        .select("patient_id,news2,recorded_at")
        .in("patient_id", patientIds)
        .order("recorded_at", { ascending: false });
      if (error) throw new Error(error.message);
      const latest = new Map<string, number>();
      for (const row of data ?? []) {
        if (!latest.has(row.patient_id)) latest.set(row.patient_id, row.news2 ?? 0);
      }
      return latest;
    },
  });

  const openOrders = useQuery({ ...workQueueQuery("all"), enabled: role === "doctor" });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["workflow"] });
    void queryClient.invalidateQueries({ queryKey: ["encounters"] });
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["events"] });
  };

  const run = useMutation({
    mutationFn: async (task: () => Promise<string | void>) => task(),
    onSuccess: (message) => {
      if (typeof message === "string") toast.success(message);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const act = (task: () => Promise<string | void>) => run.mutate(task);
  const pending = run.isPending;

  const stageRows = (stages: string[]) => (journey.data ?? []).filter((row) => stages.includes(row.stage));
  const name = (row: { patients: { full_name: string; mrn: string } | null }) =>
    `${row.patients?.full_name ?? "Unknown patient"} · ${row.patients?.mrn ?? "—"}`;

  let body: ReactNode = null;

  if (role === "reception") {
    const rows = stageRows(["registered", "waiting"]);
    body = rows.length ? (
      rows.map((row: JourneyRow) => (
        <Row
          key={row.id}
          title={name(row)}
          meta={`${STAGE_LABELS[row.stage] ?? row.stage} · ${row.chief_complaint ?? "No complaint recorded"}`}
          badge={<StatusPill status={row.priority === "critical" ? "critical" : "busy"} label={row.priority} />}
        >
          <Action
            label="Print wristband → Triage"
            pending={pending}
            onClick={() =>
              act(async () => {
                const { ticket, band } = await receptionHandoff(row.id, row.patients?.full_name ?? "");
                return `Ticket ${ticket} · Wristband ${band} printed — nurse queue notified`;
              })
            }
          />
        </Row>
      ))
    ) : (
      <Empty text="No patients waiting. Check a patient in above and they appear here." />
    );
  }

  if (role === "nurse") {
    const rows = stageRows(["nurse"]);
    body = rows.length ? (
      rows.map((row) => {
        const news2 = vitals.data?.get(row.patient_id);
        return (
          <Row
            key={row.id}
            title={name(row)}
            meta={`Wristband ${row.wristband_code ?? "not issued"} · Ticket ${row.queue_ticket ?? "—"} · NEWS2 ${news2 ?? "not recorded"}`}
            badge={
              news2 !== undefined ? (
                <StatusPill status={news2 >= 5 ? "critical" : news2 >= 3 ? "busy" : "healthy"} label={`NEWS2 ${news2}`} />
              ) : undefined
            }
          >
            <Action
              label="Triage complete → Doctor"
              pending={pending}
              onClick={() =>
                act(async () => {
                  await nurseHandoff(row.id, news2 ?? 0);
                  return `${row.patients?.full_name ?? "Patient"} handed to the attending doctor`;
                })
              }
            />
          </Row>
        );
      })
    ) : (
      <Empty text="No patients in triage. Reception hands patients here after wristband printing." />
    );
  }

  if (role === "doctor") {
    const rows = stageRows(["doctor"]);
    body = (
      <>
        {(critical.data ?? []).length > 0 && (
          <div className="space-y-2 rounded-2xl border border-[#FF3B30]/30 bg-[#FDE8E7] p-4">
            <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#D70015]">
              <ShieldAlert className="size-3.5" /> Critical values escalated to you
            </span>
            {(critical.data ?? []).slice(0, 4).map((order) => (
              <p key={order.id} className="text-[11px] font-bold text-[#D70015]">
                {order.patients?.full_name ?? "Patient"} · {order.name}: {order.result_summary} — verified by{" "}
                {order.verified_by_label ?? "lab"}
              </p>
            ))}
          </div>
        )}
        {rows.length ? (
          rows.map((row) => {
            const orders = (openOrders.data ?? []).filter((o) => o.encounter_id === row.id);
            return (
              <Row
                key={row.id}
                title={name(row)}
                meta={`${row.chief_complaint ?? "No complaint"} · eGFR ${row.patients?.egfr ?? "—"} · ${orders.length} order(s) placed`}
                badge={<StatusPill status={row.priority === "critical" ? "critical" : "busy"} label={row.priority} />}
              >
                <Action
                  label={orders.length ? "Sign off → Diagnostics" : "Sign off → Pharmacy"}
                  pending={pending}
                  onClick={() =>
                    act(async () => {
                      await doctorHandoff(row.id, orders.length);
                      return orders.length
                        ? `${orders.length} order(s) released to the lab & imaging queues`
                        : "Patient handed to pharmacy";
                    })
                  }
                />
              </Row>
            );
          })
        ) : (
          <Empty text="No consultations waiting. Nurses hand triaged patients here." />
        )}
      </>
    );
  }

  if (role === "laboratory" || role === "radiology") {
    const queue = role === "laboratory" ? labQueue.data : imagingQueue.data;
    const analyzer = role === "laboratory" ? "Roche Cobas 8000" : "64-Slice CT (Siemens)";
    const rows = (queue ?? []).filter((o) => o.status === "requested" || o.status === "in_progress");
    body = rows.length ? (
      rows.map((order: WorkOrderRow) => (
        <Row
          key={order.id}
          title={`${order.patients?.full_name ?? "Patient"} · ${order.name}`}
          meta={`Ordered by ${order.requested_by_label ?? "doctor"} · ${order.priority.toUpperCase()} · ${order.specimen_barcode ?? "no specimen label"} · eGFR ${order.patients?.egfr ?? "—"}`}
          badge={<StatusPill status={order.status === "in_progress" ? "busy" : "healthy"} label={order.status} />}
        >
          {order.status === "requested" ? (
            <Action
              label={role === "laboratory" ? "Collect & load analyzer" : "Accept & acquire scan"}
              pending={pending}
              onClick={() =>
                act(async () => {
                  const barcode = await acceptWork(order, analyzer);
                  return `${order.name} accepted on ${analyzer} (${barcode})`;
                })
              }
            />
          ) : (
            <>
              <Action
                label="Verify & release result"
                pending={pending}
                onClick={() =>
                  act(async () => {
                    await publishResult({
                      order,
                      summary:
                        role === "laboratory"
                          ? "All analytes within reference range; no action required."
                          : "No acute intracranial abnormality. Impression within normal limits.",
                      values: { analyzer, reviewed: true },
                      isCritical: false,
                      verifiedBy: actor,
                    });
                    return `Result released to ${order.requested_by_label ?? "the ordering doctor"}`;
                  })
                }
              />
              <Action
                label="Release as CRITICAL"
                tone="crit"
                pending={pending}
                onClick={() =>
                  act(async () => {
                    await publishResult({
                      order,
                      summary:
                        role === "laboratory"
                          ? "Leukocytosis with marked inflammatory markers — critical value."
                          : "Acute finding on imaging — immediate physician review required.",
                      values: { analyzer, critical: true },
                      isCritical: true,
                      verifiedBy: actor,
                    });
                    return `Critical value broadcast to ${order.requested_by_label ?? "the ordering doctor"}`;
                  })
                }
              />
            </>
          )}
        </Row>
      ))
    ) : (
      <Empty text="No inbound orders. Doctor-placed orders land here the moment they are signed." />
    );
  }

  if (role === "ward") {
    const rows = stageRows(["ward"]);
    const free = (beds.data ?? []).filter((bed) => bed.status === "available");
    body = rows.length ? (
      rows.map((row) => (
        <Row
          key={row.id}
          title={name(row)}
          meta={
            row.bed_id
              ? `Admitted to bed ${(beds.data ?? []).find((b) => b.id === row.bed_id)?.label ?? row.bed_id}`
              : `Awaiting bed · ${free.length} available`
          }
          badge={<StatusPill status={row.bed_id ? "healthy" : "busy"} label={row.bed_id ? "admitted" : "awaiting bed"} />}
        >
          {row.bed_id ? (
            <Action
              label="Step down → Pharmacy"
              pending={pending}
              onClick={() =>
                act(async () => {
                  await wardHandoff({ encounterId: row.id, bedId: row.bed_id });
                  return "Bed released for cleaning · prescription handed to pharmacy";
                })
              }
            />
          ) : (
            <>
              <Action
                label={free[0] ? `Allocate ${free[0].label}` : "No bed free"}
                pending={pending || !free[0]}
                onClick={() =>
                  act(async () => {
                    const bed = free[0];
                    if (!bed) throw new Error("No available bed");
                    await allocateBed({ encounterId: row.id, patientId: row.patient_id, bedId: bed.id, isolation: false });
                    return `Allocated ${bed.label} (${bed.rooms?.wards?.name ?? "ward"})`;
                  })
                }
              />
              <Action
                label="Isolation bed"
                tone="light"
                pending={pending || !free[0]}
                onClick={() =>
                  act(async () => {
                    const bed = free[0];
                    if (!bed) throw new Error("No available bed");
                    await allocateBed({ encounterId: row.id, patientId: row.patient_id, bedId: bed.id, isolation: true });
                    return `Negative-pressure isolation set on ${bed.label}`;
                  })
                }
              />
            </>
          )}
        </Row>
      ))
    ) : (
      <Empty text="No admissions pending. Patients arrive here once diagnostics are complete." />
    );
  }

  if (role === "pharmacy") {
    const scripts = (medQueue.data ?? []).filter((o) => o.status === "requested" || o.status === "in_progress");
    const ready = stageRows(["pharmacy"]);
    body = (
      <>
        {scripts.map((order) => (
          <Row
            key={order.id}
            title={`${order.patients?.full_name ?? "Patient"} · ${order.name}`}
            meta={`Prescribed by ${order.requested_by_label ?? "doctor"} · eGFR ${order.patients?.egfr ?? "—"} ${
              (order.patients?.egfr ?? 99) < 60 ? "· RENAL DOSE ADJUSTMENT REQUIRED" : "· renal clearance OK"
            }`}
            badge={
              <StatusPill
                status={(order.patients?.egfr ?? 99) < 60 ? "critical" : "healthy"}
                label={(order.patients?.egfr ?? 99) < 60 ? "eGFR guard" : "safe dose"}
              />
            }
          >
            <Action
              label="Dispense + Amharic sheet"
              pending={pending}
              onClick={() =>
                act(async () => {
                  await dispenseMedication(order, actor);
                  return `${order.name} dispensed · bilingual counselling sheet printed (English + አማርኛ)`;
                })
              }
            />
          </Row>
        ))}
        {ready.map((row) => (
          <Row key={row.id} title={name(row)} meta="Prescriptions complete — ready for the cashier">
            <Action
              label="Send to Billing"
              pending={pending}
              onClick={() =>
                act(async () => {
                  await pharmacyHandoff(row.id);
                  return "Encounter handed to billing & cashier";
                })
              }
            />
          </Row>
        ))}
        {scripts.length === 0 && ready.length === 0 && (
          <Empty text="No prescriptions inbound. Doctor medication orders appear here automatically." />
        )}
      </>
    );
  }

  if (role === "billing") {
    const ready = stageRows(["billing"]);
    const open = (invoices.data ?? []).filter((inv) => inv.status !== "cleared");
    body = (
      <>
        {ready.map((row) => {
          const invoiced = (invoices.data ?? []).some((inv) => inv.encounter_id === row.id);
          if (invoiced) return null;
          return (
            <Row
              key={row.id}
              title={name(row)}
              meta={`Insurance ${row.patients?.insurance_provider ?? "Self-pay"} · coverage ${row.patients?.insurance_coverage_pct ?? 0}%`}
            >
              <Action
                label="Compile itemised ledger"
                pending={pending}
                onClick={() =>
                  act(async () => {
                    await buildInvoice(row);
                    return "Invoice compiled from consultation, lab, imaging and pharmacy charges";
                  })
                }
              />
            </Row>
          );
        })}
        {open.map((inv: InvoiceRow) => (
          <Row
            key={inv.id}
            title={`${inv.patients?.full_name ?? "Patient"} · ETB ${inv.patient_due.toLocaleString()} due`}
            meta={`${inv.invoice_items.length} line items · subtotal ETB ${inv.subtotal.toLocaleString()} · insurance covered ETB ${inv.insurance_covered.toLocaleString()} · TIN ${inv.tin_number}`}
            badge={<StatusPill status={inv.status === "paid" ? "healthy" : "busy"} label={inv.status} />}
          >
            {inv.status === "paid" ? (
              <Action
                label="Issue discharge clearance"
                pending={pending}
                onClick={() =>
                  act(async () => {
                    await clearForDischarge(inv);
                    return "Discharge clearance certificate issued — encounter closed";
                  })
                }
              />
            ) : (
              <>
                <Action
                  label="Collect via Telebirr"
                  pending={pending}
                  onClick={() =>
                    act(async () => {
                      const receipt = await recordPayment({ invoice: inv, method: "Telebirr" });
                      return `Telebirr payment received · thermal tax receipt ${receipt}`;
                    })
                  }
                />
                <Action
                  label="CBE Birr"
                  tone="light"
                  pending={pending}
                  onClick={() =>
                    act(async () => {
                      const receipt = await recordPayment({ invoice: inv, method: "CBE Birr" });
                      return `CBE Birr payment received · receipt ${receipt}`;
                    })
                  }
                />
              </>
            )}
          </Row>
        ))}
        {ready.length === 0 && open.length === 0 && (
          <Empty text="No accounts to settle. Pharmacy hands cleared patients here." />
        )}
      </>
    );
  }

  return (
    <Panel
      title={chain.title}
      subtitle={`Receives from ${chain.from} → hands off to ${chain.to}`}
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B6ECC3] bg-[#E8F8EC] px-3 py-1 text-[10px] font-bold text-[#1D8A39]">
          <Radio className="size-3" /> Live sync
        </span>
      }
    >
      <div className="space-y-3">
        {journey.isLoading ? (
          <Empty text="Loading the live patient journey…" />
        ) : (
          body ?? <Empty text="Nothing to action." />
        )}
        <p className="flex items-center gap-1.5 pt-1 text-[10px] font-semibold text-[#86868B]">
          <CheckCircle2 className="size-3" /> Every action here writes to the shared event ledger and instantly updates
          the other role workspaces.
        </p>
      </div>
    </Panel>
  );
}
