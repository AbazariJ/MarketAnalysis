import Plotly from "plotly.js-cartesian-dist-min";
import { fetchGoldSeries } from "./api/tgju";
import { fetchIndexSeries } from "./api/tsetmc";
import { DEFAULT_ASSET_SYMBOL, DEFAULT_INDEX_INS_CODE, TGJU_ASSETS, TSETMC_INDICES } from "./api/assets";
import { mergeSeries, type MergedPoint } from "./analysis/merge";
import { computeRatioSeries, meanRatio } from "./analysis/ratio";
import { computePctChangeSeries, type PctChangePoint } from "./analysis/pctChange";
import { mean, median } from "./analysis/stats";
import { initDataTable } from "./ui/dataTable";
import { FetchError, type PricePoint } from "./types";
import { version as APP_VERSION } from "../package.json";

const ASSET_COLOR = "#c9a227";
const INDEX_COLOR = "#2b6cb0";
const RATIO_COLOR = "#805ad5";
const ACCENT_COLOR = "#e53e3e";

const PCT_CHANGE_WINDOWS = [30, 90, 180, 365];
const DEFAULT_PCT_CHANGE_WINDOW = 365;

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
const indexHistChartEl = document.querySelector<HTMLDivElement>("#index-hist-chart")!;
const assetHistChartEl = document.querySelector<HTMLDivElement>("#asset-hist-chart")!;
const ratioTitleEl = document.querySelector<HTMLHeadingElement>("#ratio-title")!;
const correlationTitleEl = document.querySelector<HTMLHeadingElement>("#correlation-title")!;
const pctScatterTitleEl = document.querySelector<HTMLHeadingElement>("#pct-scatter-title")!;
const indexHistTitleEl = document.querySelector<HTMLHeadingElement>("#index-hist-title")!;
const assetHistTitleEl = document.querySelector<HTMLHeadingElement>("#asset-hist-title")!;
const statsTableEl = document.querySelector<HTMLTableElement>("#stats-table")!;
const dataTableEl = document.querySelector<HTMLDivElement>("#data-table")!;
const dataTableSearchEl = document.querySelector<HTMLInputElement>("#data-table-search")!;
const dataTableCountEl = document.querySelector<HTMLElement>("#data-table-count")!;
const assetSelectEl = document.querySelector<HTMLSelectElement>("#asset-select")!;
const indexSelectEl = document.querySelector<HTMLSelectElement>("#index-select")!;
const daysSelectEl = document.querySelector<HTMLSelectElement>("#days-select")!;

const indexSeriesCache = new Map<string, PricePoint[]>();

