# Backlog

<!--
Format:  - [ ] ID (P1|P2|P3, S|M|L) one-line title
IDs:     T-### tasks/features, B-### bugs. Never reuse an ID.
Size:    S < 1h focused work · M = one session / one PR · L = must be split before entering Next.
Ready:   an item may enter Now only with acceptance criteria (AC) and size ≤ M.
WIP:     max 1 item in Now.
Cap:     keep this file ≤ 100 lines — /groom prunes Done to CHANGELOG.md.
Example entries below — replace with real ones.
-->

## Now (WIP limit: 1)

## Next (ordered by priority; ready = has AC, size ≤ M)
- [ ] T-014 (P1, M) Validate tgju/tsetmc responses with Zod at the fetch boundary
      AC: schemas for both payloads; parse before any mapping; failure raises `FetchError`
      with the field path; unit tests cover a valid payload and a malformed one.
- [ ] B-001 (P2, S) Fast select-switching can render a stale series
      AC: switching asset/index/window mid-flight discards the superseded response;
      only the newest selection ever reaches the charts; test simulates out-of-order resolution.
- [ ] T-017 (P2, S) Resolve the two competing GitHub Pages deploy paths
      AC: exactly one path remains (Actions `deploy-pages` or the `gh-pages` npm package);
      the other is removed; CLAUDE.md's deploy section matches what actually runs.
- [ ] T-015 (P2, M) Code-split Plotly out of the initial bundle (currently 1.9 MB / 589 kB gzip)
      AC: initial JS chunk under 250 kB gzip; charts still render; build emits no size warning.
- [ ] T-016 (P2, S) Remove dead `histogram()` from stats.ts (Plotly does the binning)
      AC: function and its 4 tests deleted; the DECISIONS entry that describes it as driving
      the UI is corrected to say Plotly's `nbinsx` owns binning.
- [ ] T-022 (P2, M) Test the API layer — tgju/tsetmc parsing has zero coverage
      AC: `fetch` mocked; covers date reformatting, comma-stripped numbers, sort order,
      non-OK status, and malformed payloads.
- [ ] B-002 (P3, S) Malformed payload surfaces as a generic error, not a typed `FetchError`
      AC: response mapping moves inside the `try`, so `payload.data` being absent produces
      `FetchError` rather than the catch-all "unexpected error" message. Likely folded into T-014.
- [ ] B-003 (P3, S) `tgju.ts` sets a `User-Agent` header that browsers silently drop
      AC: the forbidden header is removed; a comment records why it cannot work client-side
      (CLAUDE.md already documents this gotcha).

## Later (ideas — no AC or sizing required yet)
- [ ] T-007 Support additional tgju symbols (currencies, silver, coins)
- [ ] T-008 Jalali (Persian) date display
- [ ] T-009 Local caching of fetched series (localStorage, TTL)
- [ ] T-010 CORS proxy / relay fallback if direct browser fetch is blocked
- [ ] T-011 Export analysis (CSV / chart image)
- [ ] T-012 Alert on unusual ratio deviation
- [ ] T-018 Structured JSON logging with `durationMs` on every fetch (CLAUDE.md convention, unmet)
- [ ] T-019 Retry recoverable fetch failures (CLAUDE.md: recoverable → retry; nothing retries today)
- [ ] T-020 Guard log-scale axes against non-positive values (does not reproduce on any current
      tgju series — all sampled series are strictly positive; purely defensive)
- [ ] T-021 Accessibility pass — `aria-live` on `#status`, focus order, chart text alternatives
- [ ] B-004 Free-text table search misses formatted numbers (filter runs on raw values, so
      typing "1,234" matches nothing while the cell displays "1,234")

## Done (recent only — pruned by /groom)
- [x] T-001 (P1, S) Bootstrap project scaffold (Vite + TS + Vitest + ESLint, one trivial test) — 2026-07-25
- [x] T-002 (P1, S) Fetch tgju gold price series client-side — 2026-07-25
- [x] T-003 (P1, S) Fetch TSE all-share index series client-side — 2026-07-25 (endpoint unverified live: tsetmc.com unreachable from build/dev sandbox; verify in a real browser)
- [x] T-004 (P2, M) Merge series and render price chart — 2026-07-25
- [x] T-005 (P2, M) Gold/index ratio analysis view — 2026-07-25
- [x] T-006 (P2, M) N-day % change distribution (correlation scatter + histograms + median/mean stats) — 2026-07-25 (window selectable: 30/90/180/365d; pct-change pipeline cross-validated against an independent reference on 3197 rows of live tgju data, exact match)
- [x] T-023 (P2, S) Price chart: dual ratio-aligned log axes (left = asset, right = index) — 2026-07-26
- [x] T-013 (P2, S) Asset-vs-index log-log scatter with equal-growth reference line (notebook cell 11, plot 3) — 2026-07-25
