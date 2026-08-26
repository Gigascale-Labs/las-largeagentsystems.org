#!/usr/bin/env node
/**
 * Pulls the events feed from Gigascale-Labs/las-conferences (a separate
 * automated pipeline — LLM web search + independent URL verification, see
 * that repo's SPEC.md) down to a static JSON file this site reads directly.
 *
 * That repo is public specifically so this fetch needs no auth — see
 * docs/las-conferences-events-spec-for-ai.md. The upstream feed wraps the
 * array in {generated_at, count, events}; only the array is kept here, to
 * match how sync-airtable.mjs writes a flat array.
 *
 * Usage: node scripts/sync-las-conferences-events.mjs
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_URL =
  process.env.LAS_CONFERENCES_FEED_URL ||
  "https://raw.githubusercontent.com/Gigascale-Labs/las-conferences/main/docs/events.json";
const OUTPUT_PATH =
  process.env.LAS_CONFERENCES_SYNC_OUTPUT ||
  path.join(process.cwd(), "data", "las-conferences-events.json");
// The upstream Atom feed, copied across verbatim for /events/feed.xml to
// serve. Not rebuilt here: the pipeline generates it once and every consumer
// serves those bytes — see docs/synced-dataset-pattern.md.
const FEED_SOURCE_URL =
  process.env.LAS_CONFERENCES_ATOM_URL ||
  "https://raw.githubusercontent.com/Gigascale-Labs/las-conferences/main/docs/events.xml";
const FEED_OUTPUT_PATH =
  process.env.LAS_CONFERENCES_ATOM_OUTPUT ||
  path.join(process.cwd(), "data", "las-conferences-events.xml");

const res = await fetch(SOURCE_URL);
if (!res.ok) {
  console.error(`Fetch failed ${res.status}: ${await res.text()}`);
  process.exit(1);
}

const body = await res.json();
const events = Array.isArray(body.events) ? body.events : [];

await writeFile(OUTPUT_PATH, JSON.stringify(events, null, 2) + "\n");
console.log(`Wrote ${events.length} events to ${OUTPUT_PATH}`);

// The Atom feed is newer than the JSON one upstream, so a 404 here is a
// pipeline that has not published it yet, not a broken sync. Warn and carry
// on: the events themselves are already written, and the feed route serves a
// valid empty document until the file appears.
const feedRes = await fetch(FEED_SOURCE_URL);
if (feedRes.ok) {
  await writeFile(FEED_OUTPUT_PATH, await feedRes.text());
  console.log(`Wrote the upstream Atom feed verbatim to ${FEED_OUTPUT_PATH}`);
} else {
  console.warn(
    `No Atom feed upstream yet (${feedRes.status} for ${FEED_SOURCE_URL}); ` +
      `leaving ${FEED_OUTPUT_PATH} as it is.`,
  );
}
