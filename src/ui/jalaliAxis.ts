import Plotly from "plotly.js-cartesian-dist-min";
import { jalaliDateTicks } from "../analysis/jalaliTicks";

/**
 * Plotly has no Jalali calendar in the cartesian bundle, so the x axis stays a
 * real date axis (zoom, pan and range maths keep working on Gregorian
 * timestamps) and only the tick *labels* are replaced with Jalali ones.
 */
export function jalaliTickProps(startIso: string, endIso: string): Partial<Plotly.LayoutAxis> {
  const { tickvals, ticktext } = jalaliDateTicks(startIso, endIso);
  return { tickmode: "array", tickvals, ticktext };
}

function toIsoDay(value: unknown): string | null {
  const date = new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

const reticking = new WeakSet<HTMLElement>();

/**
 * Fixed tick arrays would go stale the moment the user zooms, so recompute them
 * for whatever span is visible after each relayout. Guarded against the relayout
 * our own update triggers.
 */
export function enableJalaliRetick(el: HTMLElement): void {
  if (reticking.has(el)) return;
  reticking.add(el);

  const plot = el as Plotly.PlotlyHTMLElement;
  let isApplying = false;
  let lastRange = "";

  plot.on("plotly_relayout", () => {
    if (isApplying) return;
    const range = (plot as unknown as { _fullLayout?: { xaxis?: { range?: unknown[] } } })._fullLayout?.xaxis?.range;
    if (!range || range.length < 2) return;

    const startIso = toIsoDay(range[0]);
    const endIso = toIsoDay(range[1]);
    if (!startIso || !endIso || startIso > endIso) return;

    const signature = `${startIso}|${endIso}`;
    if (signature === lastRange) return;
    lastRange = signature;

    const { tickvals, ticktext } = jalaliDateTicks(startIso, endIso);
    isApplying = true;
    void Plotly.relayout(plot, {
      "xaxis.tickmode": "array",
      "xaxis.tickvals": tickvals,
      "xaxis.ticktext": ticktext,
    } as unknown as Partial<Plotly.Layout>).finally(() => {
      isApplying = false;
    });
  });
}
