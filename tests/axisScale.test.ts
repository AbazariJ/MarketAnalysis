import { describe, it, expect } from "vitest";
import { alignedLogRanges } from "../src/analysis/axisScale";

/** Fraction of the axis (0 = bottom, 1 = top) at which `value` is drawn. */
function positionOf(value: number, [low, high]: [number, number]): number {
  return (Math.log10(value) - low) / (high - low);
}

describe("alignedLogRanges", () => {
  it("should_placeFirstPointsAtSameHeight_when_seriesStartAtDifferentMagnitudes", () => {
    const first = [1_000, 2_000, 1_500];
    const second = [2_000_000, 3_000_000, 1_800_000];

    const ranges = alignedLogRanges(first, second)!;

    expect(positionOf(first[0], ranges.first)).toBeCloseTo(positionOf(second[0], ranges.second), 10);
  });

  it("should_spanEqualLogDistance_when_buildingBothAxes", () => {
    const ranges = alignedLogRanges([1_000, 4_000], [50, 75])!;

    const firstSpan = ranges.first[1] - ranges.first[0];
    const secondSpan = ranges.second[1] - ranges.second[0];
    expect(firstSpan).toBeCloseTo(secondSpan, 10);
  });

  it("should_mapEqualPercentMovesToEqualDistance_when_axesAreAligned", () => {
    const ranges = alignedLogRanges([100, 300], [7, 21])!;

    // A doubling on either axis must cover the same fraction of the plot.
    const firstDouble = positionOf(200, ranges.first) - positionOf(100, ranges.first);
    const secondDouble = positionOf(14, ranges.second) - positionOf(7, ranges.second);
    expect(firstDouble).toBeCloseTo(secondDouble, 10);
  });

  it("should_coverEveryPointOfBothSeries_when_rangesAreComputed", () => {
    const first = [1_000, 5_000, 400];
    const second = [50, 60, 20];

    const ranges = alignedLogRanges(first, second)!;

    for (const v of first) expect(positionOf(v, ranges.first)).toBeGreaterThanOrEqual(0);
    for (const v of first) expect(positionOf(v, ranges.first)).toBeLessThanOrEqual(1);
    for (const v of second) expect(positionOf(v, ranges.second)).toBeGreaterThanOrEqual(0);
    for (const v of second) expect(positionOf(v, ranges.second)).toBeLessThanOrEqual(1);
  });

  it("should_produceNonZeroSpan_when_seriesAreFlat", () => {
    const ranges = alignedLogRanges([100, 100], [7, 7])!;

    expect(ranges.first[1]).toBeGreaterThan(ranges.first[0]);
    expect(positionOf(100, ranges.first)).toBeCloseTo(positionOf(7, ranges.second), 10);
  });

  it("should_returnNull_when_seriesIsEmptyOrFirstValueIsNonPositive", () => {
    expect(alignedLogRanges([], [1, 2])).toBeNull();
    expect(alignedLogRanges([1, 2], [])).toBeNull();
    expect(alignedLogRanges([0, 2], [1, 2])).toBeNull();
    expect(alignedLogRanges([-5, 2], [1, 2])).toBeNull();
  });
});
