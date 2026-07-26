import { describe, it, expect } from "vitest";
import { alignedLogRanges } from "../src/analysis/axisScale";

/** Fraction of the axis (0 = bottom, 1 = top) at which `value` is drawn. */
function positionOf(value: number, [low, high]: [number, number]): number {
  return (Math.log10(value) - low) / (high - low);
}

describe("alignedLogRanges", () => {
  it("should_placeFirstPointsAtSameHeight_when_seriesStartAtDifferentMagnitudes", () => {
    const asset = [1_000, 2_000, 1_500];
    const index = [2_000_000, 3_000_000, 1_800_000];

    const ranges = alignedLogRanges(asset, index)!;

    expect(positionOf(asset[0], ranges.asset)).toBeCloseTo(positionOf(index[0], ranges.index), 10);
  });

  it("should_spanEqualLogDistance_when_buildingBothAxes", () => {
    const ranges = alignedLogRanges([1_000, 4_000], [50, 75])!;

    const assetSpan = ranges.asset[1] - ranges.asset[0];
    const indexSpan = ranges.index[1] - ranges.index[0];
    expect(assetSpan).toBeCloseTo(indexSpan, 10);
  });

  it("should_mapEqualPercentMovesToEqualDistance_when_axesAreAligned", () => {
    const ranges = alignedLogRanges([100, 300], [7, 21])!;

    // A doubling on either axis must cover the same fraction of the plot.
    const assetDouble = positionOf(200, ranges.asset) - positionOf(100, ranges.asset);
    const indexDouble = positionOf(14, ranges.index) - positionOf(7, ranges.index);
    expect(assetDouble).toBeCloseTo(indexDouble, 10);
  });

  it("should_coverEveryPointOfBothSeries_when_rangesAreComputed", () => {
    const asset = [1_000, 5_000, 400];
    const index = [50, 60, 20];

    const ranges = alignedLogRanges(asset, index)!;

    for (const v of asset) expect(positionOf(v, ranges.asset)).toBeGreaterThanOrEqual(0);
    for (const v of asset) expect(positionOf(v, ranges.asset)).toBeLessThanOrEqual(1);
    for (const v of index) expect(positionOf(v, ranges.index)).toBeGreaterThanOrEqual(0);
    for (const v of index) expect(positionOf(v, ranges.index)).toBeLessThanOrEqual(1);
  });

  it("should_produceNonZeroSpan_when_seriesAreFlat", () => {
    const ranges = alignedLogRanges([100, 100], [7, 7])!;

    expect(ranges.asset[1]).toBeGreaterThan(ranges.asset[0]);
    expect(positionOf(100, ranges.asset)).toBeCloseTo(positionOf(7, ranges.index), 10);
  });

  it("should_returnNull_when_seriesIsEmptyOrFirstValueIsNonPositive", () => {
    expect(alignedLogRanges([], [1, 2])).toBeNull();
    expect(alignedLogRanges([1, 2], [])).toBeNull();
    expect(alignedLogRanges([0, 2], [1, 2])).toBeNull();
    expect(alignedLogRanges([-5, 2], [1, 2])).toBeNull();
  });
});
