export interface PricePoint {
  date: string; // ISO yyyy-mm-dd
  close: number;
}

export class InvalidDateError extends Error {
  constructor(value: string) {
    super(`Expected an ISO yyyy-mm-dd date, got "${value}"`);
    this.name = "InvalidDateError";
  }
}

export class FetchError extends Error {
  constructor(source: string, cause: unknown) {
    super(`Failed to fetch ${source}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "FetchError";
  }
}
