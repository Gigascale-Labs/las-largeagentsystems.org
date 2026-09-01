/**
 * Turns the days on file plus the decision log into what the page shows:
 * the papers still to review, and the last few already decided.
 *
 * Pure. It reads no file and calls nothing. `server.mts` loads the days with
 * `getPaperDays()` — which sanitises every string — and the log with
 * `readDecisions`, then calls this.
 */

import type { Paper, PaperDay } from "../lib/papers-schema.ts";
import type { DecisionLog } from "./decisions.mts";
import type { Decision } from "./decisions.mts";

/** One paper, with the day the pipeline kept it. */
export interface QueueItem {
  paper: Paper;
  /** "YYYY-MM-DD". */
  date: string;
}

/** One already-decided paper, for the Undo list. */
export interface DecidedItem extends QueueItem {
  decision: Decision;
}

export interface Queue {
  /** Papers with no decision, newest day first, in the order the day lists them. */
  undecided: QueueItem[];
  /** The most recently decided papers still on file, newest decision first. */
  recent: DecidedItem[];
  /** Papers on file. */
  total: number;
  added: number;
  skipped: number;
  /**
   * Decisions whose paper has dropped off the 60-day window. Counted, not
   * listed: the log outlives the days on file, so these are real decisions
   * with nothing left to show.
   */
  offWindow: number;
}

/**
 * Returns the queue.
 *
 * `recentLimit` caps the Undo list. It exists so a misclick is reversible
 * without the page growing without bound as the log fills up.
 */
export function buildQueue(
  days: PaperDay[],
  log: DecisionLog,
  recentLimit = 12,
): Queue {
  const undecided: QueueItem[] = [];
  const decided: DecidedItem[] = [];
  const onFile = new Set<string>();

  for (const day of days) {
    for (const paper of day.papers) {
      // A paper announced on two days would otherwise appear twice. The
      // pipeline drops papers it has already shown, so this is a guard, not
      // an observed case.
      if (onFile.has(paper.arxiv_id)) continue;
      onFile.add(paper.arxiv_id);
      const item: QueueItem = { paper, date: day.date };
      const decision = log.get(paper.arxiv_id);
      if (decision) decided.push({ ...item, decision });
      else undecided.push(item);
    }
  }

  let added = 0;
  let skipped = 0;
  let offWindow = 0;
  for (const [id, decision] of log) {
    if (decision.decision === "added") added++;
    else skipped++;
    if (!onFile.has(id)) offWindow++;
  }

  decided.sort((a, b) =>
    // Newest decision first. An empty `decided_at` sorts last rather than
    // throwing off the order.
    (b.decision.decided_at || "").localeCompare(a.decision.decided_at || ""),
  );

  return {
    undecided,
    recent: decided.slice(0, recentLimit),
    total: onFile.size,
    added,
    skipped,
    offWindow,
  };
}
