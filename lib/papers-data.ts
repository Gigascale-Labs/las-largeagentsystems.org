import { existsSync, readFileSync } from "fs";
import { join } from "path";
// Explicit .ts extension (unlike canon-data.ts's "./csv"): this module is
// exercised directly by Node's type-stripping test runner
// (tests/papers-data.test.mts), which needs it to resolve the import —
// tsconfig's allowImportingTsExtensions exists for exactly this case.
import { sanitizeText } from "./sanitize.ts";
import type {
  Paper,
  PaperDay,
  PaperMapPoint,
  PapersMap,
} from "./papers-schema";

const PAPERS_JSON_PATH = join(process.cwd(), "data", "las-new-papers.json");
const PAPERS_MAP_PATH = join(process.cwd(), "data", "las-new-papers-map.json");

/**
 * Absolute URLs, because a feed reader has no page to resolve a relative one
 * against. Kept here so the page, its metadata and the feed route cannot
 * disagree about where they live.
 */
export const PAPERS_PAGE_URL = "https://largeagentsystems.org/papers";
export const PAPERS_FEED_URL = "https://largeagentsystems.org/papers/feed.xml";
export const PAPERS_SOURCE_REPO_URL =
  "https://github.com/Gigascale-Labs/las-new-papers";

/**
 * Every string below is third-party text twice over: an arXiv title, author
 * list and abstract written by the paper's authors, then read by a model that
 * wrote the one-sentence summary and the questions. Neither writer is this
 * site. `sanitizeText` (the same cleaning `docs/untrusted-input.md` requires
 * for anything from outside the site) strips invisible characters —
 * zero-width spaces, bidirectional overrides that reverse how a title
 * displays, the Unicode Tags block that hides instructions inside ordinary
 * text — strips control codes, collapses whitespace, and caps length, before
 * the data reaches a page or the Atom feed.
 *
 * The caps are set well above the longest real value in the current data (6
 * days, 18 papers: title 110, author 22, one_sentence 539, question 262,
 * nearest_anchor_title 122, arxiv_id 10), so they clip abuse, not ordinary
 * text.
 */
const TEXT_FIELD_LIMITS = {
  arxiv_id: 40,
  title: 500,
  author: 200,
  one_sentence: 1000,
  question: 1000,
  nearest_anchor_id: 40,
  nearest_anchor_title: 500,
  date: 20,
  url: 2048,
} as const;

/**
 * Nothing here is fetched by the server, so `safe-fetch.ts`'s URL rules
 * (which exist because the contribute form makes this server fetch a
 * submitted URL) do not apply. These values become `href`s only — so the one
 * check that matters is the scheme, which keeps `javascript:` and `data:` out
 * of a link. Anything else becomes an empty string and the link is not
 * rendered.
 */
function safeUrl(value: string): string {
  const cleaned = sanitizeText(value, TEXT_FIELD_LIMITS.url);
  return /^https?:\/\//i.test(cleaned) ? cleaned : "";
}

function sanitizePaper(raw: Paper): Paper {
  return {
    arxiv_id: sanitizeText(raw.arxiv_id, TEXT_FIELD_LIMITS.arxiv_id),
    title: sanitizeText(raw.title, TEXT_FIELD_LIMITS.title),
    authors: (Array.isArray(raw.authors) ? raw.authors : []).map((author) =>
      sanitizeText(author, TEXT_FIELD_LIMITS.author),
    ),
    url: safeUrl(raw.url),
    one_sentence: sanitizeText(raw.one_sentence, TEXT_FIELD_LIMITS.one_sentence),
    nearest_anchor_id: sanitizeText(
      raw.nearest_anchor_id,
      TEXT_FIELD_LIMITS.nearest_anchor_id,
    ),
    nearest_anchor_title: sanitizeText(
      raw.nearest_anchor_title,
      TEXT_FIELD_LIMITS.nearest_anchor_title,
    ),
    open_questions: (Array.isArray(raw.open_questions)
      ? raw.open_questions
      : []
    ).map((question) => sanitizeText(question, TEXT_FIELD_LIMITS.question)),
  };
}

function sanitizeDay(raw: PaperDay): PaperDay {
  return {
    date: sanitizeText(raw.date, TEXT_FIELD_LIMITS.date),
    counts: raw.counts ?? {},
    papers: (Array.isArray(raw.papers) ? raw.papers : []).map(sanitizePaper),
  };
}

/**
 * Reads the daily arXiv reading list synced from Gigascale-Labs/las-new-papers
 * (`data/las-new-papers.json`, updated daily — see
 * `scripts/sync-las-new-papers.mjs`). Days are newest first, as written.
 * Returns `[]` if the file is missing, empty, or unparseable — like
 * `events-data.ts` there is no fallback source for this dataset. Server-only
 * (uses `fs`). `path` defaults to the real synced file; pass an explicit path
 * only from tests.
 */
export function getPaperDays(path: string = PAPERS_JSON_PATH): PaperDay[] {
  if (!existsSync(path)) return [];
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (!Array.isArray(parsed)) return [];
    return (parsed as PaperDay[])
      .filter((day) => day && typeof day === "object")
      .map(sanitizeDay);
  } catch {
    return [];
  }
}

/**
 * The oldest day on file: where the archive begins, not where it ends. Used
 * for the page's "dataset starts" line, which must never be hardcoded — the
 * sync caps at 60 days, so the start date moves.
 */
