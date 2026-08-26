import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "../components/nav";
import { Footer } from "../components/footer";
import { CanonExplorer } from "../components/canon-explorer";
import { ContributeForm } from "../components/contribute-form";
import { getCanonEntries } from "@/lib/canon-data";

/**
 * The contribute form's server action resolves DNS to check where a submitted
 * URL points (lib/safe-fetch.ts). That needs the Node.js runtime. Node is the
 * default; stating it here keeps it from changing by accident.
 */
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Sources - LargeAgentSystems.org",
  description:
    "Cross-tabulate the LAS paper canon by system type, threat model, focus area, and more - find the gaps in the corpus.",
};

export default function SourcesPage() {
  const entries = getCanonEntries();

  return (
    <div className="flex flex-1 flex-col">
      <Nav />
      <main className="flex-1 px-6 py-24 md:px-12">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Sources
          </p>
          <h1 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
            Survey the field.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/70">
            We have catalogued a variety of papers on LAS through community
            contributions and our work at Gigascale. We present them here as
            an early attempt at a survey. Please submit sources you&apos;ve
            find relevant at the bottom of the page.
          </p>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/70">
            We exclude live deployments, which are listed in the{" "}
            <Link href="/#map" className="text-accent hover:underline">
              org map
            </Link>
            .
          </p>

          <div className="mt-12">
            <CanonExplorer entries={entries} />
          </div>

          <div className="mt-24 border-t-2 border-accent pt-10">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
              Contribute
            </p>
            <h2 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
              Submit source.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/70">
              Please submit relevant papers. We are looking to grow the list
              to a thorough coverage.
            </p>
            <div className="mt-10">
              <ContributeForm />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
