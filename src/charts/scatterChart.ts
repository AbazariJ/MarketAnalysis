import { formatNumber } from "./format";

export interface ScatterPoint {
  x: number;
  y: number;
}

export interface ScatterRefLine {
  from: ScatterPoint;
  to: ScatterPoint;
  color: string;
}

export interface ScatterMarker extends ScatterPoint {
  color: string;
  label?: string;
}

export interface ScatterChartOptions {
  logScaleX?: boolean;
  logScaleY?: boolean;
  pointColor?: string;
  pointAlpha?: number;
  refLines?: ScatterRefLine[];
  markers?: ScatterMarker[];
  xLabel?: string;
  yLabel?: string;
}

const PADDING = { top: 16, right: 20, bottom: 40, left: 68 };
const TICK_COUNT = 5;

export function drawScatterChart(
  canvas: HTMLCanvasElement,
  points: ScatterPoint[],
  options: ScatterChartOptions = {},
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);
  if (points.length === 0) return;

  const refLines = options.refLines ?? [];
  const markers = options.markers ?? [];
  const scaleX = (x: number) => (options.logScaleX ? Math.log10(Math.max(x, 1e-9)) : x);
  const scaleY = (y: number) => (options.logScaleY ? Math.log10(Math.max(y, 1e-9)) : y);

  const anchors: ScatterPoint[] = [...points, ...markers, ...refLines.flatMap((l) => [l.from, l.to])];
  const xs = anchors.map((p) => scaleX(p.x));
  const ys = anchors.map((p) => scaleY(p.y));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;
  const px = (x: number) => PADDING.left + ((scaleX(x) - minX) / (maxX - minX || 1)) * plotW;
  const py = (y: number) => PADDING.top + plotH - ((scaleY(y) - minY) / (maxY - minY || 1)) * plotH;

  // Gridlines and tick labels
  ctx.font = "11px system-ui, sans-serif";
  for (let i = 0; i <= TICK_COUNT; i++) {
    const fraction = i / TICK_COUNT;

    const yPix = PADDING.top + plotH - fraction * plotH;
    const yValue = minY + (maxY - minY) * fraction;
    ctx.strokeStyle = "#eee";
    ctx.beginPath();
    ctx.moveTo(PADDING.left, yPix);
    ctx.lineTo(PADDING.left + plotW, yPix);
    ctx.stroke();
    ctx.fillStyle = "#555";
    ctx.textAlign = "right";
    ctx.fillText(formatNumber(options.logScaleY ? 10 ** yValue : yValue), PADDING.left - 6, yPix + 3);

    const xPix = PADDING.left + fraction * plotW;
    const xValue = minX + (maxX - minX) * fraction;
    ctx.strokeStyle = "#eee";
    ctx.beginPath();
    ctx.moveTo(xPix, PADDING.top);
    ctx.lineTo(xPix, PADDING.top + plotH);
    ctx.stroke();
    ctx.fillStyle = "#555";
    ctx.textAlign = "center";
    ctx.fillText(formatNumber(options.logScaleX ? 10 ** xValue : xValue), xPix, PADDING.top + plotH + 15);
  }

  // Axes
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING.left, PADDING.top);
  ctx.lineTo(PADDING.left, PADDING.top + plotH);
  ctx.lineTo(PADDING.left + plotW, PADDING.top + plotH);
  ctx.stroke();

  // Reference lines (clipped to the plot area)
  ctx.save();
  ctx.beginPath();
  ctx.rect(PADDING.left, PADDING.top, plotW, plotH);
  ctx.clip();

  for (const line of refLines) {
    ctx.strokeStyle = line.color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px(line.from.x), py(line.from.y));
    ctx.lineTo(px(line.to.x), py(line.to.y));
    ctx.stroke();
  }

  // Points
  ctx.globalAlpha = options.pointAlpha ?? 1;
  ctx.fillStyle = options.pointColor ?? "#2b6cb0";
  for (const point of points) {
    ctx.beginPath();
    ctx.arc(px(point.x), py(point.y), 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  for (const marker of markers) {
    ctx.fillStyle = marker.color;
    ctx.beginPath();
    ctx.arc(px(marker.x), py(marker.y), 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  for (const marker of markers) {
    if (!marker.label) continue;
    ctx.fillStyle = marker.color;
    ctx.textAlign = "left";
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(marker.label, Math.min(px(marker.x) + 8, width - 4), py(marker.y) - 8);
  }

  ctx.fillStyle = "#333";
  ctx.font = "12px system-ui, sans-serif";
  if (options.xLabel) {
    ctx.textAlign = "center";
    ctx.fillText(options.xLabel, PADDING.left + plotW / 2, height - 6);
  }
  if (options.yLabel) {
    ctx.save();
    ctx.translate(12, PADDING.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText(options.yLabel, 0, 0);
    ctx.restore();
  }
}
