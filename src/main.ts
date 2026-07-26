import Plotly from "plotly.js-cartesian-dist-min";
import { fetchSeries } from "./api/series";
import {
  DEFAULT_FIRST_KEY,
  DEFAULT_SECOND_KEY,
  TGJU_INSTRUMENTS,
  TSETMC_INSTRUMENTS,
  findInstrument,
  instrumentKey,
  type Instrument,
} from "./api/assets";
import { mergeSeries, type MergedPoint } from "./analysis/merge";
import { computeRatioSeries, meanRatio } from "./analysis/ratio";
import { alignedLogRanges } from "./analysis/axisScale";
import { computePctChangeSeries, type PctChangePoint } from "./analysis/pctChange";
import { mean, median } from "./analysis/stats";
import { formatJalali, formatJalaliAll } from "./analysis/jalali";
import { availableWindow, clampToAvailable, filterByWindow, resolveWindow } from "./analysis/dateRange";
import { initDataTable } from "./ui/dataTable";
import { enableJalaliRetick, jalaliTickProps } from "./ui/jalaliAxis";
import { initJalaliDatePicker } from "./ui/jalaliDatePicker";
import { FetchError, type PricePoint } from "./types";
import { version as APP_VERSION } from "../package.json";

const FIRST_COLOR = "#c9a227";
const SECOND_COLOR = "#2b6cb0";
const RATIO_COLOR = "#805ad5";
const ACCENT_COLOR = "#e53e3e";

const PCT_CHANGE_WINDOWS = [30, 90, 180, 365];
const DEFAULT_PCT_CHANGE_WINDOW = 365;

const INSTRUMENT_GROUPS = [
  { label: "طلا، ارز و کالا", instruments: TGJU_INSTRUMENTS },
  { label: "شاخص‌های بورس تهران", instruments: TSETMC_INSTRUMENTS },
];

const PLOTLY_CONFIG: Partial<Plotly.Config> = {
  responsive: true,
  displaylogo: false,
  modeBarButtonsToRemove: ["lasso2d", "select2d"],
  locale: "en",
};

const isDarkTheme = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
const TEXT_COLOR = isDarkTheme ? "#e6e9ef" : "#1a202c";
const MUTED_COLOR = isDarkTheme ? "#8b96ab" : "#64748b";
const GRID_COLOR = isDarkTheme ? "#2a3347" : "#e3e8ef";

function baseLayout(height: number): Partial<Plotly.Layout> {
  return {
    height,
    margin: { t: 28, r: 24, b: 48, l: 64 },
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { family: "Vazirmatn, Tahoma, system-ui, sans-serif", size: 12, color: TEXT_COLOR },
    hovermode: "closest",
    legend: { orientation: "h", y: 1.12, font: { color: MUTED_COLOR } },
    xaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR, color: MUTED_COLOR },
    yaxis: { gridcolor: GRID_COLOR, zerolinecolor: GRID_COLOR, color: MUTED_COLOR },
  };
}

const versionEl = document.querySelector<HTMLSpanElement>("#app-version")!;
const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
const chartsEl = document.querySelector<HTMLDivElement>("#charts")!;
const priceChartEl = document.querySelector<HTMLDivElement>("#price-chart")!;
const ratioChartEl = document.querySelector<HTMLDivElement>("#ratio-chart")!;
const correlationChartEl = document.querySelector<HTMLDivElement>("#correlation-chart")!;
const pctScatterChartEl = document.querySelector<HTMLDivElement>("#pct-scatter-chart")!;
const secondHistChartEl = document.querySelector<HTMLDivElement>("#second-hist-chart")!;
const firstHistChartEl = document.querySelector<HTMLDivElement>("#first-hist-chart")!;
const ratioTitleEl = document.querySelector<HTMLHeadingElement>("#ratio-title")!;
const correlationTitleEl = document.querySelector<HTMLHeadingElement>("#correlation-title")!;
const pctScatterTitleEl = document.querySelector<HTMLHeadingElement>("#pct-scatter-title")!;
const secondHistTitleEl = document.querySelector<HTMLHeadingElement>("#second-hist-title")!;
const firstHistTitleEl = document.querySelector<HTMLHeadingElement>("#first-hist-title")!;
const statsTableEl = document.querySelector<HTMLTableElement>("#stats-table")!;
const dataTableEl = document.querySelector<HTMLDivElement>("#data-table")!;
const dataTableSearchEl = document.querySelector<HTMLInputElement>("#data-table-search")!;
const dataTableCountEl = document.querySelector<HTMLElement>("#data-table-count")!;
const firstSelectEl = document.querySelector<HTMLSelectElement>("#first-select")!;
const secondSelectEl = document.querySelector<HTMLSelectElement>("#second-select")!;
const daysSelectEl = document.querySelector<HTMLSelectElement>("#days-select")!;
const startDateEl = document.querySelector<HTMLInputElement>("#start-date")!;
const endDateEl = document.querySelector<HTMLInputElement>("#end-date")!;
const resetRangeEl = document.querySelector<HTMLButtonElement>("#reset-range")!;

