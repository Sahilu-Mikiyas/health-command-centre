/**
 * Full data backup export (Super Admin). Reads every table the signed-in admin
 * can see, page by page, into one JSON file. This is an extra copy the hospital
 * keeps itself; it does not replace the database provider's own backups.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TableName = keyof Database["public"]["Tables"];

/** Every table, reference data first so a restore can follow the same order. */
export const BACKUP_TABLES: TableName[] = [
  "hospitals",
  "departments",
  "wards",
  "rooms",
  "beds",
  "profiles",
  "user_roles",
  "staff",
  "notification_settings",
  "patients",
  "allergies",
  "conditions",
  "vitals",
  "encounters",
  "appointments",
  "orders",
  "clinical_notes",
  "invoices",
  "invoice_items",
  "data_provenance",
  "audit_log",
  "events",
];

const PAGE = 1000;
/** A hard stop so a runaway table cannot exhaust the browser. */
const MAX_ROWS_PER_TABLE = 200_000;

export type BackupFile = {
  format: "furii-backup";
  version: 1;
  createdAt: string;
  tables: Record<string, unknown[]>;
  counts: Record<string, number>;
  errors: Record<string, string>;
  truncated: string[];
};

export async function exportBackup(onProgress?: (msg: string) => void): Promise<BackupFile> {
  const file: BackupFile = {
    format: "furii-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    tables: {},
    counts: {},
    errors: {},
    truncated: [],
  };
  for (const table of BACKUP_TABLES) {
    const rows: unknown[] = [];
    let from = 0;
    onProgress?.(`Reading ${table}…`);
    for (;;) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .range(from, from + PAGE - 1);
      if (error) {
        file.errors[table] = error.message;
        break;
      }
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
      from += PAGE;
      if (rows.length >= MAX_ROWS_PER_TABLE) {
        file.truncated.push(table);
        break;
      }
    }
    file.tables[table] = rows;
    file.counts[table] = rows.length;
  }
  return file;
}
