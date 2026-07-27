import Link from "next/link";
import { NAV_SECTIONS } from "@/lib/sections";

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
            href="/#join"
            className="shrink-0 border border-foreground px-3 py-1.5 text-foreground transition-colors hover:border-accent hover:text-accent"
          >
            Join now
          </Link>
        </nav>
      </div>
    </header>
  );
}
