import type { Metadata } from "next";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { EventsList } from "../components/events-list";
import { getEvents } from "@/lib/events-data";

export const metadata: Metadata = {
  title: "Events - LargeAgentSystems.org",
  description:
    "Workshops, conferences, and CFPs relevant to large-scale multi-agent systems, found by weekly automated search and independently checked before listing.",
};

export default function EventsPage() {
  const events = getEvents();

  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      <main className="flex-1 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Events
          </p>
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
            ) for workshops, conferences, and CFPs connected to the
            large-scale, systemic framing of multi-agent systems this site
            studies — not multi-agent systems research in general. Each
            candidate is independently checked before appearing here: its
            page is fetched and confirmed to actually mention the event.
            Items marked &ldquo;Unverified&rdquo; matched the relevance and
            reputability bar but couldn&apos;t be fetched to confirm (the
            site blocked automated access) — possibly real, just not
            checked.
          </p>

          <div className="mt-12">
            <EventsList events={events} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
