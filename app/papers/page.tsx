import type { Metadata } from "next";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { PapersList } from "../components/papers-list";
import {
  countPapers,
  countQuestions,
  getOldestDate,
  getPaperDays,
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
  const oldest = getOldestDate(days);
  const papers = countPapers(days);
  const questions = countQuestions(days);

  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      <main className="flex-1 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Papers
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
            New arXiv, every day.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/70">
            A daily arXiv scrape for large agent systems papers (
            <a
              href={PAPERS_SOURCE_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Gigascale-Labs/las-new-papers
            </a>
            ). A model reads every new paper in seven arXiv lists each day,
            keeps the few that matter for the large-scale, systemic framing of
            multi-agent systems this site studies, and writes down the
            questions they leave open. Summaries and questions are written by
            a model and are not checked by a person.
          </p>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/70">
            {oldest && (
              <>
                The dataset starts {oldest} and holds {days.length} day
                {days.length === 1 ? "" : "s"}, {papers} paper
                {papers === 1 ? "" : "s"} and {questions} question
                {questions === 1 ? "" : "s"}.{" "}
              </>
            )}
            arXiv does not publish at weekends, so some days are thin and some
            are absent. The same days go out as an{" "}
            <a href="/papers/feed.xml" className="text-accent hover:underline">
              RSS/Atom feed
            </a>
            .
          </p>

          <div className="mt-12">
            <PapersList days={days} />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
