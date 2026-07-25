import { fetchGoldSeries } from "./api/tgju";
import { fetchIndexSeries } from "./api/tsetmc";
import { DEFAULT_ASSET_SYMBOL, DEFAULT_INDEX_INS_CODE, TGJU_ASSETS, TSETMC_INDICES } from "./api/assets";
import { mergeSeries } from "./analysis/merge";
import { computeRatioSeries, meanRatio } from "./analysis/ratio";
import { drawLineChart } from "./charts/lineChart";
import { FetchError, type PricePoint } from "./types";

const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
const chartsEl = document.querySelector<HTMLDivElement>("#charts")!;
const priceCanvas = document.querySelector<HTMLCanvasElement>("#price-chart")!;
const ratioCanvas = document.querySelector<HTMLCanvasElement>("#ratio-chart")!;
const ratioTitleEl = document.querySelector<HTMLHeadingElement>("#ratio-title")!;
const assetSelectEl = document.querySelector<HTMLSelectElement>("#asset-select")!;
const indexSelectEl = document.querySelector<HTMLSelectElement>("#index-select")!;

const indexSeriesCache = new Map<string, PricePoint[]>();

function populateDropdown(select: HTMLSelectElement, options: { label: string; value: string }[], defaultValue: string): void {
  for (const opt of options) {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    select.appendChild(option);
  }
  select.value = defaultValue;
}

async function loadAndRender(symbol: string, insCode: string): Promise<void> {
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
    statusEl.textContent = `⚠️ خطا در بارگذاری داده‌ها: ${message}`;
    statusEl.classList.add("error");
    return;
  }

  const merged = mergeSeries(gold, indexSeries);
  if (merged.length === 0) {
    statusEl.textContent = "⚠️ هیچ روز مشترکی بین سری دارایی و شاخص یافت نشد.";
    statusEl.classList.add("error");
    return;
  }

  const ratios = computeRatioSeries(merged);
  const mean = meanRatio(ratios);

  statusEl.hidden = true;
  chartsEl.hidden = false;
  ratioTitleEl.textContent = `نسبت ${assetLabel} به ${indexLabel}`;

  drawLineChart(
    priceCanvas,
    [
      { label: assetLabel, color: "#c9a227", points: merged.map((p) => ({ x: Date.parse(p.date), y: p.gold })) },
      { label: indexLabel, color: "#2b6cb0", points: merged.map((p) => ({ x: Date.parse(p.date), y: p.index })) },
    ],
    { logScaleY: true },
  );

  drawLineChart(
    ratioCanvas,
    [{ label: `${assetLabel} به ${indexLabel}`, color: "#805ad5", points: ratios.map((p) => ({ x: Date.parse(p.date), y: p.ratio })) }],
    { refLines: [{ y: mean, label: `میانگین = ${mean.toFixed(2)}`, color: "#e53e3e" }] },
  );
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

  const rerender = () => void loadAndRender(assetSelectEl.value, indexSelectEl.value);
  assetSelectEl.addEventListener("change", rerender);
  indexSelectEl.addEventListener("change", rerender);

  rerender();
}

main();