export function getOldestDate(days: PaperDay[]): string {
  return days.length ? days[days.length - 1].date : "";
}

/** Total papers kept across every day held. */
export function countPapers(days: PaperDay[]): number {
  return days.reduce((total, day) => total + day.papers.length, 0);
}

/** Total open questions across every day held. */
export function countQuestions(days: PaperDay[]): number {
  return days.reduce(
    (total, day) =>
      total +
      day.papers.reduce(
        (dayTotal, paper) => dayTotal + paper.open_questions.length,
        0,
      ),
    0,
  );
}

/** Smallest, largest and median of a list. `null` when the list is empty. */
export type Spread = { min: number; max: number; median: number } | null;

function spread(values: number[]): Spread {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median:
      sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid],
  };
}

export type PapersSummary = {
  days: number;
  oldest: string;
  newest: string;
  fetched: number;
  screened: number;
  relevant: number;
  kept: number;
  questions: number;
  keptPerDay: Spread;
  questionsPerPaper: Spread;
};

/**
 * The numbers the page states about itself, totalled from the days on file.
 *
 * Computed rather than written down: the sync caps at 60 days, so every one
 * of these moves. `fetched`, `screened` and `relevant` are the pipeline's own
 * per-run records, carried through the sync untouched; `kept`, `questions`
 * and both spreads are counted here from the papers actually held.
 */
export function summarisePapers(days: PaperDay[]): PapersSummary {
  const total = (key: "fetched" | "screened" | "relevant") =>
    days.reduce((sum, day) => sum + (day.counts?.[key] ?? 0), 0);

  return {
    days: days.length,
    oldest: getOldestDate(days),
    newest: days.length ? days[0].date : "",
    fetched: total("fetched"),
    screened: total("screened"),
    relevant: total("relevant"),
    kept: countPapers(days),
    questions: countQuestions(days),
    keptPerDay: spread(days.map((day) => day.papers.length)),
    questionsPerPaper: spread(
      days.flatMap((day) => day.papers.map((p) => p.open_questions.length)),
    ),
  };
}

/**
 * The empty map. `getPapersMap` returns it when the file is missing,
 * unparseable, or holds nothing plottable, so the page renders one shape
 * rather than testing for null.
 */
const EMPTY_MAP: PapersMap = {
  model: "",
  dim: 0,
  n: 0,
  n_neighbors: 0,
  min_dist: 0,
  seed: 0,
  min_papers: 0,
  knn_overlap: null,
  knn_k: 0,
  points: [],
};

/** Returns a finite in-range coordinate, or `null`, which drops the point. */
function coordinate(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  // The build script centres and scales so the furthest paper sits at radius 1,
  // so no value it writes exceeds 1. A single point at 1e9 would compress the
  // other 45 into one pixel once the axes fit to it.
  return Math.abs(value) <= 1.5 ? value : null;
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/**
 * Reads the UMAP projection of the reading list from
 * `data/las-new-papers-map.json`, which `scripts/build-papers-map.mjs`
 * rebuilds after every sync. Server-only: uses `fs`.
 *
 * Two filters drop a point:
 *
 * | Filter | Drops |
 * |---|---|
 * | Coordinates | a point whose x or y is not a finite number in [-1.5, 1.5] |
 * | Membership | a point whose `arxiv_id` names no paper in `days` |
 *
 * The second keeps the map and the list agreeing. Clicking a dot scrolls to
 * that paper's card, and a point with no card scrolls nowhere.
 *
 * `path` defaults to the real file. Pass an explicit path only from tests.
 */
export function getPapersMap(
  days: PaperDay[],
  path: string = PAPERS_MAP_PATH,
): PapersMap {
  if (!existsSync(path)) return EMPTY_MAP;

  const known = new Set(
    days.flatMap((day) => day.papers.map((paper) => paper.arxiv_id)),
  );

  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (!parsed || typeof parsed !== "object") return EMPTY_MAP;

    const raw: unknown[] = Array.isArray(parsed.points) ? parsed.points : [];
    const points: PaperMapPoint[] = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const point = item as Record<string, unknown>;
      const arxivId = sanitizeText(
        String(point.arxiv_id ?? ""),
        TEXT_FIELD_LIMITS.arxiv_id,
      );
      const x = coordinate(point.x);
      const y = coordinate(point.y);
      if (!arxivId || !known.has(arxivId) || x === null || y === null) continue;
      points.push({
        arxiv_id: arxivId,
        date: sanitizeText(String(point.date ?? ""), TEXT_FIELD_LIMITS.date),
        x,
        y,
      });
    }

    return {
      model: sanitizeText(String(parsed.model ?? ""), TEXT_FIELD_LIMITS.title),
      dim: number(parsed.dim),
      n: points.length,
      n_neighbors: number(parsed.n_neighbors),
      min_dist: number(parsed.min_dist),
      seed: number(parsed.seed),
      min_papers: number(parsed.min_papers),
      // A share. Anything outside 0..1 is not one, and the page prints nothing.
      knn_overlap:
        typeof parsed.knn_overlap === "number" &&
        Number.isFinite(parsed.knn_overlap) &&
        parsed.knn_overlap >= 0 &&
        parsed.knn_overlap <= 1
          ? parsed.knn_overlap
          : null,
      knn_k: number(parsed.knn_k),
      points,
    };
  } catch {
    return EMPTY_MAP;
  }
}
