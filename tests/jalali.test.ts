import { describe, expect, it } from "vitest";
import { formatJalali, toJalali } from "../src/analysis/jalali";
import { InvalidDateError } from "../src/types";

describe("toJalali", () => {
  it("should_return_first_of_farvardin_when_nowruz", () => {
    expect(toJalali("2026-03-21")).toEqual({ year: 1405, month: 1, day: 1 });
  });

  it("should_return_last_day_of_year_when_day_before_nowruz", () => {
    expect(toJalali("2026-03-20")).toEqual({ year: 1404, month: 12, day: 29 });
  });

  it("should_return_esfand_thirty_when_leap_year", () => {
    // 1403 is a Jalali leap year, so Esfand has 30 days.
    expect(toJalali("2025-03-20")).toEqual({ year: 1403, month: 12, day: 30 });
  });

  it("should_convert_a_mid_year_date_when_second_half_of_year", () => {
    expect(toJalali("2026-07-26")).toEqual({ year: 1405, month: 5, day: 4 });
  });

  it("should_throw_invalid_date_error_when_input_is_not_iso", () => {
    expect(() => toJalali("1405/05/04")).toThrow(InvalidDateError);
  });
});

describe("formatJalali", () => {
  it("should_zero_pad_month_and_day_when_single_digit", () => {
    expect(formatJalali("2026-03-21")).toBe("1405/01/01");
  });

  it("should_sort_lexicographically_in_chronological_order_when_compared", () => {
    const isoDates = ["2026-03-20", "2026-03-21", "2026-07-26"];
    const formatted = isoDates.map(formatJalali);
    expect([...formatted].sort()).toEqual(formatted);
  });

  it("should_return_same_result_when_called_twice", () => {
    expect(formatJalali("2026-07-26")).toBe(formatJalali("2026-07-26"));
  });
});
