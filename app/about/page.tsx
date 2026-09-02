import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { getCanonEntries, getTransferEntries } from "@/lib/canon-data";
import { getVerifiedEvents } from "@/lib/events-data";
import {
  countPapers,
  getOldestDate,
  getPaperDays,
  PAPERS_SOURCE_REPO_URL,
} from "@/lib/papers-data";
import { getOrgTypeTimeline, ORG_MAP_SOURCE_URL } from "@/lib/org-map";
import { FEEDBACK_FORM_URL, SLACK_FORM_URL } from "@/lib/sections";
import { DIMENSION_KEYS, DIMENSION_PROSE_LABELS } from "@/lib/canon-dimensions";
import { TABLE_HEAD_ROW, TABLE_ROW, TABLE_WRAP } from "@/lib/table-styles";

export const metadata: Metadata = {
  title: "About - LargeAgentSystems.org",
  description:
    "What LargeAgentSystems.org is, what each catalogue holds, where the data comes from, and how to contribute.",
};

const GITHUB_URL =
  "https://github.com/Gigascale-Labs/las-largeagentsystems.org";

/** A heading in the style the other pages use: rule, eyebrow, serif title. */
function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-20 border-t-2 border-accent pt-10">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {eyebrow}
      </p>
      <h2 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
        {title}
      </h2>
      <div className="mt-5 max-w-2xl space-y-5 text-base leading-relaxed text-foreground/70">
        {children}
      </div>
    </section>
  );
}

/**
 * The counts on this page are read from the same files the pages themselves
 * read, at build time. Writing them into the copy by hand would make this the
 * one page on the site that goes stale on its own.
 */
