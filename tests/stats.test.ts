import { describe, expect, it } from "vitest";
import { histogram, mean, median } from "../src/analysis/stats";

describe("mean", () => {
  it("should_averageValues_when_seriesIsNonEmpty", () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5);
  });

  it("should_returnNaN_when_seriesIsEmpty", () => {
    expect(mean([])).toBeNaN();
  });
});

describe("median", () => {
  it("should_returnMiddleValue_when_countIsOdd", () => {
    expect(median([5, 1, 3])).toBe(3);
  });

  it("should_averageMiddlePair_when_countIsEven", () => {
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it("should_leaveInputUnchanged_when_sorting", () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe("histogram", () => {
  it("should_bucketValuesIntoEqualWidthBins_when_binCountIsGiven", () => {
    const bins = histogram([0, 1, 2, 3, 4], 2);

    expect(bins).toEqual([
      { start: 0, end: 2, count: 2 },
      { start: 2, end: 4, count: 3 },
    ]);
  });

  it("should_countMaximumInLastBin_when_valueEqualsUpperBound", () => {
    const bins = histogram([0, 10], 5);

    expect(bins[4].count).toBe(1);
    expect(bins.reduce((sum, b) => sum + b.count, 0)).toBe(2);
  });

  it("should_ignoreNonFiniteValues_when_seriesContainsNaN", () => {
    const bins = histogram([1, NaN, 2, Infinity], 2);

    expect(bins.reduce((sum, b) => sum + b.count, 0)).toBe(2);
  });

  it("should_returnEmpty_when_noFiniteValuesExist", () => {
    expect(histogram([NaN, Infinity], 10)).toEqual([]);
  });
});
