import { InvalidDateError } from "../types";

export interface JalaliDate {
  year: number;
  month: number; // 1-12, Farvardin = 1
  day: number; // 1-31
}

/**
 * Every date the app handles is a calendar day with no time-of-day meaning, so
 * conversion is pinned to UTC noon — far enough from either midnight that no
 * host timezone can shift the result onto a neighbouring day.
 */
const JALALI_PARTS = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "UTC",
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const formatCache = new Map<string, string>();

/** Converts an ISO `yyyy-mm-dd` Gregorian date to its Jalali (Solar Hijri) parts. */
export function toJalali(isoDate: string): JalaliDate {
  if (!ISO_DATE.test(isoDate)) throw new InvalidDateError(isoDate);
  const timestamp = Date.parse(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(timestamp)) throw new InvalidDateError(isoDate);

  const parts = JALALI_PARTS.formatToParts(new Date(timestamp));
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new InvalidDateError(isoDate);
    return Number.parseInt(part.value, 10);
  };

  return { year: read("year"), month: read("month"), day: read("day") };
}

/**
 * Formats an ISO Gregorian date as Jalali `yyyy/mm/dd`. Zero-padded on purpose:
 * the result sorts and range-compares lexicographically like the ISO input, so
 * table sorting and filtering keep working on the formatted string.
 */
export function formatJalali(isoDate: string): string {
  const cached = formatCache.get(isoDate);
  if (cached !== undefined) return cached;

  const { year, month, day } = toJalali(isoDate);
  const formatted = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
  formatCache.set(isoDate, formatted);
  return formatted;
}

/** Formats every date once; convenience for mapping a whole series. */
export function formatJalaliAll(isoDates: string[]): string[] {
  return isoDates.map(formatJalali);
}
