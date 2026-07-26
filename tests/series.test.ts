import { describe, expect, it, vi, beforeEach } from "vitest";

const fetchTgjuSeries = vi.fn();
const fetchTsetmcSeries = vi.fn();

vi.mock("../src/api/tgju", () => ({ fetchTgjuSeries }));
vi.mock("../src/api/tsetmc", () => ({ fetchTsetmcSeries }));

const { fetchSeries } = await import("../src/api/series");
const { findInstrument, instrumentKey, DEFAULT_FIRST_KEY, DEFAULT_SECOND_KEY } = await import("../src/api/assets");

function buildInstrument(overrides: Partial<{ kind: "tgju" | "tsetmc"; id: string; label: string }> = {}) {
  return { kind: "tgju" as const, id: "geram18", label: "طلای 18 عیار", ...overrides };
}

describe("fetchSeries", () => {
  beforeEach(() => {
    fetchTgjuSeries.mockReset().mockResolvedValue([]);
    fetchTsetmcSeries.mockReset().mockResolvedValue([]);
  });

  it("should_callTgjuFetcherWithSymbol_when_instrumentIsTgju", async () => {
    await fetchSeries(buildInstrument({ id: "sekee" }));

    expect(fetchTgjuSeries).toHaveBeenCalledWith("sekee");
    expect(fetchTsetmcSeries).not.toHaveBeenCalled();
  });

  it("should_callTsetmcFetcherWithInsCode_when_instrumentIsTsetmc", async () => {
    await fetchSeries(buildInstrument({ kind: "tsetmc", id: "32097828799138957", label: "شاخص كل" }));

    expect(fetchTsetmcSeries).toHaveBeenCalledWith("32097828799138957");
    expect(fetchTgjuSeries).not.toHaveBeenCalled();
  });
});

describe("instrument lookup", () => {
  it("should_namespaceIdBySource_when_buildingKey", () => {
    expect(instrumentKey(buildInstrument())).toBe("tgju:geram18");
    expect(instrumentKey(buildInstrument({ kind: "tsetmc", id: "123" }))).toBe("tsetmc:123");
  });

  it("should_resolveBothDefaults_when_lookingUpDefaultKeys", () => {
    expect(findInstrument(DEFAULT_FIRST_KEY)?.kind).toBe("tgju");
    expect(findInstrument(DEFAULT_SECOND_KEY)?.kind).toBe("tsetmc");
  });

  it("should_returnUndefined_when_keyIsUnknown", () => {
    expect(findInstrument("tgju:not-a-symbol")).toBeUndefined();
  });
});
