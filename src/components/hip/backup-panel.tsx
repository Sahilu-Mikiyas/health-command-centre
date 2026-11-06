import { useMutation } from "@tanstack/react-query";
import { DatabaseBackup, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Panel } from "@/components/hip/panel";
import { exportBackup } from "@/lib/hip/backup";
import { downloadText } from "@/lib/hip/his-queries";
import { emitEvent } from "@/lib/hip/mutations";

/** Super-admin tool: downloads a full JSON copy of the hospital's data. */
export function BackupPanel() {
  const [progress, setProgress] = useState<string | null>(null);
  const backup = useMutation({
    mutationFn: async () => {
      const file = await exportBackup(setProgress);
      const stamp = file.createdAt.slice(0, 19).replace(/[:T]/g, "-");
      downloadText(`furii-backup-${stamp}.json`, JSON.stringify(file), "application/json");
      const rows = Object.values(file.counts).reduce((a, b) => a + b, 0);
      await emitEvent({
        eventType: "backup.exported",
        severity: "warning",
        payload: { rows, tables: file.counts, errors: Object.keys(file.errors) },
      }).catch(() => undefined);
      return { rows, file };
    },
    onSuccess: ({ rows, file }) => {
      const failed = Object.keys(file.errors);
      if (failed.length)
        toast.warning(`Backup saved (${rows} rows); could not read: ${failed.join(", ")}`);
      else
        toast.success(
          `Backup saved: ${rows.toLocaleString()} rows from ${Object.keys(file.counts).length} tables`,
        );
      setProgress(null);
    },
    onError: (err: Error) => {
      toast.error(`Backup failed: ${err.message}`);
      setProgress(null);
    },
  });

  return (
    <Panel
      title="Data backup"
      subtitle="Download a full copy of the hospital's records"
      action={<DatabaseBackup className="size-4 text-[#86868B]" />}
      bodyClassName="space-y-3"
    >
      <p className="text-xs leading-relaxed text-[#86868B]">
        Exports every table (patients, clinical record, billing, staff, ledgers) as one JSON file.
        Store it encrypted and offline. This is an extra copy kept by the hospital, on top of the
        database provider's automatic backups. Every export is written to the event ledger.
      </p>
      <button
        type="button"
        disabled={backup.isPending}
        onClick={() => {
          if (
            window.confirm(
              "This file contains every patient record. Download it only to a secure, encrypted location. Continue?",
            )
          ) {
            backup.mutate();
          }
        }}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-black px-3 py-2.5 text-xs font-bold text-white hover:bg-[#1D1D1F] disabled:cursor-default disabled:opacity-40"
      >
        {backup.isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <DatabaseBackup className="size-3.5" />
        )}
        {backup.isPending ? (progress ?? "Preparing…") : "Download full backup"}
      </button>
    </Panel>
  );
}
