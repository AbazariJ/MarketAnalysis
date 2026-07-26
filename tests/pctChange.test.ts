import { describe, expect, it } from "vitest";
import { computePctChangeSeries } from "../src/analysis/pctChange";
import type { MergedPoint } from "../src/analysis/merge";

function buildMerged(entries: [date: string, first: number, second: number][]): MergedPoint[] {
  return entries.map(([date, first, second]) => ({ date, first, second }));
}

describe("computePctChangeSeries", () => {
  it("should_computeTrailingChange_when_lookbackWindowIsAvailable", () => {
    const merged = buildMerged([
      ["2026-01-01", 100, 10],
      ["2026-01-03", 150, 5],
    ]);

    const series = computePctChangeSeries(merged, 2);

    expect(series).toEqual([{ date: "2026-01-03", firstPct: 0.5, secondPct: -0.5 }]);
  });

  it("should_dropLeadingDates_when_lookbackWindowIsIncomplete", () => {
    const merged = buildMerged([
      ["2026-01-01", 100, 10],
      ["2026-01-02", 110, 11],
      ["2026-01-03", 120, 12],
    ]);

    const series = computePctChangeSeries(merged, 2);

    expect(series.map((p) => p.date)).toEqual(["2026-01-03"]);
  });

  it("should_forwardFillNonTradingDays_when_calendarHasGaps", () => {
    // 2026-01-02 and 2026-01-03 have no observation, so both carry 100 / 10
    // forward; the change on 2026-01-04 is measured against 2026-01-02.
    const merged = buildMerged([
      ["2026-01-01", 100, 10],
      ["2026-01-04", 200, 30],
    ]);

    const series = computePctChangeSeries(merged, 2);

    expect(series).toEqual([{ date: "2026-01-04", firstPct: 1, secondPct: 2 }]);
  });

  it("should_returnEmpty_when_seriesIsEmptyOrWindowIsNonPositive", () => {
    expect(computePctChangeSeries([], 30)).toEqual([]);
    expect(computePctChangeSeries(buildMerged([["2026-01-01", 100, 10]]), 0)).toEqual([]);
  });
});
