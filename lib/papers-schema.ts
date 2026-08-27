/**
 * Schema for the daily arXiv reading list synced from
 * Gigascale-Labs/las-new-papers (`data/las-new-papers.json`). This is the
 * trimmed shape `scripts/sync-las-new-papers.mjs` writes, not the upstream
 * day file: the upstream `papers[]` entry carries an abstract, categories,
 * and a set of scoring fields that the sync drops.
 *
 * Nothing here argues for a paper. `significance`, `novelty`, `similarity`,
 * `screen_reason`, and each question's approachability `label` and `reason`
 * exist upstream and are deliberately absent from this type, because the
 * upstream project's editorial rule (its web/README.md) is that the title,
 * the one-sentence summary and the questions are the whole case for reading
 * a paper. They are stripped in the sync script, so they cannot reach a page
 * even by accident.
 */

/** Run statistics for one day. Counts of papers, not judgements about them. */
export interface DayCounts {
  /** New papers listed by arXiv across the seven watched lists. */
  fetched?: number;
  /** Of those, the ones this pipeline had not seen before. */
  unseen?: number;
  /** Of those, the ones actually put through the screen. */
  screened?: number;
  /** Of those, the ones judged on topic. */
  relevant?: number;
  /** Of those, the ones published here. */
  kept?: number;
  /** Canon papers used as the similarity anchors that day. */
  anchors?: number;
}

export interface Paper {
  /** e.g. "2608.24400". */
  arxiv_id: string;
  title: string;
  authors: string[];
  /** The arXiv abstract page. */
  url: string;
  /** Neutral one-sentence summary, written by a model. */
  one_sentence: string;
  /** arXiv id of the nearest canon paper — the bearing, not a score. */
  nearest_anchor_id: string;
  nearest_anchor_title: string;
  /** Just the question text: the upstream {question, label, reason} objects
   * are reduced to their `question` string by the sync script. */
  open_questions: string[];
}

export interface PaperDay {
  /** "YYYY-MM-DD". Doubles as the page anchor id, so `#YYYY-MM-DD` deep
   * links from the feed land on the right day without translation. */
  date: string;
  counts: DayCounts;
  /** Empty on a day when nothing passed the screen — a normal outcome, and
   * a day arXiv did not publish at all (weekends) may be absent entirely. */
  papers: Paper[];
}

/** One day as the papers-per-day chart plots it. See `keptPerDaySeries`. */
export interface KeptPerDayPoint {
  /** "YYYY-MM-DD". */
  date: string;
  /** Papers kept that day. A day the pipeline ran and kept none is 0. */
  kept: number;
}
