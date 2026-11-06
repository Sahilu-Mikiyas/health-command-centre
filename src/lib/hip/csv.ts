/**
 * Safe CSV cells (RFC 4180 quoting + spreadsheet formula-injection guard).
 *
 * A text cell starting with = + - @ (or a tab / carriage return) is run as a
 * formula by Excel and LibreOffice, so a patient registered as
 * "=HYPERLINK(…)" could execute when someone opens an export. Such cells get a
 * leading apostrophe; plain numbers ("-3", "+251…" is text and is guarded) are kept.
 */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  let text = value;
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
