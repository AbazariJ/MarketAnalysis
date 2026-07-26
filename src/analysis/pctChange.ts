import type { MergedPoint } from "./merge";

export interface PctChangePoint {
  date: string;
  firstPct: number; // fractional change, e.g. 0.25 = +25%
  secondPct: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * Reindexes the merged series onto a continuous daily calendar (forward-filling
 * non-trading days), then computes the trailing `days`-calendar-day percent
 * change for both series, sampled back at the original trading dates —
 * mirroring the notebook's `df.reindex(date_range(..., freq='D')).ffill()`
 * followed by `shift(days)`. Dates without a full `days` lookback are dropped
 * (they are NaN in pandas).
 */
export function computePctChangeSeries(merged: MergedPoint[], days: number): PctChangePoint[] {
  if (merged.length === 0 || days <= 0) return [];

  const startMs = Date.parse(merged[0].date);
  const endMs = Date.parse(merged[merged.length - 1].date);
  const dayCount = Math.round((endMs - startMs) / MS_PER_DAY) + 1;
  const offsetOf = (date: string) => Math.round((Date.parse(date) - startMs) / MS_PER_DAY);

  const dailyFirst = new Array<number>(dayCount);
  const dailySecond = new Array<number>(dayCount);

  let previousFirst = merged[0].first;
  let previousSecond = merged[0].second;
  let cursor = 0;
  for (const point of merged) {
    const offset = offsetOf(point.date);
    for (let i = cursor; i < offset; i++) {
      dailyFirst[i] = previousFirst;
      dailySecond[i] = previousSecond;
    }
    dailyFirst[offset] = point.first;
    dailySecond[offset] = point.second;
    previousFirst = point.first;
    previousSecond = point.second;
    cursor = offset + 1;
  }

  const series: PctChangePoint[] = [];
  for (const point of merged) {
    const pastOffset = offsetOf(point.date) - days;
    if (pastOffset < 0) continue;
    const pastFirst = dailyFirst[pastOffset];
    const pastSecond = dailySecond[pastOffset];
    if (!pastFirst || !pastSecond) continue;
    series.push({
      date: point.date,
      firstPct: point.first / pastFirst - 1,
      secondPct: point.second / pastSecond - 1,
    });
  }

  return series;
}
