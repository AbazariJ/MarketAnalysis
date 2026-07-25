import type { MergedPoint } from "./merge";

export interface PctChangePoint {
  date: string;
  assetPct: number; // fractional change, e.g. 0.25 = +25%
  indexPct: number;
}

const MS_PER_DAY = 86_400_000;

/**
 * Reindexes the merged series onto a continuous daily calendar (forward-filling
 * non-trading days), then computes the trailing `days`-calendar-day percent
 * change for both asset and index, sampled back at the original trading dates —
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

  const dailyAsset = new Array<number>(dayCount);
  const dailyIndex = new Array<number>(dayCount);

  let previousAsset = merged[0].gold;
  let previousIndex = merged[0].index;
  let cursor = 0;
  for (const point of merged) {
    const offset = offsetOf(point.date);
    for (let i = cursor; i < offset; i++) {
      dailyAsset[i] = previousAsset;
      dailyIndex[i] = previousIndex;
    }
    dailyAsset[offset] = point.gold;
    dailyIndex[offset] = point.index;
    previousAsset = point.gold;
    previousIndex = point.index;
    cursor = offset + 1;
  }

  const series: PctChangePoint[] = [];
  for (const point of merged) {
    const pastOffset = offsetOf(point.date) - days;
    if (pastOffset < 0) continue;
    const pastAsset = dailyAsset[pastOffset];
    const pastIndex = dailyIndex[pastOffset];
    if (!pastAsset || !pastIndex) continue;
    series.push({
      date: point.date,
      assetPct: point.gold / pastAsset - 1,
      indexPct: point.index / pastIndex - 1,
    });
  }

  return series;
}
