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
- [ ] T-002 (P1, S) Fetch tgju gold price series client-side
  - AC: fetch daily `geram18` series from api.tgju.org via browser `fetch`; parse into `{date, close}[]`; on CORS/network failure show a visible error state instead of a silent crash (AC: draft)
- [ ] T-003 (P1, S) Fetch TSE all-share index series client-side
  - AC: fetch index history from cdn.tsetmc.com via browser `fetch`; parse into `{date, close}[]`; on CORS/network failure show a visible error state instead of a silent crash (AC: draft)
- [ ] T-004 (P2, M) Merge series and render price chart
  - AC: merge gold + index series by date with forward-fill; render both as a log-scale line chart on the page (AC: draft)
- [ ] T-005 (P2, M) Gold/index ratio analysis view
  - AC: compute gold/index ratio and its mean over the merged range; render ratio-over-time chart with mean line on the page (AC: draft)

## Later (ideas — no AC or sizing required yet)
- [ ] T-006 N-day % change distribution (histogram + correlation scatter)
- [ ] T-007 Support additional tgju symbols (currencies, silver, coins)
- [ ] T-008 Jalali (Persian) date display
- [ ] T-009 Local caching of fetched series (localStorage, TTL)
- [ ] T-010 CORS proxy / relay fallback if direct browser fetch is blocked
- [ ] T-011 Export analysis (CSV / chart image)
- [ ] T-012 Alert on unusual ratio deviation

## Done (recent only — pruned by /groom)
- [x] T-001 (P1, S) Bootstrap project scaffold (Vite + TS + Vitest + ESLint, one trivial test) — 2026-07-25
