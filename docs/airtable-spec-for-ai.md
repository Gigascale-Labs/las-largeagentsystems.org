# Airtable Intake Pipeline — Task F Status

**Updated 2026-07-23.** Contribute-a-Source (Task F, see `docs/las-canon-addendum.md`)
runs on Airtable: a `Pending Queue` table for submissions, manual reviewer
tagging, and an automation that promotes approved rows into `Canon`. Both
halves of site integration are now live: the write path (site form →
Pending Queue) and the read path (`lib/canon-data.ts` reads the
Airtable-synced JSON, falling back to the CSV). What's left is listed under
**What's Left** below — mostly Airtable UI steps nothing here has a tool to
do, plus one still-unverified end-to-end run.

## Infrastructure

| Item | ID |
|---|---|
| Base: LAS Canon | `apps8rBIORsmE7ij8` |
| Table: Canon | `tbl2XEeh8Rlnrlw0j` (42 rows) |
| Table: Pending Queue | `tblhFC8znRYLb80wG` |
| Airtable-hosted form (secondary entry point) | https://airtable.com/apps8rBIORsmE7ij8/pagBBh0fev2iJbqNR/form |

**Two intake paths, both write into Pending Queue:**
1. **Site form** (`/survey`) — `app/components/contribute-form.tsx` →
   `app/survey/actions.ts` → `lib/submission-store.ts`, which `POST`s
   directly to the Pending Queue table via Airtable's REST API. Primary
   path. Sets `status: "pending"` itself.
2. **Airtable-hosted form** — secondary/backup. Only captures `url` +
   `submitted_by`; every other field including `status` is left blank on
   creation, which the "Auto-Tagging on Record Creation" automation is
   *supposed* to fix (see What's Left).

**Canon sync:** `scripts/sync-airtable.mjs` pulls `Canon` → `data/las-canon.airtable.json`
(committed to git, not gitignored). Runs daily via
`.github/workflows/sync-airtable-daily.yml` (06:00 UTC + manual dispatch).
`lib/canon-data.ts` reads this file, falling back to `data/las-canon.csv`
only if the JSON is missing, empty, or unparseable — don't delete the CSV
(see "CSV retirement" below).

**Canon/CSV reconciliation (2026-07-23):** Airtable's Canon table had drifted
from `data/las-canon.csv` since the one-time seed on 2026-07-20 — nothing
pushes CSV edits back to Airtable. Found and fixed once, by hand:
- 3 stale rows (Moltbook, Habermolt, Mirofish — all "live deployment" sites,
  git-history-confirmed as deliberately removed from the CSV; the `/survey`
  page excludes live deployments on purpose) deleted from Airtable so the
  row count matches the CSV's 42.
- `institutions` backfilled for 41/42 rows from the CSV (Airtable didn't
  have this field until today).
- Habermolt's *paper* entry (`arxiv.org/abs/2605.24413` — distinct from the
  `habermolt.com` live-deployment row that was deleted) was missing the
  `"Design"` focus_area tag the CSV has.
- Everything else already matched. `data/las-canon.csv`'s mojibake
  (`â€"` for em dash) turned out **not** to be in Airtable's copy of
  `summary` — Airtable already has clean em dashes, so reading from the
  JSON incidentally fixes display of this without needing to touch the CSV.
This was a one-time manual catch-up; there's still no ongoing CSV→Airtable
sync, so if the CSV is ever hand-edited again this can drift again.

**Tagging is manual**, not automated: Airtable Automations can't make
outbound webhook calls, so the original design (auto-tag via an external
service on record creation) isn't buildable as specified. A human reviewer
fills in the bibliographic fields and picks dimension values from each
field's choice list, same as an automated tagger would have.

### Table fields

Both tables mirror `lib/canon-schema.ts`'s `CanonEntry` (Canon) and
`PendingSubmission` (Pending Queue, `CanonEntry` + `submitted_by`, `status`,
`rejection_reason`, `submitter_note`). Field choice lists as currently
configured in Airtable:

