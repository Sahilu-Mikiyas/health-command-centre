/**
 * HL7 v2.5.1 ADT messages for legacy systems (lab analysers, older HIS,
 * insurer gateways) that do not speak FHIR yet.
 *
 * Derived from encounters already in the database:
 *   A04 register outpatient · A01 admit inpatient · A03 discharge.
 * Each message is MSH + EVN + PID + PV1, segments separated by CR as the
 * standard requires; messages in a batch file are separated by LF.
 */

export const FIELD = "|";
export const COMPONENT = "^";
export const REPEAT = "~";
export const ESCAPE = "\\";
export const SUBCOMPONENT = "&";

/** Escapes the HL7 delimiter characters inside a field value (HL7 v2 §2.7). */
export function hl7Escape(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\\/g, "\\E\\")
    .replace(/\|/g, "\\F\\")
    .replace(/\^/g, "\\S\\")
    .replace(/~/g, "\\R\\")
    .replace(/&/g, "\\T\\")
    .replace(/\r\n|\r|\n/g, "\\.br\\");
}

/** HL7 TS (YYYYMMDDHHMMSS+ZZZZ) in Addis Ababa time, or YYYYMMDD for a date-only value. */
export function hl7Timestamp(value: string | Date | null | undefined): string {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value.replace(/-/g, "");
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  const addis = new Date(d.getTime() + 3 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${addis.getUTCFullYear()}${p(addis.getUTCMonth() + 1)}${p(addis.getUTCDate())}` +
    `${p(addis.getUTCHours())}${p(addis.getUTCMinutes())}${p(addis.getUTCSeconds())}+0300`
  );
}

export type AdtEvent = "A01" | "A03" | "A04";

export const ADT_LABELS: Record<AdtEvent, string> = {
  A01: "Admit inpatient",
  A03: "Discharge",
  A04: "Register outpatient",
};

export type AdtPatient = {
  id: string;
  mrn: string;
  name: string;
  dateOfBirth: string | null;
  sex: string | null;
  phone: string | null;
  nationalId?: string | null;
};

export type AdtEncounter = {
  id: string;
  startedAt: string;
  endedAt: string | null;
  bedLabel?: string | null;
  departmentCode?: string | null;
  priority?: string | null;
  chiefComplaint?: string | null;
};

export type AdtMessage = {
  controlId: string;
  event: AdtEvent;
  occurredAt: string;
  encounterId: string;
  mrn: string;
  text: string;
};

function sexCode(sex: string | null | undefined): string {
  const s = (sex ?? "").toLowerCase();
  if (s.startsWith("f")) return "F";
  if (s.startsWith("m")) return "M";
  return "U";
}

/** Ethiopian names: given name · father's name · grandfather's name → XPN family^given^middle. */
function personName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return hl7Escape(parts[0] ?? "");
  const [given, father, ...rest] = parts;
  return [hl7Escape(father), hl7Escape(given), hl7Escape(rest.join(" "))]
    .join(COMPONENT)
    .replace(/\^+$/, "");
}

export function buildAdtMessage(opts: {
  event: AdtEvent;
  patient: AdtPatient;
  encounter: AdtEncounter;
  occurredAt: string;
  controlId: string;
  sendingFacility: string;
  receivingApplication?: string;
  now?: Date;
}): AdtMessage {
  const { event, patient: p, encounter: e } = opts;
  const inpatient = event === "A01" || (event === "A03" && Boolean(e.bedLabel));
  const ids = [`${hl7Escape(p.mrn)}^^^${hl7Escape(opts.sendingFacility)}^MR`];
  if (p.nationalId) ids.push(`${hl7Escape(p.nationalId)}^^^ETH^NI`);

  const msh = [
    "MSH",
    `${COMPONENT}${REPEAT}${ESCAPE}${SUBCOMPONENT}`,
    "FURII_HIS",
    hl7Escape(opts.sendingFacility),
    hl7Escape(opts.receivingApplication ?? "RECEIVER"),
    "",
    hl7Timestamp(opts.now ?? new Date()),
    "",
    `ADT${COMPONENT}${event}${COMPONENT}ADT_${event === "A04" ? "A01" : event}`,
    opts.controlId,
    "P",
    "2.5.1",
  ].join(FIELD);
  // MSH-1 is the field separator itself, so the joined segment starts "MSH|^~\&|".
  const evn = ["EVN", event, hl7Timestamp(opts.occurredAt)].join(FIELD);
  const pid = [
    "PID",
    "1",
    "",
    ids.join(REPEAT),
    "",
    personName(p.name),
    "",
    hl7Timestamp(p.dateOfBirth),
    sexCode(p.sex),
    "",
    "",
    "",
    "",
    p.phone ? `${hl7Escape(p.phone)}^PRN^PH` : "",
  ].join(FIELD);
  const pv1 = [
    "PV1",
    "1",
    inpatient ? "I" : "O",
    inpatient && e.bedLabel
      ? `${hl7Escape(e.departmentCode ?? "WARD")}^^${hl7Escape(e.bedLabel)}`
      : hl7Escape(e.departmentCode ?? ""),
    e.priority === "critical" || e.priority === "urgent" ? "E" : "R",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    hl7Escape(e.id),
    ...Array<string>(24).fill(""),
    hl7Timestamp(e.startedAt),
    event === "A03" ? hl7Timestamp(e.endedAt) : "",
  ].join(FIELD);

  return {
    controlId: opts.controlId,
    event,
    occurredAt: opts.occurredAt,
    encounterId: e.id,
    mrn: p.mrn,
    text: [msh, evn, pid, pv1].join("\r"),
  };
}

/** Every ADT event an encounter implies, oldest first. */
export function adtEventsFor(e: AdtEncounter): { event: AdtEvent; at: string }[] {
  const out: { event: AdtEvent; at: string }[] = [
    { event: e.bedLabel ? "A01" : "A04", at: e.startedAt },
  ];
  if (e.endedAt) out.push({ event: "A03", at: e.endedAt });
  return out;
}

/** Splits a message back into segments and fields — used to verify what we send. */
export function parseHl7(text: string): string[][] {
  return text
    .split("\r")
    .filter(Boolean)
    .map((segment) => {
      const fields = segment.split(FIELD);
      // MSH-1 is the separator, so field numbering shifts by one for MSH only.
      return fields[0] === "MSH" ? ["MSH", FIELD, ...fields.slice(1)] : fields;
    });
}
