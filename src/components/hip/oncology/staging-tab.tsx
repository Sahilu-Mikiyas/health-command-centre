import { useMutation } from "@tanstack/react-query";
import { Loader2, Plus, Save, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  CANCER_SITES,
  isCancerCode,
  saveStaging,
  stagingSummary,
  type OncologyChart,
  type Staging,
  type TreatmentIntent,
} from "@/lib/hip/oncology";
import {
  BASIS_OF_DIAGNOSIS,
  BEHAVIOURS,
  MORPHOLOGIES,
  morphologyCode,
  suggestMorphology,
  topographyFromIcd10,
} from "@/lib/hip/icdo3";
import { cn } from "@/lib/utils";

import {
  errorMessage,
  Field,
  inputClass,
  primaryButtonClass,
  SectionCard,
  todayIso,
  useInvalidateOncology,
} from "./shared";

const T_OPTIONS = ["TX", "T0", "Tis", "T1", "T2", "T3", "T4"];
const N_OPTIONS = ["NX", "N0", "N1", "N2", "N3"];
const M_OPTIONS = ["M0", "M1"];
const STAGE_OPTIONS = [
  "0",
  "I",
  "IA",
  "IB",
  "II",
  "IIA",
  "IIB",
  "III",
  "IIIA",
  "IIIB",
  "IIIC",
  "IV",
];
const GRADE_OPTIONS = [
  { value: "1", label: "G1 — well differentiated" },
  { value: "2", label: "G2 — moderately differentiated" },
  { value: "3", label: "G3 — poorly differentiated" },
  { value: "X", label: "GX — cannot be assessed" },
];
const ECOG_OPTIONS = [
  { value: 0, label: "0 — Fully active" },
  { value: 1, label: "1 — Restricted strenuous activity" },
  { value: 2, label: "2 — Ambulatory, self-care, no work" },
  { value: 3, label: "3 — Limited self-care, >50% in bed" },
  { value: 4, label: "4 — Completely disabled" },
];
const INTENTS: TreatmentIntent[] = ["curative", "adjuvant", "neoadjuvant", "palliative"];

const BIOMARKER_PRESETS: { key: string; suggestions: string[] }[] = [
  { key: "ER", suggestions: ["Positive", "Negative", "90%", "Allred 8/8"] },
  { key: "PR", suggestions: ["Positive", "Negative", "50%"] },
  { key: "HER2", suggestions: ["0", "1+", "2+ (ISH pending)", "2+ ISH amplified", "3+"] },
  { key: "Ki-67", suggestions: ["< 14%", "20%", "30%", "> 50%"] },
  { key: "KRAS", suggestions: ["Wild-type", "G12C", "G12D", "Mutant"] },
  { key: "EGFR", suggestions: ["Wild-type", "Exon 19 del", "L858R", "T790M"] },
  { key: "PD-L1", suggestions: ["TPS < 1%", "TPS 1–49%", "TPS ≥ 50%", "CPS ≥ 10"] },
  { key: "MSI", suggestions: ["MSS", "MSI-H", "dMMR", "pMMR"] },
];

const OTHER_SITE = "__other";

type MarkerRow = { id: number; key: string; value: string };

let rowSeq = 0;
const nextId = () => ++rowSeq;

