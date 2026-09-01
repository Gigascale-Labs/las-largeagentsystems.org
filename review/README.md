# review — the canon review queue

A private page for picking which scraped arXiv papers go to the canon, and one
button that refreshes every synced dataset and publishes the site.

It runs on the host, binds the tailnet address, and internal-site's Caddy
serves it at `/las-papers/`. Nothing here is reachable off the tailnet. Same
arrangement as kb-gateway, which serves the Discord archive's curation queue
at `/kb/`.

## How claims in this file are labelled

| Label | Meaning |
|---|---|
| READ | a value read from a file in this repo |
| OBSERVED | a state seen in a run |
| MEASURED | a number from a run, with its date and its n |
| ASSUMED | taken as true, not checked |
| NOT CHECKED | a named gap, with the test that would settle it |

## Where a pick goes

```
data/las-new-papers.json          the daily arXiv scrape, synced into this repo
        ↓  this service
Airtable Pending Queue            status: pending, untagged
        ↓  a reviewer, in Airtable
Airtable Canon                    tagged, approved
        ↓  npm run sync:airtable  (the button below, or the daily workflow)
data/las-canon.airtable.json      committed, pushed
        ↓  Vercel
largeagentsystems.org/survey
```

Pending Queue, not Canon. READ from `lib/canon-schema.ts`: a canon row carries
six dimension tag sets — `system_type`, `participant_mix`, `observability`,
`focus_area`, `threat_model`, `claim_type` — and a scraped paper has none of
them. The choice lists for all six live in Airtable, so a reviewer tags there.
This service is a second door onto the intake queue the `/survey` form already
uses, not a second queue.

It writes no tag it was not given. Every dimension field goes across empty.

## What it holds

One file, `review/state/decisions.json`: which papers have been sent, which
have been skipped, and when. Gitignored — it is operational state, not site
data. The site's own record of a pick is the Airtable row.

Airtable is never read. The free plan caps at 1,000 API calls a month (see
`docs/airtable-spec-for-ai.md`), so one call per pick is the entire budget this
service spends. A page that listed the Pending Queue would spend that budget on
browsing.

## The button

`/las-papers/rebuild` runs this, in order, in the checkout named by
`LAS_REVIEW_REPO`:

| Step | Command |
|---|---|
| Fast-forward | `git fetch origin main`, `git merge --ff-only origin/main` |
| Canon | `npm run sync:airtable` |
| Reading list | `npm run sync:las-new-papers` |
| Papers map | `npm run build:papers-map` |
| Events | `npm run sync:las-conferences-events` |
| Stage | `git add -- data` |
| Publish | `git commit`, `git push origin main` |

The fast-forward comes first because the three workflows in
`.github/workflows/` push to the same branch on their own schedule, so this
checkout is usually behind them.

The commit message carries no `[skip ci]`, unlike the ones those workflows
make. Vercel honours that marker and would skip the deploy, which is the one
thing this button exists to cause. The three workflows run on `schedule` and
`workflow_dispatch` only, so this push triggers none of them either way.

Three guards run before any of it.

| Guard | Stops |
|---|---|
| A lock directory, created with `mkdir` | Two runs at once. `mkdir` fails when the directory exists, in one system call — never a read-then-write `if` |
| `git rev-parse --abbrev-ref HEAD` equals `LAS_REVIEW_BRANCH` | Publishing a feature branch |
| Nothing dirty outside `data/` | Publishing an edit that happens to be in the checkout |

OBSERVED 2026-09-01, n=1: pressed against a checkout holding 11 uncommitted
paths, the run stopped after `git status`, named all 11, and changed nothing.
`git log` was identical before and after.

## Run it

```bash
cp review/.env.example review/.env && chmod 600 review/.env   # then set AIRTABLE_API_KEY
node --experimental-strip-types --env-file=review/.env review/server.mts
```

Node 22 or newer: `--experimental-strip-types` is how this runs TypeScript with
no build step, the same way `npm test` does. Node prints a
`MODULE_TYPELESS_PACKAGE_JSON` warning on start, because `package.json` has no
`"type": "module"`; adding one would change how Next resolves this repo's own
files, so the warning stays.

As a service:

```bash
ln -s ~/las-largeagentsystems.org/review/las-papers-review.service \
      ~/.config/systemd/user/las-papers-review.service
systemctl --user daemon-reload
systemctl --user enable --now las-papers-review
```

Then in internal-site, set `LAS_PAPERS_UPSTREAM=100.111.194.7:8789` in `.env`
and `docker compose up -d caddy`. The Caddyfile and the front-page entry are
already there.

## Configuration

READ from `review/.env.example`.

