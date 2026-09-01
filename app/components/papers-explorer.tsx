"use client";

import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { anchorAgreement, groupAnchors } from "@/lib/papers-anchors";
import type { PaperDay, PapersMap } from "@/lib/papers-schema";
import { searchPapers, toSearchRecords } from "@/lib/papers-search";
import { keptPerDaySeries } from "@/lib/papers-series";
import { PapersCharts } from "./papers-charts";
import { PapersList, paperElementId } from "./papers-list";
import type { AnchorSeries, MapPoint } from "./papers-map";
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
  const papers = useMemo(
    () =>
      new Map(
        days.flatMap((day) =>
          day.papers.map((paper) => [paper.arxiv_id, paper] as const),
        ),
      ),
    [days],
  );

  // The colour groups read every paper held, not the papers a query matched.
  // Recomputing them per keystroke would repaint the papers that survived the
  // query, so a filter would look like a change in the data.
  const grouping = useMemo(() => groupAnchors(days), [days]);

  // One O(n^2) pass over the unfiltered points, so typing does not re-run it.
  const agreement = useMemo(
    () => anchorAgreement(map.points, grouping.anchorOf),
    [map.points, grouping.anchorOf],
  );

  const outcome = useMemo(
    () => searchPapers(deferredQuery, records),
    [deferredQuery, records],
  );

  const filtered = outcome.status === "matched";
  const matchedIds = outcome.status === "matched" ? outcome.ids : null;

  // The map's points, split into the colour groups and the unmatched pile.
  // Every group the map holds keeps a row in the key whether or not the query
  // emptied it, so the key does not move as the reader types.
  const [series, unmatched, matchedCount] = useMemo(() => {
    const hit = new Map<string, MapPoint[]>();
    const totals = new Map<string, number>();
    const miss: MapPoint[] = [];
    let matched = 0;
    for (const point of map.points) {
      const paper = papers.get(point.arxiv_id);
      const key = grouping.keyOf.get(point.arxiv_id);
      if (key === undefined) continue; // a point for a paper the page does not list
      totals.set(key, (totals.get(key) ?? 0) + 1);
      const row: MapPoint = {
        arxiv_id: point.arxiv_id,
        date: point.date,
        title: paper?.title ?? point.arxiv_id,
        anchorTitle: paper?.nearest_anchor_title ?? "",
        x: point.x,
        y: point.y,
      };
      if (matchedIds && !matchedIds.has(point.arxiv_id)) {
        miss.push(row);
      } else {
        matched++;
        const bucket = hit.get(key);
        if (bucket) bucket.push(row);
        else hit.set(key, [row]);
      }
    }
    const rows: AnchorSeries[] = grouping.groups
      .filter((group) => (totals.get(group.key) ?? 0) > 0)
      .map((group) => ({
        group,
        total: totals.get(group.key) ?? 0,
        points: hit.get(group.key) ?? [],
      }));
    return [rows, miss, matched] as const;
  }, [map.points, matchedIds, papers, grouping]);

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
        : `${shown} of ${total} papers matched. ${matchedCount} of ${map.points.length} are on the map.`;

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
        series={series}
        unmatched={unmatched}
        filtered={filtered}
        agreement={agreement}
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
