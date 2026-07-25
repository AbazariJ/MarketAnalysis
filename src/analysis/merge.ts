import type { PricePoint } from "../types";

export interface MergedPoint {
  date: string;
  gold: number;
  index: number;
}

/**
 * Merges two series by date (outer join), forward-filling gaps, then keeps
 * only dates where both series have a value — mirroring the notebook's
 * `merge(..., how="outer").ffill()` followed by `dropna()`.
 */
export function mergeSeries(gold: PricePoint[], index: PricePoint[]): MergedPoint[] {
  const dates = Array.from(new Set([...gold.map((p) => p.date), ...index.map((p) => p.date)])).sort();

  const goldByDate = new Map(gold.map((p) => [p.date, p.close]));
  const indexByDate = new Map(index.map((p) => [p.date, p.close]));

  const merged: MergedPoint[] = [];
  let lastGold: number | undefined;
  let lastIndex: number | undefined;

  for (const date of dates) {
    lastGold = goldByDate.get(date) ?? lastGold;
    lastIndex = indexByDate.get(date) ?? lastIndex;
    if (lastGold !== undefined && lastIndex !== undefined) {
      merged.push({ date, gold: lastGold, index: lastIndex });
    }
  }

  return merged;
}
