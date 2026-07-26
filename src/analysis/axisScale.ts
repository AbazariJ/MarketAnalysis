export interface AlignedLogRanges {
  asset: [number, number]; // log10 bounds for the asset (left) axis
  index: [number, number]; // log10 bounds for the index (right) axis
}

/**
 * Builds log10 bounds for two independent y-axes so that, in the default view,
 * both series start at the same height and equal percentage moves cover equal
 * vertical distance.
 *
 * Both axes are given the *same* ratio window `[low, high]` measured against
 * their own first value. On a log axis a ratio maps to a fixed distance, so an
 * identical window length means a doubling of the asset and a doubling of the
 * index span the same number of pixels, and each series' first point sits at
 * the same fraction of the axis.
 *
 * Returns `null` when the series cannot be placed on a log axis at all (empty,
 * or a non-positive first value).
 */
export function alignedLogRanges(assetValues: number[], indexValues: number[], paddingRatio = 0.05): AlignedLogRanges | null {
  const assetFirst = assetValues[0];
  const indexFirst = indexValues[0];
  if (!(assetFirst > 0) || !(indexFirst > 0)) return null;

  const ratios = [
    ...assetValues.filter((v) => v > 0 && Number.isFinite(v)).map((v) => v / assetFirst),
    ...indexValues.filter((v) => v > 0 && Number.isFinite(v)).map((v) => v / indexFirst),
  ];
  if (ratios.length === 0) return null;

  const logLow = Math.log10(Math.min(...ratios));
  const logHigh = Math.log10(Math.max(...ratios));
  const padding = (logHigh - logLow) * paddingRatio || 0.05;

  const shift = (first: number): [number, number] => [
    Math.log10(first) + logLow - padding,
    Math.log10(first) + logHigh + padding,
  ];

  return { asset: shift(assetFirst), index: shift(indexFirst) };
}
