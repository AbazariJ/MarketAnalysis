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
  // Which Jalali month the grid is showing; independent of the picked day so the
  // user can browse away and back without losing their selection.
  let viewYear = 0;
  let viewMonth = 0;

  function setViewToIso(isoDate: string): void {
    const jalali = toJalali(isoDate);
    viewYear = jalali.year;
    viewMonth = jalali.month;
  }

  function shiftView(months: number): void {
    const total = viewYear * 12 + (viewMonth - 1) + months;
    viewYear = Math.floor(total / 12);
    viewMonth = total - viewYear * 12 + 1;
    renderPopup();
  }

  function commit(isoDate: string | null): void {
    value = isoDate;
    input.value = isoDate === null ? "" : formatJalali(isoDate);
    options.onChange(value);
  }

  /** Nothing outside the loaded data is selectable, so bad windows cannot be built. */
  function isSelectable(isoDate: string): boolean {
    return isoDate >= minIso && isoDate <= maxIso;
  }

  function renderPopup(): void {
    const monthStartIso = fromJalali({ year: viewYear, month: viewMonth, day: 1 });
    const weekdayOfFirst = (new Date(`${monthStartIso}T12:00:00Z`).getUTCDay() + 1) % 7; // Saturday = 0
    const dayCount = jalaliMonthLength(viewYear, viewMonth);

    const cells: string[] = [];
    for (let blank = 0; blank < weekdayOfFirst; blank += 1) cells.push(`<span class="jalali-picker-blank"></span>`);
    for (let day = 1; day <= dayCount; day += 1) {
      const iso = fromJalali({ year: viewYear, month: viewMonth, day });
      const classes = ["jalali-picker-day"];
      if (iso === value) classes.push("is-selected");
      cells.push(
        `<button type="button" class="${classes.join(" ")}" data-iso="${iso}"${isSelectable(iso) ? "" : " disabled"}>${day}</button>`,
      );
    }

    popup.innerHTML = `
      <div class="jalali-picker-head">
        <button type="button" class="jalali-picker-nav" data-shift="-1" aria-label="ماه قبل">‹</button>
        <button type="button" class="jalali-picker-nav" data-shift="-12" aria-label="سال قبل">«</button>
        <span class="jalali-picker-title">${JALALI_MONTH_NAMES[viewMonth - 1]} ${viewYear}</span>
        <button type="button" class="jalali-picker-nav" data-shift="12" aria-label="سال بعد">»</button>
        <button type="button" class="jalali-picker-nav" data-shift="1" aria-label="ماه بعد">›</button>
      </div>
      <div class="jalali-picker-grid">
        ${JALALI_WEEKDAY_INITIALS.map((initial) => `<span class="jalali-picker-weekday">${initial}</span>`).join("")}
        ${cells.join("")}
      </div>
      <div class="jalali-picker-foot">
        <button type="button" class="jalali-picker-clear">پاک کردن</button>
      </div>`;
  }

  function openPopup(): void {
    setViewToIso(value ?? clampIso(new Date().toISOString().slice(0, 10)));
    renderPopup();
    popup.hidden = false;
  }

  function closePopup(): void {
    popup.hidden = true;
  }

  function clampIso(isoDate: string): string {
    if (isoDate < minIso) return minIso;
    if (isoDate > maxIso) return maxIso;
    return isoDate;
  }

  popup.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest("button");
    if (!target) return;

    if (target.dataset.shift) {
      shiftView(Number(target.dataset.shift));
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
    const target = event.target as Node;
    if (!popup.hidden && target !== input && !popup.contains(target)) closePopup();
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
      if (!popup.hidden) renderPopup();
    },
  };
}
