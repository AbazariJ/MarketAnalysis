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

export const JALALI_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

/** Saturday-first, matching the Iranian week. */
export const JALALI_WEEKDAY_INITIALS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const MS_PER_DAY = 86_400_000;
/** Gregorian date of Jalali 1/1/1, the anchor the day-count search starts from. */
const JALALI_EPOCH_UTC = Date.UTC(622, 2, 22, 12);

function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/** Days elapsed in a Jalali year before the given month: months 1-6 have 31 days, 7-11 have 30. */
function daysBeforeMonth(month: number): number {
  return month <= 7 ? (month - 1) * 31 : 186 + (month - 7) * 30;
}

/** Signed day distance between two Jalali dates, exact within a year and near-exact across years. */
function approximateDayDelta(target: JalaliDate, current: JalaliDate): number {
  const yearDelta = (target.year - current.year) * 365.2422;
  const dayOfYearDelta = daysBeforeMonth(target.month) + target.day - (daysBeforeMonth(current.month) + current.day);
  return Math.round(yearDelta + dayOfYearDelta);
}

function isSameJalaliDate(a: JalaliDate, b: JalaliDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/**
 * Converts a Jalali date to its ISO Gregorian equivalent. Rather than encode
 * the 33-year leap cycle a second time, this starts from an estimate and steps
 * toward the target using `toJalali` as the oracle — the same calendar the rest
 * of the app reads, so the two can never disagree.
 */
export function fromJalali(jalali: JalaliDate): string {
  const estimateDays = Math.round((jalali.year - 1) * 365.2422) + daysBeforeMonth(jalali.month) + (jalali.day - 1);
  let timestamp = JALALI_EPOCH_UTC + estimateDays * MS_PER_DAY;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const delta = approximateDayDelta(jalali, toJalali(toIso(timestamp)));
    if (delta === 0) break;
    timestamp += delta * MS_PER_DAY;
  }

  // The stepping above lands on the day itself once the estimate is inside the
  // right year; a short scan absorbs any residual rounding rather than leaving
  // the caller with a silently wrong date.
  for (let offset = -3; offset <= 3; offset += 1) {
    const iso = toIso(timestamp + offset * MS_PER_DAY);
    if (isSameJalaliDate(toJalali(iso), jalali)) return iso;
  }
  throw new InvalidDateError(`${jalali.year}/${jalali.month}/${jalali.day}`);
}

/** Number of days in a Jalali month — 29 or 30 for Esfand, depending on the leap year. */
export function jalaliMonthLength(year: number, month: number): number {
  if (month <= 6) return 31;
  if (month <= 11) return 30;
  return isJalaliLeapYear(year) ? 30 : 29;
}

/** A Jalali year is leap exactly when Esfand 30 exists in it. */
export function isJalaliLeapYear(year: number): boolean {
  try {
    return isSameJalaliDate(toJalali(fromJalali({ year, month: 12, day: 30 })), { year, month: 12, day: 30 });
  } catch {
    return false;
  }
}

/** Parses user-typed `yyyy/mm/dd` (also accepting `-` separators) into an ISO date, or null. */
export function parseJalaliInput(text: string): string | null {
  const match = text.trim().match(/^(\d{3,4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return null;

  const jalali = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (jalali.month < 1 || jalali.month > 12) return null;
  if (jalali.day < 1 || jalali.day > jalaliMonthLength(jalali.year, jalali.month)) return null;

  try {
    return fromJalali(jalali);
  } catch {
    return null;
  }
}
