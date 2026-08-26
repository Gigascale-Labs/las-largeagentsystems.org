import type { Metadata } from "next";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { EventsList } from "../components/events-list";
import { FeedButton } from "../components/feed-button";
import { EVENTS_FEED_URL, getEvents } from "@/lib/events-data";

export const metadata: Metadata = {
  title: "Events - LargeAgentSystems.org",
  description:
    "Workshops, conferences, and CFPs relevant to large-scale multi-agent systems, found by weekly automated search and independently checked before listing.",
  alternates: {
    // Feed autodiscovery: a reader pointed at /events finds the Atom feed
    // from this link without being told the URL.
    types: {
      "application/atom+xml": EVENTS_FEED_URL,
    },
  },
};

/**
 * The day this page was prerendered, UTC, as YYYY-MM-DD.
 *
 * Module scope, so it is read once during the static build and not per
 * render. `EventsList` uses it for its first render on both sides of the
 * hydration boundary. It cannot be computed inside that client component:
 * the client bundle would run `new Date()` in the browser, which is a
 * different day from the one baked into the prerendered HTML whenever a
 * reader arrives after the build, and React would report a mismatch. The
 * component swaps in the reader's real day from a `useEffect` instead.
 */
const BUILD_DATE = new Date().toISOString().slice(0, 10);

export default function EventsPage() {
  const events = getEvents();

  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      <main className="flex-1 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              Events
            </p>
            <FeedButton href="/events/feed.xml" />
          </div>
          <h1 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
            Workshops &amp; conferences.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/70">
            Found by a weekly automated web search (
            <a
              href="https://github.com/Gigascale-Labs/las-conferences"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Gigascale-Labs/las-conferences
            </a>
            ) for workshops, conferences and calls for papers on the
            large-scale, systemic framing of multi-agent systems.
          </p>

          <div className="mt-12">
            <EventsList events={events} buildDate={BUILD_DATE} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
