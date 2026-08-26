import { existsSync, readFileSync } from "fs";
import { join } from "path";

/**
 * `/papers/feed.xml` — the upstream Atom feed, served under this domain.
 *
 * The document is not built here. The pipeline that produces the papers
 * already generates it (Gigascale-Labs/las-new-papers, arxiv_feed/feed.py)
 * and now addresses it at this site, so `scripts/sync-las-new-papers.mjs`
 * copies it across verbatim and this route only serves the bytes. Rebuilding
 * it here would be a second implementation of one document, free to drift
 * from the first.
 *
 * Serving it from this domain is still worth doing: raw.githubusercontent.com
 * sends `text/plain` for .xml, which the upstream README notes as a defect,
 * and a subscriber should not have their reader pointed at a source host.
 *
 * `force-static` because the file changes only when the daily sync commits a
 * new one and the site redeploys. Nothing here reads the request.
 */
export const dynamic = "force-static";

const FEED_PATH = join(process.cwd(), "data", "las-new-papers-feed.xml");

const EMPTY_FEED =
  '<?xml version="1.0" encoding="utf-8"?>\n' +
  '<feed xmlns="http://www.w3.org/2005/Atom">' +
  "<title>arXiv open questions — LargeAgentSystems.org</title>" +
  "<id>https://largeagentsystems.org/papers</id>" +
  '<link rel="self" href="https://largeagentsystems.org/papers/feed.xml"/>' +
  '<link rel="alternate" href="https://largeagentsystems.org/papers"/>' +
  "<updated>1970-01-01T00:00:00Z</updated>" +
  "</feed>";

export function GET() {
  // A missing file means the sync has not run yet. Serve a valid empty feed
  // rather than a 500: a reader polling this URL should see "nothing yet",
  // not an error it may back off from.
  const body = existsSync(FEED_PATH)
    ? readFileSync(FEED_PATH, "utf8")
    : EMPTY_FEED;

  return new Response(body, {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}