/**
 * Session cache keyed by instrument, holding the in-flight promise rather than
 * the resolved rows — so picking the same instrument in both slots fetches once.
 */
const seriesCache = new Map<string, Promise<PricePoint[]>>();

function loadSeries(instrument: Instrument): Promise<PricePoint[]> {
  const key = instrumentKey(instrument);
  const cached = seriesCache.get(key);
  if (cached) return cached;

  const pending = fetchSeries(instrument);
  seriesCache.set(key, pending);
  // A failed fetch must not be cached, or the retry on re-select is a no-op.
  void pending.catch(() => seriesCache.delete(key));
  return pending;
}

function formatPercent(fraction: number): string {
  if (!Number.isFinite(fraction)) return "-";
  return `${(fraction * 100).toFixed(1)}٪`;
}

/** Fills a select with every instrument, grouped by source, and selects `defaultKey`. */
function populateInstrumentDropdown(select: HTMLSelectElement, defaultKey: string): void {
  for (const group of INSTRUMENT_GROUPS) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.label;
    for (const instrument of group.instruments) {
      const option = document.createElement("option");
      option.value = instrumentKey(instrument);
      option.textContent = instrument.label;
      optgroup.appendChild(option);
    }
    select.appendChild(optgroup);
  }
  select.value = defaultKey;
}

function populateDropdown(select: HTMLSelectElement, options: { label: string; value: string }[], defaultValue: string): void {
  for (const opt of options) {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  }
  select.value = defaultValue;
}

function showError(message: string): void {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.classList.add("error");
  chartsEl.hidden = true;
}

/**
 * Notebook cell 11, plots 1–2, with each series on its own log axis — the first
 * series on the left, the second on the right. `alignedLogRanges` anchors the
 * default view so both series start at the same height and an equal percentage
 * move covers an equal vertical distance on either axis; zooming decouples them.
 */
function renderPriceChart(merged: MergedPoint[], firstLabel: string, secondLabel: string): void {
  const dates = merged.map((p) => p.date);
  const jalaliDates = formatJalaliAll(dates);
  const firstValues = merged.map((p) => p.first);
  const secondValues = merged.map((p) => p.second);
  const layout = baseLayout(420);
  const ranges = alignedLogRanges(firstValues, secondValues);

  void Plotly.react(
    priceChartEl,
    [
      {
        x: dates,
        y: firstValues,
        customdata: jalaliDates,
        type: "scatter",
        mode: "lines",
        name: firstLabel,
        line: { color: FIRST_COLOR },
        yaxis: "y",
        hovertemplate: `%{customdata}<br>${firstLabel}: %{y:,.2f}<extra></extra>`,
      },
      {
        x: dates,
        y: secondValues,
        customdata: jalaliDates,
        type: "scatter",
        mode: "lines",
        name: secondLabel,
        line: { color: SECOND_COLOR },
        yaxis: "y2",
        hovertemplate: `%{customdata}<br>${secondLabel}: %{y:,.2f}<extra></extra>`,
      },
    ],
    {
      ...layout,
      margin: { ...layout.margin, r: 72 },
      xaxis: { ...layout.xaxis, title: { text: "تاریخ" }, type: "date", ...jalaliTickProps(dates[0], dates[dates.length - 1]) },
      yaxis: {
        ...layout.yaxis,
        title: { text: firstLabel, font: { color: FIRST_COLOR } },
        type: "log",
        side: "left",
        color: FIRST_COLOR,
        ...(ranges ? { range: ranges.first, autorange: false as const } : {}),
      },
      yaxis2: {
        ...layout.yaxis,
        title: { text: secondLabel, font: { color: SECOND_COLOR } },
        type: "log",
        side: "right",
        overlaying: "y",
        color: SECOND_COLOR,
        showgrid: false,
        ...(ranges ? { range: ranges.second, autorange: false as const } : {}),
      },
    },
    PLOTLY_CONFIG,
  );
  enableJalaliRetick(priceChartEl);
}

