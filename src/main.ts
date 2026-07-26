import { fetchGoldSeries } from "./api/tgju";
import { fetchIndexSeries } from "./api/tsetmc";
import { DEFAULT_ASSET_SYMBOL, DEFAULT_INDEX_INS_CODE, TGJU_ASSETS, TSETMC_INDICES } from "./api/assets";
import { mergeSeries, type MergedPoint } from "./analysis/merge";
import { computeRatioSeries, meanRatio } from "./analysis/ratio";
import { computePctChangeSeries, type PctChangePoint } from "./analysis/pctChange";
import { histogram, mean, median } from "./analysis/stats";
import { drawLineChart } from "./charts/lineChart";
import { drawScatterChart } from "./charts/scatterChart";
import { drawHistogram } from "./charts/histogramChart";
import { FetchError, type PricePoint } from "./types";

const ASSET_COLOR = "#c9a227";
const INDEX_COLOR = "#2b6cb0";
const RATIO_COLOR = "#805ad5";
const ACCENT_COLOR = "#e53e3e";

const PCT_CHANGE_WINDOWS = [30, 90, 180, 365];
const DEFAULT_PCT_CHANGE_WINDOW = 365;

const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
const chartsEl = document.querySelector<HTMLDivElement>("#charts")!;
const priceCanvas = document.querySelector<HTMLCanvasElement>("#price-chart")!;
const ratioCanvas = document.querySelector<HTMLCanvasElement>("#ratio-chart")!;
const correlationCanvas = document.querySelector<HTMLCanvasElement>("#correlation-chart")!;
const pctScatterCanvas = document.querySelector<HTMLCanvasElement>("#pct-scatter-chart")!;
const indexHistCanvas = document.querySelector<HTMLCanvasElement>("#index-hist-chart")!;
const assetHistCanvas = document.querySelector<HTMLCanvasElement>("#asset-hist-chart")!;
const ratioTitleEl = document.querySelector<HTMLHeadingElement>("#ratio-title")!;
const correlationTitleEl = document.querySelector<HTMLHeadingElement>("#correlation-title")!;
const pctScatterTitleEl = document.querySelector<HTMLHeadingElement>("#pct-scatter-title")!;
const indexHistTitleEl = document.querySelector<HTMLHeadingElement>("#index-hist-title")!;
const assetHistTitleEl = document.querySelector<HTMLHeadingElement>("#asset-hist-title")!;
const statsTableEl = document.querySelector<HTMLTableElement>("#stats-table")!;
const dataTableEl = document.querySelector<HTMLTableElement>("#data-table")!;
const assetSelectEl = document.querySelector<HTMLSelectElement>("#asset-select")!;
const indexSelectEl = document.querySelector<HTMLSelectElement>("#index-select")!;
const daysSelectEl = document.querySelector<HTMLSelectElement>("#days-select")!;

const indexSeriesCache = new Map<string, PricePoint[]>();

function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

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
  drawLineChart(
    priceCanvas,
    [
      { label: assetLabel, color: ASSET_COLOR, points: merged.map((p) => ({ x: Date.parse(p.date), y: p.gold })) },
      { label: indexLabel, color: INDEX_COLOR, points: merged.map((p) => ({ x: Date.parse(p.date), y: p.index })) },
    ],
    { logScaleY: true },
  );
}

