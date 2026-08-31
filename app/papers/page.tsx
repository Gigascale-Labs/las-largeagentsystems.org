import type { Metadata } from "next";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { PapersExplorer } from "../components/papers-explorer";
import { PapersList } from "../components/papers-list";
import { FeedButton } from "../components/feed-button";
import {
  getPaperDays,
  getPapersMap,
  PAPERS_FEED_URL,
  PAPERS_SOURCE_REPO_URL,
} from "@/lib/papers-data";

export const metadata: Metadata = {
  title: "Papers - LargeAgentSystems.org",
  description:
    "A daily arXiv scrape for large agent systems papers, and the open questions each one leaves.",
  alternates: {
    // Feed autodiscovery: a reader pointed at /papers finds the Atom feed
    // from this link without being told the URL.
    types: {
      "application/atom+xml": PAPERS_FEED_URL,
    },
  },
};

export default function PapersPage() {
  const days = getPaperDays();
  // `getPapersMap` takes the days so that no point can name a paper the page
  // does not list.
  const map = getPapersMap(days);

  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      <main className="flex-1 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              Papers
            </p>
            <FeedButton href="/papers/feed.xml" />
          </div>
          <h1 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
            Daily arXiv scrape.
          </h1>

          <div className="mt-8">
            {/* With no days there is nothing to search, count or project, so
                the list's own empty state is the whole page. */}
            {days.length === 0 ? (
              <PapersList days={days} />
            ) : (
              <PapersExplorer
                days={days}
                map={map}
                sourceUrl={PAPERS_SOURCE_REPO_URL}
              />
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
