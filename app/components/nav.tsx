import Link from "next/link";
import { FEEDBACK_FORM_URL, NAV_SECTIONS } from "@/lib/sections";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-background/95 backdrop-blur supports-backdrop-blur:bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4 md:px-12">
        <Link
          href="/#hero"
          className="whitespace-nowrap font-serif text-lg font-semibold tracking-tight"
        >
          LargeAgentSystems<span className="text-accent">.org</span>
        </Link>
        {/* min-w-0 so the nav, not the Feedback link, is what shrinks and
            scrolls on a narrow screen. */}
        <div className="flex min-w-0 items-center gap-4">
          <nav className="flex items-center gap-6 overflow-x-auto whitespace-nowrap text-xs font-medium uppercase tracking-widest text-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV_SECTIONS.map((section) => (
              <Link
                key={section.id}
                href={`/#${section.id}`}
                className="shrink-0 transition-colors hover:text-foreground"
              >
                {section.label}
              </Link>
            ))}
            <Link
              href="/survey"
              className="shrink-0 transition-colors hover:text-foreground"
            >
              Survey
            </Link>
            <Link
              href="/events"
              className="shrink-0 transition-colors hover:text-foreground"
            >
              Events
            </Link>
            <Link
              href="/papers"
              className="shrink-0 transition-colors hover:text-foreground"
            >
              Papers
            </Link>
          </nav>

          {/* Outside the scrolling nav, so it stays on screen at every width.
              A Google Form, so it leaves the site: same new-tab treatment as
              every other external link here. */}
          <a
            href={FEEDBACK_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 border border-rule px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Feedback
          </a>
        </div>
      </div>
    </header>
  );
}
