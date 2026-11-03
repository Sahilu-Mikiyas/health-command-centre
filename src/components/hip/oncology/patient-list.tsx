import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, Search, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { regimenById, type OncologyListRow } from "@/lib/hip/oncology";
import { patientsQuery } from "@/lib/hip/queries";
import { cn } from "@/lib/utils";

import {
  ageFrom,
  Chip,
  daysFromNow,
  EmptyState,
  errorMessage,
  fmtDate,
  inputClass,
  relativeDays,
  secondaryButtonClass,
  SkeletonRows,
  StageBadge,
  sexLabel,
  surfaceClass,
} from "./shared";

type Filter = "all" | "chemo" | "board" | "due";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "chemo", label: "On chemo" },
  { id: "board", label: "Tumour board" },
  { id: "due", label: "Due ≤ 7 d" },
];

function matchesFilter(row: OncologyListRow, filter: Filter) {
  if (filter === "board") return row.tumourBoardPending;
  if (filter === "chemo") {
    const d = daysFromNow(row.lastCycleAt);
    return d !== null && d >= -35;
  }
  if (filter === "due") {
    const d = daysFromNow(row.nextAppointment);
    return d !== null && d >= 0 && d <= 7;
  }
  return true;
}

export function PatientList({
  rows,
  isLoading,
  error,
  selectedId,
  onSelect,
  onAddPatient,
}: {
  rows: OncologyListRow[];
  isLoading: boolean;
  error: unknown;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAddPatient: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [addOpen, setAddOpen] = useState(false);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => matchesFilter(r, filter))
      .filter((r) => {
        if (!q) return true;
        return [
          r.patient.full_name,
          r.patient.mrn,
          r.diagnosis.name,
          r.diagnosis.icd10 ?? "",
          r.staging?.primarySite ?? "",
          r.regimenId ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        // Soonest next cycle first; patients without a booking last.
        const an = a.nextAppointment ?? "9999";
        const bn = b.nextAppointment ?? "9999";
        if (an !== bn) return an.localeCompare(bn);
        return a.patient.full_name.localeCompare(b.patient.full_name);
      });
  }, [rows, search, filter]);

  return (
    <section className={cn(surfaceClass, "flex min-w-0 flex-col overflow-hidden")}>
      <header className="flex items-center justify-between gap-3 border-b border-black/5 bg-[#FAFAFC] px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-xs font-black uppercase tracking-wider text-black">
            Cancer registry
          </h2>
          <p className="mt-0.5 text-xs font-medium text-[#86868B]">
            {isLoading ? "Loading…" : `${rows.length} patient${rows.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <button type="button" onClick={() => setAddOpen(true)} className={secondaryButtonClass}>
          <UserPlus className="size-3.5" />
          Add patient
        </button>
      </header>

      <div className="space-y-3 border-b border-black/5 px-5 py-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#86868B]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, MRN, site, ICD-10, regimen"
            className={cn(inputClass, "pl-8")}
            aria-label="Search cancer patients"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "cursor-pointer rounded-full px-3 py-1 text-[11px] font-bold transition-all",
                filter === f.id
                  ? "bg-black text-white"
                  : "border border-black/5 bg-white text-[#1D1D1F] hover:bg-[#F5F5F7]",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-[70vh] min-h-[200px] flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <SkeletonRows rows={6} />
        ) : error ? (
          <EmptyState title="Could not load the cancer registry" detail={errorMessage(error)} />
        ) : !rows.length ? (
          <EmptyState
            icon={<Users className="size-6" />}
            title="No cancer diagnoses on record"
            detail="Patients appear here once a C00–D09 ICD-10 condition is recorded. Use “Add patient” to stage an existing patient."
          />
        ) : !visible.length ? (
          <EmptyState title="No matches" detail="Try another search term or filter." />
        ) : (
          <ul className="space-y-1.5">
            {visible.map((row) => (
              <PatientRow
                key={row.patient.id}
                row={row}
                selected={row.patient.id === selectedId}
                onClick={() => onSelect(row.patient.id)}
              />
            ))}
          </ul>
        )}
      </div>

      <AddPatientDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        registryIds={new Set(rows.map((r) => r.patient.id))}
        onPick={(id) => {
          setAddOpen(false);
          onAddPatient(id);
        }}
      />
    </section>
  );
}

function PatientRow({
  row,
  selected,
  onClick,
}: {
  row: OncologyListRow;
  selected: boolean;
  onClick: () => void;
}) {
  const regimen = row.regimenId ? regimenById(row.regimenId) : undefined;
  const site = row.staging?.primarySite ?? row.diagnosis.name;
  const icd = row.staging?.icd10 ?? row.diagnosis.icd10;
  const nextDays = daysFromNow(row.nextAppointment);

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        aria-current={selected ? "true" : undefined}
        className={cn(
          "group w-full cursor-pointer rounded-2xl border px-3.5 py-3 text-left transition-all",
          selected
            ? "border-black bg-black text-white shadow-md"
            : "border-transparent bg-white hover:border-black/5 hover:bg-[#F5F5F7]",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{row.patient.full_name}</p>
            <p
              className={cn(
                "text-[11px] font-semibold",
                selected ? "text-white/70" : "text-[#86868B]",
              )}
            >
              <span className="numeric">{row.patient.mrn}</span>
              {" · "}
              {ageFrom(row.patient.date_of_birth) ?? "—"} y · {sexLabel(row.patient.sex).charAt(0)}
            </p>
          </div>
          <StageBadge stage={row.staging?.stage} className="shrink-0" />
        </div>

        <p
          className={cn(
            "mt-1.5 truncate text-xs font-semibold",
            selected ? "text-white/90" : "text-[#1D1D1F]",
          )}
        >
          {site}
          {icd ? (
            <span className={selected ? "text-white/60" : "text-[#86868B]"}> · {icd}</span>
          ) : null}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {regimen && row.lastCycle !== null ? (
            <Chip
              tone={selected ? "neutral" : "info"}
              className={selected ? "!bg-white/15 !text-white !border-white/20" : ""}
            >
              {regimen.id} · C{row.lastCycle}/{regimen.cycles}
            </Chip>
          ) : row.regimenId ? (
            <Chip>{row.regimenId}</Chip>
          ) : (
            <Chip
              className={
                selected ? "!bg-white/15 !text-white/80 !border-white/20" : "text-[#86868B]"
              }
            >
              No chemo yet
            </Chip>
          )}
          {row.tumourBoardPending ? <Chip tone="warn">Tumour board</Chip> : null}
          {row.nextAppointment ? (
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1 text-[10px] font-bold",
                selected
                  ? "text-white/80"
                  : nextDays !== null && nextDays <= 2
                    ? "text-[#B86200]"
                    : "text-[#86868B]",
              )}
            >
              <CalendarClock className="size-3" />
              {fmtDate(row.nextAppointment)} · {relativeDays(row.nextAppointment)}
            </span>
          ) : null}
        </div>
      </button>
    </li>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function AddPatientDialog({
  open,
  onOpenChange,
  registryIds,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registryIds: Set<string>;
  onPick: (id: string) => void;
}) {
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term, 250);
  const { data, isLoading, error } = useQuery({ ...patientsQuery(debounced), enabled: open });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle>Add patient to oncology</DialogTitle>
          <DialogDescription>
            Search the master patient index. The patient opens in the Staging tab so a cancer
            diagnosis can be coded and staged.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#86868B]" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Name or MRN"
            className={cn(inputClass, "pl-8")}
            aria-label="Search patients"
          />
        </div>
        <div className="max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <SkeletonRows rows={4} />
          ) : error ? (
            <EmptyState title="Search failed" detail={errorMessage(error)} />
          ) : !data?.length ? (
            <EmptyState title="No patients found" />
          ) : (
            <ul className="space-y-1">
              {data.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onPick(p.id)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-[#F5F5F7]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-black">{p.full_name}</p>
                      <p className="text-[11px] font-semibold text-[#86868B]">
                        <span className="numeric">{p.mrn}</span> · {ageFrom(p.date_of_birth) ?? "—"}{" "}
                        y · {sexLabel(p.sex)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {registryIds.has(p.id) ? <Chip tone="info">In registry</Chip> : null}
                      <ChevronRight className="size-4 text-[#86868B]" />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
