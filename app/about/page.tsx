import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { FEEDBACK_FORM_URL, SLACK_FORM_URL } from "@/lib/sections";

export const metadata: Metadata = {
  title: "About - LargeAgentSystems.org",
  description:
    "What LargeAgentSystems.org is, and three ways to contribute to it.",
};

const GITHUB_URL =
  "https://github.com/Gigascale-Labs/las-largeagentsystems.org";
const GITHUB_ISSUES_URL = `${GITHUB_URL}/issues`;

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

export default function AboutPage() {
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
            entering systems like these now.
          </p>

          <Section eyebrow="Contribute" title="How to help out.">
            <p>
              <strong className="font-semibold text-foreground">
                Submit a source to the survey.
              </strong>{" "}
              <Link
                href="/survey#contribute"
                className="text-accent hover:underline"
              >
                Here is the form
              </Link>
              . Please add your work, or sources you&apos;ve found valuable.
            </p>
            <p>
              <strong className="font-semibold text-foreground">
                Join the community.
              </strong>{" "}
              We run{" "}
              <a
                href={SLACK_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                a Slack
              </a>{" "}
              for researchers, social scientists, and policy and strategy people
              working on large agent systems.
            </p>
            <p>
              <strong className="font-semibold text-foreground">
                Report bugs.
              </strong>{" "}
              Here&apos;s the{" "}
              <a
                href={FEEDBACK_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                feedback link
              </a>
              , or submit an issue on{" "}
              <a
                href={GITHUB_ISSUES_URL}
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
