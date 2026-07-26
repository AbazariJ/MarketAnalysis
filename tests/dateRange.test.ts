import { describe, expect, it } from "vitest";
import { availableWindow, clampToAvailable, filterByWindow, resolveWindow } from "../src/analysis/dateRange";

function series(dates: string[]): { date: string; close: number }[] {
  return dates.map((date, index) => ({ date, close: 100 + index }));
}

const AVAILABLE = { start: "2020-01-01", end: "2026-07-26" };

describe("availableWindow", () => {
  it("should_span_first_to_last_row_when_series_has_data", () => {
    expect(availableWindow(series(["2020-01-01", "2023-05-05", "2026-07-26"]))).toEqual(AVAILABLE);
  });

  it("should_return_null_when_series_is_empty", () => {
    expect(availableWindow([])).toBeNull();
  });
});

describe("resolveWindow", () => {
  it("should_use_the_full_span_when_neither_side_is_picked", () => {
    expect(resolveWindow(AVAILABLE, { start: null, end: null })).toEqual(AVAILABLE);
  });

  it("should_keep_the_available_end_when_only_start_is_picked", () => {
    expect(resolveWindow(AVAILABLE, { start: "2024-03-01", end: null })).toEqual({
      start: "2024-03-01",
      end: AVAILABLE.end,
    });
  });

  it("should_keep_the_available_start_when_only_end_is_picked", () => {
    expect(resolveWindow(AVAILABLE, { start: null, end: "2024-03-01" })).toEqual({
      start: AVAILABLE.start,
      end: "2024-03-01",
    });
  });
});

describe("clampToAvailable", () => {
  it("should_return_null_when_nothing_is_picked", () => {
    expect(clampToAvailable(null, AVAILABLE)).toBeNull();
  });

  it("should_pull_up_to_the_start_when_pick_predates_the_data", () => {
    expect(clampToAvailable("2010-01-01", AVAILABLE)).toBe(AVAILABLE.start);
  });

  it("should_pull_back_to_the_end_when_pick_postdates_the_data", () => {
    expect(clampToAvailable("2030-01-01", AVAILABLE)).toBe(AVAILABLE.end);
  });

  it("should_leave_the_pick_untouched_when_inside_the_data", () => {
    expect(clampToAvailable("2024-03-01", AVAILABLE)).toBe("2024-03-01");
  });
});

describe("filterByWindow", () => {
  it("should_include_both_endpoints_when_rows_fall_on_them", () => {
    const points = series(["2020-01-01", "2023-05-05", "2026-07-26"]);
    expect(filterByWindow(points, { start: "2020-01-01", end: "2026-07-26" })).toHaveLength(3);
  });

  it("should_drop_rows_outside_the_window", () => {
    const points = series(["2020-01-01", "2023-05-05", "2026-07-26"]);
    expect(filterByWindow(points, { start: "2021-01-01", end: "2024-01-01" }).map((p) => p.date)).toEqual([
      "2023-05-05",
    ]);
  });

  it("should_return_empty_when_window_covers_no_row", () => {
    expect(filterByWindow(series(["2020-01-01"]), { start: "2021-01-01", end: "2021-02-01" })).toEqual([]);
  });
});
