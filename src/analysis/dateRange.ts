export interface DateWindow {
  /** ISO `yyyy-mm-dd`, inclusive. */
  start: string;
  /** ISO `yyyy-mm-dd`, inclusive. */
  end: string;
}

/**
 * Resolves the window to render from the user's picks. Either side may be unset,
 * in which case it falls back to the edge of the available data — an unset
 * picker means "as far as the data goes", not "no data".
 */
export function resolveWindow(
  available: DateWindow,
  selected: { start: string | null; end: string | null },
): DateWindow {
  const start = selected.start ?? available.start;
  const end = selected.end ?? available.end;
  return { start, end };
}

/** Pulls a date back inside `available`, so a pick kept across an instrument switch stays usable. */
export function clampToAvailable(isoDate: string | null, available: DateWindow): string | null {
  if (isoDate === null) return null;
  if (isoDate < available.start) return available.start;
  if (isoDate > available.end) return available.end;
  return isoDate;
}

/** Keeps the rows inside `window`, both ends inclusive. Input must be date-sorted. */
export function filterByWindow<T extends { date: string }>(points: T[], window: DateWindow): T[] {
  return points.filter((point) => point.date >= window.start && point.date <= window.end);
}

/** The full span covered by a date-sorted series, or null when it is empty. */
export function availableWindow(points: { date: string }[]): DateWindow | null {
  if (points.length === 0) return null;
  return { start: points[0].date, end: points[points.length - 1].date };
}
