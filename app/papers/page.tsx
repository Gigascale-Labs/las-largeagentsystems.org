import type { Metadata } from "next";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { PapersList } from "../components/papers-list";
import {
  getPaperDays,
  PAPERS_FEED_URL,
  PAPERS_SOURCE_REPO_URL,
  summarisePapers,
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

const NUM = new Intl.NumberFormat("en-GB");

export default function PapersPage() {
  const days = getPaperDays();
  const s = summarisePapers(days);

  // The funnel, as the pipeline's own run records report it. Four parallel
  // rows, so a table rather than a sentence.
  const funnel: Array<[string, number]> = [
    ["Fetched from arXiv", s.fetched],
    ["Screened", s.screened],
    ["Judged relevant", s.relevant],
    ["Kept, shown below", s.kept],
  ];

  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      <main className="flex-1 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Papers
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
            Daily arXiv scrape.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/70">
            {s.kept > 0 ? (
              <>
                {NUM.format(s.kept)} papers from {s.days} day
                {s.days === 1 ? "" : "s"}, {s.oldest} to {s.newest}, with{" "}
                {NUM.format(s.questions)} open questions.
              </>
            ) : (
              <>No papers are on file yet.</>
            )}{" "}
            Every new paper in seven arXiv lists is read each day. Those
            matching the large-scale, systemic framing of multi-agent systems
            this site studies are kept, with the questions each leaves open.
            The pipeline is{" "}
            <a
              href={PAPERS_SOURCE_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Gigascale-Labs/las-new-papers
            </a>
            . The same days go out as an{" "}
            <a href="/papers/feed.xml" className="text-accent hover:underline">
              Atom feed
            </a>
            .
          </p>

          {s.kept > 0 && (
            <table className="mt-8 w-full max-w-md border-collapse text-sm">
              <caption className="sr-only">
                Papers at each pipeline stage, totalled over {s.days} days
              </caption>
              <thead>
                <tr className="border-b border-rule text-left">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Stage
                  </th>
                  <th scope="col" className="py-2 text-right font-medium">
                    Papers
                  </th>
                </tr>
              </thead>
              <tbody>
                {funnel.map(([stage, n]) => (
                  <tr key={stage} className="border-b border-rule/60">
                    <td className="py-2 pr-4 text-foreground/70">{stage}</td>
                    <td className="py-2 text-right font-mono tabular-nums">
                      {NUM.format(n)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {s.keptPerDay && s.questionsPerPaper && (
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/70">
              Papers per day: {s.keptPerDay.min} to {s.keptPerDay.max}, median{" "}
              {s.keptPerDay.median} (n = {s.days} days). Questions per paper:{" "}
              {s.questionsPerPaper.min} to {s.questionsPerPaper.max}, median{" "}
              {s.questionsPerPaper.median} (n = {NUM.format(s.kept)} papers).
              arXiv announces no new submissions on Friday or Saturday, so
              some days hold none.
            </p>
          )}

          <p className="mt-6 max-w-2xl text-base leading-relaxed text-foreground/70">
            Written by a model, not checked by a person: every summary and
            every open question. Not checked at all: the papers the screen
            rejected, and the full text of any paper — the pipeline reads
            abstracts only. Whether a kept paper is worth reading is not
            measured here; reading it is the test.
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
