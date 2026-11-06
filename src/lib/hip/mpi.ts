/**
 * Master Patient Index (MPI) — patient identity checks.
 *
 * The national ID (Fayda) is captured at registration on the
 * `patient.consent_recorded` event, so it is read from the append-only event
 * stream rather than the patients table. Duplicate detection is deterministic
 * and explainable: every candidate pair lists the evidence that matched.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { queryOptions } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toEthiopianName } from "@/lib/hip/ethiopian-names";

const PATIENT_LIMIT = 5000;
const EVENT_LIMIT = 10000;

export const NATIONAL_ID_SYSTEM = "urn:et:national-id";

/* -------------------------------- normalising -------------------------------- */

/** Upper-case letters and digits only, so "4729 1856 3021" and "4729-1856-3021" match. */
export function normaliseNationalId(value: string | null | undefined): string {
  return (value ?? "").replace(/[^0-9a-z]/gi, "").toUpperCase();
}

/** Last nine digits, so "+251 911 402 318", "0911402318" and "911402318" match. */
export function normalisePhone(value: string | null | undefined): string {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 9 ? digits.slice(-9) : "";
}

function nameTokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/** Jaro–Winkler similarity (0–1); tolerant of transliteration variants like Girma / Girima. */
export function jaroWinkler(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  const range = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aHit = new Array<boolean>(a.length).fill(false);
  const bHit = new Array<boolean>(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - range);
    const hi = Math.min(i + range + 1, b.length);
    for (let j = lo; j < hi; j++) {
      if (bHit[j] || a[i] !== b[j]) continue;
      aHit[i] = bHit[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let k = 0;
  let transpositions = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aHit[i]) continue;
    while (!bHit[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  const m = matches;
  const jaro = (m / a.length + m / b.length + (m - transpositions / 2) / m) / 3;
  let prefix = 0;
  while (prefix < 4 && a[prefix] === b[prefix]) prefix++;
  return jaro + prefix * 0.1 * (1 - jaro);
}

/**
 * Name similarity for Ethiopian naming (given name · father · grandfather): each token
 * of the shorter name is matched to its best counterpart, so a missing grandfather's
 * name does not count against the match.
 */
export function nameSimilarity(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return 0;
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  const used = new Set<number>();
  let total = 0;
  for (const t of short) {
    let best = 0;
    let bestIdx = -1;
    long.forEach((u, idx) => {
      if (used.has(idx)) return;
      const score = jaroWinkler(t, u);
      if (score > best) {
        best = score;
        bestIdx = idx;
      }
    });
    if (bestIdx >= 0) used.add(bestIdx);
    total += best;
  }
  return total / short.length;
}

/* ---------------------------------- matching ---------------------------------- */

export type IdentityRecord = {
  id: string;
  mrn: string;
  name: string;
  dateOfBirth: string | null;
  sex: string | null;
  phone: string | null;
  nationalId: string | null;
  createdAt?: string | null;
};

export type MatchLevel = "definite" | "probable" | "possible";

export type MatchResult = { level: MatchLevel; score: number; reasons: string[] };

const LEVEL_RANK: Record<MatchLevel, number> = { definite: 3, probable: 2, possible: 1 };

/** Scores one pair. Returns null when the evidence is too weak or contradicts a match. */
export function scoreMatch(a: IdentityRecord, b: IdentityRecord): MatchResult | null {
  const nidA = normaliseNationalId(a.nationalId);
  const nidB = normaliseNationalId(b.nationalId);
  const name = nameSimilarity(a.name, b.name);
  const reasons: string[] = [];

  if (nidA && nidB) {
    if (nidA === nidB) {
      return {
        level: "definite",
        score: 100,
        reasons: [
          "Same national ID",
          ...(name < 0.8 ? ["Names differ — check for ID entry error"] : []),
        ],
      };
    }
    return null; // two different national IDs: different people
  }

  const sameDob = Boolean(a.dateOfBirth && a.dateOfBirth === b.dateOfBirth);
  const phoneA = normalisePhone(a.phone);
  const samePhone = Boolean(phoneA && phoneA === normalisePhone(b.phone));
  const sexKnown = Boolean(a.sex && b.sex);
  const sameSex = sexKnown && a.sex!.toLowerCase() === b.sex!.toLowerCase();

  if (nameTokens(a.name).join(" ") === nameTokens(b.name).join(" ")) reasons.push("Same name");
  else if (name >= 0.85) reasons.push(`Similar name (${Math.round(name * 100)}%)`);
  if (sameDob) reasons.push("Same date of birth");
  if (samePhone) reasons.push("Same phone number");
  if (sameSex) reasons.push("Same sex");
  if (sexKnown && !sameSex) reasons.push("Different sex recorded");

  // Twins and siblings share a birthday, surname and family phone: a clearly different
  // given name (first token) means "check", never "probably the same person".
  const givenA = nameTokens(a.name)[0] ?? "";
  const givenB = nameTokens(b.name)[0] ?? "";
  const differentGiven = Boolean(givenA && givenB) && jaroWinkler(givenA, givenB) < 0.85;
  if (differentGiven) reasons.push("Different given name");

  let level: MatchLevel | null = null;
  if (sameDob && samePhone && name >= 0.75) level = "probable";
  else if (sameDob && name >= 0.9 && (!sexKnown || sameSex)) level = "probable";
  else if (samePhone && name >= 0.85) level = "probable";
  else if (sameDob && name >= 0.75 && (!sexKnown || sameSex)) level = "possible";
  else if (samePhone && name >= 0.7) level = "possible";
  if (!level) return null;
  if (differentGiven && level === "probable") level = "possible";

  const score = Math.round(
    name * 60 + (sameDob ? 20 : 0) + (samePhone ? 15 : 0) + (sameSex ? 5 : 0),
  );
  return { level, score: Math.min(score, 99), reasons };
}

export type DuplicatePair = MatchResult & { a: IdentityRecord; b: IdentityRecord };

/** Finds candidate duplicates using blocking keys so it stays fast on thousands of patients. */
export function findDuplicates(records: IdentityRecord[]): DuplicatePair[] {
  const blocks = new Map<string, number[]>();
  const add = (key: string, idx: number) => {
    const list = blocks.get(key);
    if (list) list.push(idx);
    else blocks.set(key, [idx]);
  };
  records.forEach((r, idx) => {
    const nid = normaliseNationalId(r.nationalId);
    if (nid) add(`nid:${nid}`, idx);
    const phone = normalisePhone(r.phone);
    if (phone) add(`ph:${phone}`, idx);
    if (r.dateOfBirth) add(`dob:${r.dateOfBirth}`, idx);
  });

  const seen = new Set<string>();
  const pairs: DuplicatePair[] = [];
  for (const members of blocks.values()) {
    if (members.length < 2 || members.length > 200) continue; // skip degenerate blocks
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const a = records[members[i]!]!;
        const b = records[members[j]!]!;
        const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const match = scoreMatch(a, b);
        if (match) pairs.push({ ...match, a, b });
      }
    }
  }
  return pairs.sort((x, y) => LEVEL_RANK[y.level] - LEVEL_RANK[x.level] || y.score - x.score);
}

/* ----------------------------------- queries ----------------------------------- */

type ConsentRow = { entity_id: string | null; payload: unknown; occurred_at: string };

function nationalIdsFrom(rows: ConsentRow[]): Map<string, string> {
  // Rows arrive newest first: the first ID seen per patient is the current one.
  const ids = new Map<string, string>();
  for (const row of rows) {
    if (!row.entity_id || ids.has(row.entity_id)) continue;
    const payload = (row.payload ?? {}) as Record<string, unknown>;
    const nid = normaliseNationalId(
      typeof payload["national_id"] === "string" ? payload["national_id"] : "",
    );
    if (nid) ids.set(row.entity_id, nid);
  }
  return ids;
}

/** Current national ID for one patient, or null. */
export async function nationalIdFor(
  patientId: string,
  client: SupabaseClient<Database> = supabase,
): Promise<string | null> {
  const { data, error } = await client
    .from("events")
    .select("entity_id,payload,occurred_at")
    .eq("event_type", "patient.consent_recorded")
    .eq("entity_id", patientId)
    .order("occurred_at", { ascending: false })
    .limit(5);
  if (error) return null;
  return nationalIdsFrom((data ?? []) as ConsentRow[]).get(patientId) ?? null;
}

/** Current national IDs for many patients at once (chunked to keep URLs short). */
export async function nationalIdsForPatients(
  patientIds: string[],
  client: SupabaseClient<Database> = supabase,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(patientIds)];
  for (let i = 0; i < unique.length; i += 100) {
    const { data, error } = await client
      .from("events")
      .select("entity_id,payload,occurred_at")
      .eq("event_type", "patient.consent_recorded")
      .in("entity_id", unique.slice(i, i + 100))
      .order("occurred_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(`Consent records: ${error.message}`);
    for (const [k, v] of nationalIdsFrom((data ?? []) as ConsentRow[])) {
      if (!out.has(k)) out.set(k, v);
    }
  }
  return out;
}

export type MpiSummary = {
  patients: number;
  withNationalId: number;
  withPhone: number;
  pairs: DuplicatePair[];
  truncated: boolean;
};

export const mpiQuery = queryOptions({
  queryKey: ["his", "mpi"],
  queryFn: async (): Promise<MpiSummary> => {
    const [patientsRes, consentRes] = await Promise.all([
      supabase
        .from("patients")
        .select("id,mrn,full_name,date_of_birth,sex,phone,created_at")
        .order("created_at", { ascending: true })
        .limit(PATIENT_LIMIT),
      supabase
        .from("events")
        .select("entity_id,payload,occurred_at")
        .eq("event_type", "patient.consent_recorded")
        .order("occurred_at", { ascending: false })
        .limit(EVENT_LIMIT),
    ]);
    if (patientsRes.error) throw new Error(`Patients: ${patientsRes.error.message}`);
    if (consentRes.error) throw new Error(`Consent records: ${consentRes.error.message}`);
    const ids = nationalIdsFrom((consentRes.data ?? []) as ConsentRow[]);
    const records: IdentityRecord[] = (patientsRes.data ?? []).map((p) => ({
      id: p.id,
      mrn: p.mrn,
      name: toEthiopianName(p.full_name),
      dateOfBirth: p.date_of_birth,
      sex: p.sex,
      phone: p.phone,
      nationalId: ids.get(p.id) ?? null,
      createdAt: p.created_at,
    }));
    return {
      patients: records.length,
      withNationalId: records.filter((r) => r.nationalId).length,
      withPhone: records.filter((r) => normalisePhone(r.phone)).length,
      pairs: findDuplicates(records),
      truncated: records.length >= PATIENT_LIMIT,
    };
  },
});

export type RegistrationCandidate = IdentityRecord & MatchResult;

/**
 * Checks a registration form against existing patients before a new MRN is created.
 * Uses targeted lookups (national ID, phone, date of birth) instead of loading everyone.
 */
export async function checkRegistrationDuplicates(input: {
  fullName: string;
  dateOfBirth: string;
  sex: string;
  phone?: string;
  nationalId?: string;
}): Promise<RegistrationCandidate[]> {
  const nid = normaliseNationalId(input.nationalId);
  const phone = normalisePhone(input.phone);
  const cols = "id,mrn,full_name,date_of_birth,sex,phone,created_at";

  const [byDob, byPhone, byNid] = await Promise.all([
    input.dateOfBirth
      ? supabase.from("patients").select(cols).eq("date_of_birth", input.dateOfBirth).limit(200)
      : Promise.resolve({ data: [], error: null }),
    phone
      ? // Stored numbers keep their spacing ("+251 911 402 318"), so match the digits loosely.
        supabase
          .from("patients")
          .select(cols)
          .like("phone", `%${phone.slice(-6).split("").join("%")}`)
          .limit(100)
      : Promise.resolve({ data: [], error: null }),
    nid
      ? supabase
          .from("events")
          .select("entity_id,payload,occurred_at")
          .eq("event_type", "patient.consent_recorded")
          .eq("payload->>national_id", nid)
          .limit(20)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const rows = new Map<string, NonNullable<typeof byDob.data>[number]>();
  for (const r of [...(byDob.data ?? []), ...(byPhone.data ?? [])]) rows.set(r.id, r);

  const nidPatientIds = ((byNid.data ?? []) as ConsentRow[])
    .map((r) => r.entity_id)
    .filter((id): id is string => Boolean(id) && !rows.has(id!));
  if (nidPatientIds.length) {
    const { data } = await supabase.from("patients").select(cols).in("id", nidPatientIds);
    for (const r of data ?? []) rows.set(r.id, r);
  }
  if (!rows.size) return [];

  const { data: consent } = await supabase
    .from("events")
    .select("entity_id,payload,occurred_at")
    .eq("event_type", "patient.consent_recorded")
    .in("entity_id", [...rows.keys()])
    .order("occurred_at", { ascending: false })
    .limit(500);
  const ids = nationalIdsFrom((consent ?? []) as ConsentRow[]);

  const probe: IdentityRecord = {
    id: "__new__",
    mrn: "",
    name: input.fullName,
    dateOfBirth: input.dateOfBirth || null,
    sex: input.sex || null,
    phone: input.phone ?? null,
    nationalId: nid || null,
  };
  const out: RegistrationCandidate[] = [];
  for (const r of rows.values()) {
    const record: IdentityRecord = {
      id: r.id,
      mrn: r.mrn,
      name: toEthiopianName(r.full_name),
      dateOfBirth: r.date_of_birth,
      sex: r.sex,
      phone: r.phone,
      nationalId: ids.get(r.id) ?? null,
      createdAt: r.created_at,
    };
    const match = scoreMatch(probe, record);
    if (match) out.push({ ...record, ...match });
  }
  return out
    .sort((x, y) => LEVEL_RANK[y.level] - LEVEL_RANK[x.level] || y.score - x.score)
    .slice(0, 5);
}
