import { describe, expect, it } from "vitest";
import { jalaliDateTicks } from "../src/analysis/jalaliTicks";
import { toJalali } from "../src/analysis/jalali";

describe("jalaliDateTicks", () => {
  it("should_label_every_month_when_span_is_under_a_year", () => {
    const { tickvals, ticktext } = jalaliDateTicks("2026-03-21", "2026-09-21");
    expect(ticktext[0]).toBe("1405/01");
    expect(ticktext).toEqual(["1405/01", "1405/02", "1405/03", "1405/04", "1405/05", "1405/06"]);
    expect(tickvals[0]).toBe("2026-03-21");
  });

  it("should_place_every_tick_on_the_first_of_a_jalali_month", () => {
    const { tickvals } = jalaliDateTicks("2020-01-01", "2026-07-26");
    for (const iso of tickvals) {
      expect(toJalali(iso).day).toBe(1);
    }
  });

  it("should_label_years_only_when_span_covers_many_years", () => {
    const { ticktext } = jalaliDateTicks("2010-01-01", "2026-07-26");
    expect(ticktext.every((label) => /^\d{4}$/.test(label))).toBe(true);
  });

  it("should_keep_tick_count_within_the_limit_when_span_is_long", () => {
    const { tickvals } = jalaliDateTicks("1995-01-01", "2026-07-26", 10);
    expect(tickvals.length).toBeLessThanOrEqual(10);
  });

  it("should_fall_back_to_a_single_full_date_when_span_has_no_month_start", () => {
    const { tickvals, ticktext } = jalaliDateTicks("2026-07-24", "2026-07-26");
    expect(tickvals).toEqual(["2026-07-24"]);
    expect(ticktext).toEqual(["1405/05/02"]);
  });

  it("should_return_no_ticks_when_range_is_inverted", () => {
    expect(jalaliDateTicks("2026-07-26", "2026-01-01").tickvals).toEqual([]);
  });
});
