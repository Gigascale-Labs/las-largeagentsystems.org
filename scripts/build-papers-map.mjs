#!/usr/bin/env node
/**
 * Writes `data/las-new-papers-map.json`: two coordinates per paper, from UMAP
 * over the embedding vectors the upstream pipeline publishes.
 *
 * Input, two files:
 *
 * | File | Supplies |
 * |---|---|
 * | `data/las-new-papers.json` (this repo) | the days and paper ids the page lists |
 * | `data/embeddings/YYYY-MM-DD.json` (upstream) | one 768-float L2-normalised vector per kept paper |
 *
 * Output: `{model, dim, n, n_neighbors, min_dist, seed, min_papers,
 * knn_overlap, knn_k, points: [{arxiv_id, date, x, y}]}`.
 *
 * This script does not store the vectors. Measured on the 10 days on file: 52
 * vectors take 337KB, the output takes 6.0KB. It fetches them, projects them,
 * and drops them, which is the rule the sync follows for the fields it trims.
 *
 * It is a separate script from `sync-las-new-papers.mjs`, which carries no
 * dependencies by the rule in `docs/synced-dataset-pattern.md`. This one needs
 * `umap-js`. A failure here leaves `data/las-new-papers.json` untouched.
 *
 * Two properties, both measured:
 *
 * 1. **Determinism.** The PRNG takes a fixed seed. Three consecutive runs over
 *    the same 52 papers wrote byte-identical files. Without it every daily run
 *    would rewrite the file.
 * 2. **Alignment to the previous map.** UMAP has no incremental mode: refitting
 *    with papers added moves every paper, not only the new ones. This script
 *    rotates and reflects the new layout onto the one on disk, over the papers
 *    they share. Measured displacement of shared papers, in plot radii, where
 *    the plot radius is 1:
 *
 *    | Papers added | n shared | Aligned median | Unaligned median | Source |
 *    |---|---|---|---|---|
 *    | 6 on 46 | 46 | 0.405 | 1.090 | observed, a real daily refit |
 *    | 2 on 44 | 44 | 0.247 | 0.622 | simulated, by withholding 2 papers |
 *    | 10 on 36 | 36 | 0.336 | 0.369 | simulated, by withholding a day |
 *
 *    Rotation and reflection are the only parameters it removes. It does not
 *    remove the rearrangement, which dominates at the 10-paper delta.
 *
 * Not checked: behaviour above 52 papers. The 60-day sync cap admits roughly
 * 480. Running the script against a synthetic 480-vector input would settle
 * both the runtime and whether `MIN_PAPERS` and `N_NEIGHBORS` still hold.
 *
 * Usage: node scripts/build-papers-map.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { UMAP } from "umap-js";

const SOURCE_BASE =
  process.env.LAS_NEW_PAPERS_BASE_URL ||
  "https://raw.githubusercontent.com/Gigascale-Labs/las-new-papers/main/";
const PAPERS_PATH =
  process.env.LAS_NEW_PAPERS_SYNC_OUTPUT ||
  path.join(process.cwd(), "data", "las-new-papers.json");
const OUTPUT_PATH =
  process.env.LAS_NEW_PAPERS_MAP_OUTPUT ||
  path.join(process.cwd(), "data", "las-new-papers-map.json");

/**
 * Fewer than 12 vectors and this script writes no points; the page then
 * renders no map.
 *
 * Assumed, not measured: 12 is below UMAP's default `nNeighbors` of 15, and I
 * picked it as the point where the neighbourhood graph stops describing the
 * papers. I do not know the right threshold. Sweeping n from 5 to 60 against
 * `knnOverlap` would settle it.
 */
const MIN_PAPERS = 12;

/** UMAP defaults. `N_NEIGHBORS` caps at n-1 at fit time. */
const N_NEIGHBORS = 15;
const MIN_DIST = 0.1;
const SEED = 20260826;

/** Neighbourhood size `knnOverlap` scores the projection over. */
const OVERLAP_K = 10;

/** mulberry32: a seeded PRNG, so two runs over the same papers give the same map. */
function seededRandom(seed) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Cosine distance, the metric the upstream pipeline uses (`embed.py`
 * normalises at the source, so every similarity there is a dot product).
 *
 * On unit vectors this ranks identically to Euclidean, which is umap-js's
 * default. Naming it keeps both repositories describing one geometry.
 */
function cosineDistance(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return 1 - dot;
}

function sourceUrl(relative) {
  const base = SOURCE_BASE.endsWith("/") ? SOURCE_BASE : `${SOURCE_BASE}/`;
  return new URL(relative, base).toString();
}

