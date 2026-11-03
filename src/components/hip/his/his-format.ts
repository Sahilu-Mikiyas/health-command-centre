/** Chart palette, axis/tooltip presets and formatters shared by the HIS panels. */
/** Shared chart palette — matches the app's Apple-style tokens. */
export const HIS_COLORS = {
  ink: "#1D1D1F",
  muted: "#86868B",
  grid: "#E8E8ED",
  blue: "#0071E3",
  green: "#1D8A39",
  red: "#D70015",
  orange: "#FF9500",
  purple: "#AF52DE",
  teal: "#30B0C7",
  slate: "#C7C7CC",
} as const;

export const SERIES = [
  HIS_COLORS.blue,
  HIS_COLORS.green,
  HIS_COLORS.orange,
  HIS_COLORS.purple,
  HIS_COLORS.teal,
  HIS_COLORS.red,
];

export const tooltipStyle = {
  contentStyle: {
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.08)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    fontSize: 12,
    fontWeight: 600,
  },
  labelStyle: { color: HIS_COLORS.muted, fontWeight: 700 },
  cursor: { fill: "rgba(0,0,0,0.04)" },
};

export const axisProps = {
  tick: { fontSize: 11, fill: HIS_COLORS.muted, fontWeight: 600 },
  axisLine: false,
  tickLine: false,
} as const;

export function fmtNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString();
}

export function fmtMinutes(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h < 48) return m ? `${h} h ${m} min` : `${h} h`;
  return `${Math.round(h / 24)} d`;
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "2-digit" });
}
