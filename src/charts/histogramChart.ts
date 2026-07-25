import type { HistogramBin } from "../analysis/stats";
import { formatNumber } from "./format";

export interface HistogramVerticalLine {
  value: number;
  color: string;
  label?: string;
}

export interface HistogramChartOptions {
  barColor?: string;
  verticalLines?: HistogramVerticalLine[];
  xLabel?: string;
}

const PADDING = { top: 16, right: 20, bottom: 40, left: 52 };
const TICK_COUNT = 5;

export function drawHistogram(
  canvas: HTMLCanvasElement,
  bins: HistogramBin[],
  options: HistogramChartOptions = {},
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (bins.length === 0) return;

  const minX = bins[0].start;
  const maxX = bins[bins.length - 1].end;
  const maxCount = Math.max(...bins.map((b) => b.count));

  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;
  const px = (x: number) => PADDING.left + ((x - minX) / (maxX - minX || 1)) * plotW;
  const py = (count: number) => PADDING.top + plotH - (count / (maxCount || 1)) * plotH;

  ctx.font = "11px system-ui, sans-serif";
  for (let i = 0; i <= TICK_COUNT; i++) {
    const fraction = i / TICK_COUNT;

    const yPix = PADDING.top + plotH - fraction * plotH;
    ctx.strokeStyle = "#eee";
    ctx.beginPath();
    ctx.moveTo(PADDING.left, yPix);
    ctx.lineTo(PADDING.left + plotW, yPix);
    ctx.stroke();
    ctx.fillStyle = "#555";
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(maxCount * fraction)), PADDING.left - 6, yPix + 3);

    const xPix = PADDING.left + fraction * plotW;
    ctx.fillStyle = "#555";
    ctx.textAlign = "center";
    ctx.fillText(formatNumber(minX + (maxX - minX) * fraction), xPix, PADDING.top + plotH + 15);
  }

  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING.left, PADDING.top);
  ctx.lineTo(PADDING.left, PADDING.top + plotH);
  ctx.lineTo(PADDING.left + plotW, PADDING.top + plotH);
  ctx.stroke();

  ctx.fillStyle = options.barColor ?? "#4a5568";
  for (const bin of bins) {
    if (bin.count === 0) continue;
    const left = px(bin.start);
    const barWidth = Math.max(px(bin.end) - left - 1, 1);
    const top = py(bin.count);
    ctx.fillRect(left, top, barWidth, PADDING.top + plotH - top);
  }

  for (const line of options.verticalLines ?? []) {
    if (line.value < minX || line.value > maxX) continue;
    const xPix = px(line.value);
    ctx.strokeStyle = line.color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(xPix, PADDING.top);
    ctx.lineTo(xPix, PADDING.top + plotH);
    ctx.stroke();
    if (line.label) {
      ctx.fillStyle = line.color;
      ctx.textAlign = "left";
      ctx.fillText(line.label, Math.min(xPix + 5, width - 60), PADDING.top + 11);
    }
  }

  if (options.xLabel) {
    ctx.fillStyle = "#333";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(options.xLabel, PADDING.left + plotW / 2, height - 6);
  }
}
