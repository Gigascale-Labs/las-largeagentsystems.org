# largeagentsystems.org

The site for LargeAgentSystems.org, a project of Gigascale Labs. It states the
large agent systems problem, shows the field's growth from public datasets, and
serves three catalogues: the canon, upcoming events, and new arXiv papers.

## Stack

| Item | Version |
|---|---|
| Next.js (App Router, Turbopack) | 16.2.4 |
| React | 19.2.4 |
| TypeScript | 5 |
| Tailwind CSS | 4 |
| Recharts | 3.9.2 |
| Node (local) | 22.23.2 |
| Node (sync workflows) | 18 |

`AGENTS.md` states the first rule for this repo: this Next.js version differs
from older ones. Read `node_modules/next/dist/docs/` before writing code.

## Run it

```bash
npm ci --legacy-peer-deps
cp .env.example .env.local   # then set AIRTABLE_API_KEY
npm run dev                  # http://localhost:3000
```

`next dev` and `next build` both need `AIRTABLE_API_KEY`. The `/survey` form
writes submissions into the Airtable Pending Queue table through it
(`lib/submission-store.ts`).

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build; the last run prerendered 9 static pages |
| `npm start` | Serve the build |
| `npm run lint` | ESLint |
| `npm test` | Node's test runner over `tests/*.test.mts` |
| `npm run sync:airtable` | Refresh `data/las-canon.airtable.json` |
| `npm run sync:las-conferences-events` | Refresh `data/las-conferences-events.json` |
| `npm run sync:las-new-papers` | Refresh `data/las-new-papers.json` |

## Routes

| Route | Renders | Reads |
|---|---|---|
| `/` | Landing page: framing, two charts, threat models, focus areas, research agendas, org map link | Static copy in `app/components/`, plus two live CSV fetches |
| `/events` | Conference and event listings | `data/las-conferences-events.json` |
| `/events/feed.xml` | Atom feed, served byte for byte | `data/las-conferences-events.xml` |
| `/papers` | Paper listings and a papers-per-day chart | `data/las-new-papers.json` |
| `/papers/feed.xml` | Atom feed, served byte for byte | `data/las-new-papers-feed.xml` |
| `/survey` | Canon plus a public contribution form | `data/las-canon.airtable.json`, Airtable |

## Data

Five upstream datasets feed the site. Three land in `data/` through a cron
workflow and a commit. Two the server fetches at render time.

| Dataset | Upstream | Path in | Cadence |
|---|---|---|---|
| Canon | Airtable base `apps8rBIORsmE7ij8` | `scripts/sync-airtable.mjs` → `data/las-canon.airtable.json` | Cron 06:00 UTC daily |
| Events | `Gigascale-Labs/las-conferences` | `scripts/sync-las-conferences-events.mjs` → `data/las-conferences-events.json` | Cron Mondays 22:00 UTC |
| Papers | `Gigascale-Labs/las-new-papers` | `scripts/sync-las-new-papers.mjs` → `data/las-new-papers.json` | Cron 09:00 UTC daily |
| Agent usage stats | `Gigascale-Labs/las-usage-stats` | `lib/usage-stats.ts`, `fetch` | Per render, 86400 s revalidate |
| Org map | `Gigascale-Labs/map.largeagentsystems.org` | `lib/org-map.ts`, `fetch` | Per render, 86400 s revalidate |

Each sync workflow runs on a cron offset after its upstream pipeline, commits
only when the file changed, and tags the commit `[skip ci]`.

Two rules govern the synced ones. Sync only the fields a page renders: a field
that never reaches `data/` cannot leak later. Never rebuild a document the
upstream pipeline already generates: both `feed.xml` routes serve upstream
bytes. `docs/synced-dataset-pattern.md` gives the full six-part shape;
`/papers` is the reference implementation.

All upstream text is untrusted. `lib/sanitize.ts` strips zero-width
characters, bidirectional overrides, and the Unicode Tags block, and caps
length. See `docs/untrusted-input.md`.

## Tests

`npm test` runs 112 tests in 15 suites across 4 files: `tests/event-dates`,
`tests/events-data`, `tests/papers-data`, `tests/safe-fetch`. All 112 pass on
Node 22.23.2. The runner uses `--experimental-strip-types`, so it needs Node
22.6 or later; Node 20 rejects the flag.

No workflow runs the tests. The three workflows in `.github/workflows/` only
sync data. Run `npm test` and `npm run lint` yourself before pushing.

## Environment

| Variable | Used by |
|---|---|
| `AIRTABLE_API_KEY` | `/survey` form writes, `scripts/sync-airtable.mjs` |
| `AIRTABLE_BASE_ID` | Same; defaults to `apps8rBIORsmE7ij8` |
| `AIRTABLE_CANON_TABLE_ID` | Canon table name |
| `AIRTABLE_PENDING_QUEUE_TABLE_ID` | Pending Queue table name |

## Docs

| File | Covers |
|---|---|
| `AGENTS.md` | What to read before touching each area |
| `docs/synced-dataset-pattern.md` | The dataset pattern, and the writing rules for page copy |
| `docs/untrusted-input.md` | Handling text from outside this site |
| `docs/airtable-spec-for-ai.md` | The Airtable base |
| `docs/las-canon-addendum.md` | The canon's scope and tagging |
| `docs/las-conferences-events-spec-for-ai.md` | The events dataset |

## Licence

MIT. See `LICENSE`.
