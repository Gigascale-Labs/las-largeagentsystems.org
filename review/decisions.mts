/**
 * The decision log: which scraped papers have been sent to the canon queue,
 * which have been skipped, and when.
 *
 * One JSON object keyed by arXiv id, on disk. It is operational state, not
 * site data: nothing in `data/` reads it, no page renders it, and it is
 * gitignored. The site's own record of a pick is the Airtable Pending Queue
 * row this service creates.
 *
 * Airtable is never read to rebuild this file. The free plan caps at 1,000 API
 * calls a month (see `docs/airtable-spec-for-ai.md`), and a queue page that
 * called Airtable on every load would spend that on browsing. One call per
 * pick is the whole budget this service uses.
 *
 * Writes are atomic: a temp file in the same directory, then `rename`. A
 * process killed mid-write leaves the previous log intact rather than half a
 * file. Same reason `scripts/build-papers-map.mjs` writes once at the end.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type DecisionKind = "added" | "skipped";

export interface Decision {
  arxiv_id: string;
  decision: DecisionKind;
  /** ISO 8601, UTC. */
  decided_at: string;
  /** What the reviewer typed. "" when they typed nothing. */
  note: string;
  /**
   * Whether the Pending Queue write succeeded. Always true for "skipped",
   * which writes nothing. A false here means the paper left the queue but
   * Airtable never got it — the page says so, and Undo puts it back.
   */
  airtable_ok: boolean;
  /** Why the Airtable write failed. "" when it did not. */
  airtable_error: string;
}

export type DecisionLog = Map<string, Decision>;

/** Where the log lives. `LAS_REVIEW_STATE_DIR` moves it off the checkout. */
export function decisionsPath(stateDir: string): string {
  return join(stateDir, "decisions.json");
}

/**
 * Reads the log, or an empty one when the file is missing, empty or
 * unparseable.
 *
 * Fail soft, the same rule the site's own loaders follow: an unreadable log
 * must not stop the queue from rendering. It costs a re-decision, not a page.
 */
export function readDecisions(path: string): DecisionLog {
  if (!existsSync(path)) return new Map();
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return new Map();
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return new Map();
  }
  const log: DecisionLog = new Map();
  for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
    const row = value as Partial<Decision>;
    if (row?.decision !== "added" && row?.decision !== "skipped") continue;
    log.set(id, {
      arxiv_id: id,
      decision: row.decision,
      decided_at: typeof row.decided_at === "string" ? row.decided_at : "",
      note: typeof row.note === "string" ? row.note : "",
      airtable_ok: row.airtable_ok !== false,
      airtable_error:
        typeof row.airtable_error === "string" ? row.airtable_error : "",
    });
  }
  return log;
}

/** Writes the whole log, atomically. */
export function writeDecisions(path: string, log: DecisionLog): void {
  mkdirSync(dirname(path), { recursive: true });
  const object: Record<string, Omit<Decision, "arxiv_id">> = {};
  // Sorted, so two runs over the same decisions write the same bytes and a
  // diff of the file shows what changed rather than what moved.
  for (const id of [...log.keys()].sort()) {
    // The id is the key, so it is not repeated in the value.
    const entry = log.get(id)!;
    object[id] = {
      decision: entry.decision,
      decided_at: entry.decided_at,
      note: entry.note,
      airtable_ok: entry.airtable_ok,
      airtable_error: entry.airtable_error,
    };
  }
  const temp = `${path}.tmp`;
  writeFileSync(temp, JSON.stringify(object, null, 2) + "\n", "utf8");
  renameSync(temp, path);
}

/** Adds or replaces one decision and writes the log. Returns the new log. */
export function recordDecision(path: string, decision: Decision): DecisionLog {
  const log = readDecisions(path);
  log.set(decision.arxiv_id, decision);
  writeDecisions(path, log);
  return log;
}

/**
 * Removes one decision and writes the log. Returns the new log.
 *
 * This puts the paper back in the queue. It does not delete an Airtable row:
 * this service holds no Airtable record id, and the Pending Queue is a
 * reviewer's workspace, not a mirror of this file. The page says so beside the
 * button.
 */
export function forgetDecision(path: string, arxivId: string): DecisionLog {
  const log = readDecisions(path);
  log.delete(arxivId);
  writeDecisions(path, log);
  return log;
}
