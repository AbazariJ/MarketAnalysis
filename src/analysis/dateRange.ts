export interface RangeOption {
  /** Value used in the select element; `all` means "no filtering". */
  value: string;
  label: string;
  /** Window length in months, or `null` for the whole history. */
  months: number | null;
}

/** Longest window first, so the default (`all`) is also the first option. */
export const RANGE_OPTIONS: RangeOption[] = [
  { value: "all", label: "همه دوره", months: null },
  { value: "120", label: "10 سال", months: 120 },
  { value: "60", label: "5 سال", months: 60 },
  { value: "36", label: "3 سال", months: 36 },
  { value: "12", label: "1 سال", months: 12 },
  { value: "6", label: "6 ماه", months: 6 },
  { value: "3", label: "3 ماه", months: 3 },
  { value: "1", label: "1 ماه", months: 1 },
];

export const DEFAULT_RANGE_VALUE = "all";

export function findRange(value: string): RangeOption | undefined {
  return RANGE_OPTIONS.find((option) => option.value === value);
}

/**
 * Subtracts whole months from an ISO date, clamping the day to the target
 * month's length so 2026-03-31 minus one month is 2026-02-28, not 2026-03-03.
 */
export function subtractMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const totalMonths = year * 12 + (month - 1) - months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = totalMonths - targetYear * 12 + 1;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(day, daysInTargetMonth);
  return `${String(targetYear).padStart(4, "0")}-${String(targetMonth).padStart(2, "0")}-${String(targetDay).padStart(2, "0")}`;
}

/**
 * Keeps the last `months` of a date-sorted series. The window is anchored at
 * the newest row rather than today, so a series that stopped updating still
 * shows data instead of an empty chart.
 */
export function filterByRange<T extends { date: string }>(points: T[], months: number | null): T[] {
  if (months === null || points.length === 0) return points;

  const anchor = points[points.length - 1].date;
  const cutoff = subtractMonths(anchor, months);
  return points.filter((point) => point.date >= cutoff);
}
