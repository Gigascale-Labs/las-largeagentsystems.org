# LAS Conferences Events Sync — Status

**Updated 2026-08-26.** Displays events found by a separate automated
pipeline, [Gigascale-Labs/las-conferences](https://github.com/Gigascale-Labs/las-conferences)
(LLM web search for workshops/conferences/CFPs relevant to this site's scope,
independently verified before publishing — see that repo's SPEC.md). Both
halves of site integration are code-complete but **not yet live end to end**:
the upstream feed this pulls from does not exist on `main` yet. See
**What's Left** below.

## How it works

Same shape as the Airtable sync (`docs/airtable-spec-for-ai.md`), one-way
instead of two:

1. `las-conferences`'s own weekly GitHub Actions run (Mondays 20:00 UTC)
   discovers events, verifies them, and publishes the cumulative list as
   `docs/events.json` on its `main` branch (public repo, no auth needed to
   read).
2. This site's `.github/workflows/sync-las-conferences-events-weekly.yml`
   (Mondays 21:00 UTC — offset so step 1 has landed first) runs
   `scripts/sync-las-conferences-events.mjs`, which fetches that file, keeps
   only its `events` array, and writes `data/las-conferences-events.json`.
   Commits it if changed.
3. `lib/events-data.ts`'s `getEvents()` reads that file at request/build
   time, sanitizing every text field through `lib/sanitize.ts`'s
   `sanitizeText` first (same treatment `docs/untrusted-input.md` requires
   for anything originating outside this site — these values ultimately come
   from an LLM reading scraped third-party pages, not from this site's own
   contribute form, but the concern is the same: invisible/control
   characters and unbounded length). Returns `[]` if the file is missing,
   empty, or unparseable — there is no fallback source, unlike
   `canon-data.ts`'s CSV fallback, since this dataset has no prior static
   seed.
4. `app/events/page.tsx` calls `getEvents()` and renders `EventsList`
   (`app/components/events-list.tsx`): filterable by event type, toggle to
   show/hide `blocked` items (matched relevance/reputability but the source
   page couldn't be fetched to confirm — shown with an "Unverified" badge
   when the toggle is on, hidden by default).

## Schema

`lib/events-schema.ts`'s `Event` mirrors `las-conferences`'s `db.py` `events`
table column-for-column: `id` (uuid4), `date_scraped`, `name`, `event_type`,
`dates`, `location`, `description`, `organizer`, `url`, `query`,
`relevance_rationale`, `reputability_rationale`, `verification_status`
(`"verified" | "blocked"` — `"rejected"` rows are dropped upstream and never
appear here), `verification_note`.

## What's Left

**Blocking (needs `las-conferences` work, not this repo):**
- [ ] `las-conferences`'s `dev` branch (where the whole discovery/verify/DB/
  feed pipeline currently lives) needs to merge to `main` — a decision for
  whoever owns that repo, not made here.
- [ ] A real (non-dry-run) run needs to happen on `las-conferences`'s `main`
  to actually produce `docs/events.json` content. Until then, this site's
  sync script will fetch a 404 and exit non-zero — not yet tried against the
  real URL for that reason.

**Code (this repo):**
- [x] Schema, data loader (with sanitization), list component, page, nav
  link, sync script, scheduled workflow — all written and passing
  (`npm test`: 30/30 including 7 new; `npx tsc --noEmit` clean; `npm run
  build` succeeds; `/events` manually verified via `next build && next
  start` + curl against both an empty feed and a 2-row sample — one
  verified, one blocked, confirming the blocked row is excluded from the
  default rendered table and shows the "Unverified" badge when the toggle
  is on).
- [ ] Once the upstream feed is real, run the sync script for real once and
  confirm the actual JSON shape matches what `Event` expects — only tested
  against a hand-written sample so far, not the real upstream output.

## Known constraints

- **No secret needed.** `las-conferences` is a public repo specifically so
  this fetch needs no auth, unlike the Airtable sync.
- **One-way only.** This site only reads; nothing here writes back to
  `las-conferences`.
- **Weekly, not live.** Site pages read the committed JSON file, never call
  the upstream repo's API/feed directly at request time — same "sync script,
  not live call" principle as the Airtable integration, for the same reason
  (don't make a visitor's page load depend on a third party being up).