export function StagingTab({ chart, onSaved }: { chart: OncologyChart; onSaved: () => void }) {
  const existing = chart.staging;
  const cancerCondition =
    chart.conditions.find((c) => isCancerCode(c.icd10) && c.status !== "resolved") ??
    chart.conditions.find((c) => isCancerCode(c.icd10));
  const invalidate = useInvalidateOncology();

  const initialSite = existing?.primarySite ?? "";
  const known = CANCER_SITES.find((s) => s.label === initialSite);
  const [siteChoice, setSiteChoice] = useState(
    initialSite ? (known ? known.label : OTHER_SITE) : "",
  );
  const [customSite, setCustomSite] = useState(known ? "" : initialSite);
  const [icd10, setIcd10] = useState(existing?.icd10 ?? cancerCondition?.icd10 ?? "");
  const [histology, setHistology] = useState(existing?.histology ?? "");
  const [t, setT] = useState(existing?.t ?? "");
  const [n, setN] = useState(existing?.n ?? "");
  const [m, setM] = useState(existing?.m ?? "");
  const [stage, setStage] = useState(existing?.stage ?? "");
  const [grade, setGrade] = useState(existing?.grade ?? "");
  const [ecog, setEcog] = useState<number>(existing?.ecog ?? 0);
  const [intent, setIntent] = useState<TreatmentIntent>(existing?.intent ?? "curative");
  const [diagnosedOn, setDiagnosedOn] = useState(
    existing?.diagnosedOn ?? cancerCondition?.onset_date ?? todayIso(),
  );
  const [topography, setTopography] = useState(existing?.icdo3Topography ?? "");
  const [morphology, setMorphology] = useState(existing?.icdo3Morphology ?? "");
  const [behaviour, setBehaviour] = useState(existing?.icdo3Behaviour ?? "3");
  const [basis, setBasis] = useState(existing?.basisOfDiagnosis ?? "");
  const [markers, setMarkers] = useState<MarkerRow[]>(() =>
    Object.entries(existing?.biomarkers ?? {}).map(([key, value]) => ({
      id: nextId(),
      key,
      value,
    })),
  );

  const primarySite = siteChoice === OTHER_SITE ? customSite.trim() : siteChoice;
  const suggestedTopography = topographyFromIcd10(icd10);
  const suggestedMorphology = suggestMorphology(histology);
  const topographyValue = topography.trim().toUpperCase() || suggestedTopography;
  const morphologyValue = morphology || suggestedMorphology;

  const draft: Staging = {
    primarySite,
    icd10: icd10.trim().toUpperCase(),
    histology: histology.trim(),
    t,
    n,
    m,
    stage,
    grade,
    ecog,
    intent,
    biomarkers: Object.fromEntries(
      markers
        .filter((r) => r.key.trim() && r.value.trim())
        .map((r) => [r.key.trim(), r.value.trim()]),
    ),
    diagnosedOn,
    icdo3Topography: topographyValue,
    icdo3Morphology: morphologyValue,
    icdo3Behaviour: behaviour,
    basisOfDiagnosis: basis,
  };
  const fullMorphology = morphologyCode(morphologyValue, behaviour, grade);

  const missing = [
    !primarySite && "primary site",
    !draft.icd10 && "ICD-10",
    !t && "T",
    !n && "N",
    !m && "M",
    !stage && "stage",
    !basis && "basis of diagnosis",
  ].filter(Boolean) as string[];
  const icdWarning = draft.icd10 && !isCancerCode(draft.icd10);
  const mismatch = m === "M1" && stage && stage !== "IV";

  const mutation = useMutation({
    mutationFn: () =>
      saveStaging({
        patientId: chart.patient.id,
        staging: draft,
        conditionId: cancerCondition?.id ?? null,
      }),
    onSuccess: async () => {
      await invalidate();
      toast.success(`Staging saved — ${draft.primarySite} stage ${draft.stage}`);
      onSaved();
    },
    onError: (err) => toast.error(`Could not save staging: ${errorMessage(err)}`),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (missing.length) {
      toast.error(`Complete: ${missing.join(", ")}`);
      return;
    }
    mutation.mutate();
  };

  const addPreset = (key: string) => {
    if (markers.some((r) => r.key.toLowerCase() === key.toLowerCase())) return;
    setMarkers((rows) => [...rows, { id: nextId(), key, value: "" }]);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {existing ? (
        <p className="rounded-2xl bg-[#F5F5F7] px-3 py-2 text-[11px] font-semibold text-[#86868B]">
          Pre-filled from the latest signed staging. Saving creates a new signed staging note;
          history is preserved.
        </p>
      ) : null}

      <SectionCard title="Primary tumour">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Primary site *" className="sm:col-span-2">
            <select
              value={siteChoice}
              onChange={(e) => {
                const value = e.target.value;
                setSiteChoice(value);
                const site = CANCER_SITES.find((s) => s.label === value);
                if (site) setIcd10(site.icd10);
              }}
              className={inputClass}
            >
              <option value="">Select site…</option>
              {CANCER_SITES.map((s) => (
                <option key={s.label} value={s.label}>
                  {s.label} ({s.icd10})
                </option>
              ))}
              <option value={OTHER_SITE}>Other site…</option>
            </select>
          </Field>
          {siteChoice === OTHER_SITE ? (
            <Field label="Site name *">
              <input
                value={customSite}
                onChange={(e) => setCustomSite(e.target.value)}
                placeholder="e.g. Pancreas"
                className={inputClass}
              />
            </Field>
          ) : null}
          <Field
            label="ICD-10 *"
            hint={
              icdWarning ? (
                <span className="text-[#B86200]">Not a C00–D09 neoplasm code</span>
              ) : (
                "Auto-filled, editable"
              )
            }
          >
            <input
              value={icd10}
              onChange={(e) => setIcd10(e.target.value)}
              placeholder="C50.9"
              className={cn(inputClass, "uppercase")}
            />
          </Field>
          <Field label="Histology" className="sm:col-span-2">
            <input
              value={histology}
              onChange={(e) => setHistology(e.target.value)}
              placeholder="e.g. Invasive ductal carcinoma"
              className={inputClass}
            />
          </Field>
          <Field label="Date of diagnosis">
            <input
              type="date"
              value={diagnosedOn}
              max={todayIso()}
              onChange={(e) => setDiagnosedOn(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard title="Registry coding (ICD-O-3)">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Topography"
            hint={
              topography ? "Entered by clinician" : suggestedTopography ? "From ICD-10" : undefined
            }
          >
            <input
              value={topography}
              onChange={(e) => setTopography(e.target.value)}
              placeholder={suggestedTopography || "C50.9"}
              className={cn(inputClass, "uppercase")}
            />
          </Field>
          <Field
            label="Morphology"
            className="sm:col-span-2"
            hint={
              !morphology && suggestedMorphology ? "Suggested from histology — confirm" : undefined
            }
          >
            <select
              value={morphologyValue}
              onChange={(e) => setMorphology(e.target.value)}
              className={inputClass}
            >
              <option value="">Not coded</option>
              {MORPHOLOGIES.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.code} — {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Behaviour">
            <select
              value={behaviour}
              onChange={(e) => setBehaviour(e.target.value)}
              className={inputClass}
            >
              {BEHAVIOURS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Basis of diagnosis *"
            className="sm:col-span-2"
            hint="Histology (7) is the registry gold standard"
          >
            <select value={basis} onChange={(e) => setBasis(e.target.value)} className={inputClass}>
              <option value="">Select…</option>
              {BASIS_OF_DIAGNOSIS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end sm:col-span-2">
            <p className="rounded-2xl bg-[#F5F5F7] px-3 py-2 text-[11px] font-bold text-[#1D1D1F]">
              ICD-O-3: {topographyValue || "—"} · {fullMorphology || "—"}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="TNM & stage group">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="T *">
            <select value={t} onChange={(e) => setT(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {T_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="N *">
            <select value={n} onChange={(e) => setN(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {N_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="M *">
            <select value={m} onChange={(e) => setM(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {M_OPTIONS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Overall stage *"
            hint={
              mismatch ? (
                <span className="text-[#B86200]">M1 disease is usually stage IV</span>
              ) : undefined
            }
          >
            <select value={stage} onChange={(e) => setStage(e.target.value)} className={inputClass}>
              <option value="">—</option>
              {STAGE_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  Stage {o}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Grade" className="col-span-2">
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className={inputClass}>
              <option value="">Not recorded</option>
              {GRADE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ECOG performance status" className="col-span-2">
            <select
              value={ecog}
              onChange={(e) => setEcog(Number(e.target.value))}
              className={inputClass}
            >
              {ECOG_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="mt-3">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
            Treatment intent
          </span>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {INTENTS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIntent(i)}
                aria-pressed={intent === i}
                className={cn(
                  "cursor-pointer rounded-full px-3 py-1.5 text-[11px] font-bold capitalize transition-all",
                  intent === i
                    ? "bg-black text-white"
                    : "border border-black/10 bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]",
                )}
              >
                {i}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Biomarkers">
        <div className="mb-3 flex flex-wrap gap-1.5">
          {BIOMARKER_PRESETS.map((p) => {
            const used = markers.some((r) => r.key.toLowerCase() === p.key.toLowerCase());
            return (
              <button
                key={p.key}
                type="button"
                disabled={used}
                onClick={() => addPreset(p.key)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-bold text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:cursor-default disabled:opacity-40"
              >
                <Plus className="size-3" />
                {p.key}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMarkers((rows) => [...rows, { id: nextId(), key: "", value: "" }])}
            className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-black/20 px-2.5 py-1 text-[11px] font-bold text-[#86868B] hover:bg-[#F5F5F7]"
          >
            <Plus className="size-3" /> Custom
          </button>
        </div>
        {markers.length ? (
          <div className="space-y-2">
            {markers.map((row) => {
              const preset = BIOMARKER_PRESETS.find(
                (p) => p.key.toLowerCase() === row.key.toLowerCase(),
              );
              const listId = `bm-${row.id}`;
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)_auto] gap-2"
                >
                  <input
                    value={row.key}
                    onChange={(e) =>
                      setMarkers((rows) =>
                        rows.map((r) => (r.id === row.id ? { ...r, key: e.target.value } : r)),
                      )
                    }
                    placeholder="Marker"
                    aria-label="Biomarker name"
                    className={inputClass}
                  />
                  <input
                    value={row.value}
                    list={preset ? listId : undefined}
                    onChange={(e) =>
                      setMarkers((rows) =>
                        rows.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r)),
                      )
                    }
                    placeholder="Result"
                    aria-label={`${row.key || "Biomarker"} result`}
                    className={inputClass}
                  />
                  {preset ? (
                    <datalist id={listId}>
                      {preset.suggestions.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setMarkers((rows) => rows.filter((r) => r.id !== row.id))}
                    aria-label={`Remove ${row.key || "biomarker"}`}
                    className="grid size-9 cursor-pointer place-items-center rounded-2xl text-[#86868B] hover:bg-[#FDE8E7] hover:text-[#D70015]"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[11px] font-semibold text-[#86868B]">
            No biomarkers. Add receptor status, driver mutations or immunotherapy markers above.
          </p>
        )}
      </SectionCard>

      <div className="flex flex-col gap-3 rounded-3xl border border-black/5 bg-[#FAFAFC] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
            Registry summary
          </p>
          <p className="text-xs font-semibold text-black">
            {missing.length ? (
              <span className="text-[#86868B]">Required: {missing.join(", ")}</span>
            ) : (
              stagingSummary(draft)
            )}
          </p>
        </div>
        <button
          type="submit"
          disabled={mutation.isPending || missing.length > 0}
          className={cn(primaryButtonClass, "shrink-0")}
        >
          {mutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          {existing ? "Save restaging" : "Save staging"}
        </button>
      </div>
    </form>
  );
}
