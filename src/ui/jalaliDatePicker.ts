import {
  JALALI_MONTH_NAMES,
  JALALI_WEEKDAY_INITIALS,
  formatJalali,
  fromJalali,
  jalaliMonthLength,
  parseJalaliInput,
  toJalali,
} from "../analysis/jalali";

export interface JalaliDatePickerController {
  /** The picked day as an ISO Gregorian date, or null when the field is empty. */
  getValue(): string | null;
  /** Sets the field from an ISO date; `null` clears it back to the placeholder. */
  setValue(isoDate: string | null): void;
  /** Restricts which days are selectable; a value outside the new bounds is clamped. */
  setBounds(minIso: string, maxIso: string): void;
}

interface PickerOptions {
  input: HTMLInputElement;
  /** Called whenever the picked value changes, by typing or by clicking a day. */
  onChange(isoDate: string | null): void;
}

/** Clicking the title zooms out: days → months → years, and picking zooms back in. */
type PickerView = "days" | "months" | "years";

/** Year pages are decade-aligned (1400-1409), which reads more naturally than arbitrary blocks. */
const YEARS_PER_PAGE = 10;

/**
 * A dependency-free Jalali calendar attached to a text input. Native
 * `<input type="date">` is Gregorian-only and every off-the-shelf Persian picker
 * we could use pulls in jQuery, which this app does not otherwise need.
 * The input accepts typed `yyyy/mm/dd` too; the calendar is a convenience over it.
 */
