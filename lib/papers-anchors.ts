/**
 * Groups the papers by the canon paper each one sits nearest to, and hands
 * each group a colour and a marker shape for the UMAP map.
 *
 * The grouping reads `nearest_anchor_id` / `nearest_anchor_title`, which the
 * upstream pipeline computes and `scripts/sync-las-new-papers.mjs` copies
 * across. This module does not recompute the nearest canon paper; the list
 * already prints the same field as "nearest in the canon".
 *
 * This lives apart from `papers-data.ts` for the reason `papers-series.ts`
 * does: a client component reads it, and `papers-data.ts` imports `fs` at
 * module scope. Nothing here touches the filesystem.
 *
 * ## Why four named groups and not nineteen
 *
 * Measured on the 10 days on file: 52 papers name 19 distinct canon papers,
 * the largest three at 7 papers each. A scatter plot puts any two marks side
 * by side, so its palette has to clear the colour checks over every pair, not
 * only over neighbouring slots.
 *
 * Run against the site's eight chart slots in `app/globals.css`, on both
 * surfaces, at every subset of size 3 or more: 17 of 256 subsets pass, and
 * none is larger than 4. Slots 1, 4, 5 and 6 are one of the two passing
 * 4-subsets. Their worst all-pairs separation:
 *
 * | Mode | Worst pair | ΔE (protan/deutan) | Verdict |
 * |---|---|---|---|
 * | Light | chart-5 ↔ chart-1 | 13.0 | pass |
 * | Dark | chart-6 ↔ chart-4 | 6.9 | floor band |
 *
 * The dark pair sits in the 6–8 floor band, which is legal only with a second
 * channel, so each group also carries its own marker shape. Two of the light
 * slots fall under 3:1 against the page background, which asks for visible
 * labels: the key names every group and the list below the chart prints each
 * paper's nearest canon paper in text.
 *
 * Not checked: whether a re-stepped palette would clear all pairs at 5 or more
 * slots. Feeding new candidate steps to the validator would settle it.
 *
 * `docs/synced-dataset-pattern.md`, "Colouring the map by the nearest canon
 * paper", carries the full subset comparison.
 *
 * ## What the ranking costs
 *
 * The four named groups are the four canon papers with the most papers, ties
 * broken by arXiv id. Rank, not identity, picks the colour, so a daily sync
 * that reorders the top four repaints them. Within one page the assignment is
 * fixed: it is computed over every paper held, before any query, so typing in
 * the search box never repaints a group.
 */

import type { PaperDay } from "./papers-schema";

/** Marker shapes, in the order `namedGroups` hands them out. */
export type AnchorShape = "circle" | "square" | "triangle" | "diamond";

/** Canon papers that get a colour of their own. See the note above. */
export const NAMED_ANCHORS = 4;

