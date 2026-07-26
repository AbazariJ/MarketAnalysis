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


## 2026-07-26 — Jalali dates as a display layer only [T-008]
**Context.** Every user-facing date was Gregorian ISO, which no Persian reader of this app thinks
in. Plotly's world-calendar component (`calendar: "jalali"`) is not part of the
`plotly.js-cartesian-dist-min` bundle we ship. **Decision.** Keep every date Gregorian ISO
`yyyy-mm-dd` from fetch through merge, analysis and sorting; convert to Jalali only at the render
boundary. Conversion uses `Intl.DateTimeFormat("en-u-ca-persian-nu-latn")` on UTC noon rather than
a hand-rolled arithmetic table. Date axes stay `type: "date"` on Gregorian timestamps and only
their tick *labels* are replaced (`tickmode: "array"`), recomputed on every `plotly_relayout` so
zooming keeps producing Jalali labels at a sensible spacing. **Consequences.** Merging, range
filtering and lexicographic sorting are untouched, so no analysis code learns about calendars.
Jalali output is zero-padded `yyyy/mm/dd`, which sorts and range-compares as a string exactly like
the ISO input — the data table simply swaps the formatted value in. Latin digits, not Persian ones,
to match the numbers everywhere else in the UI. Rejected: a `type: "category"` axis of pre-formatted
Jalali strings (loses date-aware zoom and spacing); rejected: bundling full plotly.js for its
calendar support (the bundle is already 1.9 MB — see T-015).


## 2026-07-26 — Explicit Jalali start/end pickers, not preset ranges [T-025]
**Context.** The app always analysed each series' full history; the only way to look at a narrower
window was to zoom a chart, which changed nothing downstream. A first pass shipped preset ranges
(1/3/6 months, 1/3/5/10 years, all), but presets cannot express "Nowruz 1402 to Nowruz 1403", which
is how the question is usually asked here. **Decision.** Replace the preset dropdown with two
Jalali date pickers, start and end. Either may be left empty and falls back to the first or last
available day, so the startup view is the full history with no interaction. The window slices the
merged series *before* rendering. **Consequences.** Ratio means, percent-change medians, the stats
table and the raw-data table all describe the picked window, not the full history — the pickers are
an analysis control, not a viewport. Narrow windows can leave fewer rows than the percent-change
lookback, in which case those sections hide themselves as they already did for short series. Picks
survive an instrument switch by being clamped into the new series' span. Rejected: keeping the
presets alongside the pickers — two controls answering the same question, with the ambiguity of
which one wins.


## 2026-07-26 — The Jalali picker is hand-rolled [T-025]
**Context.** Native `<input type="date">` is Gregorian-only, and no browser exposes a Jalali picker.
Every mature Persian datepicker (persian-datepicker, pwt.datepicker) depends on jQuery, which this
app does not otherwise carry. **Decision.** Write a ~180-line calendar popup over a plain text
input, converting via `fromJalali`/`toJalali`. `fromJalali` deliberately does not encode the 33-year
leap cycle a second time: it estimates a Gregorian day, then steps toward the target using `toJalali`
(the `Intl` Persian calendar) as the oracle, so the two directions cannot disagree. **Consequences.**
No new dependency and no jQuery, at the cost of owning the popup's behaviour. The input still accepts
typed `yyyy/mm/dd`, and days outside the loaded data are disabled, so an unusable window cannot be
built by clicking. Leap years and month lengths are derived from the oracle rather than tabulated —
`jalaliMonthLength` asks whether Esfand 30 exists — and a round-trip test covers every day of six
consecutive Jalali years.


## 2026-07-26 — DOM-level tests for the picker, on happy-dom [B-005]
**Context.** The date picker shipped with its month/year navigation broken: re-rendering the popup
detached the just-clicked button, so the outside-click handler concluded the click had landed
outside and closed the calendar. Nothing in the suite could have caught it — every test ran on pure
functions in the node environment. **Decision.** Add `happy-dom` as the test environment for UI
components that own event handling, opted into per file via `// @vitest-environment happy-dom`, and
cover the picker's interactions (navigate, zoom to months/years, pick, clear, type, click away).
`jsdom` was tried first and rejected: v29 fails to load under this Node/Vitest pair
(`ERR_REQUIRE_ESM` from a transitive dependency). **Consequences.** Component behaviour is now
regression-tested without a browser; the node environment stays the default, so the analysis tests
pay nothing for it. The underlying fix is that in-popup clicks stop propagating, which is also why
the outside-click handler no longer needs to inspect the click target's ancestry.
