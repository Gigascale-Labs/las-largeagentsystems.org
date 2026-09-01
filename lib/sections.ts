/**
 * The links in the nav, in order.
 *
 * Two kinds sit in one list because the nav renders them identically and the
 * order matters across both: an anchor on the home page (`id`) and a page of
 * its own (`href`). Before this held both, About could only go after every
 * anchor, which is not where it belongs.
 *
 * The home page still renders "The approach" (#help) and "Take action"
 * (#start); they are reachable by scrolling, just not listed here. #join is
 * the Slack community section, whose own eyebrow already reads "Community".
 */
export type NavLink = { label: string } & (
  | { id: string; href?: never }
  | { href: string; id?: never }
);

export const NAV_LINKS: readonly NavLink[] = [
  { id: "problem", label: "The Problem" },
  { id: "map", label: "Org Map" },
  { href: "/about", label: "About" },
  { id: "join", label: "Community" },
  { href: "/survey", label: "Survey" },
  { href: "/events", label: "Events" },
  { href: "/papers", label: "Papers" },
] as const;

/** Where a nav link points: a home-page anchor, or a page. */
export function navHref(link: NavLink): string {
  return link.href ?? `/#${link.id}`;
}

/**
 * The feedback form linked from the top bar. A Google Form, so the link
 * leaves the site.
 *
 * Here rather than inline in nav.tsx for the same reason NAV_SECTIONS is: the
 * nav renders on every page, and a URL that appears in one component is still
 * a fact about the site, not about the header.
 */
export const FEEDBACK_FORM_URL = "https://forms.gle/PePoNesEo5pAaqa37";

/**
 * The Slack community's request-to-join form. A Google Form, so the link
 * leaves the site. Here rather than inline in join.tsx because the About page
 * links to it too, and a URL two components share is a fact about the site.
 */
export const SLACK_FORM_URL = "https://forms.gle/4YSjPwHw16RDTAiV9";
