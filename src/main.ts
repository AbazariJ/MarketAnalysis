import { fetchGoldSeries } from "./api/tgju";
import { fetchIndexSeries } from "./api/tsetmc";
import { mergeSeries } from "./analysis/merge";
import { computeRatioSeries, meanRatio } from "./analysis/ratio";
import { drawLineChart } from "./charts/lineChart";
import { FetchError } from "./types";

const statusEl = document.querySelector<HTMLParagraphElement>("#status")!;
const chartsEl = document.querySelector<HTMLDivElement>("#charts")!;
const priceCanvas = document.querySelector<HTMLCanvasElement>("#price-chart")!;
const ratioCanvas = document.querySelector<HTMLCanvasElement>("#ratio-chart")!;

async function main() {
  let gold, index;
  try {
    [gold, index] = await Promise.all([fetchGoldSeries(), fetchIndexSeries()]);
  } catch (err) {
    const message = err instanceof FetchError ? err.message : "Unexpected error while loading market data.";
    statusEl.textContent = `⚠️ ${message}`;
    statusEl.classList.add("error");
    return;
  }

  const merged = mergeSeries(gold, index);
  if (merged.length === 0) {
    statusEl.textContent = "⚠️ No overlapping dates between gold and index series.";
    statusEl.classList.add("error");
    return;
  }

  const ratios = computeRatioSeries(merged);
  const mean = meanRatio(ratios);

  statusEl.hidden = true;
  chartsEl.hidden = false;

  drawLineChart(
    priceCanvas,
    [
      { label: "Gold 18k", color: "#c9a227", points: merged.map((p) => ({ x: Date.parse(p.date), y: p.gold })) },
      { label: "TSE Index", color: "#2b6cb0", points: merged.map((p) => ({ x: Date.parse(p.date), y: p.index })) },
    ],
    { logScaleY: true },
  );

  drawLineChart(
    ratioCanvas,
    [{ label: "Gold / Index", color: "#805ad5", points: ratios.map((p) => ({ x: Date.parse(p.date), y: p.ratio })) }],
    { refLines: [{ y: mean, label: `mean = ${mean.toFixed(2)}`, color: "#e53e3e" }] },
  );
}

main();
