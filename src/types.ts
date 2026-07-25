export interface PricePoint {
  date: string; // ISO yyyy-mm-dd
  close: number;
}

export class FetchError extends Error {
  constructor(source: string, cause: unknown) {
    super(`Failed to fetch ${source}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "FetchError";
  }
}
