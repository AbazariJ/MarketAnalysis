import { fetchTgjuSeries } from "./tgju";
import { fetchTsetmcSeries } from "./tsetmc";
import type { Instrument } from "./assets";
import type { PricePoint } from "../types";

/** Routes an instrument to whichever site serves it, so callers stay source-agnostic. */
export function fetchSeries(instrument: Instrument): Promise<PricePoint[]> {
  return instrument.kind === "tgju" ? fetchTgjuSeries(instrument.id) : fetchTsetmcSeries(instrument.id);
}
