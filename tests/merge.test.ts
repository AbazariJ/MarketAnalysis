import { describe, expect, it } from "vitest";
import { mergeSeries } from "../src/analysis/merge";

describe("mergeSeries", () => {
  it("should_forwardFillAndIntersect_when_datesDontFullyOverlap", () => {
    const gold = [
      { date: "2026-01-01", close: 100 },
      { date: "2026-01-03", close: 110 },
    ];
    const index = [
      { date: "2026-01-02", close: 10 },
      { date: "2026-01-03", close: 12 },
    ];

    const merged = mergeSeries(gold, index);

    expect(merged).toEqual([
      { date: "2026-01-02", gold: 100, index: 10 },
      { date: "2026-01-03", gold: 110, index: 12 },
    ]);
  });
});