/** Notebook cell 11, plot 4: the ratio series against its own mean. */
function renderRatioChart(merged: MergedPoint[], firstLabel: string, secondLabel: string): void {
  const ratios = computeRatioSeries(merged);
  const meanValue = meanRatio(ratios);
  const dates = ratios.map((p) => p.date);
  const layout = baseLayout(420);

  ratioTitleEl.textContent = `نسبت ${firstLabel} به ${secondLabel}`;
  void Plotly.react(
    ratioChartEl,
    [
      {
        x: dates,
        y: ratios.map((p) => p.ratio),
        customdata: formatJalaliAll(dates),
        type: "scatter",
        mode: "lines",
        name: `${firstLabel} به ${secondLabel}`,
        line: { color: RATIO_COLOR },
        hovertemplate: `%{customdata}<br>نسبت: %{y:,.2f}<extra></extra>`,
      },
    ],
    {
      ...layout,
      xaxis: {
        ...layout.xaxis,
        title: { text: "تاریخ" },
        type: "date",
        ...(dates.length > 0 ? jalaliTickProps(dates[0], dates[dates.length - 1]) : {}),
      },
      yaxis: { ...layout.yaxis, title: { text: "نسبت" } },
      shapes: [
        {
          type: "line",
          xref: "paper",
          x0: 0,
          x1: 1,
          y0: meanValue,
          y1: meanValue,
          line: { color: ACCENT_COLOR, dash: "dash", width: 1.5 },
        },
      ],
      annotations: [
        {
          xref: "paper",
          x: 1,
          y: meanValue,
          xanchor: "right",
          yanchor: "bottom",
          showarrow: false,
          text: `میانگین = ${meanValue.toFixed(2)}`,
          font: { color: ACCENT_COLOR },
        },
      ],
    },
    PLOTLY_CONFIG,
  );
  enableJalaliRetick(ratioChartEl);
}

/**
 * Notebook cell 11, plot 3: log-log scatter of the first series against the
 * second, with a red reference line anchored at (minSecond, minFirst) rising in
 * exact proportion to the second — the path the first would trace if both grew
 * at the same rate.
 */
function renderCorrelationChart(merged: MergedPoint[], firstLabel: string, secondLabel: string): void {
  const secondValues = merged.map((p) => p.second);
  const minSecond = Math.min(...secondValues);
  const maxSecond = Math.max(...secondValues);
  const minFirst = Math.min(...merged.map((p) => p.first));
  const layout = baseLayout(460);

  correlationTitleEl.textContent = `پراکندگی ${firstLabel} در برابر ${secondLabel} (مقیاس لگاریتمی)`;
  void Plotly.react(
    correlationChartEl,
    [
      {
        x: secondValues,
        y: merged.map((p) => p.first),
        text: formatJalaliAll(merged.map((p) => p.date)),
        type: "scatter",
        mode: "markers",
        name: `${firstLabel} / ${secondLabel}`,
        marker: { color: SECOND_COLOR, opacity: 0.35, size: 5 },
        hovertemplate: `%{text}<br>${secondLabel}: %{x:,.2f}<br>${firstLabel}: %{y:,.2f}<extra></extra>`,
      },
      {
        x: [minSecond, maxSecond],
        y: [minFirst, (minFirst * maxSecond) / minSecond],
        type: "scatter",
        mode: "lines",
        name: "رشد هم‌نسبت",
        line: { color: ACCENT_COLOR, width: 1.5 },
        hoverinfo: "skip",
      },
    ],
    {
      ...layout,
      xaxis: { ...layout.xaxis, title: { text: secondLabel }, type: "log" },
      yaxis: { ...layout.yaxis, title: { text: firstLabel }, type: "log" },
    },
    PLOTLY_CONFIG,
  );
}

/** Notebook cell 12, plot 1: second vs first percent change, median marker, zero crosshairs. */
function renderPctScatter(pctSeries: PctChangePoint[], days: number, firstLabel: string, secondLabel: string): void {
  const secondPcts = pctSeries.map((p) => p.secondPct * 100);
  const firstPcts = pctSeries.map((p) => p.firstPct * 100);
  const medianSecond = median(secondPcts);
  const medianFirst = median(firstPcts);
  const layout = baseLayout(460);

  pctScatterTitleEl.textContent = `همبستگی تغییر درصدی ${days} روزه`;
  void Plotly.react(
    pctScatterChartEl,
    [
      {
        x: secondPcts,
        y: firstPcts,
        text: formatJalaliAll(pctSeries.map((p) => p.date)),
        type: "scatter",
        mode: "markers",
        name: "روزها",
        marker: { color: SECOND_COLOR, opacity: 0.15, size: 5 },
        hovertemplate: `%{text}<br>${secondLabel}: %{x:.2f}٪<br>${firstLabel}: %{y:.2f}٪<extra></extra>`,
      },
      {
        x: [medianSecond],
        y: [medianFirst],
        type: "scatter",
        mode: "markers",
        name: `میانه (${medianSecond.toFixed(1)} ، ${medianFirst.toFixed(1)})`,
        marker: { color: ACCENT_COLOR, size: 11, symbol: "diamond" },
        hovertemplate: `میانه<br>${secondLabel}: %{x:.2f}٪<br>${firstLabel}: %{y:.2f}٪<extra></extra>`,
      },
    ],
    {
      ...layout,
      xaxis: { ...layout.xaxis, title: { text: `تغییر ${secondLabel} (٪)` }, zeroline: true, zerolinecolor: ACCENT_COLOR, zerolinewidth: 1.5 },
      yaxis: { ...layout.yaxis, title: { text: `تغییر ${firstLabel} (٪)` }, zeroline: true, zerolinecolor: ACCENT_COLOR, zerolinewidth: 1.5 },
    },
    PLOTLY_CONFIG,
  );
}

