# MarketAnalysis

A one-page, all-client-side web app that crawls tsetmc.com and tgju.org and analyzes the resulting market data (gold, currency, Tehran Stock Exchange index) in the browser.

## Stack
TypeScript, HTML, CSS — no server component. Build tooling: Vite + Node.js 18. Test runner: Vitest. Linter: ESLint. Deployed as a static bundle to GitHub Pages.

## Commands
- Setup: `npm install` (verified)
- Run: `npm run dev` (assumption — Vite dev server, not exercised this session)
- Test: `npm test` (verified — Vitest)
- Lint / format: `npm run lint` (verified — ESLint)
- Build / deploy: `npm run build` (verified — produces `dist/`) then publish `dist/` to the `gh-pages` branch (assumption — deploy mechanism not yet set up)

## Layout
```
src/     # TS modules: crawlers (tsetmc/tgju), data merge/analysis, UI rendering
tests/   # mirrors src/
docs/    # standards, ADRs, runbooks
```

## Conventions
- Commits: Conventional Commits (`feat|fix|refactor|test|docs|chore|perf(scope): msg`), atomic and bisectable.
- Errors: typed domain errors (`OrderNotFoundError`), never raw strings; recoverable → retry, non-recoverable → fail fast.
- Validate all input at the boundary (Pydantic / Zod) before any business logic runs.
- Logging: structured JSON to stdout; include `timestamp`, `level`, `durationMs`; never PII or secrets.
- Tests: name `should_X_when_Y`; one concept per test; mock external deps, never own code; builders/factories over magic literals.
- API endpoints (if any): 4xx = client fault, 5xx = ours, never 200 with an error body.
- Naming: booleans prefixed `is/has/can/should`; functions start with a verb; no non-obvious abbreviations.

## Gotchas
- Browser `fetch()` cannot set `Origin`, `Referer`, or `User-Agent` (forbidden headers) — the notebook's Python `requests` calls to tsetmc.com set these manually, which has no browser equivalent. tsetmc responses depend entirely on the server sending permissive CORS headers on its own; if it doesn't, requests fail as opaque CORS errors with no way to work around it client-side (see T-010 fallback idea).
- tsetmc.com was unreachable from the dev/build sandbox used to write this code (`curl` timed out on both the main site and API) — the tsetmc fetcher (`src/api/tsetmc.ts`) is implemented from the source notebook's logic but not exercised against a live response. Verify in an actual browser before trusting it.
- tgju.org's API (`api.tgju.org`) sends `access-control-allow-origin: *` and works from direct browser `fetch` — verified live.

## Task management
- Single source of truth: `docs/BACKLOG.md`. Read it only when running /groom, /next, /plan, /close, /bug, or when I reference a task ID — never load it otherwise.
- IDs: `T-###` tasks, `B-###` bugs. Reference them in commits (`fix(io): handle empty CSV [B-002]`) and TODOs (`TODO(B-002): ...`).
- WIP limit 1. Nothing enters Now without acceptance criteria and size ≤ M (M = fits one session / one PR).
- Decisions worth keeping go to `docs/DECISIONS.md`, not chat history or plan files.
