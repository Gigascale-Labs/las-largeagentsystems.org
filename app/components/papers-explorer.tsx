"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import type { PaperDay, PapersMap } from "@/lib/papers-schema";
import { searchPapers, toSearchRecords } from "@/lib/papers-search";
import { keptPerDaySeries } from "@/lib/papers-series";
import { PapersCharts } from "./papers-charts";
import { PapersList, paperElementId } from "./papers-list";
import type { MapPoint } from "./papers-map";
import { PapersSearchBox } from "./papers-search-box";

/**
 * Holds the query and hands the result to both the map and the list. One piece
 * of state drives both, so a search cannot filter one and miss the other.
 *
 * This component ends /papers' no-client-JavaScript property. The list stays
 * plain markup — anchors for the day index, `<details>` for the open questions
 * — but the server now sends the tree to the browser as well as rendering it,
 * because matching needs the text on the client. It fetches nothing: the
 * search runs over what the page already shows.
 */
export function PapersExplorer({
  days,
  map,
  sourceUrl,
}: {
  days: PaperDay[];
  map: PapersMap;
  sourceUrl: string;
}) {
  const [query, setQuery] = useState("");
  // Keeps typing responsive while the filter catches up. At the 60-day cap
  // this re-runs over roughly 480 papers per keystroke. Not measured: the
  // keystroke latency at that size. I only ran it at 52 papers.
  const deferredQuery = useDeferredValue(query);

  const records = useMemo(() => toSearchRecords(days), [days]);
  const titles = useMemo(
    () =>
      new Map(
        days.flatMap((day) =>
          day.papers.map((paper) => [paper.arxiv_id, paper.title] as const),
        ),
      ),
    [days],
  );

  const outcome = useMemo(
    () => searchPapers(deferredQuery, records),
    [deferredQuery, records],
  );

  const filtered = outcome.status === "matched";
  const matchedIds = outcome.status === "matched" ? outcome.ids : null;

  const [matched, unmatched] = useMemo(() => {
    const hit: MapPoint[] = [];
    const miss: MapPoint[] = [];
    for (const point of map.points) {
      const row: MapPoint = {
        arxiv_id: point.arxiv_id,
        date: point.date,
        title: titles.get(point.arxiv_id) ?? point.arxiv_id,
        x: point.x,
        y: point.y,
      };
      (matchedIds && !matchedIds.has(point.arxiv_id) ? miss : hit).push(row);
    }
    return [hit, miss];
  }, [map.points, matchedIds, titles]);

  // Both charts read the same query. The per-day counts drop to the matched
  // papers so the two views cannot disagree about what the page is showing.
  const keptPerDay = useMemo(
    () => keptPerDaySeries(days, matchedIds),
    [days, matchedIds],
  );

  const total = records.length;
  const shown = matchedIds ? matchedIds.size : total;
  const status =
    outcome.status === "error"
      ? outcome.message
      : outcome.status === "all"
        ? `${total} paper${total === 1 ? "" : "s"} across ${days.length} day${
            days.length === 1 ? "" : "s"
          }.`
        : `${shown} of ${total} papers matched. ${matched.length} of ${map.points.length} are on the map.`;

  const scrollToPaper = useCallback((arxivId: string) => {
    const target = document.getElementById(paperElementId(arxivId));
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <div>
      <PapersSearchBox
        query={query}
        onQueryChange={setQuery}
        status={status}
      />

      <PapersCharts
        keptPerDay={keptPerDay}
        sourceUrl={sourceUrl}
        map={map}
        matched={matched}
        unmatched={unmatched}
        filtered={filtered}
        onSelect={scrollToPaper}
      />

      <div className="mt-12">
        {/* A query that did not parse filters nothing. The list stays whole
            and the message under the box says why. */}
        <PapersList days={days} matchedIds={matchedIds} />
      </div>
    </div>
  );
}