export function initJalaliDatePicker(options: PickerOptions): JalaliDatePickerController {
  const { input } = options;
  const popup = document.createElement("div");
  popup.className = "jalali-picker";
  popup.hidden = true;
  input.parentElement!.appendChild(popup);

  let value: string | null = null;
  let minIso = "1000-01-01";
  let maxIso = "3000-01-01";
  let view: PickerView = "days";
  // Which Jalali month the grid is showing; independent of the picked day so the
  // user can browse away and back without losing their selection.
  let viewYear = 0;
  let viewMonth = 0;

  function clampIso(isoDate: string): string {
    if (isoDate < minIso) return minIso;
    if (isoDate > maxIso) return maxIso;
    return isoDate;
  }

  /** Nothing outside the loaded data is selectable, so an empty window cannot be built. */
  function isSelectable(isoDate: string): boolean {
    return isoDate >= minIso && isoDate <= maxIso;
  }

  function setViewToIso(isoDate: string): void {
    const jalali = toJalali(isoDate);
    viewYear = jalali.year;
    viewMonth = jalali.month;
  }

  function setViewMonthIndex(monthIndex: number): void {
    viewYear = Math.floor(monthIndex / 12);
    viewMonth = monthIndex - viewYear * 12 + 1;
  }

  /** The arrows step by whatever the current view shows: a month, a year, or a year page. */
  function shift(direction: number): void {
    if (view === "days") setViewMonthIndex(viewYear * 12 + (viewMonth - 1) + direction);
    else if (view === "months") viewYear += direction;
    else viewYear += direction * YEARS_PER_PAGE;
    render();
  }

  function commit(isoDate: string | null): void {
    value = isoDate;
    input.value = isoDate === null ? "" : formatJalali(isoDate);
    options.onChange(value);
  }

  /** First day of the shown month that the bounds still allow, for month/year buttons. */
  function hasSelectableDay(year: number, month: number): boolean {
    const first = fromJalali({ year, month, day: 1 });
    const last = fromJalali({ year, month, day: jalaliMonthLength(year, month) });
    return last >= minIso && first <= maxIso;
  }

  function hasSelectableMonth(year: number): boolean {
    const first = fromJalali({ year, month: 1, day: 1 });
    const last = fromJalali({ year, month: 12, day: jalaliMonthLength(year, 12) });
    return last >= minIso && first <= maxIso;
  }

  function renderDays(): string {
    const monthStartIso = fromJalali({ year: viewYear, month: viewMonth, day: 1 });
    const weekdayOfFirst = (new Date(`${monthStartIso}T12:00:00Z`).getUTCDay() + 1) % 7; // Saturday = 0
    const dayCount = jalaliMonthLength(viewYear, viewMonth);

    const cells: string[] = JALALI_WEEKDAY_INITIALS.map(
      (initial) => `<span class="jalali-picker-weekday">${initial}</span>`,
    );
    for (let blank = 0; blank < weekdayOfFirst; blank += 1) cells.push(`<span class="jalali-picker-blank"></span>`);
    for (let day = 1; day <= dayCount; day += 1) {
      const iso = fromJalali({ year: viewYear, month: viewMonth, day });
      const selected = iso === value ? " is-selected" : "";
      const disabled = isSelectable(iso) ? "" : " disabled";
      cells.push(`<button type="button" class="jalali-picker-day${selected}" data-iso="${iso}"${disabled}>${day}</button>`);
    }
    return `<div class="jalali-picker-grid">${cells.join("")}</div>`;
  }

  function renderMonths(): string {
    const cells = JALALI_MONTH_NAMES.map((name, index) => {
      const month = index + 1;
      const selected = month === viewMonth ? " is-selected" : "";
      const disabled = hasSelectableDay(viewYear, month) ? "" : " disabled";
      return `<button type="button" class="jalali-picker-cell${selected}" data-month="${month}"${disabled}>${name}</button>`;
    });
    return `<div class="jalali-picker-grid is-wide">${cells.join("")}</div>`;
  }

  function renderYears(): string {
    // Pages are anchored on decade boundaries, so paging back and forth always
    // shows the same blocks of years rather than drifting with the selection.
    const pageStart = Math.floor(viewYear / YEARS_PER_PAGE) * YEARS_PER_PAGE;
    const cells: string[] = [];
    for (let year = pageStart; year < pageStart + YEARS_PER_PAGE; year += 1) {
      const selected = year === viewYear ? " is-selected" : "";
      const disabled = hasSelectableMonth(year) ? "" : " disabled";
      cells.push(`<button type="button" class="jalali-picker-cell${selected}" data-year="${year}"${disabled}>${year}</button>`);
    }
    return `<div class="jalali-picker-grid is-wide">${cells.join("")}</div>`;
  }

  function headTitle(): string {
    if (view === "days") return `${JALALI_MONTH_NAMES[viewMonth - 1]} ${viewYear}`;
    if (view === "months") return String(viewYear);
    const pageStart = Math.floor(viewYear / YEARS_PER_PAGE) * YEARS_PER_PAGE;
    return `${pageStart} – ${pageStart + YEARS_PER_PAGE - 1}`;
  }

  function render(): void {
    const body = view === "days" ? renderDays() : view === "months" ? renderMonths() : renderYears();
    // Glyphs are mirrored for RTL: the right-pointing arrow moves back in time.
    // The year jumps only appear on the day grid, where the arrows step months —
    // in the other views the plain arrows already move a year or a year page.
    const yearJumps = view === "days";
    popup.innerHTML = `
      <div class="jalali-picker-head">
        <button type="button" class="jalali-picker-nav" data-shift="-1" aria-label="قبلی">›</button>
        ${yearJumps ? `<button type="button" class="jalali-picker-nav" data-shift="-12" aria-label="سال قبل">»</button>` : ""}
        <button type="button" class="jalali-picker-title" data-zoom-out="1" aria-label="انتخاب ماه و سال">${headTitle()}</button>
        ${yearJumps ? `<button type="button" class="jalali-picker-nav" data-shift="12" aria-label="سال بعد">«</button>` : ""}
        <button type="button" class="jalali-picker-nav" data-shift="1" aria-label="بعدی">‹</button>
      </div>
      ${body}
      <div class="jalali-picker-foot">
        <button type="button" class="jalali-picker-clear">پاک کردن</button>
      </div>`;
  }

  function openPopup(): void {
    if (!popup.hidden) return;
    view = "days";
    setViewToIso(value ?? clampIso(new Date().toISOString().slice(0, 10)));
    render();
    popup.hidden = false;
  }

  function closePopup(): void {
    popup.hidden = true;
  }

  popup.addEventListener("click", (event) => {
    // Re-rendering detaches the clicked button, which would make the
    // outside-click handler below think the click landed outside the popup and
    // close it. Stopping propagation keeps every in-popup click in-popup.
    event.stopPropagation();

    const target = (event.target as HTMLElement).closest("button");
    if (!target) return;

    if (target.dataset.shift) {
      shift(Number(target.dataset.shift));
      return;
    }
    if (target.dataset.zoomOut) {
      view = view === "days" ? "months" : "years";
      render();
      return;
    }
    if (target.dataset.year) {
      viewYear = Number(target.dataset.year);
      view = "months";
      render();
      return;
    }
    if (target.dataset.month) {
      viewMonth = Number(target.dataset.month);
      view = "days";
      render();
      return;
    }
    if (target.classList.contains("jalali-picker-clear")) {
      commit(null);
      closePopup();
      return;
    }
    if (target.dataset.iso) {
      commit(target.dataset.iso);
      closePopup();
    }
  });

  input.addEventListener("focus", openPopup);
  input.addEventListener("click", openPopup);

  input.addEventListener("change", () => {
    const text = input.value.trim();
    if (text === "") {
      commit(null);
      return;
    }
    const parsed = parseJalaliInput(text);
    // An unparseable or out-of-range entry snaps back to the last good value
    // rather than silently filtering the charts to nothing.
    commit(parsed !== null && isSelectable(parsed) ? parsed : value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePopup();
  });

  document.addEventListener("click", (event) => {
    if (!popup.hidden && event.target !== input) closePopup();
  });

  return {
    getValue: () => value,
    setValue(isoDate) {
      value = isoDate;
      input.value = isoDate === null ? "" : formatJalali(isoDate);
    },
    setBounds(nextMin, nextMax) {
      minIso = nextMin;
      maxIso = nextMax;
      if (value !== null) {
        const clamped = clampIso(value);
        if (clamped !== value) this.setValue(clamped);
      }
      if (!popup.hidden) render();
    },
  };
}
