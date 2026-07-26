import type { PricePoint } from "../types";

export interface MergedPoint {
  date: string;
  first: number;
  second: number;
}

/**
 * Merges two series by date (outer join), forward-filling gaps, then keeps
 * only dates where both series have a value — mirroring the notebook's
 * `merge(..., how="outer").ffill()` followed by `dropna()`.
 */
export function mergeSeries(first: PricePoint[], second: PricePoint[]): MergedPoint[] {
  const dates = Array.from(new Set([...first.map((p) => p.date), ...second.map((p) => p.date)])).sort();

  const firstByDate = new Map(first.map((p) => [p.date, p.close]));
  const secondByDate = new Map(second.map((p) => [p.date, p.close]));

  const merged: MergedPoint[] = [];
  let lastFirst: number | undefined;
  let lastSecond: number | undefined;

  for (const date of dates) {
    lastFirst = firstByDate.get(date) ?? lastFirst;
    lastSecond = secondByDate.get(date) ?? lastSecond;
    if (lastFirst !== undefined && lastSecond !== undefined) {
      merged.push({ date, first: lastFirst, second: lastSecond });
    }
  }

  return merged;
}
