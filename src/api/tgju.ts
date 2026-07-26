import { FetchError, type PricePoint } from "../types";

const TGJU_SUMMARY_URL = "https://api.tgju.org/v1/market/indicator/summary-table-data";

interface TgjuRow {
  0: string; // open
  1: string; // low
  2: string; // high
  3: string; // close
  4: string; // change
  5: string; // pct_change
  6: string; // date (Gregorian, e.g. "2024-01-01")
  7: string; // date (Jalali)
}

export async function fetchTgjuSeries(symbol = "geram18"): Promise<PricePoint[]> {
  let rows: TgjuRow[];
  try {
    const res = await fetch(`${TGJU_SUMMARY_URL}/${symbol}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = (await res.json()) as { data: TgjuRow[] };
    rows = payload.data;
  } catch (err) {
    throw new FetchError(`tgju.org (${symbol})`, err);
  }

  return rows
    .map((row) => ({
      date: String(row[6]).replace(/\//g, "-"), // "2026/07/23" -> "2026-07-23"
      close: Number(String(row[3]).replace(/,/g, "")),
    }))
    .filter((p) => p.date && Number.isFinite(p.close))
    .sort((a, b) => a.date.localeCompare(b.date));
}
