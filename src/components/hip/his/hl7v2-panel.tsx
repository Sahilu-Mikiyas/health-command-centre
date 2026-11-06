import { useQuery } from "@tanstack/react-query";
import { Download, Network } from "lucide-react";
import { useMemo, useState } from "react";

import { fmtDate } from "@/components/hip/his/his-format";
import { EmptyState, QueryBody } from "@/components/hip/his/his-ui";
import { Panel } from "@/components/hip/panel";
import { supabase } from "@/integrations/supabase/client";
import { toEthiopianName } from "@/lib/hip/ethiopian-names";
import { useFacility } from "@/lib/hip/facility";
import { downloadText } from "@/lib/hip/his-queries";
import {
  ADT_LABELS,
  adtEventsFor,
  buildAdtMessage,
  type AdtEvent,
  type AdtMessage,
} from "@/lib/hip/hl7v2";
import { nationalIdsForPatients } from "@/lib/hip/mpi";
import { cn } from "@/lib/utils";

const RANGES = [1, 7, 30] as const;

type EncounterRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  priority: string | null;
  chief_complaint: string | null;
  patients: {
    id: string;
    mrn: string;
    full_name: string;
    date_of_birth: string | null;
    sex: string | null;
    phone: string | null;
  } | null;
  beds: { label: string } | null;
  departments: { code: string } | null;
};

const adtFeedQuery = (days: number, facilityCode: string) => ({
  queryKey: ["his", "hl7v2", days, facilityCode],
  queryFn: async (): Promise<AdtMessage[]> => {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data, error } = await supabase
      .from("encounters")
      .select(
        "id,started_at,ended_at,priority,chief_complaint,patients(id,mrn,full_name,date_of_birth,sex,phone),beds(label),departments(code)",
      )
      .or(`started_at.gte.${since},ended_at.gte.${since}`)
      .order("started_at", { ascending: true })
      .limit(1000);
    if (error) throw new Error(`Encounters: ${error.message}`);
    const rows = (data ?? []) as unknown as EncounterRow[];
    const nids = await nationalIdsForPatients(
      rows.map((r) => r.patients?.id).filter((id): id is string => Boolean(id)),
    );
    const messages: AdtMessage[] = [];
    let seq = 0;
    for (const r of rows) {
      if (!r.patients) continue;
      const encounter = {
        id: r.id,
        startedAt: r.started_at,
        endedAt: r.ended_at,
        bedLabel: r.beds?.label ?? null,
        departmentCode: r.departments?.code ?? null,
        priority: r.priority,
        chiefComplaint: r.chief_complaint,
      };
      for (const ev of adtEventsFor(encounter)) {
        if (ev.at < since) continue;
        seq++;
        messages.push(
          buildAdtMessage({
            event: ev.event,
            occurredAt: ev.at,
            controlId: `FURII${String(seq).padStart(6, "0")}`,
            sendingFacility: facilityCode,
            patient: {
              id: r.patients.id,
              mrn: r.patients.mrn,
              name: toEthiopianName(r.patients.full_name),
              dateOfBirth: r.patients.date_of_birth,
              sex: r.patients.sex,
              phone: r.patients.phone,
              nationalId: nids.get(r.patients.id) ?? null,
            },
            encounter,
          }),
        );
      }
    }
    return messages.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  },
});

export function Hl7v2Panel() {
  const facility = useFacility();
  const facilityCode = facility.id === "oncology" ? "FURII_ONC" : "FURII_IM";
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);
  const feed = useQuery(adtFeedQuery(days, facilityCode));
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Panel
      title="HL7 v2 ADT feed"
      subtitle="Admissions, registrations and discharges for systems that don't speak FHIR yet (v2.5.1)"
      action={<Network className="size-4 text-[#86868B]" />}
    >
      <QueryBody query={feed} loadingLabel="Building ADT messages…">
        {(messages) => (
          <FeedBody
            messages={messages}
            days={days}
            setDays={setDays}
            selected={selected}
            setSelected={setSelected}
          />
        )}
      </QueryBody>
    </Panel>
  );
}

function FeedBody({
  messages,
  days,
  setDays,
  selected,
  setSelected,
}: {
  messages: AdtMessage[];
  days: number;
  setDays: (d: (typeof RANGES)[number]) => void;
  selected: string | null;
  setSelected: (id: string | null) => void;
}) {
  const counts = useMemo(() => {
    const c: Record<AdtEvent, number> = { A01: 0, A03: 0, A04: 0 };
    for (const m of messages) c[m.event]++;
    return c;
  }, [messages]);
  const shown = messages.find((m) => m.controlId === selected) ?? messages[messages.length - 1];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              aria-pressed={days === d}
              className={cn(
                "cursor-pointer rounded-full px-2.5 py-1 text-[11px] font-bold",
                days === d
                  ? "bg-black text-white"
                  : "border border-black/10 bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]",
              )}
            >
              {d === 1 ? "24 h" : `${d} days`}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!messages.length}
          onClick={() =>
            downloadText(
              `adt-feed-${new Date().toISOString().slice(0, 10)}.hl7`,
              messages.map((m) => m.text).join("\n"),
              "application/hl7-v2",
            )
          }
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-black px-3 py-2 text-xs font-bold text-white hover:bg-[#1D1D1F] disabled:cursor-default disabled:opacity-40"
        >
          <Download className="size-3.5" /> Download .hl7 batch
        </button>
      </div>

      {messages.length === 0 ? (
        <EmptyState
          title="No admissions, registrations or discharges in this window"
          hint="Messages appear as patients are checked in, admitted to a bed or discharged."
        />
      ) : (
        <>
          <p className="text-xs font-semibold text-[#86868B]">
            {messages.length} messages · {counts.A04} A04 {ADT_LABELS.A04.toLowerCase()} ·{" "}
            {counts.A01} A01 {ADT_LABELS.A01.toLowerCase()} · {counts.A03} A03{" "}
            {ADT_LABELS.A03.toLowerCase()}
          </p>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <ul className="max-h-72 divide-y divide-black/5 overflow-y-auto rounded-2xl border border-black/5">
              {[...messages]
                .reverse()
                .slice(0, 200)
                .map((m) => (
                  <li key={m.controlId}>
                    <button
                      type="button"
                      onClick={() => setSelected(m.controlId)}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-[#F5F5F7]",
                        shown?.controlId === m.controlId && "bg-[#F5F5F7]",
                      )}
                    >
                      <span className="font-mono font-bold text-[#1D1D1F]">ADT^{m.event}</span>
                      <span className="numeric truncate text-[#86868B]">{m.mrn}</span>
                      <span className="numeric shrink-0 text-[#86868B]">
                        {fmtDate(m.occurredAt)}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
            {shown ? (
              <pre className="max-h-72 overflow-auto whitespace-pre rounded-2xl bg-[#1D1D1F] p-3 font-mono text-[11px] leading-relaxed text-[#F5F5F7]">
                {shown.text.split("\r").join("\n")}
              </pre>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
