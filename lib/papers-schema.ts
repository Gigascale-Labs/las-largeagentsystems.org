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

/**
 * One paper's place on the UMAP map. `scripts/build-papers-map.mjs` writes it.
 *
 * Two coordinates, plus the id that joins the point to the paper the list
 * renders. The 768-dimensional vector behind the coordinates is absent: the
 * build script fetches it, projects it, and drops it.
 */
export interface PaperMapPoint {
  arxiv_id: string;
  /** "YYYY-MM-DD", the day the pipeline kept the paper. The tooltip prints it. */
  date: string;
  /** Both in [-1, 1]: centred, then scaled so the furthest paper sits at radius 1. */
  x: number;
  y: number;
}

/**
 * The map file: the points, and every parameter that produced them.
 *
 * The parameters travel with the points because the page prints them. They are
 * what makes the projection reproducible.
 */
export interface PapersMap {
  /** The embedding model upstream ran, e.g. "allenai/specter2_base". */
  model: string;
  /** Dimensions of the vector projected, e.g. 768. */
  dim: number;
  /** Papers plotted. 0 when the archive is too small to project. */
  n: number;
  /** UMAP's neighbourhood size. The build caps it at n-1. */
  n_neighbors: number;
  min_dist: number;
  /** PRNG seed. Fixed: the same papers give the same map. */
  seed: number;
  /** Below this many papers the build writes no points. */
  min_papers: number;
  /**
   * Mean share of each paper's `knn_k` nearest neighbours that survive the
   * projection, 0 to 1. Measured over all `n` papers; 0.531 at n = 52.
   *
   * The page prints it. UMAP draws a layout for any input, and this says
   * whether closeness on that layout tracks closeness in the embedding.
   * `null` when n <= `knn_k`.
   */
  knn_overlap: number | null;
  knn_k: number;
  points: PaperMapPoint[];
}
