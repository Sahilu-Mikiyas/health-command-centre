import { useMutation } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Download,
  FileJson2,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { HIS_COLORS } from "@/components/hip/his/his-format";
import { EmptyState, ErrorState, PatientPicker } from "@/components/hip/his/his-ui";
import { Panel } from "@/components/hip/panel";
import { buildPatientBundle, type BundleResult } from "@/lib/hip/fhir";
import { downloadText } from "@/lib/hip/his-queries";
import type { PatientRow } from "@/lib/hip/queries";
import { cn } from "@/lib/utils";

const MAX_LINES = 3000;

const TYPE_COLORS: Record<string, string> = {
  Patient: HIS_COLORS.ink,
  Encounter: HIS_COLORS.blue,
  Condition: HIS_COLORS.purple,
  AllergyIntolerance: HIS_COLORS.red,
  Observation: HIS_COLORS.green,
  DiagnosticReport: HIS_COLORS.teal,
  MedicationRequest: HIS_COLORS.orange,
  Coverage: HIS_COLORS.muted,
};

/** Lightweight JSON syntax colouring — keys, strings, numbers, literals. */
function highlight(json: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re =
    /("(?:\\.|[^"\\])*")(\s*:)?|\b(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b|\b(true|false|null)\b/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = re.exec(json))) {
    if (match.index > last) out.push(json.slice(last, match.index));
    if (match[1]) {
      out.push(
        <span key={i++} className={match[2] ? "text-[#0071E3]" : "text-[#1D8A39]"}>
          {match[1]}
        </span>,
      );
      if (match[2]) out.push(match[2]);
    } else if (match[3]) {
      out.push(
        <span key={i++} className="text-[#B86200]">
          {match[3]}
        </span>,
      );
    } else if (match[4]) {
      out.push(
        <span key={i++} className="text-[#AF52DE]">
          {match[4]}
        </span>,
      );
    }
    last = re.lastIndex;
  }
  if (last < json.length) out.push(json.slice(last));
  return out;
}