/** Notebook cell 11, plot 4: the ratio series against its own mean. */
function renderRatioChart(merged: MergedPoint[], assetLabel: string, indexLabel: string): void {
  const ratios = computeRatioSeries(merged);
  const meanValue = meanRatio(ratios);

  ratioTitleEl.textContent = `نسبت ${assetLabel} به ${indexLabel}`;
  drawLineChart(
    ratioCanvas,
    [
      {
        label: `${assetLabel} به ${indexLabel}`,
        color: RATIO_COLOR,
        points: ratios.map((p) => ({ x: Date.parse(p.date), y: p.ratio })),
      },
    ],
    { refLines: [{ y: meanValue, label: `میانگین = ${toPersianDigits(meanValue.toFixed(2))}`, color: ACCENT_COLOR }] },
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

  correlationTitleEl.textContent = `پراکندگی ${assetLabel} در برابر ${indexLabel} (مقیاس لگاریتمی)`;
  drawScatterChart(
    correlationCanvas,
    merged.map((p) => ({ x: p.index, y: p.gold })),
    {
      logScaleX: true,
      logScaleY: true,
      pointColor: INDEX_COLOR,
      pointAlpha: 0.35,
      refLines: [
        {
          from: { x: minIndex, y: minAsset },
          to: { x: maxIndex, y: (minAsset * maxIndex) / minIndex },
          color: ACCENT_COLOR,
        },
      ],
      xLabel: indexLabel,
      yLabel: assetLabel,
    },
  );
}

/** Notebook cell 12, plot 1: index vs asset percent change, median marker, zero crosshairs. */
function renderPctScatter(pctSeries: PctChangePoint[], days: number, assetLabel: string, indexLabel: string): void {
  const indexPcts = pctSeries.map((p) => p.indexPct * 100);
  const assetPcts = pctSeries.map((p) => p.assetPct * 100);
  const medianIndex = median(indexPcts);
  const medianAsset = median(assetPcts);

  pctScatterTitleEl.textContent = `همبستگی تغییر درصدی ${toPersianDigits(days)} روزه`;
  drawScatterChart(
    pctScatterCanvas,
    pctSeries.map((p) => ({ x: p.indexPct * 100, y: p.assetPct * 100 })),
    {
      pointColor: INDEX_COLOR,
      pointAlpha: 0.15,
      refLines: [
        { from: { x: Math.min(...indexPcts, 0), y: 0 }, to: { x: Math.max(...indexPcts, 0), y: 0 }, color: ACCENT_COLOR },
        { from: { x: 0, y: Math.min(...assetPcts, 0) }, to: { x: 0, y: Math.max(...assetPcts, 0) }, color: ACCENT_COLOR },
      ],
      markers: [
        {
          x: medianIndex,
          y: medianAsset,
          color: ACCENT_COLOR,
          label: `میانه (${toPersianDigits(medianIndex.toFixed(1))} ، ${toPersianDigits(medianAsset.toFixed(1))})`,
        },
      ],
      xLabel: `تغییر ${indexLabel} (٪)`,
      yLabel: `تغییر ${assetLabel} (٪)`,
    },
  );
}

/** Notebook cell 12, plots 2–3: one histogram per series with its median marked. */
function renderPctHistograms(pctSeries: PctChangePoint[], days: number, assetLabel: string, indexLabel: string): void {
  const daysFa = toPersianDigits(days);
  const charts = [
    { canvas: indexHistCanvas, titleEl: indexHistTitleEl, label: indexLabel, color: INDEX_COLOR, values: pctSeries.map((p) => p.indexPct * 100) },
    { canvas: assetHistCanvas, titleEl: assetHistTitleEl, label: assetLabel, color: ASSET_COLOR, values: pctSeries.map((p) => p.assetPct * 100) },
  ];

  for (const chart of charts) {
    const medianValue = median(chart.values);
    chart.titleEl.textContent = `توزیع تغییر درصدی ${daysFa} روزه ${chart.label}`;
    drawHistogram(chart.canvas, histogram(chart.values, 60), {
      barColor: chart.color,
      verticalLines: [{ value: medianValue, color: ACCENT_COLOR, label: `میانه = ${toPersianDigits(medianValue.toFixed(1))}٪` }],
      xLabel: `تغییر ${daysFa} روزه (٪)`,
    });
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
            <td>${toPersianDigits(formatPercent(median(row.values)))}</td>
            <td>${toPersianDigits(formatPercent(mean(row.values)))}</td>
            <td>${toPersianDigits(row.values.length)}</td>
          </tr>`,
        )
        .join("")}
    </tbody>`;
}

function formatNumber(value: number): string {
  return toPersianDigits(value.toLocaleString("en-US", { maximumFractionDigits: 2 }));
}

/** Raw merged series backing the charts above, newest day first. */
function renderDataTable(merged: MergedPoint[], assetLabel: string, indexLabel: string): void {
  dataTableEl.innerHTML = `
    <thead>
      <tr><th>تاریخ</th><th>${assetLabel}</th><th>${indexLabel}</th></tr>
    </thead>
    <tbody>
      ${merged
        .slice()
        .reverse()
        .map(
          (p) => `<tr>
            <td>${toPersianDigits(p.date)}</td>
            <td>${formatNumber(p.gold)}</td>
            <td>${formatNumber(p.index)}</td>
          </tr>`,
        )
        .join("")}
    </tbody>`;
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
    PCT_CHANGE_WINDOWS.map((d) => ({ label: `${toPersianDigits(d)} روز`, value: String(d) })),
    String(DEFAULT_PCT_CHANGE_WINDOW),
  );

  const rerender = () => void loadAndRender(assetSelectEl.value, indexSelectEl.value, Number(daysSelectEl.value));
  assetSelectEl.addEventListener("change", rerender);
  indexSelectEl.addEventListener("change", rerender);
  daysSelectEl.addEventListener("change", rerender);

  rerender();
}

main();
