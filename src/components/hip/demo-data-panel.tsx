import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/hip/panel";
import {
  removeDemoData,
  seedInternalMedicineDemo,
  seedOncologyDemo,
  type DemoResult,
} from "@/lib/hip/demo-seed";

type Action = "im" | "onc" | "remove";

const RUNNERS: Record<Action, (onProgress: (msg: string) => void) => Promise<DemoResult>> = {
  im: seedInternalMedicineDemo,
  onc: seedOncologyDemo,
  remove: removeDemoData,
};

const LABELS: Record<Action, string> = {
  im: "Internal-medicine cases",
  onc: "Oncology cases",
  remove: "Demo data removal",
};

/** Super-admin tool: loads / removes realistic patient cases for pitch demos. */
export function DemoDataPanel() {
  const queryClient = useQueryClient();
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState<Action | null>(null);

  const append = (msg: string) => {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLog((prev) => [...prev.slice(-199), `${time}  ${msg}`]);
  };

  const mutation = useMutation({
    mutationFn: async (action: Action) => {
      setRunning(action);
      return { action, result: await RUNNERS[action](append) };
    },
    onSuccess: async ({ action, result }) => {
      if (action === "remove") {
        toast.success(`Removed ${result.removed ?? 0} demo patients`);
      } else {
        toast.success(
          `${LABELS[action]}: ${result.created} created${
            result.skipped ? `, ${result.skipped} already loaded` : ""
          }`,
        );
      }
      await queryClient.invalidateQueries();
    },
    onError: (err: Error) => {
      append(`✗ ${err.message}`);
      toast.error(err.message);
    },
    onSettled: () => setRunning(null),
  });

  const run = (action: Action) => {
    if (
      action === "remove" &&
      !confirm(
        "Remove ALL demo patients (MRN DEMO-*) and their encounters, orders, notes, vitals and appointments? This cannot be undone.",
      )
    ) {
      return;
    }
    setLog([]);
    mutation.mutate(action);
  };

  const busy = mutation.isPending;
  const btn =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

  return (
    <Panel
      title="Pitch demo data"
      subtitle="6 internal-medicine & diagnostics + 8 oncology cases · MRN prefix DEMO- · safe to re-run"
      className="min-w-0"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => run("im")}
            className={`${btn} bg-black text-white shadow-md hover:bg-slate-800`}
          >
            {running === "im" ? "Loading…" : "Load internal-medicine cases"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run("onc")}
            className={`${btn} bg-black text-white shadow-md hover:bg-slate-800`}
          >
            {running === "onc" ? "Loading…" : "Load oncology cases"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => run("remove")}
            className={`${btn} border border-[#FFD1CF] bg-[#FFF1F0] text-[#D70015] hover:bg-white`}
          >
            {running === "remove" ? "Removing…" : "Remove demo data"}
          </button>
        </div>

        <p className="text-xs font-medium text-[#86868B]">
          Existing MRNs are skipped, so loading twice never duplicates patients. Removal deletes
          only patients whose MRN starts with DEMO- (child records cascade).
        </p>

        <div
          aria-live="polite"
          className="max-h-56 min-h-16 overflow-y-auto rounded-2xl border border-black/10 bg-[#FAFAFC] p-3 font-mono text-[11px] leading-relaxed text-black"
        >
          {log.length ? (
            log.map((line, i) => (
              <div
                key={i}
                className={
                  line.includes("✗")
                    ? "text-[#D70015]"
                    : line.includes("✓") || line.includes("Done")
                      ? "text-[#1D8A39]"
                      : undefined
                }
              >
                {line}
              </div>
            ))
          ) : (
            <span className="text-[#86868B]">Progress will appear here.</span>
          )}
        </div>
      </div>
    </Panel>
  );
}
