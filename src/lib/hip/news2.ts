/**
 * NEWS2 (Royal College of Physicians, 2017) — SpO2 scale 1.
 * Missing parameters contribute 0 and are listed in `missing`.
 */

export type Consciousness = "A" | "C" | "V" | "P" | "U";

export type News2Input = {
  respiratoryRate?: number | null;
  spo2?: number | null;
  supplementalO2?: boolean;
  systolic?: number | null;
  pulse?: number | null;
  /** ACVPU. Defaults to Alert when not assessed. */
  consciousness?: Consciousness;
  temperatureC?: number | null;
};

/** low (0-4), low_medium (any single parameter scoring 3), medium (5-6), high (≥7). */
export type News2Band = "low" | "low_medium" | "medium" | "high";

export type News2Result = {
  score: number;
  band: News2Band;
  label: string;
  parts: Record<string, number>;
  missing: string[];
};

const has = (v: number | null | undefined): v is number =>
  typeof v === "number" && Number.isFinite(v);

function scoreRespiration(rr: number) {
  if (rr <= 8) return 3;
  if (rr <= 11) return 1;
  if (rr <= 20) return 0;
  if (rr <= 24) return 2;
  return 3;
}

function scoreSpo2Scale1(spo2: number) {
  if (spo2 <= 91) return 3;
  if (spo2 <= 93) return 2;
  if (spo2 <= 95) return 1;
  return 0;
}

function scoreSystolic(sbp: number) {
  if (sbp <= 90) return 3;
  if (sbp <= 100) return 2;
  if (sbp <= 110) return 1;
  if (sbp <= 219) return 0;
  return 3;
}

function scorePulse(hr: number) {
  if (hr <= 40) return 3;
  if (hr <= 50) return 1;
  if (hr <= 90) return 0;
  if (hr <= 110) return 1;
  if (hr <= 130) return 2;
  return 3;
}

function scoreTemperature(t: number) {
  if (t <= 35.0) return 3;
  if (t <= 36.0) return 1;
  if (t <= 38.0) return 0;
  if (t <= 39.0) return 1;
  return 2;
}

export const NEWS2_BAND_LABEL: Record<News2Band, string> = {
  low: "Low",
  low_medium: "Low-Medium",
  medium: "Medium",
  high: "High",
};

export function computeNews2(input: News2Input): News2Result {
  const parts: Record<string, number> = {};
  const missing: string[] = [];

  if (has(input.respiratoryRate)) parts["respiration"] = scoreRespiration(input.respiratoryRate);
  else missing.push("respiration");
  if (has(input.spo2)) parts["spo2"] = scoreSpo2Scale1(input.spo2);
  else missing.push("spo2");
  parts["air_or_oxygen"] = input.supplementalO2 ? 2 : 0;
  if (has(input.systolic)) parts["systolic"] = scoreSystolic(input.systolic);
  else missing.push("systolic");
  if (has(input.pulse)) parts["pulse"] = scorePulse(input.pulse);
  else missing.push("pulse");
  parts["consciousness"] = (input.consciousness ?? "A") === "A" ? 0 : 3;
  if (has(input.temperatureC)) parts["temperature"] = scoreTemperature(input.temperatureC);
  else missing.push("temperature");

  const values = Object.values(parts);
  const score = values.reduce((sum, v) => sum + v, 0);
  const band: News2Band =
    score >= 7
      ? "high"
      : score >= 5
        ? "medium"
        : values.some((v) => v === 3)
          ? "low_medium"
          : "low";

  return { score, band, label: NEWS2_BAND_LABEL[band], parts, missing };
}
