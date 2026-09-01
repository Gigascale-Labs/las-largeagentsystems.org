# Synced dataset pattern

**Updated 2026-09-01.** Three pages on this site display a dataset produced by
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
overlap is the check that would settle it. `papers-per-day-chart.tsx` and
`papers-map.tsx` were written to the rules.

## Editorial rule carried from `/papers`

The upstream pipeline scores every paper for significance and novelty, labels
every question approachable or not, and records why the screen passed it.
None of that is displayed. The title, the one-sentence summary and the
questions are the whole case for reading a paper; a score beside it would
argue for the paper instead of describing it. The fields are dropped in
`scripts/sync-las-new-papers.mjs`, so the page cannot show them by accident.

Keep this rule if you add a page over a dataset that carries its own
confidence or quality scores.

## A seventh part: a computed artifact

`/papers` holds one file the other two pages do not: a file this repo computes
from a second upstream file, rather than copying.

| Step | File |
|---|---|
| Upstream publishes the vectors | `las-new-papers`, `data/embeddings/YYYY-MM-DD.json` |
| This repo projects them | `scripts/build-papers-map.mjs` |
| The result | `data/las-new-papers-map.json` — `{arxiv_id, date, x, y}` per paper |

The rules for a sync hold here, plus four more.

**Store the output, never the input.** Measured on the 10 days on file: the
vectors take 337KB (52 papers, 768 floats each, 6.5KB per paper) and the output
takes 6.0KB. The build script fetches the vectors, projects them, and drops
them. This is "sync the fields the page renders", applied to a computation.

**Keep the computation out of the sync script.** `sync-las-new-papers.mjs`
carries no dependencies by the rule above; the projection needs `umap-js`. A
failure in the projection leaves `data/las-new-papers.json` untouched.

**Write the same file for the same input.** UMAP is stochastic, and the daily
job commits whatever changed. An unseeded fit rewrites the map every day. The
PRNG takes a fixed seed; three consecutive runs over the same 52 papers wrote
byte-identical files.

**Say how far the picture can be trusted.** UMAP produces a layout for any
input. Whether that layout puts papers near each other because they are near
each other in the embedding is a separate question, so the build script
measures it: the mean share of each paper's 10 nearest neighbours that survive
the projection. It read 0.531 over 52 papers, and the page prints it.

### What a refit costs

UMAP has no incremental mode. Adding papers moves every paper. The build
script rotates and reflects each new layout onto the previous one, which
removes the orientation change and nothing else.

Displacement of the papers shared between two fits, in plot radii, where the
plot radius is 1:

| Papers added | n shared | Aligned median | Unaligned median | Source |
|---|---|---|---|---|
| 6 on 46 | 46 | 0.405 | 1.090 | observed, a real daily refit |
| 2 on 44 | 44 | 0.247 | 0.622 | simulated, by withholding 2 papers |
| 10 on 36 | 36 | 0.336 | 0.369 | simulated, by withholding a day |

Inferred from those three rows: the alignment pays at small and moderate
deltas and returns almost nothing at a large one, because the rearrangement
dominates there. Three rows are not a curve. Running the same comparison at
deltas of 1, 4 and 8 papers would establish where it stops paying.

Not checked: anything above 52 papers. The 60-day cap admits roughly 480.

## Search on /papers

`lib/papers-search.ts`, with `liqe` as the parser: quoted phrases, AND / OR /
NOT, brackets, `field:value`, wildcards, and implicit AND between bare terms.

**The query does not leave the browser.** The page holds every paper it lists,
so the search filters what is on screen. There is no endpoint and nothing is
logged, so `docs/untrusted-input.md`'s server-side rules do not apply.

The input is still capped at 200 characters and cleaned with `sanitizeText`.
A zero-width space inside a term makes that term match nothing while looking
identical to a term that matches.

One `liqe` behaviour needed correcting. Measured: it compiles an unquoted term
to `/term/ui` and a quoted one to `/term/u`, so `"large agent systems"` matched
0 of 52 papers while `"Large Agent Systems"` matched 1.
`caseInsensitivePhrases` rewrites each quoted literal in the parse tree as an
escaped case-insensitive regex.

### The two chart views

