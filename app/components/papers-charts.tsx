"use client";

import { useState } from "react";
import type { AnchorAgreement } from "@/lib/papers-anchors";
import type { KeptPerDayPoint, PapersMap } from "@/lib/papers-schema";
import { PapersPerDayChart } from "./papers-per-day-chart";
import {
  PapersMap as PapersMapChart,
  type AnchorSeries,
  type MapPoint,
} from "./papers-map";

/**
 * Switches one chart slot between two views of the same 52 papers: the count
 * per day, and the UMAP map.
 *
 * They sit in one slot rather than one above the other because they answer
 * different questions about the same set, and a reader wants one at a time.
 *
 * Both views answer the search box above them. A view that ignored the query
 * while its neighbour honoured it would read as a fault.
 */

type View = "per-day" | "map";

const VIEWS: ReadonlyArray<{ id: View; label: string }> = [
  { id: "per-day", label: "Daily" },
  { id: "map", label: "Map" },
];

export function PapersCharts({
  keptPerDay,
  sourceUrl,
  map,
  series,
  unmatched,
  filtered,
  agreement,
  onSelect,
}: {
  keptPerDay: KeptPerDayPoint[];
  sourceUrl: string;
  map: PapersMap;
  series: AnchorSeries[];
  unmatched: MapPoint[];
  filtered: boolean;
  agreement: AnchorAgreement | null;
  onSelect: (arxivId: string) => void;
}) {
  const [view, setView] = useState<View>("per-day");

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 font-mono text-xs uppercase tracking-[0.2em]">
        <span className="mr-2 text-muted">View</span>
        {VIEWS.map((option) => (
          <button
            key={option.id}
            type="button"
            // aria-pressed, not the tab pattern: a pair of toggle buttons
            // needs no arrow-key handling, and a half-built tablist is worse
            // for a screen reader than a button that says what it is.
            aria-pressed={view === option.id}
            onClick={() => setView(option.id)}
            className={
              view === option.id
                ? "px-2 py-1 text-accent underline underline-offset-4"
                : "px-2 py-1 text-muted hover:text-foreground"
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {view === "per-day" ? (
        <PapersPerDayChart
          points={keptPerDay}
          sourceUrl={sourceUrl}
          filtered={filtered}
        />
      ) : (
        <PapersMapChart
          map={map}
          series={series}
          unmatched={unmatched}
          filtered={filtered}
          agreement={agreement}
          onSelect={onSelect}
        />
      )}
    </div>
  );
}
