/**
 * Turns one scraped paper into one Airtable Pending Queue row.
 *
 * Pending Queue, not Canon. A canon row carries six dimension tag sets that a
 * scraped paper has none of, and the choice lists for those live in Airtable.
 * This service picks papers; a reviewer tags them there, and Airtable's own
 * approve automation promotes the row into Canon. See
 * `docs/airtable-spec-for-ai.md`.
 *
 * The six dimension fields are set to empty arrays here for the type, and
 * `addPendingSubmission` does not send them at all. A blank multi-select is a
 * blank multi-select either way; what matters is that nothing invents a tag
 * the reviewer did not choose.
 *
 * Pure. `server.mts` does the Airtable call.
 */

import type { PendingSubmission } from "../lib/canon-schema.ts";
import type { Paper } from "../lib/papers-schema.ts";
import { FIELD_LIMITS, sanitizeText } from "../lib/sanitize.ts";

/** How the canon separates a multi-value string. Matches `lib/canon-data.ts`. */
const SEPARATOR = "; ";

/**
 * The year an arXiv id was announced, as the canon's `date` field wants it.
 *
 * ASSUMED, not read from the paper: a new-style arXiv id is `YYMM.NNNNN`, so
 * the first two digits are the year within the century, and the century is
 * 2000. That holds for every id from 2007 to 2099. It is the *announcement*
 * year, which is the version-1 date; a paper first posted earlier and
 * cross-listed later would carry the later year. Returns "" for an id that
 * does not match, and the reviewer fills the field in Airtable.
 */
export function announcementYear(arxivId: string): string {
  const match = /^(\d{2})(0[1-9]|1[0-2])\.\d{4,5}(v\d+)?$/.exec(arxivId.trim());
  return match ? `20${match[1]}` : "";
}

/**
 * The provenance line that goes on every row this service creates.
 *
 * A reviewer opening the Pending Queue sees rows from two other paths — the
 * site's `/survey` form and the Airtable-hosted form — and this says which
 * one a row came from and what the pipeline already knew about it.
 */
export function provenanceNote(paper: Paper, date: string): string {
  const parts = [
    `Picked from the daily arXiv scrape${date ? ` of ${date}` : ""}.`,
    paper.arxiv_id ? `arXiv ${paper.arxiv_id}.` : "",
    paper.nearest_anchor_title
      ? `Nearest in the canon: ${paper.nearest_anchor_title}.`
      : "",
  ];
  return parts.filter(Boolean).join(" ");
}

/**
 * Returns the Pending Queue row for `paper`.
 *
 * Every string is capped with the same limits the `/survey` form uses. The
 * paper text arrives already cleaned by `getPaperDays()`; the reviewer's note
 * does not, so it is cleaned here.
 */
export function toPendingSubmission(
  paper: Paper,
  date: string,
  { reviewer, note }: { reviewer: string; note: string },
): PendingSubmission {
  const reviewerNote = sanitizeText(note, FIELD_LIMITS.note);
  const provenance = provenanceNote(paper, date);
  return {
    title: sanitizeText(paper.title, FIELD_LIMITS.title),
    // Every paper in this pipeline is an arXiv posting, which is the
    // `preprint` value in Airtable's itemType choice list.
    itemType: "preprint",
    creators: sanitizeText(paper.authors.join(SEPARATOR), FIELD_LIMITS.creators),
    date: announcementYear(paper.arxiv_id),
    url: sanitizeText(paper.url, FIELD_LIMITS.url),
    tags: "",
    summary: sanitizeText(paper.one_sentence, FIELD_LIMITS.summary),
    system_type: [],
    participant_mix: [],
    participant_observability: [],
    operator_observability: [],
    public_observability: [],
    focus_area: [],
    threat_model: [],
    claim_type: [],
    // The pick was made from the title and the one-sentence summary, not the
    // full text. That is exactly what this field records.
    tag_confidence: "summary-only",
    submitted_by: sanitizeText(reviewer, FIELD_LIMITS.submittedBy),
    status: "pending",
    submitter_note: sanitizeText(
      reviewerNote ? `${reviewerNote} ${provenance}` : provenance,
      FIELD_LIMITS.note,
    ),
  };
}
