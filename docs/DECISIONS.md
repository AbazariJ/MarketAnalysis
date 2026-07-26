# Decisions

<!--
Append-only, newest first. One entry per significant choice — architecture,
library, data model, tradeoff. This replaces retro documents: process lessons
go here too, in one line, or into Claude Code auto memory.
Entry template: date — title [related ID] / Context / Decision / Consequences & rejected.
Example below — replace with real ones.
-->

## 2026-07-26 — Price chart uses two ratio-aligned log axes [T-023]
**Context.** Both series shared one log axis, so the asset (tens of millions of rial) and the
index (tens of thousands) sat far apart vertically and their shapes could not be compared.
**Decision.** Give each series its own log axis — asset left, index right, tick labels coloured to
match their line — and set the default ranges from `alignedLogRanges()`, which hands both axes the
*same* ratio window measured against their own first value. **Consequences.** In the default view
both series start at the same height and an equal percentage move covers an equal vertical
distance, so the lines are directly comparable and crossings are meaningful. The trade-off is that
absolute levels are no longer readable across axes, and zooming decouples the two ranges (Plotly
autoscales each independently) — the alignment guarantee holds for the default view only, which is
what was asked for. Rejected: normalising both series to 100 at the first point on one shared axis
— equivalent geometry, but it discards the real price ticks the table and hovers are read against.

## 2026-07-25 — Histogram bins derived from data, not pinned [T-006]
**Context.** The notebook hard-codes bin edges per chart (`np.linspace(-50, 800, 100)` for the
index, `np.linspace(-50, 400, 100)` for gold) — ranges tuned by eye for one asset/index pair.
**Decision.** `histogram()` spans `[min, max]` of the actual values over a fixed bin count (60 in
the UI). **Consequences.** Charts stay readable for any of the ~150 tgju assets and any index the
dropdowns offer, and no data falls outside the axis. Bin edges now shift as the window or asset
changes, so bar heights are not comparable across selections — acceptable, since the median line
carries the comparison. Rejected: keeping the notebook's fixed ranges (clips most non-gold assets).

## 2026-07-25 — Percent-change window is user-selectable [T-006]
**Context.** The notebook sets `days = 365` as a module-level variable and re-runs the cell to
change horizon. **Decision.** Expose 30/90/180/365 as a dropdown, defaulting to 365. All
percent-change charts and the stats table re-render off one recomputation. **Consequences.** The
shorter windows retain far more rows (the first `days` calendar days are dropped for lack of a
lookback), so the histograms densify as the window shrinks. Rejected: a free-form numeric input —
no validation value over four sensible presets.


## 2026-07-26 — Any-to-any series comparison via one `Instrument` type [T-024]
**Context.** The app hard-wired the comparison to "one tgju asset vs one tsetmc index": two
purpose-built dropdowns feeding two different fetchers. Comparing two indices, or two assets,
was impossible even though every analysis function below the fetch already worked on two anonymous
series. **Decision.** Collapse both sources into a single `Instrument { kind, id, label }` tagged
by source, dispatch through `fetchSeries()`, and give both slots the same dropdown listing every
instrument grouped by `<optgroup>`. The merged/derived field names lose their domain meaning:
`gold`/`index` → `first`/`second`, `assetPct`/`indexPct` → `firstPct`/`secondPct`, and
`AlignedLogRanges.asset`/`.index` → `.first`/`.second`. **Consequences.** All four combinations
(asset↔index, asset↔asset, index↔index, and an instrument against itself) fall out of one code
path with no mode switch. The ratio chart can now be handed two different units (a USD ounce vs a
rial index), where the ratio's absolute value is meaningless and only its trend reads — a hint in
the UI says so. Index↔index doubles exposure to the unverified tsetmc CORS behaviour. The series
cache is now keyed by `kind:id` and stores the in-flight promise, so both slots share one fetch
when they name the same instrument, and failures are evicted so re-selecting retries. Rejected: a
"comparison mode" toggle switching between two dropdown sets — same capability, more UI state.
