import { FetchError, type PricePoint } from "../types";

const TSETMC_HISTORY_URL = "https://cdn.tsetmc.com/api/Index/GetIndexB2History";

// Default index code = "total_ew" (equal-weighted total index), matching the
// source notebook. Browsers forbid scripts from setting Origin/Referer/User-Agent
// on fetch() (the Python notebook sets these manually via `requests`, which a
// browser cannot replicate) — this call relies entirely on tsetmc.cdn sending
// permissive CORS response headers; if it doesn't, the browser blocks the
// response before this code ever sees it (see FetchError below).
const DEFAULT_INS_CODE = "67130298613737946";

interface TsetmcHistoryRow {
  dEven: number; // yyyymmdd
  xNivInuClMresIbs: number; // close
}

export async function fetchTsetmcSeries(insCode = DEFAULT_INS_CODE): Promise<PricePoint[]> {
  let rows: TsetmcHistoryRow[];
  try {
    const res = await fetch(`${TSETMC_HISTORY_URL}/${insCode}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = (await res.json()) as { indexB2: TsetmcHistoryRow[] };
    rows = payload.indexB2;
  } catch (err) {
    throw new FetchError("tsetmc.com index history", err);
  }

  return rows
    .map((row) => {
      const s = String(row.dEven);
      const date = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
      return { date, close: Number(row.xNivInuClMresIbs) };
    })
    .filter((p) => Number.isFinite(p.close))
    .sort((a, b) => a.date.localeCompare(b.date));
}