export function FhirExportPanel({
  patient,
  onPatientChange,
}: {
  patient: PatientRow | null;
  onPatientChange: (patient: PatientRow | null) => void;
}) {
  const generate = useMutation({
    mutationFn: (patientId: string) => buildPatientBundle(patientId),
    onSuccess: (result) =>
      toast.success(
        `FHIR R4 Bundle generated — ${result.bundle.entry.length} resources for ${result.mrn}`,
      ),
    onError: (error) => toast.error(error instanceof Error ? error.message : "FHIR export failed"),
  });

  return (
    <Panel
      title="HL7 FHIR R4 export"
      subtitle="Patient-level Bundle (collection) built live from the clinical record"
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B6ECC3] bg-[#E8F8EC] px-3 py-1 text-[11px] font-bold text-[#1D8A39]">
          <ShieldCheck className="size-3.5" /> R4 · 4.0.1
        </span>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <PatientPicker
            value={patient}
            onChange={(next) => {
              generate.reset();
              onPatientChange(next);
            }}
          />
          <button
            type="button"
            disabled={!patient || generate.isPending}
            onClick={() => patient && generate.mutate(patient.id)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-black px-4 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-[#1D1D1F] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generate.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Generate FHIR Bundle
          </button>
          <div className="rounded-2xl bg-[#F5F5F7] p-4 text-xs leading-relaxed text-[#86868B]">
            <p className="mb-1 font-bold text-[#1D1D1F]">What gets exported</p>
            Patient (MRN identifier), Coverage, Encounter (AMB/IMP), Condition (ICD-10),
            AllergyIntolerance, vital-sign Observations (LOINC + UCUM), lab Observations with
            H/L/HH/LL interpretation, lab &amp; imaging DiagnosticReport, MedicationRequest
            (chemotherapy tagged). Entries use{" "}
            <code className="font-mono text-[#1D1D1F]">urn:uuid</code> fullUrls with resolvable
            internal references.
          </div>
        </div>

        <div className="min-w-0">
          {generate.isPending ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-xs font-semibold text-[#86868B]">
              <Loader2 className="size-6 animate-spin text-black" />
              Querying patient record and mapping to FHIR R4…
            </div>
          ) : generate.error ? (
            <ErrorState error={generate.error} className="min-h-64" />
          ) : generate.data ? (
            <BundleResultView result={generate.data} />
          ) : (
            <EmptyState
              className="min-h-64"
              icon={<FileJson2 className="size-6 text-[#86868B]" />}
              title={patient ? "Ready to export" : "Select a patient"}
              hint={
                patient
                  ? `Generate a FHIR R4 Bundle for ${patient.full_name} (${patient.mrn}).`
                  : "Search by name or MRN, then generate a standards-based FHIR R4 Bundle you can download or send to another system."
              }
            />
          )}
        </div>
      </div>
    </Panel>
  );
}

function BundleResultView({ result }: { result: BundleResult }) {
  const [showJson, setShowJson] = useState(true);
  const [showIssues, setShowIssues] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [copied, setCopied] = useState(false);

  const fullJson = useMemo(() => JSON.stringify(result.bundle, null, 2), [result.bundle]);
  const viewJson = useMemo(() => {
    if (filter === "all") return fullJson;
    const subset = result.bundle.entry.filter((e) => e.resource.resourceType === filter);
    return JSON.stringify(subset, null, 2);
  }, [filter, fullJson, result.bundle.entry]);
  const lines = useMemo(() => viewJson.split("\n"), [viewJson]);
  const truncated = lines.length > MAX_LINES;
  const rendered = useMemo(
    () => highlight(truncated ? lines.slice(0, MAX_LINES).join("\n") : viewJson),
    [lines, truncated, viewJson],
  );

  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");
  const sizeKb = Math.round((new Blob([fullJson]).size / 1024) * 10) / 10;
  const filename = `${result.mrn.replace(/[^A-Za-z0-9_-]/g, "_")}-fhir-bundle.json`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullJson);
      setCopied(true);
      toast.success("FHIR Bundle copied to clipboard");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Clipboard unavailable in this browser context");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-[#1D1D1F]">
            Bundle · {result.patientName} · {result.mrn}
          </p>
          <p className="text-xs font-semibold text-[#86868B]">
            {result.bundle.entry.length} resources · {sizeKb} KB · type collection ·{" "}
            {new Date(result.bundle.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold text-[#1D1D1F] hover:bg-[#F5F5F7]"
          >
            {copied ? (
              <Check className="size-3.5 text-[#1D8A39]" />
            ) : (
              <ClipboardCopy className="size-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            type="button"
            onClick={() => downloadText(filename, fullJson, "application/fhir+json")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-black px-3 py-2 text-xs font-bold text-white hover:bg-[#1D1D1F]"
          >
            <Download className="size-3.5" /> Download JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {result.counts.map((c) => (
          <button
            key={c.type}
            type="button"
            onClick={() => setFilter(filter === c.type ? "all" : c.type)}
            className={cn(
              "flex min-w-0 items-center gap-2 rounded-2xl border px-3 py-2.5 text-left transition-all",
              filter === c.type
                ? "border-black bg-black text-white"
                : "border-black/5 bg-[#F5F5F7] hover:bg-[#E8E8ED]",
            )}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: TYPE_COLORS[c.type] ?? HIS_COLORS.muted }}
            />
            <span className="min-w-0 flex-1 truncate text-[11px] font-bold">{c.type}</span>
            <span className="numeric text-sm font-black">{c.count}</span>
          </button>
        ))}
      </div>

      <div
        className={cn(
          "rounded-2xl border p-3",
          errors.length ? "border-[#F9BDBD] bg-[#FDE8E7]/50" : "border-[#B6ECC3] bg-[#E8F8EC]/60",
        )}
      >
        <button
          type="button"
          onClick={() => setShowIssues((v) => !v)}
          className="flex w-full items-center gap-2 text-left text-xs font-bold"
          disabled={result.issues.length === 0}
        >
          {errors.length ? (
            <AlertTriangle className="size-4 text-[#D70015]" />
          ) : (
            <ShieldCheck className="size-4 text-[#1D8A39]" />
          )}
          <span className={errors.length ? "text-[#D70015]" : "text-[#1D8A39]"}>
            Structural validation: {errors.length} error{errors.length === 1 ? "" : "s"},{" "}
            {warnings.length} warning
            {warnings.length === 1 ? "" : "s"}
          </span>
          <span className="ml-auto text-[#86868B]">
            required elements · urn:uuid references · date formats · ICD-10 / LOINC / UCUM
          </span>
          {result.issues.length ? (
            showIssues ? (
              <ChevronDown className="size-4 text-[#86868B]" />
            ) : (
              <ChevronRight className="size-4 text-[#86868B]" />
            )
          ) : null}
        </button>
        {showIssues && result.issues.length ? (
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto font-mono text-[11px]">
            {result.issues.slice(0, 50).map((issue, i) => (
              <li
                key={i}
                className={issue.severity === "error" ? "text-[#D70015]" : "text-[#B86200]"}
              >
                [{issue.severity}] {issue.path}: {issue.message}
              </li>
            ))}
            {result.issues.length > 50 ? (
              <li className="text-[#86868B]">…and {result.issues.length - 50} more</li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/10">
        <button
          type="button"
          onClick={() => setShowJson((v) => !v)}
          className="flex w-full items-center gap-2 border-b border-black/5 bg-[#FAFAFC] px-4 py-2.5 text-left text-xs font-bold text-[#1D1D1F]"
        >
          {showJson ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          JSON {filter === "all" ? "Bundle" : `· ${filter} entries`}
          <span className="ml-auto font-semibold text-[#86868B]">
            {lines.length.toLocaleString()} lines
          </span>
        </button>
        {showJson ? (
          <>
            <pre className="max-h-[480px] overflow-auto bg-white p-4 font-mono text-[11.5px] leading-relaxed text-[#1D1D1F]">
              <code>{rendered}</code>
            </pre>
            {truncated ? (
              <p className="border-t border-black/5 bg-[#FAFAFC] px-4 py-2 text-[11px] font-semibold text-[#86868B]">
                Preview shows the first {MAX_LINES.toLocaleString()} lines — Download JSON for the
                complete bundle.
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
