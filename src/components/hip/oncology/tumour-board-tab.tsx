import { useMutation } from "@tanstack/react-query";
import { Check, Gavel, Loader2, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  recordTumourBoard,
  stagingSummary,
  type OncNote,
  type OncologyChart,
} from "@/lib/hip/oncology";
import { cn } from "@/lib/utils";

import {
  Chip,
  EmptyState,
  errorMessage,
  Field,
  fmtDateTime,
  inputClass,
  primaryButtonClass,
  SectionCard,
  useInvalidateOncology,
} from "./shared";

const SPECIALTIES = [
  "Medical Oncology",
  "Radiation Oncology",
  "Surgical Oncology",
  "Pathology",
  "Radiology",
  "Palliative Care",
  "Nursing",
  "Pharmacy",
];

const RECOMMENDATION_TEMPLATES = [
  "Proceed with neoadjuvant chemotherapy, then re-image and re-discuss.",
  "Proceed to surgery, then adjuvant chemotherapy per pathology.",
  "Definitive chemoradiotherapy.",
  "Palliative systemic therapy and best supportive care.",
  "Further imaging / biopsy required before decision.",
];

function parseAttendees(objective: string | null): string[] {
  if (!objective) return [];
  try {
    const value = JSON.parse(objective) as { attendees?: unknown };
    return Array.isArray(value.attendees)
      ? value.attendees.filter((a): a is string => typeof a === "string")
      : [];
  } catch {
    return [];
  }
}

function DecisionCard({ note }: { note: OncNote }) {
  const attendees = parseAttendees(note.objective);
  return (
    <li className="rounded-2xl border border-black/5 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold text-[#86868B]">
          {fmtDateTime(note.signed_at ?? note.created_at)}
          {note.author_label ? ` · ${note.author_label}` : ""}
        </p>
        {attendees.length ? (
          <span className="text-[10px] font-bold text-[#86868B]">
            {attendees.length} specialties
          </span>
        ) : null}
      </div>
      {note.subjective ? (
        <p className="mt-1.5 text-[11px] font-medium text-[#86868B]">{note.subjective}</p>
      ) : null}
      {attendees.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {attendees.map((a) => (
            <Chip key={a}>{a}</Chip>
          ))}
        </div>
      ) : null}
      {note.assessment ? (
        <div className="mt-3">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
            Discussion
          </p>
          <p className="whitespace-pre-line text-xs font-medium text-[#1D1D1F]">
            {note.assessment}
          </p>
        </div>
      ) : null}
      {note.plan ? (
        <div className="mt-3 rounded-xl bg-[#F5E8FF] px-3 py-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#8922C7]">
            Recommendation
          </p>
          <p className="whitespace-pre-line text-xs font-bold text-black">{note.plan}</p>
        </div>
      ) : null}
    </li>
  );
}

export function TumourBoardTab({ chart }: { chart: OncologyChart }) {
  const invalidate = useInvalidateOncology();
  const decisions = chart.notes.filter((n) => n.note_type === "tumour_board");

  const [caseSummary, setCaseSummary] = useState(() =>
    chart.staging ? stagingSummary(chart.staging) : "",
  );
  const [attendees, setAttendees] = useState<string[]>(["Medical Oncology"]);
  const [discussion, setDiscussion] = useState("");
  const [recommendation, setRecommendation] = useState("");

  const toggle = (s: string) =>
    setAttendees((list) => (list.includes(s) ? list.filter((x) => x !== s) : [...list, s]));

  const valid = caseSummary.trim() && attendees.length >= 2 && recommendation.trim();

  const mutation = useMutation({
    mutationFn: () =>
      recordTumourBoard({
        patientId: chart.patient.id,
        caseSummary: caseSummary.trim(),
        attendees,
        discussion: discussion.trim(),
        recommendation: recommendation.trim(),
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success("Tumour-board decision recorded");
      setDiscussion("");
      setRecommendation("");
    },
    onError: (err) => toast.error(`Could not record decision: ${errorMessage(err)}`),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) {
      toast.error("Case summary, at least two specialties and a recommendation are required");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <SectionCard title="Record MDT decision" icon={<Gavel className="size-3.5" />}>
        <form onSubmit={submit} className="space-y-3">
          {!chart.staging ? (
            <p className="rounded-2xl bg-[#FFF4E5] px-3 py-2 text-[11px] font-semibold text-[#B86200]">
              No staging on record — stage the patient first for a complete case presentation.
            </p>
          ) : null}
          <Field label="Case summary *">
            <textarea
              value={caseSummary}
              onChange={(e) => setCaseSummary(e.target.value)}
              rows={3}
              className={cn(inputClass, "resize-y")}
              placeholder="Site, histology, TNM, stage, performance status, biomarkers"
            />
          </Field>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
              Attendees * <span className="normal-case tracking-normal">(min. 2 specialties)</span>
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {SPECIALTIES.map((s) => {
                const on = attendees.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggle(s)}
                    aria-pressed={on}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-all",
                      on
                        ? "bg-black text-white"
                        : "border border-black/10 bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]",
                    )}
                  >
                    {on ? <Check className="size-3" /> : null}
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
          <Field label="Discussion">
            <textarea
              value={discussion}
              onChange={(e) => setDiscussion(e.target.value)}
              rows={4}
              className={cn(inputClass, "resize-y")}
              placeholder="Imaging and pathology review, resectability, comorbidities, patient preference…"
            />
          </Field>
          <Field label="Recommendation *">
            <textarea
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              rows={3}
              className={cn(inputClass, "resize-y")}
              placeholder="Agreed management plan"
            />
          </Field>
          <div className="flex flex-wrap gap-1">
            {RECOMMENDATION_TEMPLATES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setRecommendation(t)}
                className="cursor-pointer rounded-full border border-dashed border-black/15 px-2 py-0.5 text-[10px] font-semibold text-[#86868B] hover:bg-[#F5F5F7] hover:text-black"
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={!valid || mutation.isPending}
              className={primaryButtonClass}
            >
              {mutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Gavel className="size-3.5" />
              )}
              Sign MDT decision
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="Past decisions"
        icon={<Users className="size-3.5" />}
        action={decisions.length ? <Chip>{decisions.length}</Chip> : null}
      >
        {decisions.length ? (
          <ul className="space-y-3">
            {decisions.map((n) => (
              <DecisionCard key={n.id} note={n} />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Users className="size-5" />}
            title="Not yet discussed at tumour board"
            detail="Every new cancer diagnosis should be presented at the multidisciplinary tumour board before definitive treatment."
          />
        )}
      </SectionCard>
    </div>
  );
}
