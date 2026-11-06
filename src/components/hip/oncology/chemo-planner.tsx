import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Info,
  Loader2,
  Lock,
  ShieldCheck,
  Syringe,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  bsaMosteller,
  calculateDoses,
  prescribeCycle,
  preChemoChecks,
  REGIMENS,
  regimenById,
  type GateCheck,
  type OncologyChart,
  type Regimen,
} from "@/lib/hip/oncology";
import { myProfileQuery } from "@/lib/hip/queries";
import { cn } from "@/lib/utils";

import {
  Chip,
  errorMessage,
  Field,
  fmtDate,
  inputClass,
  primaryButtonClass,
  SectionCard,
  todayIso,
  useInvalidateOncology,
} from "./shared";

/** Site → reference regimens commonly used first-line (used only to rank the select). */
const SITE_REGIMENS: Record<string, string[]> = {
  Breast: ["AC", "PAC-W"],
  Colon: ["FOLFOX6", "CAPOX"],
  Rectum: ["FOLFOX6", "CAPOX"],
  Stomach: ["CAPOX"],
  Oesophagus: ["CARBO-PAC"],
  "Lung / bronchus": ["CARBO-PAC", "CIS-ETO", "GEM-CIS"],
  Ovary: ["CARBO-PAC"],
  "Cervix uteri": ["CARBO-PAC"],
  Bladder: ["GEM-CIS"],
  "Hodgkin lymphoma": ["ABVD"],
  "Diffuse large B-cell lymphoma": ["RCHOP"],
};

const REDUCTIONS = [0, 10, 20, 25] as const;

const EMETO_TONE: Record<Regimen["emetogenic"], "crit" | "warn" | "ok"> = {
  high: "crit",
  moderate: "warn",
  low: "ok",
};

/** Height/weight from the most recent chemo order instructions ("Ht 165 cm, Wt 62 kg"). */
function lastAnthropometrics(
  chart: OncologyChart,
): { height: string; weight: string; at: string } | null {
  for (const order of chart.orders) {
    if (!order.code?.startsWith("CHEMO:")) continue;
    const ht = /Ht ([\d.]+) cm/.exec(order.instructions ?? "")?.[1];
    const wt = /Wt ([\d.]+) kg/.exec(order.instructions ?? "")?.[1];
    if (ht && wt) return { height: ht, weight: wt, at: order.requested_at };
  }
  return null;
}

function nextCycleFor(chart: OncologyChart, regimenId: string): number {
  const given = chart.cyclesGiven.filter((c) => c.regimenId === regimenId).map((c) => c.cycle);
  return given.length ? Math.max(...given) + 1 : 1;
}

function defaultRegimen(chart: OncologyChart): string {
  const last = chart.cyclesGiven[chart.cyclesGiven.length - 1];
  if (last && regimenById(last.regimenId)) return last.regimenId;
  const suggested = chart.staging ? SITE_REGIMENS[chart.staging.primarySite]?.[0] : undefined;
  return suggested ?? REGIMENS[0]!.id;
}

const CHECK_ICON: Record<
  GateCheck["status"],
  { icon: typeof CheckCircle2; className: string; label: string }
> = {
  pass: { icon: CheckCircle2, className: "text-[#1D8A39]", label: "Pass" },
  warn: { icon: AlertTriangle, className: "text-[#B86200]", label: "Caution" },
  fail: { icon: XCircle, className: "text-[#D70015]", label: "Fail" },
  missing: { icon: CircleHelp, className: "text-[#86868B]", label: "Missing" },
};

