import { useMemo, useState } from "react";

import {
  buildLabResult,
  FLAG_LABEL,
  flagValue,
  guessPanel,
  LAB_PANELS,
  panelById,
  refRange,
  type ImagingResultValues,
  type LabResultValues,
} from "@/lib/hip/lab-panels";

export type ResultSubmission = {
  summary: string;
  values: LabResultValues | ImagingResultValues;
  isCritical: boolean;
};

const FLAG_CLASS: Record<string, string> = {
  N: "text-[#1D8A39]",
  L: "text-[#B25000]",
  H: "text-[#B25000]",
  LL: "text-[#D70015] font-black",
  HH: "text-[#D70015] font-black",
};

const inputCls =
  "w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black outline-none focus:border-black/40";

/** Structured lab result entry with live reference-range flagging. */
export function LabResultEntry({
  orderName,
  analyzer,
  pending,
  onSubmit,
  onCancel,
}: {
  orderName: string;
  analyzer: string;
  pending?: boolean;
  onSubmit: (result: ResultSubmission) => void;
  onCancel: () => void;
}) {
  const [panelId, setPanelId] = useState(() => guessPanel(orderName).id);
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const panel = panelById(panelId) ?? LAB_PANELS[0]!;

  const preview = useMemo(
    () => buildLabResult(panel, raw, { analyzer, comment: comment.trim() || undefined }),
    [panel, raw, analyzer, comment],
  );

  return (
    <div className="space-y-3 rounded-2xl border border-black/10 bg-[#FAFAFC] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-[#86868B]">
          Result entry · {orderName}
        </span>
        <select
          value={panelId}
          onChange={(e) => {
            setPanelId(e.target.value);
            setRaw({});
          }}
          className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] font-bold text-black"
        >
          {LAB_PANELS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {panel.analytes.map((analyte) => {
          const text = raw[analyte.code] ?? "";
          const num = Number(text);
          const flag = text.trim() && Number.isFinite(num) ? flagValue(analyte, num) : null;
          return (
            <label
              key={analyte.code}
              className="flex items-center gap-2 rounded-xl bg-white p-2 border border-black/5"
            >
              <span className="w-32 shrink-0 text-[11px] font-bold text-black">
                {analyte.label}
                <span className="block text-[10px] font-semibold text-[#86868B]">
                  {refRange(analyte)} {analyte.unit}
                </span>
              </span>
              <input
                inputMode="decimal"
                value={text}
                onChange={(e) => setRaw((prev) => ({ ...prev, [analyte.code]: e.target.value }))}
                className={inputCls}
                placeholder="value"
              />
              <span
                className={`w-20 shrink-0 text-right text-[10px] font-bold ${flag ? FLAG_CLASS[flag] : "text-[#C7C7CC]"}`}
              >
                {flag ? FLAG_LABEL[flag] : "—"}
              </span>
            </label>
          );
        })}
      </div>

      <input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className={inputCls}
        placeholder="Comment (optional) — e.g. haemolysed sample, repeat advised"
      />

      <p
        className={`rounded-xl px-3 py-2 text-[11px] font-bold ${
          preview.isCritical
            ? "bg-[#FDE8E7] text-[#D70015]"
            : "bg-white text-black border border-black/5"
        }`}
      >
        {preview.summary}
      </p>

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-[11px] font-bold text-black"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending || preview.values.analytes.length === 0}
          onClick={() => onSubmit(preview)}
          className={`rounded-full px-4 py-2 text-[11px] font-bold text-white disabled:opacity-40 ${
            preview.isCritical ? "bg-[#FF3B30]" : "bg-black"
          }`}
        >
          {preview.isCritical ? "Verify & broadcast CRITICAL" : "Verify & release result"}
        </button>
      </div>
    </div>
  );
}

/** Radiology report: findings + impression, with an explicit critical-finding switch. */
export function ImagingReportEntry({
  orderName,
  modality,
  pending,
  onSubmit,
  onCancel,
}: {
  orderName: string;
  modality: string;
  pending?: boolean;
  onSubmit: (result: ResultSubmission) => void;
  onCancel: () => void;
}) {
  const [findings, setFindings] = useState("");
  const [impression, setImpression] = useState("");
  const [critical, setCritical] = useState(false);
  const ready = findings.trim().length > 0 && impression.trim().length > 0;

  return (
    <div className="space-y-3 rounded-2xl border border-black/10 bg-[#FAFAFC] p-4">
      <span className="text-[11px] font-black uppercase tracking-wider text-[#86868B]">
        Report · {orderName}
      </span>
      <textarea
        value={findings}
        onChange={(e) => setFindings(e.target.value)}
        rows={3}
        className={inputCls}
        placeholder="Findings — e.g. No focal consolidation. Heart size normal. No pleural effusion."
      />
      <textarea
        value={impression}
        onChange={(e) => setImpression(e.target.value)}
        rows={2}
        className={inputCls}
        placeholder="Impression — e.g. Normal chest radiograph."
      />
      <label className="flex items-center gap-2 text-[11px] font-bold text-[#D70015]">
        <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
        Critical / unexpected finding — notify ordering doctor immediately
      </label>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-black/10 bg-white px-4 py-2 text-[11px] font-bold text-black"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending || !ready}
          onClick={() =>
            onSubmit({
              summary: `${critical ? "CRITICAL — " : ""}${impression.trim()}`,
              values: {
                kind: "imaging",
                modality,
                findings: findings.trim(),
                impression: impression.trim(),
              },
              isCritical: critical,
            })
          }
          className={`rounded-full px-4 py-2 text-[11px] font-bold text-white disabled:opacity-40 ${
            critical ? "bg-[#FF3B30]" : "bg-black"
          }`}
        >
          Sign & release report
        </button>
      </div>
    </div>
  );
}