function formatPercent(fraction: number): string {
  if (!Number.isFinite(fraction)) return "-";
  return `${(fraction * 100).toFixed(1)}٪`;
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

/** Notebook cell 11, plots 1–2: both series on a shared log axis. */
function renderPriceChart(merged: MergedPoint[], assetLabel: string, indexLabel: string): void {
  const dates = merged.map((p) => p.date);
  const layout = baseLayout(420);
  void Plotly.react(
    priceChartEl,
    [
      { x: dates, y: merged.map((p) => p.gold), type: "scatter", mode: "lines", name: assetLabel, line: { color: ASSET_COLOR } },
      { x: dates, y: merged.map((p) => p.index), type: "scatter", mode: "lines", name: indexLabel, line: { color: INDEX_COLOR } },
    ],
    {
      ...layout,
      xaxis: { ...layout.xaxis, title: { text: "تاریخ" }, type: "date" },
      yaxis: { ...layout.yaxis, title: { text: "قیمت (مقیاس لگاریتمی)" }, type: "log" },
    },
    PLOTLY_CONFIG,
  );
}

/** Notebook cell 11, plot 4: the ratio series against its own mean. */
function renderRatioChart(merged: MergedPoint[], assetLabel: string, indexLabel: string): void {
  const ratios = computeRatioSeries(merged);
  const meanValue = meanRatio(ratios);
  const layout = baseLayout(420);

  ratioTitleEl.textContent = `نسبت ${assetLabel} به ${indexLabel}`;
  void Plotly.react(
    ratioChartEl,
    [
      {
        x: ratios.map((p) => p.date),
        y: ratios.map((p) => p.ratio),
        type: "scatter",
        mode: "lines",
        name: `${assetLabel} به ${indexLabel}`,
        line: { color: RATIO_COLOR },
      },
    ],
    {
      ...layout,
      xaxis: { ...layout.xaxis, title: { text: "تاریخ" }, type: "date" },
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
}

/**
 * Notebook cell 11, plot 3: log-log scatter of asset against index, with a red
 * reference line anchored at (minIndex, minAsset) rising in exact proportion to
 * the index — the path the asset would trace if both grew at the same rate.
 */
function renderCorrelationChart(merged: MergedPoint[], assetLabel: string, indexLabel: string): void {
  const indexValues = merged.map((p) => p.index);
  const minIndex = Math.min(...indexValues);
  const maxIndex = Math.max(...indexValues);
  const minAsset = Math.min(...merged.map((p) => p.gold));
  const layout = baseLayout(460);

  correlationTitleEl.textContent = `پراکندگی ${assetLabel} در برابر ${indexLabel} (مقیاس لگاریتمی)`;
  void Plotly.react(
    correlationChartEl,
    [
      {
        x: indexValues,
        y: merged.map((p) => p.gold),
        text: merged.map((p) => p.date),
        type: "scatter",
        mode: "markers",
        name: `${assetLabel} / ${indexLabel}`,
        marker: { color: INDEX_COLOR, opacity: 0.35, size: 5 },
        hovertemplate: `%{text}<br>${indexLabel}: %{x:,.2f}<br>${assetLabel}: %{y:,.2f}<extra></extra>`,
      },
      {
        x: [minIndex, maxIndex],
        y: [minAsset, (minAsset * maxIndex) / minIndex],
        type: "scatter",
        mode: "lines",
        name: "رشد هم‌نسبت",
        line: { color: ACCENT_COLOR, width: 1.5 },
        hoverinfo: "skip",
      },
    ],
    {
      ...layout,
      xaxis: { ...layout.xaxis, title: { text: indexLabel }, type: "log" },
      yaxis: { ...layout.yaxis, title: { text: assetLabel }, type: "log" },
    },
    PLOTLY_CONFIG,
  );
}

/** Notebook cell 12, plot 1: index vs asset percent change, median marker, zero crosshairs. */
function renderPctScatter(pctSeries: PctChangePoint[], days: number, assetLabel: string, indexLabel: string): void {
  const indexPcts = pctSeries.map((p) => p.indexPct * 100);
  const assetPcts = pctSeries.map((p) => p.assetPct * 100);
  const medianIndex = median(indexPcts);
  const medianAsset = median(assetPcts);
  const layout = baseLayout(460);

  pctScatterTitleEl.textContent = `همبستگی تغییر درصدی ${days} روزه`;
  void Plotly.react(
    pctScatterChartEl,
    [
      {
        x: indexPcts,
        y: assetPcts,
        text: pctSeries.map((p) => p.date),
        type: "scatter",
        mode: "markers",
        name: "روزها",
        marker: { color: INDEX_COLOR, opacity: 0.15, size: 5 },
        hovertemplate: `%{text}<br>${indexLabel}: %{x:.2f}٪<br>${assetLabel}: %{y:.2f}٪<extra></extra>`,
      },
      {
        x: [medianIndex],
        y: [medianAsset],
        type: "scatter",
        mode: "markers",
        name: `میانه (${medianIndex.toFixed(1)} ، ${medianAsset.toFixed(1)})`,
        marker: { color: ACCENT_COLOR, size: 11, symbol: "diamond" },
        hovertemplate: `میانه<br>${indexLabel}: %{x:.2f}٪<br>${assetLabel}: %{y:.2f}٪<extra></extra>`,
      },
    ],
    {
      ...layout,
      xaxis: { ...layout.xaxis, title: { text: `تغییر ${indexLabel} (٪)` }, zeroline: true, zerolinecolor: ACCENT_COLOR, zerolinewidth: 1.5 },
      yaxis: { ...layout.yaxis, title: { text: `تغییر ${assetLabel} (٪)` }, zeroline: true, zerolinecolor: ACCENT_COLOR, zerolinewidth: 1.5 },
    },
    PLOTLY_CONFIG,
  );
}

/** Notebook cell 12, plots 2–3: one histogram per series with its median marked. */
function renderPctHistograms(pctSeries: PctChangePoint[], days: number, assetLabel: string, indexLabel: string): void {
  const charts = [
    { el: indexHistChartEl, titleEl: indexHistTitleEl, label: indexLabel, color: INDEX_COLOR, values: pctSeries.map((p) => p.indexPct * 100) },
    { el: assetHistChartEl, titleEl: assetHistTitleEl, label: assetLabel, color: ASSET_COLOR, values: pctSeries.map((p) => p.assetPct * 100) },
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
function renderStatsTable(pctSeries: PctChangePoint[], assetLabel: string, indexLabel: string): void {
  const rows = [
    { label: assetLabel, values: pctSeries.map((p) => p.assetPct) },
    { label: indexLabel, values: pctSeries.map((p) => p.indexPct) },
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
    { field: "gold", title: "", sorter: "number", hozAlign: "right", headerFilter: "input", formatter: (cell) => formatNumber(cell.getValue()) },
    { field: "index", title: "", sorter: "number", hozAlign: "right", headerFilter: "input", formatter: (cell) => formatNumber(cell.getValue()) },
  ],
});

function renderDataTable(merged: MergedPoint[], assetLabel: string, indexLabel: string): void {
  dataTable.setColumnTitle("gold", assetLabel);
  dataTable.setColumnTitle("index", indexLabel);
  dataTable.setRows(merged);
}

function renderPctChangeSections(merged: MergedPoint[], days: number, assetLabel: string, indexLabel: string): void {
  const pctSeries = computePctChangeSeries(merged, days);
  const anchors = document.querySelectorAll<HTMLElement>("#pct-scatter-chart, #index-hist-chart, #asset-hist-chart, #stats-table");
  const hasEnoughHistory = pctSeries.length > 0;

  for (const anchor of anchors) {
    anchor.closest("section")!.hidden = !hasEnoughHistory;
  }
  if (!hasEnoughHistory) return;

  renderPctScatter(pctSeries, days, assetLabel, indexLabel);
  renderPctHistograms(pctSeries, days, assetLabel, indexLabel);
  renderStatsTable(pctSeries, assetLabel, indexLabel);
}

async function loadAndRender(symbol: string, insCode: string, days: number): Promise<void> {
  const asset = TGJU_ASSETS.find((a) => a.symbol === symbol);
  const index = TSETMC_INDICES.find((i) => i.insCode === insCode);
  const assetLabel = asset?.label ?? symbol;
  const indexLabel = index?.label ?? insCode;

  statusEl.hidden = false;
  statusEl.textContent = `در حال بارگذاری داده‌های ${assetLabel} و ${indexLabel}…`;
  statusEl.classList.remove("error");
  chartsEl.hidden = true;

  let gold: PricePoint[];
  let indexSeries: PricePoint[];
  try {
    const cached = indexSeriesCache.get(insCode);
    [gold, indexSeries] = await Promise.all([fetchGoldSeries(symbol), cached ? Promise.resolve(cached) : fetchIndexSeries(insCode)]);
    indexSeriesCache.set(insCode, indexSeries);
  } catch (err) {
    const message = err instanceof FetchError ? err.message : "خطای غیرمنتظره هنگام بارگذاری داده‌های بازار.";
    showError(`⚠️ خطا در بارگذاری داده‌ها: ${message}`);
    return;
  }

  const merged = mergeSeries(gold, indexSeries);
  if (merged.length === 0) {
    showError("⚠️ هیچ روز مشترکی بین سری دارایی و شاخص یافت نشد.");
    return;
  }

  statusEl.hidden = true;
  chartsEl.hidden = false;

  renderPriceChart(merged, assetLabel, indexLabel);
  renderRatioChart(merged, assetLabel, indexLabel);
  renderCorrelationChart(merged, assetLabel, indexLabel);
  renderPctChangeSections(merged, days, assetLabel, indexLabel);
  renderDataTable(merged, assetLabel, indexLabel);
}

function main(): void {
  versionEl.textContent = `v${APP_VERSION}`;
  populateDropdown(
    assetSelectEl,
    TGJU_ASSETS.map((a) => ({ label: a.label, value: a.symbol })),
    DEFAULT_ASSET_SYMBOL,
  );
  populateDropdown(
    indexSelectEl,
    TSETMC_INDICES.map((i) => ({ label: i.label, value: i.insCode })),
    DEFAULT_INDEX_INS_CODE,
  );
  populateDropdown(
    daysSelectEl,
    PCT_CHANGE_WINDOWS.map((d) => ({ label: `${d} روز`, value: String(d) })),
    String(DEFAULT_PCT_CHANGE_WINDOW),
  );

  const rerender = () => void loadAndRender(assetSelectEl.value, indexSelectEl.value, Number(daysSelectEl.value));
  assetSelectEl.addEventListener("change", rerender);
  indexSelectEl.addEventListener("change", rerender);
  daysSelectEl.addEventListener("change", rerender);

  rerender();
}

main();