`/papers` draws one chart slot with two views, switched by the toggle above
it: the papers-per-day bars and the UMAP map. `papers-charts.tsx` owns the
switch. They occupy one slot because they answer different questions about the
same 52 papers and a reader wants one at a time.

Both views answer the search box. The map greys the papers a query excluded;
the bar chart counts only the papers it matched, and its caption and key say
"Papers matching" rather than "Papers kept". A view that ignored the query
while its neighbour honoured it would read as a fault.

That is why `keptPerDaySeries` moved to `lib/papers-series.ts`. Its counts now
depend on client state, and `lib/papers-data.ts` imports `fs` at module scope,
so a client component cannot import from it.

Two recharts behaviours to know when adding a third view. `Legend` paints its
swatch from `fill` and ignores `fillOpacity`, so a translucent series gets a
swatch far darker than its marks; the map's unmatched series uses an opaque
`color-mix` instead. `Legend` also paints its label in the series colour,
which left "Not matched" too pale to read, so the bar chart passes a
`formatter` that puts the label on a text token.

The map does not use `Legend` at all. Its key rows carry paper titles, which
run past 100 characters and do not fit a legend strip, so the key is an HTML
list below the plot with an inline-SVG swatch per row.

### Colouring the map by the nearest canon paper

The upstream pipeline records the canon paper each new paper sits nearest to,
and the sync copies `nearest_anchor_id` and `nearest_anchor_title` across. The
list prints them under each paper; the map colours by them.
`lib/papers-anchors.ts` holds the grouping and the two measurements below.
Nothing here recomputes the nearest canon paper. That is "do not reimplement an
upstream document", applied to a field.

**A scatter caps the palette at four.** Measured on the 10 days on file: 52
papers name 19 distinct canon papers, the largest three at 7 papers each. A
scatter puts any two marks side by side, so its palette has to clear the colour
checks over every pair, not over neighbouring slots only. Run over the eight
slots in `app/globals.css`, on both surfaces, at every subset of size 3 or
more: 17 of 256 subsets pass, and none is larger than 4.

Worst all-pairs separation, OKLab ΔE ×100 under simulated protan/deutan
vision, where 8 is the target and 6 the floor:

| Slots | Light | Dark | Verdict |
|---|---|---|---|
| 1, 4, 5, 6 | 13.0 | 6.9 | passes, dark in the floor band |
| 4, 5, 6, 7 | 16.2 | 6.9 | passes, dark in the floor band |
| 1, 2, 3, 4, the fixed-order prefix | 13.7 | 4.8 | fails both |

The map takes 1, 4, 5, 6. The floor band is legal only with a second channel,
so each group also carries a marker shape: circle, square, triangle, diamond.
Two light slots sit under 3:1 against the page, which asks for visible labels;
the key names every group and the list below prints each paper's canon paper
in text.

**Rank picks the colour, not identity.** The four named groups are the four
canon papers with the most papers, ties broken by arXiv id, and they cover 26
of the 52 papers. The other 15 canon papers share one grey. A daily sync that
reorders the top four repaints them, and the page says so. Within one page the
assignment is fixed: `groupAnchors` runs over every paper held, before any
query, so typing in the search box never repaints a group.

**Say how far the colouring can be trusted.** Same rule as `knn_overlap`.
Measured over the 52 papers on the map: 14 (26.9%) have a nearest neighbour on
the plot naming the same canon paper, against 6.6% with the canon papers dealt
out at random. Median distance in plot radii, where the plot radius is 1:

| Pair | Median | n |
|---|---|---|
| Both papers name the same canon paper | 0.591 | 87 pairs |
| The two name different canon papers | 0.843 | 1239 pairs |

`anchorAgreement` computes all of it at render time, in one O(n^2) pass over
the unfiltered points, so none of it goes stale as the window moves.

Not checked: whether a re-stepped palette clears all pairs at 5 slots or more.
Feeding candidate steps to `validate_palette.js` would settle it. Not measured:
the cost of that O(n^2) pass at the 60-day cap, which admits roughly 480
papers. I ran it at 52.

Adding search ended `/papers`' no-client-JavaScript property. The list stays
plain markup — anchors for the day index, `<details>` for the open questions —
but the server now sends the tree to the browser as well as rendering it,
because matching needs the text on the client.

Not checked: the page weight and keystroke latency at the 60-day cap. I
measured both only at 10 days and 52 papers.
