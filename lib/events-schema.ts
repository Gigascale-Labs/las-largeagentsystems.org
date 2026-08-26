/**
 * Schema for the events feed synced from Gigascale-Labs/las-conferences
 * (`data/las-conferences-events.json`). Mirrors that repo's `db.py`
 * `events` table column-for-column — see its SPEC.md sections 5 and 7 for
 * what each field means and how `verification_status` is decided.
 */

/**
 * "rejected" never appears here: an event whose page didn't mention its
 * claimed name is dropped entirely by the upstream pipeline, not published.
 * - "verified": the claimed page was fetched and does mention the event.
 * - "blocked": the page couldn't be fetched at all (robots.txt, 403,
 *   timeout) — says nothing about whether the event is real, so it's kept
 *   and flagged rather than dropped upstream too.
 */
export type VerificationStatus = "verified" | "blocked";

export type EventType = "workshop" | "conference" | "cfp";

export interface Event {
  /** uuid4, assigned once when the row was first scraped. */
  id: string;
  /** UTC date this event was first scraped, immutable after that. */
  date_scraped: string;
  name: string;
  event_type: EventType;
  /** As stated by the source page, not independently checked. Empty string if not stated. */
  dates: string;
  /** As stated by the source page, not independently checked. Empty string if not stated. */
  location: string;
  /** Neutral one-sentence summary of what the event covers. */
  description: string;
  organizer: string;
  url: string;
  /** The search query that surfaced this candidate — debugging/provenance only. */
  query: string;
  relevance_rationale: string;
  reputability_rationale: string;
  verification_status: VerificationStatus;
  verification_note: string;
}
