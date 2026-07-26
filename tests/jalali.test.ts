import { describe, expect, it } from "vitest";
import {
  formatJalali,
  fromJalali,
  isJalaliLeapYear,
  jalaliMonthLength,
  parseJalaliInput,
  toJalali,
} from "../src/analysis/jalali";
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

describe("fromJalali", () => {
  it("should_return_nowruz_gregorian_date_when_first_of_farvardin", () => {
    expect(fromJalali({ year: 1405, month: 1, day: 1 })).toBe("2026-03-21");
  });

  it("should_return_the_leap_day_when_esfand_thirty", () => {
    expect(fromJalali({ year: 1403, month: 12, day: 30 })).toBe("2025-03-20");
  });

  it("should_round_trip_every_month_start_over_a_decade", () => {
    for (let year = 1395; year <= 1405; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        const iso = fromJalali({ year, month, day: 1 });
        expect(toJalali(iso)).toEqual({ year, month, day: 1 });
      }
    }
  });

  it("should_round_trip_consecutive_days_across_a_year_boundary", () => {
    let previous = "";
    for (const day of [28, 29, 30]) {
      const iso = fromJalali({ year: 1403, month: 12, day });
      expect(toJalali(iso).day).toBe(day);
      expect(iso > previous).toBe(true);
      previous = iso;
    }
  });

  it("should_round_trip_every_single_day_over_six_years", () => {
    for (let year = 1400; year <= 1405; year += 1) {
      for (let month = 1; month <= 12; month += 1) {
        for (let day = 1; day <= jalaliMonthLength(year, month); day += 1) {
          expect(toJalali(fromJalali({ year, month, day }))).toEqual({ year, month, day });
        }
      }
    }
  });

  it("should_throw_invalid_date_error_when_the_day_does_not_exist", () => {
    expect(() => fromJalali({ year: 1404, month: 12, day: 30 })).toThrow(InvalidDateError);
  });
});

describe("jalaliMonthLength", () => {
  it("should_return_thirty_one_when_first_half_of_year", () => {
    expect(jalaliMonthLength(1404, 3)).toBe(31);
  });

  it("should_return_thirty_when_second_half_of_year", () => {
    expect(jalaliMonthLength(1404, 8)).toBe(30);
  });

  it("should_return_twenty_nine_when_esfand_of_a_common_year", () => {
    expect(jalaliMonthLength(1404, 12)).toBe(29);
  });

  it("should_return_thirty_when_esfand_of_a_leap_year", () => {
    expect(jalaliMonthLength(1403, 12)).toBe(30);
  });
});

describe("isJalaliLeapYear", () => {
  it("should_identify_1403_as_leap_and_1404_as_common", () => {
    expect(isJalaliLeapYear(1403)).toBe(true);
    expect(isJalaliLeapYear(1404)).toBe(false);
  });
});

describe("parseJalaliInput", () => {
  it("should_parse_slash_separated_input", () => {
    expect(parseJalaliInput("1405/01/01")).toBe("2026-03-21");
  });

  it("should_parse_unpadded_and_dash_separated_input", () => {
    expect(parseJalaliInput("1405-1-1")).toBe("2026-03-21");
  });

  it("should_return_null_when_day_exceeds_month_length", () => {
    expect(parseJalaliInput("1404/12/30")).toBeNull();
  });

  it("should_return_null_when_month_is_out_of_range", () => {
    expect(parseJalaliInput("1404/13/01")).toBeNull();
  });

  it("should_return_null_when_text_is_not_a_date", () => {
    expect(parseJalaliInput("دیروز")).toBeNull();
  });
});
