// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initJalaliDatePicker } from "../src/ui/jalaliDatePicker";

function setup(bounds: { min: string; max: string } = { min: "2015-01-01", max: "2026-07-26" }) {
  document.body.innerHTML = `<div class="field field-date"><input id="d" type="text" /></div>`;
  const input = document.querySelector<HTMLInputElement>("#d")!;
  const onChange = vi.fn();
  const picker = initJalaliDatePicker({ input, onChange });
  picker.setBounds(bounds.min, bounds.max);
  return { input, onChange, picker, popup: () => document.querySelector<HTMLElement>(".jalali-picker")! };
}

function click(el: Element | null): void {
  expect(el).not.toBeNull();
  (el as HTMLElement).click();
}

function title(popup: HTMLElement): string {
  return popup.querySelector(".jalali-picker-title")!.textContent!.trim();
}

describe("jalaliDatePicker", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("should_open_the_calendar_when_input_is_clicked", () => {
    const { input, popup } = setup();
    click(input);
    expect(popup().hidden).toBe(false);
  });

  it("should_stay_open_when_navigating_to_the_previous_month", () => {
    const { input, popup, picker } = setup();
    picker.setValue("2026-07-26"); // 1405/05/04
    click(input);
    const before = title(popup());

    click(popup().querySelector('[data-shift="-1"]'));

    expect(popup().hidden).toBe(false);
    expect(title(popup())).not.toBe(before);
  });

  it("should_step_a_whole_year_when_the_double_arrow_is_clicked", () => {
    const { input, popup, picker } = setup();
    picker.setValue("2026-07-26"); // 1405/05
    click(input);

    click(popup().querySelector('[data-shift="-12"]'));

    expect(popup().hidden).toBe(false);
    expect(title(popup())).toBe("مرداد 1404");
  });

  it("should_pick_a_day_and_report_it_as_an_iso_date", () => {
    const { input, popup, onChange, picker } = setup();
    picker.setValue("2026-07-26");
    click(input);

    click(popup().querySelector('[data-iso="2026-07-23"]')); // 1405/05/01

    expect(picker.getValue()).toBe("2026-07-23");
    expect(input.value).toBe("1405/05/01");
    expect(onChange).toHaveBeenCalledWith("2026-07-23");
    expect(popup().hidden).toBe(true);
  });

  it("should_close_when_a_click_lands_outside_the_calendar", () => {
    const { input, popup } = setup();
    click(input);
    expect(popup().hidden).toBe(false);

    click(document.body);

    expect(popup().hidden).toBe(true);
  });

  it("should_open_a_month_chooser_when_the_title_is_clicked", () => {
    const { input, popup, picker } = setup();
    picker.setValue("2026-07-26");
    click(input);

    click(popup().querySelector(".jalali-picker-title"));

    expect(popup().querySelectorAll("[data-month]")).toHaveLength(12);
    click(popup().querySelector('[data-month="1"]'));
    expect(title(popup())).toBe("فروردین 1405");
    expect(popup().querySelectorAll("[data-iso]").length).toBeGreaterThan(0);
  });

  it("should_open_a_year_chooser_when_the_title_is_clicked_twice", () => {
    const { input, popup, picker } = setup();
    picker.setValue("2026-07-26");
    click(input);

    click(popup().querySelector(".jalali-picker-title"));
    click(popup().querySelector(".jalali-picker-title"));

    const years = popup().querySelectorAll("[data-year]");
    expect(years.length).toBeGreaterThan(0);
    click(popup().querySelector('[data-year="1400"]'));
    expect(title(popup())).toContain("1400");
  });

  it("should_disable_days_outside_the_bounds", () => {
    const { input, popup, picker } = setup({ min: "2026-07-23", max: "2026-07-26" });
    picker.setValue("2026-07-26");
    click(input);

    expect(popup().querySelector<HTMLButtonElement>('[data-iso="2026-07-22"]')?.disabled ?? true).toBe(true);
    expect(popup().querySelector<HTMLButtonElement>('[data-iso="2026-07-24"]')!.disabled).toBe(false);
  });

  it("should_clear_the_value_when_the_clear_button_is_used", () => {
    const { input, popup, onChange, picker } = setup();
    picker.setValue("2026-07-26");
    click(input);

    click(popup().querySelector(".jalali-picker-clear"));

    expect(picker.getValue()).toBeNull();
    expect(input.value).toBe("");
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("should_snap_back_to_the_last_good_value_when_typed_text_is_invalid", () => {
    const { input, picker } = setup();
    picker.setValue("2026-07-26");

    input.value = "بی‌معنی";
    input.dispatchEvent(new Event("change"));

    expect(picker.getValue()).toBe("2026-07-26");
    expect(input.value).toBe("1405/05/04");
  });

  it("should_accept_a_typed_jalali_date", () => {
    const { input, picker, onChange } = setup();

    input.value = "1404/01/01";
    input.dispatchEvent(new Event("change"));

    expect(picker.getValue()).toBe("2025-03-21");
    expect(onChange).toHaveBeenCalledWith("2025-03-21");
  });
});
