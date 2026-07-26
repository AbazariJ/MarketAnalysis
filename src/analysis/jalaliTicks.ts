import { toJalali } from "./jalali";

export interface JalaliTicks {
  tickvals: string[]; // ISO Gregorian dates, what a Plotly date axis expects
  ticktext: string[]; // Jalali labels, what the reader sees
}

/** Month counts that read naturally as a tick spacing, coarsest chosen last. */
const MONTH_STEPS = [1, 2, 3, 6, 12, 24, 60, 120, 240];

function addDays(isoDate: string, days: number): string {
  const timestamp = Date.parse(`${isoDate}T12:00:00Z`) + days * 86_400_000;
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Walks the range day by day and returns the ISO date of every Jalali month
 * start it contains. Day-stepping keeps the calendar arithmetic in one place
 * (`toJalali`) instead of reimplementing Jalali month lengths here; a decade of
 * history is only a few thousand cached lookups.
 */
function jalaliMonthStarts(startIso: string, endIso: string): { iso: string; year: number; month: number }[] {
  const starts: { iso: string; year: number; month: number }[] = [];
  for (let iso = startIso; iso <= endIso; iso = addDays(iso, 1)) {
    const jalali = toJalali(iso);
    if (jalali.day === 1) starts.push({ iso, year: jalali.year, month: jalali.month });
  }
  return starts;
}

/**
 * Builds Jalali axis ticks for a Gregorian date span. Ticks land on Jalali
 * month boundaries so labels read as whole months and years; the spacing widens
 * until at most `maxTicks` remain. Spans of a year or more are labelled by year
 * alone, shorter ones as `yyyy/mm`.
 */
export function jalaliDateTicks(startIso: string, endIso: string, maxTicks = 10): JalaliTicks {
  if (startIso > endIso) return { tickvals: [], ticktext: [] };

  const monthStarts = jalaliMonthStarts(startIso, endIso);
  if (monthStarts.length === 0) {
    // Sub-month span: a single tick at the start beats an unlabelled axis.
    const start = toJalali(startIso);
    return { tickvals: [startIso], ticktext: [`${start.year}/${String(start.month).padStart(2, "0")}/${String(start.day).padStart(2, "0")}`] };
  }

  const step = MONTH_STEPS.find((candidate) => monthStarts.length / candidate <= maxTicks) ?? MONTH_STEPS[MONTH_STEPS.length - 1];
  // Anchor on absolute month index so ticks fall on stable boundaries (e.g. a
  // step of 3 always lands on Farvardin/Tir/Mehr/Dey) regardless of the span.
  const selected = monthStarts.filter(({ year, month }) => (year * 12 + (month - 1)) % step === 0);
  const useYearLabels = step >= 12;

  return {
    tickvals: selected.map((tick) => tick.iso),
    ticktext: selected.map((tick) => (useYearLabels ? String(tick.year) : `${tick.year}/${String(tick.month).padStart(2, "0")}`)),
  };
}
