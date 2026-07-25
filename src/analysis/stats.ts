export interface HistogramBin {
  start: number;
  end: number;
  count: number;
}

export function mean(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/**
 * Buckets `values` into `binCount` equal-width bins spanning [min, max].
 * The notebook pins bin edges to hand-picked ranges (`np.linspace(-50, 800, 100)`);
 * deriving them from the data keeps the chart honest for any asset/index pair.
 */
export function histogram(values: number[], binCount = 40): HistogramBin[] {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0 || binCount <= 0) return [];

  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const width = (max - min) / binCount || 1;

  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    start: min + i * width,
    end: min + (i + 1) * width,
    count: 0,
  }));

  for (const value of finite) {
    const slot = Math.min(Math.floor((value - min) / width), binCount - 1);
    bins[slot].count++;
  }

  return bins;
}