/**
 * Returns one upstream file as parsed JSON, or null when it is absent.
 *
 * A base that is not http(s) names a local directory, which is how a run
 * against a checkout of the upstream repo works. Node's `fetch` does not
 * support `file:`, so this branches rather than using a URL scheme.
 */
async function fetchJson(relative) {
  if (!/^https?:/i.test(SOURCE_BASE)) {
    const file = path.join(SOURCE_BASE, relative);
    if (!existsSync(file)) return null;
    return JSON.parse(await readFile(file, "utf8"));
  }
  const res = await fetch(sourceUrl(relative));
  if (!res.ok) return null;
  return res.json();
}

/** Returns the days and paper ids the page shows, newest day first. */
async function readSyncedDays() {
  if (!existsSync(PAPERS_PATH)) {
    console.error(
      `${PAPERS_PATH} is missing. Run sync:las-new-papers first: the map covers ` +
        `the papers that page lists, so the sync decides which days to project.`,
    );
    process.exit(1);
  }
  const parsed = JSON.parse(await readFile(PAPERS_PATH, "utf8"));
  if (!Array.isArray(parsed)) {
    console.error(`${PAPERS_PATH} is not an array of days.`);
    process.exit(1);
  }
  return parsed;
}

/** Returns the previous map keyed by id, or an empty map on a first run. */
async function readPreviousPoints() {
  if (!existsSync(OUTPUT_PATH)) return new Map();
  try {
    const parsed = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
    const points = Array.isArray(parsed?.points) ? parsed.points : [];
    return new Map(points.map((p) => [p.arxiv_id, [p.x, p.y]]));
  } catch {
    // An unreadable previous map drops the alignment. The run continues.
    return new Map();
  }
}

function centroid(points) {
  const sum = points.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

/**
 * Returns the mean overlap between each paper's k nearest neighbours before and
 * after the projection. 1.0 means every paper kept all k; 0.0 means none kept
 * any.
 *
 * UMAP produces a layout for any input. This measures whether that layout puts
 * papers near each other because they are near each other in the embedding.
 * The page prints the result. Cost is one O(n^2) pass: 52 papers took under a
 * second.
 */
function knnOverlap(vectors, points, k) {
  const n = vectors.length;
  if (n <= k) return null;

  const nearest = (distance) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const ranked = [];
      for (let j = 0; j < n; j++) {
        if (i !== j) ranked.push([distance(i, j), j]);
      }
      ranked.sort((a, b) => a[0] - b[0]);
      out.push(new Set(ranked.slice(0, k).map(([, j]) => j)));
    }
    return out;
  };

  const high = nearest((i, j) => cosineDistance(vectors[i], vectors[j]));
  const low = nearest((i, j) =>
    Math.hypot(points[i][0] - points[j][0], points[i][1] - points[j][1]),
  );

  let total = 0;
  for (let i = 0; i < n; i++) {
    let shared = 0;
    for (const j of low[i]) if (high[i].has(j)) shared++;
    total += shared / k;
  }
  return total / n;
}

/**
 * Rescales a centred layout so the furthest paper sits at radius 1.
 *
 * One factor covers both axes. Scaling x and y separately would stretch the
 * layout, and distance between points is the only quantity the plot carries.
 */
function normalise(points) {
  const [cx, cy] = centroid(points);
  const centred = points.map(([x, y]) => [x - cx, y - cy]);
  const radius = Math.max(
    ...centred.map(([x, y]) => Math.hypot(x, y)),
    Number.EPSILON,
  );
  return centred.map(([x, y]) => [x / radius, y / radius]);
}

/**
 * Rotates and, where that fits better, reflects `points` onto `previous`.
 *
 * Both layouts arrive centred and scaled, leaving one angle and one mirror.
 * Those two transforms change a UMAP layout's orientation and nothing else.
 * `ids` indexes `points`; `previous` maps an id to the last run's coordinates
 * and need not cover every id.
 *
 * Returns `points` unchanged when fewer than three papers overlap. Two points
 * do not fix an angle.
 */