| Variable | Default | What it decides |
|---|---|---|
| `AIRTABLE_API_KEY` | unset | Without it the page says so and every pick fails; nothing is written |
| `AIRTABLE_BASE_ID` | `apps8rBIORsmE7ij8` | The LAS Canon base |
| `AIRTABLE_PENDING_QUEUE_TABLE_ID` | `Pending Queue` | Where a pick lands |
| `LAS_REVIEW_BIND` | `127.0.0.1` | The unit sets the tailnet address. Loopback is the default so a misconfigured run reaches nothing |
| `LAS_REVIEW_PORT` | `8789` | Next after kb-gateway's 8788 |
| `LAS_REVIEW_REPO` | this repository | The checkout the button publishes |
| `LAS_REVIEW_BRANCH` | `main` | The only branch the button will push |
| `LAS_REVIEW_NPM` | `npm` | Absolute in the unit: a user unit's PATH has no nvm shim |
| `LAS_REVIEW_STATE_DIR` | `review/state` | The decision log, the lock, the last run |
| `LAS_REVIEW_REVIEWER` | `papers-review` | Goes in the row's `submitted_by`, so a reviewer sees which door it came in by |

## What the pages send to Airtable

READ from `review/submission.mts`.

| Field | Value |
|---|---|
| `title`, `url`, `summary` | the paper's title, arXiv page, and one-sentence summary |
| `creators` | the authors, semicolon-separated, as the canon stores them |
| `itemType` | `preprint` — every paper in this pipeline is an arXiv posting |
| `date` | the year, derived from the arXiv id |
| `tag_confidence` | `summary-only` — the pick was made from the summary, not the full text |
| `status` | `pending` |
| `submitted_by` | `LAS_REVIEW_REVIEWER` |
| `submitter_note` | what the reviewer typed, then the provenance line |
| six dimension fields, `tags` | empty |

ASSUMED, not read from the paper: a new-style arXiv id is `YYMM.NNNNN`, so
`2608.26849` gives 2026. That holds for 2007 to 2099. It is the *announcement*
year — a paper first posted earlier and cross-listed later carries the later
one. An id that does not match leaves the field empty for the reviewer.

## Security

| Property | How |
|---|---|
| Off the public internet | Binds the tailnet address; Caddy binds `TAILSCALE_BIND_IP` only |
| No cross-site writes | Every POST goes through `checkSameOrigin` in `review/csrf.mts`: `Sec-Fetch-Site` first, `Origin` against the request host second |
| No injected markup | Every interpolated value goes through `escapeHtml`. Paper text is written by a paper's authors, then rewritten by a model |
| No `javascript:` link | `safeHref` passes `http` and `https` and nothing else |
| No client script | The pages run none. The rebuild page reloads itself with a meta refresh |

### `Referrer-Policy` and the origin check are coupled

OBSERVED 2026-09-01, n=1, Chromium 151 through Caddy: every form on the queue
page returned "Refused — That form was sent from another site." The response
carried `Referrer-Policy: no-referrer`, which the fetch spec says serialises a
request's origin as the literal string `"null"`. `new URL("null")` throws, and
the check refused a POST from its own page.

MEASURED, same browser and route, changing only the response header:

| `Referrer-Policy` | `Origin` the browser sent | `POST /decide` |
|---|---|---|
| `no-referrer` | `null` | 403 |
| `same-origin` | `https://system-1.blenny-ratio.ts.net` | 303 |

Two things changed. The response sets `Referrer-Policy: same-origin`, which
still sends nothing to another site. And `"null"` now reads as "the browser
withheld the origin", judged on `Sec-Fetch-Site` alone, so the check survives
a future header change. A refusal now prints its reason on the page and logs
it, because a refusal with no reason is what made this take an hour.

ASSUMED: every browser that withholds `Origin` sends `Sec-Fetch-Site`. Chrome,
Firefox and Safari have shipped it since 2020. NOT CHECKED: any browser other
than Chromium 151. `tests/review-csrf.test.mts` covers the header combinations,
not the browsers.

Paper text is cleaned for storage upstream by `getPaperDays()`, which strips
zero-width characters, bidirectional overrides and the Unicode Tags block. That
is storage hygiene, not escaping — see `docs/untrusted-input.md`. This service
renders HTML by concatenating strings, so `escapeHtml` is the control that
matters here, and `tests/review-html.test.mts` covers it.

## Tests

`npm test` runs them with everything else.

| File | Covers |
|---|---|
| `tests/review-html.test.mts` | escaping, `safeHref`, the page shell's relative links |
| `tests/review-decisions.test.mts` | the log: round-trip, malformed file, replace, forget |
| `tests/review-queue.test.mts` | what the page shows, and the counts |
| `tests/review-submission.test.mts` | the Airtable field mapping and the year derivation |
| `tests/review-rebuild.test.mts` | the dirty-tree guard and the lock |
| `tests/review-csrf.test.mts` | the cross-site POST check, including `Origin: null` |

NOT CHECKED: `runRebuild` end to end. It fast-forwards a branch and pushes to a
live remote, so testing it needs a throwaway remote and a throwaway checkout.
Building those two fixtures is the test that would settle it. Its guards are
covered; its happy path is covered only by pressing the button.

NOT CHECKED: the page at 480 papers, which is what the 60-day sync cap admits.
MEASURED 2026-09-01, n=1: it rendered 55 papers across 11 days.
