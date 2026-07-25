import { describe, expect, it } from "vitest";
import { computeRatioSeries, meanRatio } from "../src/analysis/ratio";

describe("ratio analysis", () => {
  const merged = [
    { date: "2026-01-01", gold: 100, index: 10 },
    { date: "2026-01-02", gold: 200, index: 20 },
  ];

  it("should_divideGoldByIndex_when_computingRatioSeries", () => {
    expect(computeRatioSeries(merged)).toEqual([
      { date: "2026-01-01", ratio: 10 },
      { date: "2026-01-02", ratio: 10 },
    ]);
  });

  it("should_averageRatios_when_computingMeanRatio", () => {
    const ratios = computeRatioSeries(merged);
    expect(meanRatio(ratios)).toBe(10);
  });
});
