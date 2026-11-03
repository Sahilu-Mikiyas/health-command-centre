import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Inbox, Loader2, Search, UserRound, X } from "lucide-react";
import { useDeferredValue, useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { patientsQuery, type PatientRow } from "@/lib/hip/queries";
import { cn } from "@/lib/utils";

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

export function LoadingState({ label = "Loading live data…", className }: { label?: string; className?: string }) {
  return (
    <div className={cn("flex min-h-32 items-center justify-center gap-2 text-xs font-semibold text-[#86868B]", className)}>
      <Loader2 className="size-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ error, className }: { error: unknown; className?: string }) {
  const message = error instanceof Error ? error.message : "Could not load data";
  return (
    <div
      className={cn(
        "flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-[#F9BDBD] bg-[#FDE8E7]/50 p-4 text-center",
        className,
      )}
    >
      <AlertTriangle className="size-5 text-[#D70015]" />
      <p className="text-xs font-bold text-[#D70015]">Live query failed</p>
      <p className="max-w-md text-xs text-[#86868B]">{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  icon,
  className,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-32 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-black/10 bg-[#F5F5F7]/60 p-6 text-center",
        className,
      )}
    >
      {icon ?? <Inbox className="size-5 text-[#86868B]" />}
      <p className="text-sm font-bold text-[#1D1D1F]">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-[#86868B]">{hint}</p> : null}
    </div>
  );
}

/** Generic query-state wrapper so every panel renders loading / error / content consistently. */
export function QueryBody<T>({
  query,
  children,
  loadingLabel,
}: {
  query: { data: T | undefined; isLoading: boolean; error: unknown };
  children: (data: T) => ReactNode;
  loadingLabel?: string;
}) {
  if (query.isLoading) return <LoadingState label={loadingLabel} />;
  if (query.error) return <ErrorState error={query.error} />;
  if (query.data === undefined) return <LoadingState label={loadingLabel} />;
  return <>{children(query.data)}</>;
}

export function SectionIntro({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-black/5 bg-[#F5F5F7] p-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-white text-black shadow-2xs">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-[#1D1D1F]">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#86868B]">{children}</p>
      </div>
    </div>
  );
}

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

/** Search-as-you-type patient selector backed by the shared `patientsQuery`. */
export function PatientPicker({
  value,
  onChange,
}: {
  value: PatientRow | null;
  onChange: (patient: PatientRow | null) => void;
}) {
  const [search, setSearch] = useState("");
  const deferred = useDeferredValue(search);
  const patients = useQuery({ ...patientsQuery(deferred), enabled: !value });

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-black text-sm font-black text-white">
          {value.full_name
            .split(/\s+/)
            .map((part) => part[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-[#1D1D1F]">{value.full_name}</p>
          <p className="truncate text-xs font-semibold text-[#86868B]">
            {value.mrn} · {value.sex} · DOB {fmtDate(value.date_of_birth)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="grid size-8 place-items-center rounded-full text-[#86868B] hover:bg-[#F5F5F7] hover:text-black"
          aria-label="Change patient"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  const rows = (patients.data ?? []).slice(0, 8);
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#86868B]" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search patient by name or MRN…"
          className="h-10 rounded-xl pl-9"
          aria-label="Search patients"
        />
      </div>
      <div className="max-h-64 overflow-y-auto rounded-2xl border border-black/5 bg-white">
        {patients.isLoading ? (
          <LoadingState label="Searching patients…" className="min-h-20" />
        ) : patients.error ? (
          <ErrorState error={patients.error} className="min-h-20 rounded-none border-0" />
        ) : rows.length === 0 ? (
          <p className="p-4 text-center text-xs font-semibold text-[#86868B]">No patients match.</p>
        ) : (
          rows.map((patient) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => onChange(patient)}
              className="flex w-full items-center gap-3 border-b border-black/5 px-3 py-2.5 text-left last:border-b-0 hover:bg-[#F5F5F7]"
            >
              <UserRound className="size-4 shrink-0 text-[#86868B]" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[#1D1D1F]">
                {patient.full_name}
              </span>
              <span className="numeric shrink-0 text-xs font-bold text-[#86868B]">{patient.mrn}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
