import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FlaskConical,
  Pill,
  Scan,
  Share2,
  Stethoscope,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Panel, Stat } from "@/components/hip/panel";
import { Timeline } from "@/components/hip/timeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  acknowledgeResult,
  detailForEvent,
  isForRoles,
  issueReferral,
  notificationFeedQuery,
  resultInboxQuery,
  titleForEvent,
  type ResultInboxRow,
} from "@/lib/hip/alerts";
import { createOrder } from "@/lib/hip/mutations";

type NextStep = "laboratory" | "imaging" | "medication" | "referral";

const STEP_META: Record<NextStep, { label: string; icon: typeof FlaskConical; placeholder: string }> = {
  laboratory: { label: "Further lab test", icon: FlaskConical, placeholder: "e.g. Repeat Renal Panel in 24h" },
  imaging: { label: "Imaging study", icon: Scan, placeholder: "e.g. Non-contrast Head CT" },
  medication: { label: "Prescribe medicine", icon: Pill, placeholder: "e.g. Sumatriptan 50mg PO PRN" },
  referral: { label: "Specialist referral", icon: Share2, placeholder: "e.g. Nephrology & Renal Medicine" },
};

function timeLabel(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Doctor's closed-loop inbox: results returned from every department,
 * live patient-state notifications, and the next clinical step.
 */
export function DoctorInbox({ doctorLabel }: { doctorLabel: string }) {
  const queryClient = useQueryClient();
  const results = useQuery({ ...resultInboxQuery, refetchInterval: 15000 });
  const feed = useQuery({ ...notificationFeedQuery, refetchInterval: 15000 });

  const [activeRow, setActiveRow] = useState<ResultInboxRow | null>(null);
  const [step, setStep] = useState<NextStep>("laboratory");
  const [detail, setDetail] = useState("");
  const [reason, setReason] = useState("");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["orders"] });
    void queryClient.invalidateQueries({ queryKey: ["events"] });
    void queryClient.invalidateQueries({ queryKey: ["encounters"] });
  };

  const ackMut = useMutation({
    mutationFn: (row: ResultInboxRow) => acknowledgeResult(row, doctorLabel),
    onSuccess: () => {
      toast.success("Result reviewed — loop closed back to the department");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const nextStepMut = useMutation({
    mutationFn: async () => {
      if (!activeRow) throw new Error("Select a result first");
      if (!detail.trim()) throw new Error("Describe the next step");
      if (step === "referral") {
        return issueReferral({
          patientId: activeRow.patient_id,
          encounterId: activeRow.encounter_id,
          specialty: detail,
          reason: reason || `Follow-up on ${activeRow.name}`,
          doctorLabel,
        });
      }
      return createOrder({
        patientId: activeRow.patient_id,
        encounterId: activeRow.encounter_id,
        category: step,
        name: detail,
        priority: activeRow.is_critical ? "urgent" : "routine",
        instructions: reason || `Triggered by result: ${activeRow.name}`,
      });
    },
    onSuccess: () => {
      toast.success(
        step === "referral"
          ? "Referral issued and broadcast to reception"
          : `Order dispatched to ${step === "medication" ? "pharmacy" : step}`,
      );
      setDetail("");
      setReason("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = results.data ?? [];
  const criticalCount = rows.filter((row) => row.is_critical && row.status === "resulted").length;
  const pendingReview = rows.filter((row) => row.status === "resulted").length;

  const mine = (feed.data ?? []).filter((event) => isForRoles(event.event_type, ["doctor"])).slice(0, 14);
  const StepIcon = STEP_META[step].icon;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Results awaiting review" value={pendingReview} tone={pendingReview > 0 ? "warn" : "ok"} />
        <Stat label="Critical values" value={criticalCount} tone={criticalCount > 0 ? "crit" : "ok"} />
        <Stat label="Live role notifications" value={mine.length} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Panel
          title="Returned Results Inbox"
          subtitle="Lab · imaging · procedures — verified results routed back to you"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-black/5">
            {rows.map((row) => (
              <li key={row.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {row.is_critical ? (
                        <AlertTriangle className="size-3.5 shrink-0 text-[#D70015]" />
                      ) : (
                        <CheckCircle2 className="size-3.5 shrink-0 text-[#1D8A39]" />
                      )}
                      <p className="truncate text-sm font-extrabold text-black">{row.name}</p>
                      <span className="rounded-full border border-black/10 bg-[#F5F5F7] px-2 py-0.5 text-[9px] font-black uppercase text-black">
                        {row.category}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-[#86868B]">
                      {row.patients?.full_name ?? "Patient"} · {row.patients?.mrn ?? "—"} · verified{" "}
                      {timeLabel(row.verified_at)} by {row.verified_by_label ?? "department"}
                    </p>
                    {row.result_summary ? (
                      <p
                        className={`mt-1.5 rounded-xl border p-2 text-[11px] font-bold ${
                          row.is_critical
                            ? "border-[#F9BDBD] bg-[#FDE8E7] text-[#D70015]"
                            : "border-black/5 bg-[#F5F5F7] text-black"
                        }`}
                      >
                        {row.result_summary}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-2xl text-[10px] font-bold"
                      onClick={() => {
                        setActiveRow(row);
                        setDetail("");
                      }}
                    >
                      Take next step →
                    </Button>
                    {row.status === "resulted" ? (
                      <Button
                        size="sm"
                        className="rounded-2xl bg-black text-[10px] font-bold text-white"
                        disabled={ackMut.isPending}
                        onClick={() => ackMut.mutate(row)}
                      >
                        Acknowledge ✓
                      </Button>
                    ) : (
                      <span className="rounded-full border border-[#B6ECC3] bg-[#E8F8EC] px-2.5 py-1 text-[9px] font-black uppercase text-[#1D8A39]">
                        Reviewed
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {rows.length === 0 ? (
              <li className="px-4 py-8 text-center text-[11px] font-semibold text-[#86868B]">
                No results returned yet — orders appear here the moment a department verifies them.
              </li>
            ) : null}
          </ul>
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Next Clinical Step"
            subtitle={activeRow ? `${activeRow.patients?.full_name ?? "Patient"} · ${activeRow.name}` : "Pick a result first"}
          >
            <div className="space-y-3 text-xs font-semibold text-black">
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(STEP_META) as NextStep[]).map((key) => {
                  const Icon = STEP_META[key].icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStep(key)}
                      className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-[10px] font-bold transition-all cursor-pointer ${
                        step === key
                          ? "bg-black text-white shadow-md"
                          : "border border-black/5 bg-[#F5F5F7] text-black hover:bg-white"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {STEP_META[key].label}
                    </button>
                  );
                })}
              </div>

              <div className="space-y-1">
                <Label htmlFor="next-detail" className="text-[10px] font-extrabold uppercase text-[#86868B]">
                  {step === "referral" ? "Specialty" : "Order name"}
                </Label>
                <Input
                  id="next-detail"
                  value={detail}
                  onChange={(event) => setDetail(event.target.value)}
                  placeholder={STEP_META[step].placeholder}
                  className="rounded-2xl border-black/10 bg-[#F5F5F7] text-xs font-bold text-black"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="next-reason" className="text-[10px] font-extrabold uppercase text-[#86868B]">
                  Clinical reasoning / instructions
                </Label>
                <Input
                  id="next-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Why this step follows the result"
                  className="rounded-2xl border-black/10 bg-[#F5F5F7] text-xs font-bold text-black"
                />
              </div>

              <Button
                className="w-full rounded-2xl bg-black py-3 text-xs font-bold text-white"
                disabled={!activeRow || nextStepMut.isPending}
                onClick={() => nextStepMut.mutate()}
              >
                <StepIcon className="size-4" /> Dispatch {STEP_META[step].label}
              </Button>

              {!activeRow ? (
                <p className="text-[10px] font-semibold text-[#86868B]">
                  Select “Take next step” on a returned result to enable dispatch.
                </p>
              ) : null}
            </div>
          </Panel>

          <Panel
            title="Live Patient State Notifications"
            subtitle="Every stage change across the hospital that concerns you"
            action={<Bell className="size-4 text-black" />}
          >
            <Timeline
              items={mine.map((event) => ({
                id: event.id,
                time: timeLabel(event.occurred_at),
                title: titleForEvent(event),
                detail: detailForEvent(event),
                tone:
                  event.severity === "critical" ? "crit" : event.severity === "warning" ? "warn" : "ok",
              }))}
            />
          </Panel>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-black/5 bg-white p-3 text-[10px] font-bold text-[#86868B]">
        <Stethoscope className="size-3.5 text-black" />
        Realtime channel active — reception, triage, lab, imaging, ward, pharmacy and billing changes appear here instantly.
      </div>
    </div>
  );
}