/** Notebook cell 12, plots 2–3: one histogram per series with its median marked. */
function renderPctHistograms(pctSeries: PctChangePoint[], days: number, firstLabel: string, secondLabel: string): void {
  const charts = [
    { el: secondHistChartEl, titleEl: secondHistTitleEl, label: secondLabel, color: SECOND_COLOR, values: pctSeries.map((p) => p.secondPct * 100) },
    { el: firstHistChartEl, titleEl: firstHistTitleEl, label: firstLabel, color: FIRST_COLOR, values: pctSeries.map((p) => p.firstPct * 100) },
  ];

  for (const chart of charts) {
    const medianValue = median(chart.values);
    const layout = baseLayout(360);
    chart.titleEl.textContent = `توزیع تغییر درصدی ${days} روزه ${chart.label}`;
    const trace = {
      x: chart.values,
      type: "histogram",
      nbinsx: 60,
      marker: { color: chart.color },
      hovertemplate: `بازه: %{x}<br>تعداد روز: %{y}<extra></extra>`,
    };
    void Plotly.react(
      chart.el,
      [trace as unknown as Plotly.Data],
      {
        ...layout,
        showlegend: false,
        xaxis: { ...layout.xaxis, title: { text: `تغییر ${days} روزه (٪)` } },
        yaxis: { ...layout.yaxis, title: { text: "تعداد روز" } },
        shapes: [
          { type: "line", x0: medianValue, x1: medianValue, y0: 0, y1: 1, yref: "paper", line: { color: ACCENT_COLOR, dash: "dash", width: 1.5 } },
        ],
        annotations: [
          {
            x: medianValue,
            y: 1,
            yref: "paper",
            yanchor: "bottom",
            showarrow: false,
            text: `میانه = ${medianValue.toFixed(1)}٪`,
            font: { color: ACCENT_COLOR },
          },
        ],
      },
      PLOTLY_CONFIG,
    );
  }
}

