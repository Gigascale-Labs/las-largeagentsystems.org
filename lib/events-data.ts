import { existsSync, readFileSync } from "fs";
import { join } from "path";
// Explicit .ts extension (unlike canon-data.ts's "./csv"): this module is
// exercised directly by Node's type-stripping test runner
// (tests/events-data.test.mts), which needs it to resolve the import —
// tsconfig's allowImportingTsExtensions exists for exactly this case.
import { sanitizeText } from "./sanitize.ts";
import type { Event } from "./events-schema";

/**
 * Absolute URLs, because a feed reader has no page to resolve a relative one
 * against. Kept here so the page, its metadata and the feed route cannot
 * disagree about where they live.
 */
export const EVENTS_PAGE_URL = "https://largeagentsystems.org/events";
export const EVENTS_FEED_URL = "https://largeagentsystems.org/events/feed.xml";

const EVENTS_JSON_PATH = join(
  process.cwd(),
  "data",
  "las-conferences-events.json",
);

/**
 * These values ultimately come from an LLM reading scraped third-party
 * pages (see the upstream repo's SPEC.md section 4) — not a submission
 * through this site's own contribute form, but still text that originated
 * outside this site. `sanitizeText` (same cleaning `docs/untrusted-input.md`
 * requires for anything from outside the site) strips invisible/control
 * characters and caps length before the data ever reaches a page.
 */
const TEXT_FIELD_LIMITS = {
  name: 300,
  dates: 100,
  location: 200,
  description: 500,
  organizer: 200,
  query: 300,
  relevance_rationale: 800,
  reputability_rationale: 800,
  verification_note: 500,
} as const;

function sanitizeEvent(raw: Event): Event {
  return {
    ...raw,
    name: sanitizeText(raw.name, TEXT_FIELD_LIMITS.name),
    dates: sanitizeText(raw.dates, TEXT_FIELD_LIMITS.dates),
    location: sanitizeText(raw.location, TEXT_FIELD_LIMITS.location),
    description: sanitizeText(raw.description, TEXT_FIELD_LIMITS.description),
    organizer: sanitizeText(raw.organizer, TEXT_FIELD_LIMITS.organizer),
    query: sanitizeText(raw.query, TEXT_FIELD_LIMITS.query),
    relevance_rationale: sanitizeText(
      raw.relevance_rationale,
      TEXT_FIELD_LIMITS.relevance_rationale,
    ),
    reputability_rationale: sanitizeText(
      raw.reputability_rationale,
      TEXT_FIELD_LIMITS.reputability_rationale,
    ),
    verification_note: sanitizeText(
      raw.verification_note,
      TEXT_FIELD_LIMITS.verification_note,
    ),
  };
}

/**
 * Reads the events feed synced from Gigascale-Labs/las-conferences
 * (`data/las-conferences-events.json`, updated weekly — see
 * `docs/las-conferences-events-spec-for-ai.md` and
 * `scripts/sync-las-conferences-events.mjs`). Returns `[]` if the file is
 * missing, empty, or unparseable — unlike `canon-data.ts` there is no
 * fallback source for this dataset, since it has no prior static seed.
 * Server-only (uses `fs`). `path` defaults to the real synced file; pass an
 * explicit path only from tests.
 */
export function getEvents(path: string = EVENTS_JSON_PATH): Event[] {
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(parsed)) return [];
    return (parsed as Event[]).map(sanitizeEvent);
  } catch {
    return [];
  }
}

/**
 * Events that were independently verified as real (upstream SPEC.md section
 * 5) — excludes "blocked" (matched relevance/reputability but the URL
 * couldn't be fetched to confirm it, e.g. robots.txt/403/timeout). Use this
 * for a default display that should only show confirmed events; use
 * `getEvents()` directly to also surface blocked ones with their own
 * "unverified" treatment, same as the upstream digest issue does.
 */
export function getVerifiedEvents(path: string = EVENTS_JSON_PATH): Event[] {
  return getEvents(path).filter((event) => event.verification_status === "verified");
}
