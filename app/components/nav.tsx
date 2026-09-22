"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { FEEDBACK_FORM_URL, NAV_LINKS, navHref } from "@/lib/sections";

/**
 * The top bar.
 *
 * The seven links need 620px in a row, and the bar is one flex line. Measured
 * in Chromium against the built site, the nav got 0px at 320px, 1.4px at
 * 375px, 16.4px at 390px and 346.4px at 768px, so 0 of 7 links were in view on
 * a phone and 3 of 7 on a tablet. The nav carried `min-w-0` and a hidden
 * scrollbar, so it shrank without showing it could be scrolled.
 *
 * Below `lg` the links now sit in a panel behind a Menu button. The row
 * returns at `lg`, where `gap-4` fits all seven inside the 602.4px a 1024px
 * viewport leaves; `gap-6` needs 1042px, so it waits for `xl`.
 *
 * Both `<nav>` elements stay in the DOM. The one that does not apply sits in
 * a `display: none` subtree, so only one is ever in the accessibility tree.
 *
 * This is a client component for one reason: the panel's open state. Every
 * value it renders is static.
 */
export function Nav() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  // Escape closes the panel.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // The panel exists only below `lg`. Without this, widening past the
  // breakpoint with the panel open hides it but leaves `open` true, and it
  // reappears when the window narrows again. 64rem is Tailwind's `lg`.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 64rem)");
    const closeIfWide = () => {
      if (wide.matches) setOpen(false);
    };
    closeIfWide();
    wide.addEventListener("change", closeIfWide);
    return () => wide.removeEventListener("change", closeIfWide);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-background/95 backdrop-blur supports-backdrop-blur:bg-background/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4 md:px-12">
        {/* text-base below `md`: the wordmark is 207.6px at text-lg and
            185.6px at text-base, and a 320px viewport leaves 272px for the
            wordmark, the gap and the Menu button together. text-lg overruns
            that by 9.6px; text-base leaves 12.4px. */}
        <Link
          href="/#hero"
          onClick={() => setOpen(false)}
          className="whitespace-nowrap font-serif text-base font-semibold tracking-tight md:text-lg"
        >
          LargeAgentSystems<span className="text-accent">.org</span>
        </Link>

        {/* Below `lg`, the only control in the bar. It carries the Feedback
            link's treatment because it takes that link's place in the row. */}
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((wasOpen) => !wasOpen)}
          className="shrink-0 border border-rule px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-accent hover:text-accent lg:hidden"
        >
          {open ? "Close" : "Menu"}
        </button>

        {/* `lg` and above: the row this bar has always been. min-w-0 so the
            nav, not the Feedback link, is what shrinks and scrolls. */}
        <div className="hidden min-w-0 items-center gap-4 lg:flex">
          <nav
            aria-label="Main"
            className="flex items-center gap-4 overflow-x-auto whitespace-nowrap text-xs font-medium uppercase tracking-widest text-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:gap-6"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={navHref(link)}
                className="shrink-0 transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
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

      {/* Below `lg`: the panel. It scrolls rather than growing past the
          screen, because the bar is sticky and the panel hangs off it. */}
      <div id={panelId} hidden={!open} className="lg:hidden">
        <nav
          aria-label="Main"
          className="max-h-[calc(100dvh-8rem)] overflow-y-auto border-t border-rule px-6 pb-6 md:px-12"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={navHref(link)}
                  onClick={() => setOpen(false)}
                  className="block border-b border-rule py-3.5 text-xs font-medium uppercase tracking-widest text-muted transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <a
            href={FEEDBACK_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-6 inline-block border border-rule px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:border-accent hover:text-accent"
          >
            Feedback
          </a>
        </nav>
      </div>
    </header>
  );
}
