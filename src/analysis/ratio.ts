import type { MergedPoint } from "./merge";

export interface RatioPoint {
  date: string;
  ratio: number;
}

export function computeRatioSeries(merged: MergedPoint[]): RatioPoint[] {
  return merged.map((p) => ({ date: p.date, ratio: p.first / p.second }));
}

export function meanRatio(ratios: RatioPoint[]): number {
  if (ratios.length === 0) return 0;
  return ratios.reduce((sum, p) => sum + p.ratio, 0) / ratios.length;
}