export function ChemoPlanner({ chart }: { chart: OncologyChart }) {
  const invalidate = useInvalidateOncology();
  const { data: me } = useQuery(myProfileQuery);
  const prior = useMemo(() => lastAnthropometrics(chart), [chart]);

  const [regimenId, setRegimenId] = useState(() => defaultRegimen(chart));
  const [cycle, setCycle] = useState(() => nextCycleFor(chart, defaultRegimen(chart)));
  const [height, setHeight] = useState(prior?.height ?? "");
  const [weight, setWeight] = useState(prior?.weight ?? "");
  const [reductionChoice, setReductionChoice] = useState<string>("0");
  const [customReduction, setCustomReduction] = useState("");
  const [startDate, setStartDate] = useState(todayIso());
  const [overrideReason, setOverrideReason] = useState("");

  const regimen = regimenById(regimenId) ?? REGIMENS[0]!;
  const heightCm = Number(height);
  const weightKg = Number(weight);
  const bsa = bsaMosteller(heightCm, weightKg);
  const reductionPct =
    reductionChoice === "custom"
      ? Math.min(Math.max(Number(customReduction) || 0, 0), 75)
      : Number(reductionChoice);
  const egfr = chart.patient.egfr;
  const usesAuc = regimen.drugs.some((d) => d.basis === "auc");

  const doses = useMemo(
    () => calculateDoses({ regimen, bsa, egfr, reductionPct }),
    [regimen, bsa, egfr, reductionPct],
  );
  const checks = useMemo(() => preChemoChecks(chart, regimen, doses), [chart, regimen, doses]);
  const failing = checks.filter((c) => c.status === "fail");
  const counts = {
    pass: checks.filter((c) => c.status === "pass").length,
    warn: checks.filter((c) => c.status === "warn").length,
    fail: failing.length,
    missing: checks.filter((c) => c.status === "missing").length,
  };

  const alreadyGiven = chart.cyclesGiven.some(
    (c) => c.regimenId === regimen.id && c.cycle === cycle,
  );
  const anthropometricsInvalid =
    !(heightCm >= 100 && heightCm <= 230) || !(weightKg >= 25 && weightKg <= 250);

  const blockers = [
    anthropometricsInvalid && "Enter a valid height (100–230 cm) and weight (25–250 kg)",
    usesAuc && egfr === null && "eGFR is required for Calvert carboplatin dosing",
    !anthropometricsInvalid &&
      doses.some((d) => !(d.dose > 0)) &&
      "A calculated dose is zero or invalid — check the inputs",
    !(cycle >= 1) && "Cycle number must be 1 or more",
    alreadyGiven && `${regimen.id} cycle ${cycle} has already been prescribed`,
    !startDate && "Choose a start date",
  ].filter(Boolean) as string[];

  const needsOverride = failing.length > 0;
  const overrideOk = !needsOverride || overrideReason.trim().length >= 10;
  const canPrescribe = blockers.length === 0 && overrideOk;

  const prescriber = me?.staff?.full_name ?? me?.profile?.full_name ?? me?.email ?? null;

  const changeRegimen = (id: string) => {
    setRegimenId(id);
    setCycle(nextCycleFor(chart, id));
    setOverrideReason("");
  };

  const mutation = useMutation({
    mutationFn: () =>
      prescribeCycle({
        patientId: chart.patient.id,
        regimen,
        cycle,
        doses,
        bsa,
        heightCm,
        weightKg,
        reductionPct,
        startDate,
        ...(needsOverride ? { overrideReason: overrideReason.trim() } : {}),
      }),
    onSuccess: async () => {
      await invalidate();
      const nextNote =
        cycle < regimen.cycles
          ? ` Cycle ${cycle + 1} booked in ${regimen.cycleDays} days.`
          : " Final planned cycle.";
      toast.success(
        `${regimen.id} cycle ${cycle} prescribed — ${doses.length} order${doses.length === 1 ? "" : "s"} sent to Pharmacy.${nextNote}`,
      );
      setCycle((c) => c + 1);
      setOverrideReason("");
    },
    onError: (err) => toast.error(`Prescription failed: ${errorMessage(err)}`),
  });

  const ranked = useMemo(() => {
    const suggested = chart.staging ? (SITE_REGIMENS[chart.staging.primarySite] ?? []) : [];
    return {
      suggested: REGIMENS.filter((r) => suggested.includes(r.id)),
      other: REGIMENS.filter((r) => !suggested.includes(r.id)),
    };
  }, [chart.staging]);

  return (
    <div className="space-y-4">
      <SectionCard title="Regimen & patient parameters" icon={<Syringe className="size-3.5" />}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Regimen" className="sm:col-span-2 lg:col-span-3">
            <select
              value={regimenId}
              onChange={(e) => changeRegimen(e.target.value)}
              className={inputClass}
            >
              {ranked.suggested.length ? (
                <optgroup label={`Suggested for ${chart.staging?.primarySite}`}>
                  {ranked.suggested.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </optgroup>
              ) : null}
              <optgroup label={ranked.suggested.length ? "Other regimens" : "Regimens"}>
                {ranked.other.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>
          <Field
            label="Cycle"
            hint={
              cycle > regimen.cycles ? (
                <span className="text-[#B86200]">Beyond planned {regimen.cycles} cycles</span>
              ) : (
                `of ${regimen.cycles} planned`
              )
            }
          >
            <input
              type="number"
              min={1}
              value={cycle}
              onChange={(e) => setCycle(Math.max(0, Math.floor(Number(e.target.value))))}
              className={cn(inputClass, "numeric")}
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Chip>{regimen.indication}</Chip>
          <Chip>q{regimen.cycleDays} days</Chip>
          <Chip>{regimen.cycles} cycles</Chip>
          <Chip tone={EMETO_TONE[regimen.emetogenic]} className="capitalize">
            {regimen.emetogenic} emetogenic risk
          </Chip>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
          <Field
            label="Height (cm)"
            hint={prior ? `Last: ${prior.height} cm (${fmtDate(prior.at)})` : "Measure today"}
            className="lg:col-span-1"
          >
            <input
              type="number"
              inputMode="decimal"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="165"
              className={cn(inputClass, "numeric")}
            />
          </Field>
          <Field
            label="Weight (kg)"
            hint={prior ? `Last: ${prior.weight} kg` : "Weigh before each cycle"}
            className="lg:col-span-1"
          >
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="62"
              className={cn(inputClass, "numeric")}
            />
          </Field>
          <div className="flex flex-col justify-center rounded-2xl bg-black px-3 py-2 text-white lg:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
              BSA (Mosteller)
            </span>
            <span className="numeric text-xl font-extrabold">
              {bsa > 0 ? bsa.toFixed(2) : "—"}{" "}
              <span className="text-xs font-bold text-white/60">m²</span>
            </span>
          </div>
          <div className="flex flex-col justify-center rounded-2xl bg-[#F5F5F7] px-3 py-2 lg:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#86868B]">
              eGFR {usesAuc ? "(Calvert)" : ""}
            </span>
            <span
              className={cn(
                "numeric text-xl font-extrabold",
                egfr === null ? "text-[#86868B]" : egfr < 60 ? "text-[#B86200]" : "text-black",
              )}
            >
              {egfr ?? "—"} <span className="text-xs font-bold text-[#86868B]">mL/min</span>
            </span>
          </div>
          <Field label="Dose reduction" className="lg:col-span-1">
            <select
              value={reductionChoice}
              onChange={(e) => setReductionChoice(e.target.value)}
              className={inputClass}
            >
              {REDUCTIONS.map((r) => (
                <option key={r} value={String(r)}>
                  {r === 0 ? "None (100%)" : `${r}% reduction`}
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
          </Field>
          {reductionChoice === "custom" ? (
            <Field label="Custom %" hint="0–75%" className="lg:col-span-1">
              <input
                type="number"
                min={0}
                max={75}
                value={customReduction}
                onChange={(e) => setCustomReduction(e.target.value)}
                className={cn(inputClass, "numeric")}
              />
            </Field>
          ) : (
            <Field label="Start date" className="lg:col-span-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </Field>
          )}
          {reductionChoice === "custom" ? (
            <Field label="Start date" className="col-span-2 lg:col-span-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </Field>
          ) : null}
        </div>
        {bsa > 2.2 ? (
          <p className="mt-2 text-[11px] font-semibold text-[#B86200]">
            BSA above 2.2 m² — confirm local policy on BSA capping for obese patients.
          </p>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Calculated doses"
        action={
          reductionPct ? (
            <Chip tone="warn">{reductionPct}% reduction applied</Chip>
          ) : (
            <Chip>Full dose</Chip>
          )
        }
      >
        {bsa <= 0 ? (
          <p className="rounded-2xl bg-[#F5F5F7] px-3 py-4 text-center text-xs font-semibold text-[#86868B]">
            Enter height and weight to calculate BSA-based doses.
          </p>
        ) : (
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-black/5 text-[10px] uppercase tracking-wider text-[#86868B]">
                  <th className="px-2 py-2 font-bold">Drug</th>
                  <th className="px-2 py-2 font-bold">Basis / formula</th>
                  <th className="px-2 py-2 text-right font-bold">Full dose</th>
                  <th className="px-2 py-2 text-right font-bold">Final dose</th>
                  <th className="px-2 py-2 font-bold">Route</th>
                  <th className="px-2 py-2 font-bold">Schedule</th>
                </tr>
              </thead>
              <tbody>
                {doses.map((d) => (
                  <tr key={d.code} className="border-b border-black/5 last:border-0">
                    <td className="px-2 py-2.5 font-bold text-black">{d.drug}</td>
                    <td className="px-2 py-2.5 font-medium text-[#86868B]">
                      <span className="numeric">{d.formula}</span>
                    </td>
                    <td className="numeric px-2 py-2.5 text-right font-semibold text-[#86868B]">
                      {d.fullDose} {d.unit}
                    </td>
                    <td className="numeric px-2 py-2.5 text-right">
                      <span className="text-sm font-extrabold text-black">
                        {d.dose} {d.unit}
                      </span>
                      {d.capped ? (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-[#FFF4E5] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#B86200]">
                          <Lock className="size-2.5" /> capped {d.maxDose} {d.unit}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2.5 font-bold text-black">{d.route}</td>
                    <td className="px-2 py-2.5 font-medium text-[#1D1D1F]">{d.schedule}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-[10px] font-semibold text-[#86868B]">
          Regimen doses are reference templates — verify against local protocol.
        </p>
      </SectionCard>

      <SectionCard
        title="Pre-chemotherapy safety gate"
        icon={<ShieldCheck className="size-3.5" />}
        action={
          <div className="flex flex-wrap gap-1">
            {counts.fail ? <Chip tone="crit">{counts.fail} fail</Chip> : null}
            {counts.warn ? <Chip tone="warn">{counts.warn} caution</Chip> : null}
            {counts.missing ? <Chip>{counts.missing} missing</Chip> : null}
            {!counts.fail && !counts.warn && !counts.missing ? (
              <Chip tone="ok">All clear</Chip>
            ) : null}
          </div>
        }
      >
        <ul className="grid gap-2 md:grid-cols-2">
          {checks.map((c) => {
            const meta = CHECK_ICON[c.status];
            const Icon = meta.icon;
            return (
              <li
                key={c.label}
                className={cn(
                  "flex items-start gap-2.5 rounded-2xl px-3 py-2.5",
                  c.status === "fail"
                    ? "bg-[#FDE8E7]"
                    : c.status === "warn"
                      ? "bg-[#FFF4E5]"
                      : "bg-[#F5F5F7]",
                )}
              >
                <Icon
                  className={cn("mt-0.5 size-4 shrink-0", meta.className)}
                  aria-label={meta.label}
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-black">
                    {c.label}{" "}
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-wider",
                        meta.className,
                      )}
                    >
                      {meta.label}
                    </span>
                  </p>
                  <p className="text-[11px] font-medium text-[#1D1D1F]">{c.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </SectionCard>

      <div className="space-y-3 rounded-3xl border border-black/10 bg-[#FAFAFC] p-4 sm:p-5">
        {needsOverride ? (
          <div className="space-y-2 rounded-2xl border border-[#F9BDBD] bg-[#FDE8E7] p-3">
            <p className="flex items-center gap-1.5 text-xs font-black text-[#D70015]">
              <AlertOctagon className="size-4" />
              {failing.length} safety check{failing.length === 1 ? "" : "s"} failed — prescriber
              override required
            </p>
            <p className="text-[11px] font-semibold text-[#1D1D1F]">
              Failed: {failing.map((f) => f.label).join(", ")}. The override reason is recorded on
              every order and flagged to Pharmacy.
            </p>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              rows={3}
              placeholder="Clinical justification (e.g. G-CSF support given, ANC recovering; discussed with consultant)…"
              className={cn(inputClass, "resize-y bg-white")}
              aria-label="Override reason"
            />
            {!overrideOk ? (
              <p className="text-[10px] font-semibold text-[#D70015]">Minimum 10 characters.</p>
            ) : null}
          </div>
        ) : null}

        {blockers.length ? (
          <ul className="space-y-1">
            {blockers.map((b) => (
              <li
                key={b}
                className="flex items-center gap-1.5 text-[11px] font-bold text-[#B86200]"
              >
                <AlertTriangle className="size-3.5 shrink-0" /> {b}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0 text-[#0071E3]" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-black">
                Orders go to Pharmacy for independent double-check &amp; compounding
              </p>
              <p className="text-[11px] font-medium text-[#86868B]">
                {doses.length} medication order{doses.length === 1 ? "" : "s"} · {regimen.id} C
                {cycle}
                {cycle < regimen.cycles ? ` · next cycle auto-booked +${regimen.cycleDays} d` : ""}
                {prescriber ? ` · Prescriber: ${prescriber}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={!canPrescribe || mutation.isPending}
            onClick={() => mutation.mutate()}
            className={cn(
              primaryButtonClass,
              "shrink-0",
              needsOverride && "bg-[#D70015] hover:bg-[#B00012]",
            )}
          >
            {mutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Syringe className="size-3.5" />
            )}
            {needsOverride ? "Override & prescribe" : `Prescribe cycle ${cycle}`}
          </button>
        </div>
      </div>
    </div>
  );
}
