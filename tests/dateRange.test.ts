import { describe, expect, it } from "vitest";
import { DEFAULT_RANGE_VALUE, RANGE_OPTIONS, filterByRange, findRange, subtractMonths } from "../src/analysis/dateRange";

function series(dates: string[]): { date: string; close: number }[] {
  return dates.map((date, index) => ({ date, close: 100 + index }));
}

describe("subtractMonths", () => {
  it("should_keep_day_when_target_month_is_long_enough", () => {
    expect(subtractMonths("2026-07-26", 6)).toBe("2026-01-26");
  });

  it("should_clamp_day_when_target_month_is_shorter", () => {
    expect(subtractMonths("2026-03-31", 1)).toBe("2026-02-28");
  });

  it("should_cross_year_boundary_when_window_exceeds_current_month", () => {
    expect(subtractMonths("2026-02-10", 12)).toBe("2025-02-10");
  });
});

describe("filterByRange", () => {
  it("should_return_all_points_when_range_is_null", () => {
    const points = series(["2020-01-01", "2026-07-26"]);
    expect(filterByRange(points, null)).toEqual(points);
  });

  it("should_anchor_window_at_last_point_when_series_is_stale", () => {
    const points = series(["2019-01-01", "2020-01-15", "2020-06-01"]);
    expect(filterByRange(points, 12).map((p) => p.date)).toEqual(["2020-01-15", "2020-06-01"]);
  });

  it("should_include_the_cutoff_day_when_a_point_falls_on_it", () => {
    const points = series(["2026-01-26", "2026-07-26"]);
    expect(filterByRange(points, 6)).toHaveLength(2);
  });

  it("should_return_empty_when_input_is_empty", () => {
    expect(filterByRange([], 12)).toEqual([]);
  });
});

describe("findRange", () => {
  it("should_resolve_the_default_value_to_the_whole_history", () => {
    expect(findRange(DEFAULT_RANGE_VALUE)?.months).toBeNull();
  });

  it("should_return_undefined_when_value_is_unknown", () => {
    expect(findRange("42")).toBeUndefined();
  });

  it("should_expose_unique_values_for_every_option", () => {
    expect(new Set(RANGE_OPTIONS.map((o) => o.value)).size).toBe(RANGE_OPTIONS.length);
  });
});