/** Notebook cell 13: median and mean of both percent-change series. */
function renderStatsTable(pctSeries: PctChangePoint[], firstLabel: string, secondLabel: string): void {
  const rows = [
    { label: firstLabel, values: pctSeries.map((p) => p.firstPct) },
    { label: secondLabel, values: pctSeries.map((p) => p.secondPct) },
  ];

  statsTableEl.innerHTML = `
    <thead>
      <tr><th>سری</th><th>میانه</th><th>میانگین</th><th>تعداد روز</th></tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `<tr>
            <td>${row.label}</td>
            <td>${formatPercent(median(row.values))}</td>
            <td>${formatPercent(mean(row.values))}</td>
            <td>${row.values.length}</td>
          </tr>`,
        )
        .join("")}
    </tbody>`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/** Interactive view of the raw merged series backing the charts above. */
const dataTable = initDataTable<MergedPoint>({
  container: dataTableEl,
  searchInput: dataTableSearchEl,
  countEl: dataTableCountEl,
  initialSort: { column: "date", dir: "desc" },
  columns: [
    { field: "date", title: "تاریخ", sorter: "string", headerFilter: "input", formatter: (cell) => cell.getValue() },
    { field: "first", title: "", sorter: "number", hozAlign: "right", headerFilter: "input", formatter: (cell) => formatNumber(cell.getValue()) },
    { field: "second", title: "", sorter: "number", hozAlign: "right", headerFilter: "input", formatter: (cell) => formatNumber(cell.getValue()) },
  ],
});

function renderDataTable(merged: MergedPoint[], firstLabel: string, secondLabel: string): void {
  dataTable.setColumnTitle("first", firstLabel);
  dataTable.setColumnTitle("second", secondLabel);
  // Zero-padded Jalali dates sort and filter as strings exactly like the ISO
  // ones they replace, so the column keeps its chronological ordering.
  dataTable.setRows(merged.map((point) => ({ ...point, date: formatJalali(point.date) })));
}

/**
 * Both pickers start empty, which renders the full history; picking a day
 * re-renders from the cached series without refetching.
 */
const startPicker = initJalaliDatePicker({ input: startDateEl, onChange: () => rerender() });
const endPicker = initJalaliDatePicker({ input: endDateEl, onChange: () => rerender() });

function rerender(): void {
  void loadAndRender(firstSelectEl.value, secondSelectEl.value, Number(daysSelectEl.value));
}

function renderPctChangeSections(merged: MergedPoint[], days: number, firstLabel: string, secondLabel: string): void {
  const pctSeries = computePctChangeSeries(merged, days);
  const anchors = document.querySelectorAll<HTMLElement>("#pct-scatter-chart, #second-hist-chart, #first-hist-chart, #stats-table");
  const hasEnoughHistory = pctSeries.length > 0;

  for (const anchor of anchors) {
    anchor.closest("section")!.hidden = !hasEnoughHistory;
  }
  if (!hasEnoughHistory) return;

  renderPctScatter(pctSeries, days, firstLabel, secondLabel);
  renderPctHistograms(pctSeries, days, firstLabel, secondLabel);
  renderStatsTable(pctSeries, firstLabel, secondLabel);
}

async function loadAndRender(firstKey: string, secondKey: string, days: number): Promise<void> {
  const first = findInstrument(firstKey);
  const second = findInstrument(secondKey);
  if (!first || !second) {
    showError("⚠️ سری انتخاب‌شده شناخته نشد.");
    return;
  }

  statusEl.hidden = false;
  statusEl.textContent = `در حال بارگذاری داده‌های ${first.label} و ${second.label}…`;
  statusEl.classList.remove("error");
  chartsEl.hidden = true;

  let firstSeries: PricePoint[];
  let secondSeries: PricePoint[];
  try {
    [firstSeries, secondSeries] = await Promise.all([loadSeries(first), loadSeries(second)]);
  } catch (err) {
    const message = err instanceof FetchError ? err.message : "خطای غیرمنتظره هنگام بارگذاری داده‌های بازار.";
    showError(`⚠️ خطا در بارگذاری داده‌ها: ${message}`);
    return;
  }

  const allMerged = mergeSeries(firstSeries, secondSeries);
  if (allMerged.length === 0) {
    showError("⚠️ هیچ روز مشترکی بین دو سری انتخاب‌شده یافت نشد.");
    return;
  }

  // The pickers can only be bounded once the data is in, so they are configured
  // here rather than at startup; an unset side means "the edge of the data".
  const available = availableWindow(allMerged)!;
  startPicker.setBounds(available.start, available.end);
  endPicker.setBounds(available.start, available.end);

  const picked = resolveWindow(available, {
    start: clampToAvailable(startPicker.getValue(), available),
    end: clampToAvailable(endPicker.getValue(), available),
  });
  if (picked.start > picked.end) {
    showError("⚠️ تاریخ شروع باید پیش از تاریخ پایان باشد.");
    return;
  }

  const merged = filterByWindow(allMerged, picked);
  if (merged.length === 0) {
    showError("⚠️ در بازه زمانی انتخاب‌شده داده‌ای وجود ندارد.");
    return;
  }

  statusEl.hidden = true;
  chartsEl.hidden = false;

  renderPriceChart(merged, first.label, second.label);
  renderRatioChart(merged, first.label, second.label);
  renderCorrelationChart(merged, first.label, second.label);
  renderPctChangeSections(merged, days, first.label, second.label);
  renderDataTable(merged, first.label, second.label);
}

function main(): void {
  versionEl.textContent = `v${APP_VERSION}`;
  populateInstrumentDropdown(firstSelectEl, DEFAULT_FIRST_KEY);
  populateInstrumentDropdown(secondSelectEl, DEFAULT_SECOND_KEY);
  populateDropdown(
    daysSelectEl,
    PCT_CHANGE_WINDOWS.map((d) => ({ label: `${d} روز`, value: String(d) })),
    String(DEFAULT_PCT_CHANGE_WINDOW),
  );

  firstSelectEl.addEventListener("change", rerender);
  secondSelectEl.addEventListener("change", rerender);
  daysSelectEl.addEventListener("change", rerender);
  resetRangeEl.addEventListener("click", () => {
    startPicker.setValue(null);
    endPicker.setValue(null);
    rerender();
  });

  rerender();
}

main();
