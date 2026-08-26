#!/usr/bin/env node
/**
 * Pulls the daily arXiv reading list from Gigascale-Labs/las-new-papers (a
 * separate automated pipeline — a model reads every new paper in seven arXiv
 * lists, keeps the few that matter for one research profile, and writes down
 * the questions they leave open) down to a static JSON file this site reads
 * directly.
 *
 * That repo is public specifically so this fetch needs no auth, the same way
 * sync-las-conferences-events.mjs reads las-conferences.
 *
 * Two things this script deliberately does NOT copy across:
 *
 * 1. `screened` — the per-paper screening trace, which is most of the ~225KB
 *    of each day file and is never displayed.
 * 2. Everything that argues for a paper: `significance`, `novelty`,
 *    `similarity`, `screen_reason`, and each question's `label`
 *    ("approachable" / "not approachable") and `reason`. That is the upstream
 *    project's editorial rule (see its web/README.md): the title, the
 *    one-sentence summary and the questions are the whole case for reading a
 *    paper. Stripping them here means they cannot leak into a page or a feed
 *    later, whatever anyone renders.
 *
 * The Atom feed is copied across verbatim, not rebuilt. The pipeline already
 * generates it (arxiv_feed/feed.py) and now addresses it at this site
 * (feed.site_url / feed.self_url in its config.yaml), so regenerating it here
 * would be a second implementation of the same document, free to drift.
 *
 * Usage: node scripts/sync-las-new-papers.mjs
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_BASE =
  process.env.LAS_NEW_PAPERS_BASE_URL ||
  "https://raw.githubusercontent.com/Gigascale-Labs/las-new-papers/main/";
const OUTPUT_PATH =
  process.env.LAS_NEW_PAPERS_SYNC_OUTPUT ||
  path.join(process.cwd(), "data", "las-new-papers.json");
const FEED_OUTPUT_PATH =
  process.env.LAS_NEW_PAPERS_FEED_OUTPUT ||
  path.join(process.cwd(), "data", "las-new-papers-feed.xml");

/** Matches the upstream feed's own cap (arxiv_feed/feed.py MAX_ENTRIES). */
const MAX_DAYS = 60;

function sourceUrl(relative) {
  // Force the trailing slash: without it `new URL` would resolve against the
  // base's parent directory, which silently drops the last path segment.
  const base = SOURCE_BASE.endsWith("/") ? SOURCE_BASE : `${SOURCE_BASE}/`;
  return new URL(relative, base).toString();
}

/**
 * The days the pipeline has published, newest first.
 *
 * The Atom feed is the pipeline's own index of published days: each
 * `<entry><id>` ends in `#YYYY-MM-DD`. Reading it beats listing the directory
 * through the GitHub API, which is rate-limited for anonymous callers.
 */
async function fetchFeed() {
  const url = sourceUrl("data/feed.xml");
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Feed fetch failed ${res.status} for ${url}: ${await res.text()}`);
    process.exit(1);
  }
  return res.text();
}

/** The days the pipeline has published, newest first, read off the feed. */
function listDays(xml) {
  const days = [...xml.matchAll(/<id>[^<]*#(\d{4}-\d{2}-\d{2})<\/id>/g)].map(
    (match) => match[1],
  );
  return [...new Set(days)].sort().reverse().slice(0, MAX_DAYS);
}

/** Keep only the fields the page and the feed render. */
function trimPaper(paper) {
  return {
    arxiv_id: paper.arxiv_id ?? "",
    title: paper.title ?? "",
    authors: Array.isArray(paper.authors) ? paper.authors : [],
    url: paper.url ?? "",
    one_sentence: paper.one_sentence ?? "",
    nearest_anchor_id: paper.nearest_anchor_id ?? "",
    nearest_anchor_title: paper.nearest_anchor_title ?? "",
    // Each upstream question is {question, label, reason}. Only the question
    // survives — see the header comment.
    open_questions: (Array.isArray(paper.open_questions)
      ? paper.open_questions
      : []
    ).map((q) => q?.question ?? ""),
  };
}

function trimDay(day) {
  return {
    date: day.date ?? "",
    counts: day.counts ?? {},
    papers: (Array.isArray(day.papers) ? day.papers : []).map(trimPaper),
  };
}

async function fetchDay(date) {
  const url = sourceUrl(`data/${date}.json`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return trimDay(await res.json());
}

const feedXml = await fetchFeed();
const dates = listDays(feedXml);
const days = [];
for (const date of dates) {
  try {
    days.push(await fetchDay(date));
  } catch (err) {
    // One unreadable day must not lose every other day, the same way the
    // upstream feed rebuild skips a day file it cannot parse.
    console.warn(`Skipping ${date}: ${err.message}`);
  }
}

await writeFile(OUTPUT_PATH, JSON.stringify(days, null, 2) + "\n");
await writeFile(FEED_OUTPUT_PATH, feedXml);
const papers = days.reduce((total, day) => total + day.papers.length, 0);
console.log(`Wrote ${days.length} days (${papers} papers) to ${OUTPUT_PATH}`);
console.log(`Wrote the upstream feed verbatim to ${FEED_OUTPUT_PATH}`);
