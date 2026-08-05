import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Send } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Panel } from "@/components/hip/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hospitalBrain } from "@/lib/hip/brain.functions";
import {
  bedSummaryQuery,
  departmentsQuery,
  flowQuery,
  recentEventsQuery,
  staffSummaryQuery,
} from "@/lib/hip/queries";

/** The intelligence rail: the hospital explains itself in plain language. */
export function HospitalBrainPanel() {
  const { data: beds } = useQuery(bedSummaryQuery);
  const { data: flow } = useQuery(flowQuery);
  const { data: staff } = useQuery(staffSummaryQuery);
  const { data: departments } = useQuery(departmentsQuery);
  const { data: events } = useQuery(recentEventsQuery(20));

  const callBrain = useServerFn(hospitalBrain);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [question, setQuestion] = useState("");

  const snapshot = useMemo(() => {
    const lines: string[] = [];
    if (beds) {
      lines.push(
        `Beds: ${beds.total} total, ${beds.occupied} occupied, ${beds.available} available, ${beds.cleaning} cleaning, ${beds.reserved} reserved, ${beds.maintenance} maintenance.`,
      );
    }
    if (flow) {
      lines.push(
        `Active encounters: ${flow.total} (critical ${flow.critical}). By stage: ${flow.stages
          .map((stage) => `${stage.stage} ${stage.count}`)
          .join(", ")}.`,
      );
    }
    if (staff) {
      lines.push(
        `Staff on record ${staff.total}: active ${staff.active}, offline ${staff.offline}, doctors ${staff.doctors}, nurses ${staff.nurses}, lab techs ${staff.lab}.`,
      );
    }
    if (departments?.length) {
      lines.push(
        `Department status: ${departments
          .map((department) => `${department.name} ${department.status}`)
          .join("; ")}.`,
      );
    }
    if (events?.length) {
      lines.push(
        `Recent events: ${events
          .slice(0, 12)
          .map(
            (event) =>
              `${event.event_type}/${event.severity}${event.department_code ? ` @${event.department_code}` : ""}`,
          )
          .join(", ")}.`,
      );
    }
    return lines.join("\n");
  }, [beds, flow, staff, departments, events]);

  const ask = useCallback(
    async (userQuestion: string | null) => {
      if (!snapshot) return;
      setBusy(true);
      setError(null);
      try {
        const result = await callBrain({ data: { snapshot, question: userQuestion } });
        setAnswer(result.text);
        setError(result.error);
      } catch {
        setError("The intelligence layer could not be reached.");
      } finally {
        setBusy(false);
      }
    },
    [callBrain, snapshot],
  );

  return (
    <Panel
      title="Hospital Brain"
      subtitle="Live narrative intelligence"
      action={
        <Button
          size="sm"
          variant="ghost"
          disabled={busy || !snapshot}
          onClick={() => void ask(null)}
          className="h-7 gap-1.5 px-2 text-xs"
        >
          <RefreshCw className={busy ? "size-3.5 animate-spin" : "size-3.5"} />
          Brief
        </Button>
      }
    >
      <div className="space-y-3">
        {answer ? (
          <p className="animate-rise whitespace-pre-line text-sm leading-relaxed text-foreground">
            {answer}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {busy
              ? "Reading the live snapshot…"
              : "Generate a status brief, or ask the hospital a direct question."}
          </p>
        )}

        {error ? <p className="text-xs text-crit">{error}</p> : null}

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = question.trim();
            if (!trimmed) return;
            void ask(trimmed);
            setQuestion("");
          }}
        >
          <Input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Why is discharge slowing down?"
            className="h-9 bg-surface-raised text-sm"
          />
          <Button type="submit" size="sm" disabled={busy} className="h-9 px-3">
            <Send className="size-4" />
            <span className="sr-only">Ask</span>
          </Button>
        </form>
      </div>
    </Panel>
  );
}