/** Chart slots 1, 4, 5, 6 of the eight in `app/globals.css`. */
const NAMED_COLOURS = [
  "var(--chart-1)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

const NAMED_SHAPES: AnchorShape[] = ["circle", "square", "triangle", "diamond"];

/** The group holding every canon paper outside the named four. */
export const OTHER_KEY = "__other__";
/** The group holding papers the pipeline recorded no nearest canon paper for. */
export const NONE_KEY = "__none__";

export interface AnchorGroup {
  /** Stable across a filter. An arXiv id, or one of the two catch-all keys. */
  key: string;
  /** What the key prints: a canon paper's title, or a catch-all label. */
  label: string;
  /** arXiv id of the canon paper. "" for the two catch-all groups. */
  anchorId: string;
  /** Papers in the group, over every day held, before any query. */
  count: number;
  /** Canon papers the group covers. 1 for a named group, 0 for `NONE_KEY`. */
  anchors: number;
  colour: string;
  shape: AnchorShape;
  /** Drawn as an outline rather than a fill. True only for `NONE_KEY`. */
  hollow: boolean;
}

export interface AnchorGrouping {
  /** Named groups first, then `OTHER_KEY`, then `NONE_KEY`. Empty groups are absent. */
  groups: AnchorGroup[];
  /** arxiv_id -> group key. Every paper on file appears. */
  keyOf: Map<string, string>;
  /** arxiv_id -> the canon paper's arXiv id. Papers with none are absent. */
  anchorOf: Map<string, string>;
  /** Papers over every day held. */
  papers: number;
  /** Distinct canon papers named as nearest, over those papers. */
  anchors: number;
}

/**
 * Returns the colour groups for the map, over every paper the page holds.
 *
 * Pass the unfiltered days. The result decides which colour each paper wears,
 * so recomputing it against a query would repaint the papers that survived it.
 */
export function groupAnchors(days: PaperDay[]): AnchorGrouping {
  const tally = new Map<string, { title: string; count: number }>();
  const anchorOf = new Map<string, string>();
  let papers = 0;
  let none = 0;

  for (const day of days) {
    for (const paper of day.papers) {
      papers++;
      const id = paper.nearest_anchor_id;
      const title = paper.nearest_anchor_title;
      if (!id && !title) {
        none++;
        continue;
      }
      // The id is the join key upstream writes; the title is the fallback for
      // a canon entry that is not on arXiv and so carries no id.
      const key = id || title;
      anchorOf.set(paper.arxiv_id, key);
      const seen = tally.get(key);
      if (seen) seen.count++;
      else tally.set(key, { title: title || id, count: 1 });
    }
  }

  const ranked = [...tally.entries()].sort(
    // Ties break on the key, so two anchors at the same count keep one order
    // across runs rather than following the input.
    (a, b) => b[1].count - a[1].count || (a[0] < b[0] ? -1 : 1),
  );

  const groups: AnchorGroup[] = ranked
    .slice(0, NAMED_ANCHORS)
    .map(([key, { title, count }], i) => ({
      key,
      label: title,
      anchorId: key,
      count,
      anchors: 1,
      colour: NAMED_COLOURS[i],
      shape: NAMED_SHAPES[i],
      hollow: false,
    }));

  const named = new Set(groups.map((group) => group.key));
  const rest = ranked.filter(([key]) => !named.has(key));
  if (rest.length > 0) {
    groups.push({
      key: OTHER_KEY,
      label: "Other canon paper",
      anchorId: "",
      count: rest.reduce((sum, [, { count }]) => sum + count, 0),
      anchors: rest.length,
      colour: "var(--muted)",
      shape: "circle",
      hollow: false,
    });
  }
  if (none > 0) {
    groups.push({
      key: NONE_KEY,
      label: "No canon paper recorded",
      anchorId: "",
      count: none,
      anchors: 0,
      colour: "var(--muted)",
      shape: "circle",
      hollow: true,
    });
  }

  const keyOf = new Map<string, string>();
  for (const day of days) {
    for (const paper of day.papers) {
      const anchor = anchorOf.get(paper.arxiv_id);
      keyOf.set(
        paper.arxiv_id,
        anchor === undefined ? NONE_KEY : named.has(anchor) ? anchor : OTHER_KEY,
      );
    }
  }

  return { groups, keyOf, anchorOf, papers, anchors: tally.size };
}

/** What `anchorAgreement` measured. Distances are in plot radii; the plot radius is 1. */
export interface AnchorAgreement {
  /** Papers on the map that carry a canon paper. */
  n: number;
  /** Of those, the ones whose nearest neighbour on the plot names the same one. */
  shared: number;
  /** The same share if the canon papers were dealt out at random, 0 to 1. */
  chance: number;
  /** Median distance between two papers naming the same canon paper. */
  sameMedian: number;
  /** Pairs behind `sameMedian`. */
  samePairs: number;
  /** Median distance between two papers naming different ones. */
  otherMedian: number;
  /** Pairs behind `otherMedian`. */
  otherPairs: number;
}

/**
 * Scores whether the colouring tracks the layout: does a paper's nearest
 * neighbour on the plot name the same canon paper?
 *
 * `chance` is the answer the same set gives with the canon papers dealt out at
 * random, which is the number to read the result against. A group of 7 in 52
 * produces same-anchor pairs on its own.
 *
 * Scored on the raw canon paper, not the colour group, so two papers both
 * landing in the catch-all group do not count as agreeing.
 *
 * Returns null below two anchored papers. Cost is one O(n^2) pass: 52 papers
 * ran in under a second, and the 60-day cap admits roughly 480. Not measured:
 * the cost at that size.
 */
export function anchorAgreement(
  points: ReadonlyArray<{ arxiv_id: string; x: number; y: number }>,
  anchorOf: Map<string, string>,
): AnchorAgreement | null {
  const anchored = points.filter((point) => anchorOf.has(point.arxiv_id));
  const n = anchored.length;
  if (n < 2) return null;

  const same: number[] = [];
  const other: number[] = [];
  let shared = 0;

  for (let i = 0; i < n; i++) {
    let nearest: [number, number] | null = null;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const distance = Math.hypot(
        anchored[i].x - anchored[j].x,
        anchored[i].y - anchored[j].y,
      );
      if (!nearest || distance < nearest[0]) nearest = [distance, j];
      // Each unordered pair once.
      if (j > i) {
        const alike =
          anchorOf.get(anchored[i].arxiv_id) ===
          anchorOf.get(anchored[j].arxiv_id);
        (alike ? same : other).push(distance);
      }
    }
    if (
      nearest &&
      anchorOf.get(anchored[i].arxiv_id) ===
        anchorOf.get(anchored[nearest[1]].arxiv_id)
    ) {
      shared++;
    }
  }

  const median = (values: number[]) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  return {
    n,
    shared,
    // Two papers drawn at random share an anchor this often: the same-anchor
    // pairs over all pairs.
    chance: (2 * same.length) / (n * (n - 1)),
    sameMedian: median(same),
    samePairs: same.length,
    otherMedian: median(other),
    otherPairs: other.length,
  };
}
