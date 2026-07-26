import { describe, expect, it } from "vitest";
import { mergeSeries } from "../src/analysis/merge";

describe("mergeSeries", () => {
  it("should_forwardFillAndIntersect_when_datesDontFullyOverlap", () => {
    const first = [
      { date: "2026-01-01", close: 100 },
      { date: "2026-01-03", close: 110 },
    ];
    const second = [
      { date: "2026-01-02", close: 10 },
      { date: "2026-01-03", close: 12 },
    ];

    const merged = mergeSeries(first, second);

    expect(merged).toEqual([
      { date: "2026-01-02", first: 100, second: 10 },
      { date: "2026-01-03", first: 110, second: 12 },
    ]);
  });

  it("should_pairEveryDateWithItself_when_bothSlotsHoldTheSameSeries", () => {
    const series = [
      { date: "2026-01-01", close: 100 },
      { date: "2026-01-02", close: 120 },
    ];

    expect(mergeSeries(series, series)).toEqual([
      { date: "2026-01-01", first: 100, second: 100 },
      { date: "2026-01-02", first: 120, second: 120 },
    ]);
  });
});
