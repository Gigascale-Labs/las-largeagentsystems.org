import { existsSync, readFileSync } from "fs";
import { join } from "path";
// Explicit .ts extension (unlike canon-data.ts's "./csv"): this module is
// exercised directly by Node's type-stripping test runner
// (tests/papers-data.test.mts), which needs it to resolve the import —
// tsconfig's allowImportingTsExtensions exists for exactly this case.
import { sanitizeText } from "./sanitize.ts";
import type { KeptPerDayPoint, Paper, PaperDay } from "./papers-schema";

const PAPERS_JSON_PATH = join(process.cwd(), "data", "las-new-papers.json");

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

/**
 * Papers kept on each day held, oldest first — the order a time axis reads
 * in. `getPaperDays` returns days newest first, which is the order the page
 * lists them; a chart reversing that in the component would put the newest
 * day on the left.
 *
 * Days the pipeline did not run are absent from the data and stay absent
 * here: arXiv announces nothing on some days, and one bar per day on file is
 * a count of days the pipeline read, not a calendar. A day it ran and kept
 * nothing is a real zero and is plotted.
 */
export function keptPerDaySeries(days: PaperDay[]): KeptPerDayPoint[] {
  return days
    .map((day) => ({ date: day.date, kept: day.papers.length }))
    .reverse();
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