| Field | Choices |
|---|---|
| `itemType` | bookSection, conferencePaper, dataset, journalArticle, preprint, report, webpage |
| `system_type` | production economy, social network, labour market, financial system |
| `participant_mix` | pure-AI, mixed human+AI |
| `observability` | aggregates observable, interactions observable, agents observable |
| `focus_area` | Monitoring, Steering, Simulation, Redesign, Design |
| `threat_model` | Gradual Disempowerment, Systemic Instability, Inequality, Collective Superintelligence, Partially Observable Systems, Power Concentration, Outdated Models |
| `claim_type` | theoretical/conceptual framework, empirical study, survey/taxonomy, proposed method/system, position/opinion, threat model articulation, policy/regulatory analysis, dataset/tool, live deployment |
| `tag_confidence` | summary-only, full-text |
| `status` (Pending Queue only) | pending, approved, rejected |

Both tables now also have an `institutions` field (multilineText,
semicolon-separated, open-ended — not a choice list), matching
`CanonEntry.institutions` in `lib/canon-schema.ts`. `focus_area` now
includes `"Design"` in both tables too. Both were added and reconciled
2026-07-23 (see "Canon/CSV reconciliation" above); `CLAIM_TYPES` previously
lacked `"live deployment"` against the addendum's confirmed-authoritative
9-value scheme — also fixed 2026-07-23. No more known drift between
`lib/canon-schema.ts` and the live Airtable field/choice configuration.

## What's Left

**Airtable UI (manual — no available tool can do these):**
- [ ] Repurpose "Auto-Tagging on Record Creation": replace its dead webhook
  action with a single "Update record" action setting `status → "pending"`.
  Matters only for rows from the Airtable-hosted form; the site form
  already sets status in code.
- [ ] Add a Grid view on Pending Queue filtered to `status = pending`, for
  reviewers to work from.
- [ ] Delete or fix the stray Pending Queue row with `url: "test"`.

**Code:**
- [x] `CLAIM_TYPES` in `lib/canon-schema.ts` now includes `"live deployment"`
  (9 values), matching the addendum's confirmed-authoritative scheme.
- [x] `"Design"` added to `focus_area` choices in both Airtable tables; a
  real `institutions` field added to both, backfilled on Canon from the CSV.
- [x] `lib/canon-data.ts` now reads `data/las-canon.airtable.json` first,
  falling back to `data/las-canon.csv` if it's missing/empty/invalid.
  `scripts/sync-airtable.mjs` updated to include `institutions` in what it
  pulls (it silently dropped that field before today).

**Config / infra:**
- [ ] Set `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, `AIRTABLE_PENDING_QUEUE_TABLE_ID`
  in `.env.local` (local dev) and in the production hosting environment —
  the site's contribute form fails without them, which wasn't true before
  this pipeline existed.
- [ ] Run one real submission through `next dev` once the key is available
  locally — only validated against the live Airtable schema directly so
  far (create + delete a throwaway record), not through the actual UI.
- [ ] Run one submission all the way through: site form → Pending Queue →
  manually tag → approve → confirm the promotion automation actually fires
  and creates the Canon row (it's built but has never fired for real).

**CSV retirement:** don't delete `data/las-canon.csv` until `lib/canon-data.ts`
reads only the Airtable JSON and that's been stable for a while — it's the
fallback if the Airtable pipeline breaks.

## Known constraints

- **API quota:** Airtable free plan caps at 1,000 calls/month. The daily
  sync is 1 call/day (~30/month); each contribute-form submission is 1
  more call. Site pages must never call the Airtable API on page load —
  only the sync script (scheduled) and the submit server action (one call
  per submission) do.
- **Mojibake:** several `summary` values in `data/las-canon.csv` have
  `â€"`-style encoding corruption. Checked 2026-07-23: Airtable's copies of
  those same summaries are already clean, so the site displays correctly
  now that it reads the JSON — this is only still a problem if something
  ever falls back to reading the CSV directly. Fix in the CSV itself if
  that matters, rather than touching Airtable (which is already correct).
- **Credentials:** personal API token from https://airtable.com/account/tokens/pat.
  The GitHub Actions sync needs its own `AIRTABLE_API_KEY` repo secret,
  scoped to `data.records:read` with explicit access granted to the LAS
  Canon base (a PAT's access list doesn't auto-include bases from a
  different Airtable account/session).