function alignToPrevious(points, ids, previous) {
  const pairs = [];
  for (let i = 0; i < ids.length; i++) {
    const was = previous.get(ids[i]);
    if (was) pairs.push([points[i], was]);
  }
  if (pairs.length < 3) return points;

  const anchorPrev = normalise(pairs.map(([, was]) => was));

  let best = null;
  for (const mirror of [1, -1]) {
    // The best rotation for a set of 2-D point pairs is a closed form: the
    // angle of the summed cross and dot products. No SVD needed at this size.
    let dot = 0;
    let cross = 0;
    pairs.forEach(([now], i) => {
      const [nx, ny] = [now[0], now[1] * mirror];
      const [px, py] = anchorPrev[i];
      dot += nx * px + ny * py;
      cross += nx * py - ny * px;
    });
    const angle = Math.atan2(cross, dot);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const residual = pairs.reduce((sum, [now], i) => {
      const [nx, ny] = [now[0], now[1] * mirror];
      const [px, py] = anchorPrev[i];
      return sum + (nx * cos - ny * sin - px) ** 2 + (nx * sin + ny * cos - py) ** 2;
    }, 0);
    if (!best || residual < best.residual) best = { residual, cos, sin, mirror };
  }

  // Observed: a rerun over unchanged papers refits to the same layout, and the
  // best transform onto it comes back as an angle near 1e-9 rather than exactly
  // 0. That arithmetic moved one of 46 coordinates across the 4th decimal place
  // and rewrote the file. Snapping to the identity below 1e-6 rad stops it.
  // 1e-6 rad moves a point at radius 1 by 1e-6, four orders of magnitude below
  // the 1e-4 written out.
  if (best.mirror === 1 && Math.abs(best.sin) < 1e-6) return points;

  return points.map(([x, y]) => {
    const my = y * best.mirror;
    return [x * best.cos - my * best.sin, x * best.sin + my * best.cos];
  });
}

// ---- run ------------------------------------------------------------------

const days = await readSyncedDays();
const wanted = new Map();               // arxiv_id -> date, in page order
for (const day of days) {
  for (const paper of day.papers ?? []) {
    if (paper.arxiv_id && !wanted.has(paper.arxiv_id)) {
      wanted.set(paper.arxiv_id, day.date);
    }
  }
}

const ids = [];
const dates = [];
const vectors = [];
let model = "";
let dim = 0;
const missingDays = [];

for (const day of days) {
  const payload = await fetchJson(`data/embeddings/${day.date}.json`);
  if (!payload || typeof payload.vectors !== "object") {
    // Two causes: the upstream pipeline published the day before it wrote
    // vectors, or the day's vector file has not landed yet. Either way the
    // day's papers stay in the list and stay off the map.
    if ((day.papers ?? []).length > 0) missingDays.push(day.date);
    continue;
  }
  model ||= String(payload.model ?? "");
  for (const [arxivId, vector] of Object.entries(payload.vectors)) {
    if (!wanted.has(arxivId) || !Array.isArray(vector)) continue;
    if (dim === 0) dim = vector.length;
    if (vector.length !== dim) continue;   // a model change mid-archive
    ids.push(arxivId);
    dates.push(wanted.get(arxivId));
    vectors.push(vector.map(Number));
  }
}

if (missingDays.length > 0) {
  console.warn(
    `No vectors for ${missingDays.length} day(s) with papers: ${missingDays.join(", ")}`,
  );
}

let points = [];
let overlap = null;
const nNeighbors = Math.max(2, Math.min(N_NEIGHBORS, vectors.length - 1));

if (vectors.length >= MIN_PAPERS) {
  const umap = new UMAP({
    nComponents: 2,
    nNeighbors,
    minDist: MIN_DIST,
    distanceFn: cosineDistance,
    random: seededRandom(SEED),
  });
  const fitted = normalise(umap.fit(vectors));
  // Scored before alignment. Rotation and reflection do not change which
  // papers are near which.
  overlap = knnOverlap(vectors, fitted, OVERLAP_K);
  const aligned = alignToPrevious(fitted, ids, await readPreviousPoints());
  points = aligned.map(([x, y], i) => ({
    arxiv_id: ids[i],
    date: dates[i],
    // 4 dp is 0.005% of the plot's width, under one pixel on a 640px chart,
    // and it stops floating-point noise rewriting the file.
    x: Number(x.toFixed(4)),
    y: Number(y.toFixed(4)),
  }));
}

const output = {
  model,
  dim,
  n: points.length,
  n_neighbors: points.length ? nNeighbors : 0,
  min_dist: MIN_DIST,
  seed: SEED,
  min_papers: MIN_PAPERS,
  /** See `knnOverlap`. `null` when there are too few papers to score. */
  knn_overlap: overlap === null ? null : Number(overlap.toFixed(3)),
  knn_k: overlap === null ? 0 : OVERLAP_K,
  points,
};

await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + "\n");

if (points.length === 0) {
  console.log(
    `Wrote an empty map to ${OUTPUT_PATH}: ${vectors.length} vector(s), ` +
      `under the minimum of ${MIN_PAPERS}.`,
  );
} else {
  console.log(
    `Wrote ${points.length} point(s) to ${OUTPUT_PATH} ` +
      `(${model || "unknown model"}, ${dim}d, nNeighbors=${nNeighbors}, ` +
      `${OVERLAP_K}-NN overlap ${output.knn_overlap ?? "n/a"}).`,
  );
}
