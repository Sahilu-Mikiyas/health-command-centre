import { useState } from "react";

import {
  ETHIOPIAN_MONTHS,
  fromEthiopian,
  isEthiopianLeapYear,
  toEthiopian,
} from "@/lib/hip/ethiopian-calendar";
import { useLanguage, useT } from "@/lib/hip/i18n";
import { cn } from "@/lib/utils";

/**
 * A date field that accepts either calendar. The Gregorian <input type="date"> keeps
 * the form `name`, so the stored value is always ISO; the Ethiopian day / month /
 * year fields stay in sync with it in both directions.
 */
export function EthiopianDateInput({
  name,
  defaultValue,
  required,
  max,
  inputClassName,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
  max?: string;
  inputClassName?: string;
}) {
  const t = useT();
  const lang = useLanguage();
  const [iso, setIso] = useState(defaultValue ?? "");
  const initial = toEthiopian(defaultValue ?? null);
  const [ec, setEc] = useState({
    day: initial ? String(initial.day) : "",
    month: initial ? String(initial.month) : "",
    year: initial ? String(initial.year) : "",
  });
  const [ecError, setEcError] = useState<string | null>(null);

  const fromGregorian = (value: string) => {
    setIso(value);
    const et = toEthiopian(value || null);
    setEc(
      et
        ? { day: String(et.day), month: String(et.month), year: String(et.year) }
        : { day: "", month: "", year: "" },
    );
    setEcError(null);
  };

  const fromEc = (next: typeof ec) => {
    setEc(next);
    const year = Number(next.year);
    const month = Number(next.month);
    const day = Number(next.day);
    if (!next.year || !next.month || !next.day) return;
    try {
      const value = fromEthiopian({ year, month, day });
      if (max && value > max) {
        setEcError("That date is in the future");
        return;
      }
      setIso(value);
      setEcError(null);
    } catch {
      setEcError(
        month === 13
          ? `Pagume has ${isEthiopianLeapYear(year) ? 6 : 5} days in ${year}`
          : "Not a valid Ethiopian date",
      );
    }
  };

  const small =
    "rounded-xl border border-black/10 bg-white px-2 py-1.5 text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-black";
  const maxDay = ec.month === "13" ? (isEthiopianLeapYear(Number(ec.year)) ? 6 : 5) : 30;

  return (
    <div className="space-y-2">
      <input
        name={name}
        type="date"
        required={required}
        max={max}
        value={iso}
        onChange={(e) => fromGregorian(e.target.value)}
        className={inputClassName}
      />
      <fieldset className="flex flex-wrap items-center gap-1.5">
        <legend className="sr-only">{t("Ethiopian calendar")}</legend>
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86868B]">
          {t("Ethiopian calendar")}
        </span>
        <select
          aria-label={t("Day")}
          value={ec.day}
          onChange={(e) => fromEc({ ...ec, day: e.target.value })}
          className={small}
        >
          <option value="">{t("Day")}</option>
          {Array.from({ length: maxDay }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
        <select
          aria-label={t("Month")}
          value={ec.month}
          onChange={(e) => fromEc({ ...ec, month: e.target.value })}
          className={small}
        >
          <option value="">{t("Month")}</option>
          {ETHIOPIAN_MONTHS.map((m, i) => (
            <option key={m.en} value={i + 1}>
              {lang === "am" ? m.am : m.en}
            </option>
          ))}
        </select>
        <input
          aria-label={t("Year")}
          inputMode="numeric"
          placeholder={t("Year")}
          value={ec.year}
          onChange={(e) => fromEc({ ...ec, year: e.target.value.replace(/\D/g, "").slice(0, 4) })}
          className={cn(small, "w-20")}
        />
        {ecError ? (
          <span role="alert" className="text-[11px] font-semibold text-[#D70015]">
            {ecError}
          </span>
        ) : null}
      </fieldset>
    </div>
  );
}
