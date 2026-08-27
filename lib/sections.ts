// The sections the nav links to. The page still renders "The approach"
// (#help) and "Take action" (#start); they are reachable by scrolling, just
// not listed here. #join is the Slack community section, whose own eyebrow
// already reads "Community".
export const NAV_SECTIONS = [
  { id: "problem", label: "The Problem" },
  { id: "map", label: "Org Map" },
  { id: "join", label: "Community" },
] as const;

/**
 * The feedback form linked from the top bar. A Google Form, so the link
 * leaves the site.
 *
 * Here rather than inline in nav.tsx for the same reason NAV_SECTIONS is: the
 * nav renders on every page, and a URL that appears in one component is still
 * a fact about the site, not about the header.
 */
export const FEEDBACK_FORM_URL = "https://forms.gle/PePoNesEo5pAaqa37";
