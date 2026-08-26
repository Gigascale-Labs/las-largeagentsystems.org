// The sections the nav links to. The page still renders "The approach"
// (#help) and "Take action" (#start); they are reachable by scrolling, just
// not listed here. #join is the Slack community section, whose own eyebrow
// already reads "Community".
export const NAV_SECTIONS = [
  { id: "problem", label: "The Problem" },
  { id: "map", label: "Org Map" },
  { id: "join", label: "Community" },
] as const;
