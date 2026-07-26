export interface AlignedLogRanges {
  first: [number, number]; // log10 bounds for the first series' (left) axis
  second: [number, number]; // log10 bounds for the second series' (right) axis
}

/**
 * Builds log10 bounds for two independent y-axes so that, in the default view,
 * both series start at the same height and equal percentage moves cover equal
 * vertical distance.
 *
 * Both axes are given the *same* ratio window `[low, high]` measured against
 * their own first value. On a log axis a ratio maps to a fixed distance, so an
 * identical window length means a doubling of either series spans the same
 * number of pixels, and each series' first point sits at the same fraction of
 * the axis.
 *
 * Returns `null` when the series cannot be placed on a log axis at all (empty,
 * or a non-positive first value).
 */
export function alignedLogRanges(firstValues: number[], secondValues: number[], paddingRatio = 0.05): AlignedLogRanges | null {
  const firstStart = firstValues[0];
  const secondStart = secondValues[0];
  if (!(firstStart > 0) || !(secondStart > 0)) return null;

  const ratios = [
    ...firstValues.filter((v) => v > 0 && Number.isFinite(v)).map((v) => v / firstStart),
    ...secondValues.filter((v) => v > 0 && Number.isFinite(v)).map((v) => v / secondStart),
  ];
  if (ratios.length === 0) return null;

  const logLow = Math.log10(Math.min(...ratios));
  const logHigh = Math.log10(Math.max(...ratios));
  const padding = (logHigh - logLow) * paddingRatio || 0.05;

  const shift = (start: number): [number, number] => [
    Math.log10(start) + logLow - padding,
    Math.log10(start) + logHigh + padding,
  ];

  return { first: shift(firstStart), second: shift(secondStart) };
}
