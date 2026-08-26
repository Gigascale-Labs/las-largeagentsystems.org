import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { EVENTS_FEED_URL, EVENTS_PAGE_URL } from "@/lib/events-data";

/**
 * `/events/feed.xml` — the upstream Atom feed, served under this domain.
 *
 * The document is not built here. `Gigascale-Labs/las-conferences` generates
 * it (`src/tracker/feed.py`) beside the JSON feed, and
 * `scripts/sync-las-conferences-events.mjs` copies it across verbatim. Same
 * arrangement as `/papers/feed.xml`, and the same reason: one document,
 * generated once, so two implementations cannot drift. See
 * `docs/synced-dataset-pattern.md`.
 *
 * `force-static` because the file changes only when the weekly sync commits a
 * new one and the site redeploys. Nothing here reads the request.
 */
export const dynamic = "force-static";

const FEED_PATH = join(process.cwd(), "data", "las-conferences-events.xml");

const EMPTY_FEED =
  '<?xml version="1.0" encoding="utf-8"?>\n' +
  '<feed xmlns="http://www.w3.org/2005/Atom">' +
  "<title>Events — LargeAgentSystems.org</title>" +
  `<id>${EVENTS_PAGE_URL}</id>` +
  `<link rel="self" href="${EVENTS_FEED_URL}"/>` +
  `<link rel="alternate" href="${EVENTS_PAGE_URL}"/>` +
  "<updated>1970-01-01T00:00:00Z</updated>" +
  "</feed>";

export function GET() {
  // A missing file means the upstream has not published its Atom feed yet, or
  // the sync has not run. Serve a valid empty feed rather than a 500: a reader
  // polling this URL should see "nothing yet", not an error it backs off from.
  const body = existsSync(FEED_PATH)
    ? readFileSync(FEED_PATH, "utf8")
    : EMPTY_FEED;

  return new Response(body, {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}