export default async function AboutPage() {
  const canon = getCanonEntries();
  const transfer = getTransferEntries();
  const events = getVerifiedEvents();
  const paperDays = getPaperDays();
  const papers = countPapers(paperDays);
  // The same loader the home page's chart uses. It returns null if the remote
  // CSV cannot be read, and the row then carries no count rather than a stale
  // one written into the copy.
  const orgs = await getOrgTypeTimeline();

  const catalogues = [
    {
      href: "/survey",
      name: "Survey",
      holds: `${canon.length} sources, plus ${transfer.length} from outside AI whose methods carry over`,
      built: "Contributions and our own reading, tagged by hand",
    },
    {
      href: "/#map",
      name: "Org map",
      holds: orgs
        ? `${orgs.totalOrgs} organisations working on large agent systems, by type and founding year`
        : "Organisations working on large agent systems, by type and founding year",
      built: "A hand-curated CSV in its own repository",
    },
    {
      href: "/events",
      name: "Events",
      holds: `${events.length} conferences, workshops and deadlines`,
      built: "Curated, with an Atom feed",
    },
    {
      href: "/papers",
      name: "Papers",
      holds: `${papers} papers from the last ${paperDays.length} days of arXiv`,
      built: "A daily automated screen, rebuilt each morning",
    },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      <main className="flex-1 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            About
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
            What this site is.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/70">
            LargeAgentSystems.org is a project of{" "}
            <a
              href="https://www.gigascale-labs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Gigascale Labs
            </a>
            . We use <em>large agent system</em> to mean a large-scale system of
            interacting AI agents, often with humans in it too: an economy, a
            social platform, a market, a workforce. Millions of agents are
            entering systems like these now. The risks that follow - instability,
            inequality, emergent capabilities, disempowerment - are properties of
            the system, not of any one model in it.
          </p>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/70">
            No single field owns that problem. It sits between AI safety,
            computer science, economics, and the social sciences. This site is a
            common reference for people working across that gap: what the
            problem is, who is working on it, and what has been written.
          </p>

          <Section eyebrow="Contents" title="Four catalogues.">
            <p>
              Each one is a live list, rebuilt from its source rather than
              written into the page. The counts below are what they hold today.
            </p>
            <div className={TABLE_WRAP}>
              <table className="w-full min-w-[40rem] border-collapse text-sm">
                <thead>
                  <tr className={TABLE_HEAD_ROW}>
                    <th className="px-3 py-2 font-normal">Catalogue</th>
                    <th className="px-3 py-2 font-normal">Holds</th>
                    <th className="px-3 py-2 font-normal">Built from</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogues.map((c) => (
                    <tr key={c.href} className={TABLE_ROW}>
                      <td className="px-3 py-3">
                        <Link
                          href={c.href}
                          className="font-serif text-base font-semibold transition-colors hover:text-accent"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-foreground/70">{c.holds}</td>
                      <td className="px-3 py-3 text-foreground/70">{c.built}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section eyebrow="Method" title="How the survey is tagged.">
            <p>
              Every source in the survey carries values on {DIMENSION_KEYS.length}{" "}
              dimensions, so the corpus can be crossed one against another and
              the gaps read off the table:{" "}
              {DIMENSION_KEYS.map((key, i) => (
                <span key={key}>
                  {i > 0 && (i === DIMENSION_KEYS.length - 1 ? ", and " : ", ")}
                  {DIMENSION_PROSE_LABELS[key]}
                </span>
              ))}
              .
            </p>
            <p>
              Each dimension draws from a closed list. A paper takes a value
              only where a passage in it supports that value, and where that
              value is a main setting of the paper or appears at heading level.
              A dimension stays empty when nothing on its list fits. Empty is a
              finding, not an omission: it says the paper is not a source for
              that question. The table has a <em>Not tagged</em> row and column
              so a paper carrying nothing on a dimension still appears.</p>
            <p>
              The three observability columns record one scale three times, once
              for what a participant can see, once for the operator, and once
              for the public. They are the same question asked from three
              vantage points, and the answers differ.
            </p>
            <p>
              Tagging is a judgement, and judgements are wrong sometimes. If a
              row looks mistagged, tell us - the feedback link is in the header
              of every page.
            </p>
          </Section>

          <Section eyebrow="Sources" title="Where the data comes from.">
            <p>
              No page here calls an API when you load it. Every catalogue is a
              file in the repository, refreshed by a scheduled job, so what you
              read is what was committed.
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                The paper screen runs daily against arXiv, in{" "}
                <a
                  href={PAPERS_SOURCE_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  its own repository
                </a>
                . The last {paperDays.length} days are kept, from{" "}
                {getOldestDate(paperDays)} onward.
              </li>
              <li>
                The org map is a hand-curated CSV, also in{" "}
                <a
                  href={ORG_MAP_SOURCE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  its own repository
                </a>
                .
              </li>
              <li>
                The growth and adoption charts are built from public datasets,
                cited on the chart that uses them.
              </li>
              <li>
                This site is open source, under an MIT licence, on{" "}
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  GitHub
                </a>
                .
              </li>
            </ul>
          </Section>

          <Section eyebrow="Contribute" title="Three ways in.">
            <p>
              <strong className="font-semibold text-foreground">
                Submit a source.
              </strong>{" "}
              The form is at the bottom of the{" "}
              <Link href="/survey" className="text-accent hover:underline">
                survey
              </Link>
              . We are still filling gaps, and a paper we have missed is the
              most useful thing you can send.
            </p>
            <p>
              <strong className="font-semibold text-foreground">
                Join the community.
              </strong>{" "}
              We run a Slack for researchers, social scientists, and policy and
              strategy people working on large agent systems.{" "}
              <a
                href={SLACK_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Request to join
              </a>
              .
            </p>
            <p>
              <strong className="font-semibold text-foreground">
                Tell us what is wrong.
              </strong>{" "}
              A wrong tag, a missing organisation, a dead link, a claim we have
              not supported:{" "}
              <a
                href={FEEDBACK_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                send feedback
              </a>
              , or open an issue on{" "}
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                GitHub
              </a>
              .
            </p>
          </Section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
