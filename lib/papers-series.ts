/**
 * Derives the papers-per-day series the bar chart plots.
 *
 * This lives apart from `papers-data.ts` because both the server page and a
 * client component read it, and `papers-data.ts` imports `fs` at module scope.
 * Nothing here touches the filesystem: it is a pure function over the days the
 * loader already returned.
 */

import type { KeptPerDayPoint, PaperDay } from "./papers-schema";

/**
 * Returns the papers on each day held, oldest first, which is the order a time
 * axis reads in. `getPaperDays` returns days newest first, the order the page
 * lists them; a component reversing that would put the newest day on the left.
 *
 * `matchedIds` counts only the papers a query matched. Pass `null` to count
 * every paper held, which is what the page plots when nobody has typed
 * anything.
 *
 * Days the pipeline did not run are absent from the data and stay absent here.
 * arXiv announces nothing on some days, so one bar per day on file counts the
 * days the pipeline read, not the days on a calendar. A day it ran and kept
 * nothing is a real zero, and the chart plots it.
 */
export function keptPerDaySeries(
  days: PaperDay[],
  matchedIds: Set<string> | null = null,
): KeptPerDayPoint[] {
  return days
    .map((day) => ({
      date: day.date,
      kept: matchedIds
        ? day.papers.filter((paper) => matchedIds.has(paper.arxiv_id)).length
        : day.papers.length,
    }))
    .reverse();
}
