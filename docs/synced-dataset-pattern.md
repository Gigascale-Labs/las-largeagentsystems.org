# Synced dataset pattern

**Updated 2026-08-26.** Three pages on this site display a dataset produced by
a separate automated pipeline in another repository. They are all built the
same way. Follow this shape for the next one; do not invent a fourth.

| Page | Upstream repo | Cadence | Synced file |
|---|---|---|---|
| `/` canon sections | Airtable | daily | `data/las-canon.airtable.json` |
| `/events` | `Gigascale-Labs/las-conferences` | Mondays 21:00 UTC | `data/las-conferences-events.json` |
| `/papers` | `Gigascale-Labs/las-new-papers` | daily 09:00 UTC | `data/las-new-papers.json` |

`/papers` is the most recent and the closest to this document. Read
`scripts/sync-las-new-papers.mjs`, `lib/papers-data.ts`,
`app/papers/page.tsx` and `app/components/papers-list.tsx` as the worked
example.

## The six parts

1. **A sync script**, `scripts/sync-<source>.mjs`. Fetches the upstream file
   over plain HTTPS and writes a static file into `data/`. The upstream repo
   is public so the fetch needs no auth. Node's built-in `fetch` and
   `node:fs/promises` only; no dependencies.
2. **A workflow**, `.github/workflows/sync-<source>-<cadence>.yml`. Runs the
   script on a cron offset *after* the upstream pipeline's own run, commits
   the result only if it changed, and tags the commit `[skip ci]`. Include
   `workflow_dispatch`.
3. **A schema**, `lib/<name>-schema.ts`. Types only. Fields the page must
   never render are left out of the type, so rendering them is a compile
   error rather than a review catch.
4. **A loader**, `lib/<name>-data.ts`. Server-only. Reads the synced file,
   returns `[]` when it is missing, empty or unparseable, and passes every
   string through `sanitizeText` first — see `docs/untrusted-input.md`.
5. **A page**, `app/<name>/page.tsx`, and its list component in
   `app/components/`. Server components. Static prerender.
6. **Tests**, `tests/<name>-data.test.mts`. Cover the missing file, the
   malformed file, the empty file, and at least one hostile string.

## Rules that are not obvious

**Sync the fields the page renders, and no more.** One upstream day file for
`/papers` is about 225 kB, of which the screening trace is the bulk and none
of it is displayed. Dropping it at sync time put all six days in 62 kB.
Trim in the sync script, not in the component: a field that never lands in
`data/` cannot leak into a page or a feed later, whoever writes the next
renderer.

**Do not reimplement an upstream document.** `/papers/feed.xml` serves the
Atom feed the pipeline already generates, copied across byte for byte. The
first draft rebuilt it in TypeScript — 154 lines of generator and 299 of
test, a second implementation of one document, free to drift from the first.
If the upstream document is addressed wrongly, fix its addresses upstream. In
that case `feed.site_url` and `feed.self_url` in the pipeline's `config.yaml`
now point at this site, and this repo only sets the `Content-Type`.

**Treat upstream text as untrusted.** It is written by people outside this
site and, for `/papers`, rewritten by a model. `sanitizeText` strips
zero-width characters, bidirectional overrides and the Unicode Tags block,
and caps length. React escaping is not the control here; storage and export
are. See `docs/untrusted-input.md`.

**Fail soft per item, loud per feed.** A missing upstream index is a
non-zero exit. One unreadable item is a warning and a skip. One bad row must
not cost the other rows.

**Compute every number the page states.** No count, date or range is written
into the copy. `summarisePapers()` in `lib/papers-data.ts` totals the funnel
and derives the spreads at build time. The sync caps at 60 days, so any
hardcoded number goes stale on its own.

## Writing rules for page copy

These apply to any user-facing text on this site, and to commits, PRs and
comments.

- Answer in the first sentence. Then give the detail.
- Give facts and numbers, not justifications.
- State every number with its n and its spread.
- Label what was measured, observed, inferred and assumed.
- Name what was not checked.
- Use a table for three or more parallel items.
- No metaphor, no praise, no filler, no stacked hedges.
- Say "I do not know" when you do not know, and name the test that would
  settle it.

For charts: make no claim in the title, label both axes, provide a key, and
do not overlay two elements in the same colour.

`/papers` and `/events` were rewritten to these rules on 2026-08-26 and are
the reference. Two edits from that pass show the difference:

| Before | After |
|---|---|
| "Nothing passed the screen on this day. That is a normal outcome, not a failure." | "0 papers kept. 142 screened, 6 judged relevant, none cleared the judge's gates." |
| "Show unverified (possibly relevant, not independently confirmed)" | "Show unconfirmed (page blocked automated access, so existence was not checked)" |

**Not audited against the chart rules:** the homepage charts
(`growth-chart.tsx`, `org-type-chart.tsx`, `usage-stats-chart.tsx`,
`quantity-quality.tsx`). Reading each for axis labels, keys and colour
overlap is the check that would settle it.

## Editorial rule carried from `/papers`

The upstream pipeline scores every paper for significance and novelty, labels
every question approachable or not, and records why the screen passed it.
None of that is displayed. The title, the one-sentence summary and the
questions are the whole case for reading a paper; a score beside it would
argue for the paper instead of describing it. The fields are dropped in
`scripts/sync-las-new-papers.mjs`, so the page cannot show them by accident.

Keep this rule if you add a page over a dataset that carries its own
confidence or quality scores.
