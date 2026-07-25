import { formatNumber } from "./format";

export interface ChartSeries {
  label: string;
  color: string;
  points: { x: number; y: number }[];
}

export interface ChartRefLine {
  y: number;
  label: string;
  color: string;
}

export interface LineChartOptions {
  logScaleY?: boolean;
  refLines?: ChartRefLine[];
  title?: string;
}

const PADDING = { top: 24, right: 16, bottom: 24, left: 64 };

export function drawLineChart(canvas: HTMLCanvasElement, series: ChartSeries[], options: LineChartOptions = {}): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { width, height } = canvas;
  ctx.clearRect(0, 0, width, height);

  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) return;

  const xs = allPoints.map((p) => p.x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);

  const toPlotY = (y: number) => (options.logScaleY ? Math.log10(Math.max(y, 1e-9)) : y);
  const ys = allPoints.map((p) => toPlotY(p.y)).concat((options.refLines ?? []).map((r) => toPlotY(r.y)));
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const plotW = width - PADDING.left - PADDING.right;
  const plotH = height - PADDING.top - PADDING.bottom;

  const px = (x: number) => PADDING.left + ((x - minX) / (maxX - minX || 1)) * plotW;
  const py = (y: number) => PADDING.top + plotH - ((toPlotY(y) - minY) / (maxY - minY || 1)) * plotH;

  // Axes
  ctx.strokeStyle = "#ccc";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING.left, PADDING.top);
  ctx.lineTo(PADDING.left, PADDING.top + plotH);
  ctx.lineTo(PADDING.left + plotW, PADDING.top + plotH);
  ctx.stroke();

  // Y-axis ticks
  ctx.fillStyle = "#555";
  ctx.font = "11px system-ui, sans-serif";
  ctx.textAlign = "right";
  const tickCount = 5;
  for (let i = 0; i <= tickCount; i++) {
    const yPlot = minY + ((maxY - minY) * i) / tickCount;
    const yVal = options.logScaleY ? Math.pow(10, yPlot) : yPlot;
    const yPix = PADDING.top + plotH - (i / tickCount) * plotH;
    ctx.fillText(formatNumber(yVal), PADDING.left - 6, yPix + 3);
    ctx.strokeStyle = "#eee";
    ctx.beginPath();
    ctx.moveTo(PADDING.left, yPix);
    ctx.lineTo(PADDING.left + plotW, yPix);
    ctx.stroke();
  }

  // Reference lines
  for (const ref of options.refLines ?? []) {
    ctx.strokeStyle = ref.color;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(PADDING.left, py(ref.y));
    ctx.lineTo(PADDING.left + plotW, py(ref.y));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = ref.color;
    ctx.textAlign = "left";
    ctx.fillText(ref.label, PADDING.left + 6, py(ref.y) - 4);
  }

  // Series lines
  for (const s of series) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    s.points.forEach((p, i) => {
      const x = px(p.x);
      const y = py(p.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // Legend
  ctx.textAlign = "left";
  ctx.font = "12px system-ui, sans-serif";
  series.forEach((s, i) => {
    ctx.fillStyle = s.color;
    ctx.fillRect(PADDING.left + i * 120, 4, 10, 10);
    ctx.fillStyle = "#333";
    ctx.fillText(s.label, PADDING.left + i * 120 + 14, 13);
  });

  if (options.title) {
    ctx.fillStyle = "#111";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(options.title, width / 2, height - 6);
  }
}
