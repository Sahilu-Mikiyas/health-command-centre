/**
 * Ethiopian (Ge'ez) calendar conversion — Amete Mihret era.
 *
 * Twelve months of 30 days plus Pagume (5 days, 6 in a leap year). The new year
 * (Enkutatash, Meskerem 1) falls on 11 September, or 12 September in the
 * Gregorian year before a Gregorian leap year. Conversion goes through the
 * Julian Day Number so it is exact for any date.
 */

const ETHIOPIAN_EPOCH_JDN = 1724221; // Meskerem 1, year 1 (Amete Mihret)

export const ETHIOPIAN_MONTHS = [
  { en: "Meskerem", am: "መስከረም" },
  { en: "Tikimt", am: "ጥቅምት" },
  { en: "Hidar", am: "ኅዳር" },
  { en: "Tahsas", am: "ታኅሣሥ" },
  { en: "Tir", am: "ጥር" },
  { en: "Yekatit", am: "የካቲት" },
  { en: "Megabit", am: "መጋቢት" },
  { en: "Miyazya", am: "ሚያዝያ" },
  { en: "Ginbot", am: "ግንቦት" },
  { en: "Sene", am: "ሰኔ" },
  { en: "Hamle", am: "ሐምሌ" },
  { en: "Nehase", am: "ነሐሴ" },
  { en: "Pagume", am: "ጳጉሜ" },
] as const;

export type EthiopianDate = { year: number; month: number; day: number };

function gregorianToJdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return (
    d +
    Math.floor((153 * mm + 2) / 5) +
    365 * yy +
    Math.floor(yy / 4) -
    Math.floor(yy / 100) +
    Math.floor(yy / 400) -
    32045
  );
}

function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

function jdnToEthiopian(jdn: number): EthiopianDate {
  // Count 4-year cycles from Meskerem 1 of year 0, so the leap year (year % 4 === 3)
  // is the last of each cycle and Pagume 6 is day 1460 of the cycle.
  const offset = jdn - (ETHIOPIAN_EPOCH_JDN - 365);
  const r = ((offset % 1461) + 1461) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  return {
    year: 4 * Math.floor(offset / 1461) + Math.floor(r / 365) - Math.floor(r / 1460),
    month: Math.floor(n / 30) + 1,
    day: (n % 30) + 1,
  };
}

function ethiopianToJdn({ year, month, day }: EthiopianDate): number {
  return ETHIOPIAN_EPOCH_JDN + 365 * (year - 1) + Math.floor(year / 4) + 30 * (month - 1) + day - 1;
}

export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3;
}

/** Year · month · day of a calendar date. Date-only strings are read as written, never shifted by time zone. */
function calendarParts(value: Date | string): { year: number; month: number; day: number } | null {
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (m && value.length <= 10) return { year: +m[1]!, month: +m[2]!, day: +m[3]! };
    value = new Date(value);
  }
  if (Number.isNaN(value.getTime())) return null;
  // Timestamps are read in Addis Ababa time (UTC+3, no daylight saving).
  const addis = new Date(value.getTime() + 3 * 3_600_000);
  return { year: addis.getUTCFullYear(), month: addis.getUTCMonth() + 1, day: addis.getUTCDate() };
}

export function toEthiopian(value: Date | string | null | undefined): EthiopianDate | null {
  if (value === null || value === undefined || value === "") return null;
  const g = calendarParts(value);
  return g ? jdnToEthiopian(gregorianToJdn(g.year, g.month, g.day)) : null;
}

/** Ethiopian date → ISO Gregorian date (YYYY-MM-DD). Throws on an impossible date. */
export function fromEthiopian(date: EthiopianDate): string {
  const { year, month, day } = date;
  const maxDay = month === 13 ? (isEthiopianLeapYear(year) ? 6 : 5) : 30;
  if (!Number.isInteger(year) || year < 1 || month < 1 || month > 13 || day < 1 || day > maxDay) {
    throw new Error(`Not a valid Ethiopian date: ${day}/${month}/${year}`);
  }
  const g = jdnToGregorian(ethiopianToJdn(date));
  return `${g.year}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`;
}

/** "Tikimt 26, 2019 EC" or, in Amharic script, "ጥቅምት 26 ቀን 2019 ዓ.ም". Empty string when the date is missing. */
export function formatEthiopian(
  value: Date | string | null | undefined,
  lang: "en" | "am" = "en",
): string {
  const et = toEthiopian(value);
  if (!et) return "";
  const month = ETHIOPIAN_MONTHS[et.month - 1]!;
  return lang === "am"
    ? `${month.am} ${et.day} ቀን ${et.year} ዓ.ም`
    : `${month.en} ${et.day}, ${et.year} EC`;
}

/** "Tikimt 2019 EC" for a month view, from any day in that Gregorian-dated period. */
export function formatEthiopianMonth(value: Date | string, lang: "en" | "am" = "en"): string {
  const et = toEthiopian(value);
  if (!et) return "";
  const month = ETHIOPIAN_MONTHS[et.month - 1]!;
  return lang === "am" ? `${month.am} ${et.year} ዓ.ም` : `${month.en} ${et.year} EC`;
}
