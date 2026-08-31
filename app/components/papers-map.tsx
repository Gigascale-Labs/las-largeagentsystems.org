"use client";

import {
  Label,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { PapersMap } from "@/lib/papers-schema";

/**
 * Draws one dot per paper, placed by UMAP over the embedding vectors the
 * upstream pipeline used to rank each day.
 *
 * Built to the chart rules in `docs/synced-dataset-pattern.md`: the caption
 * says what the chart plots and makes no claim about it, both axes carry
 * labels, a key names every series, and no two series share a colour.
 *
 * The axis ticks are absent. A UMAP axis has no units and no direction, and
 * the same papers under a different seed produce different numbers for the
 * same layout. Distance between dots is the only quantity the chart carries.
 * The caption below prints the model, neighbourhood size, minimum distance and
 * seed instead.
 *
 * The plot is square. Distance carries the content, so a box wider than it is
 * tall would make one gap mean two different values depending on its
 * direction.
 */
/** One paper as the chart draws it: its place, plus the text the tooltip prints. */
export interface MapPoint {
  arxiv_id: string;
  date: string;
  title: string;
  x: number;
  y: number;
}

const AXIS_DOMAIN: [number, number] = [-1.12, 1.12];

function axisProps(dataKey: "x" | "y") {
  return {
    type: "number" as const,
    dataKey,
    domain: AXIS_DOMAIN,
    // No ticks: see the note above on UMAP axis numbers.
    tick: false,
    tickLine: false,
    axisLine: { stroke: "var(--rule)" },
  };
}

function PointTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: MapPoint }>;
}) {
  const point = active ? payload?.[0]?.payload : undefined;
  if (!point) return null;
  return (
    <div className="max-w-xs border border-rule bg-background p-2 text-xs">
      <p className="font-serif text-sm leading-snug">{point.title}</p>
      <p className="mt-1 font-mono text-[10px] text-muted">
        {point.arxiv_id} · {point.date}
      </p>
    </div>
  );
}

export function PapersMap({
  map,
  matched,
  unmatched,
  filtered,
  onSelect,
}: {
  map: PapersMap;
  /** Papers the current query matched. Every paper, when nothing is typed. */
  matched: MapPoint[];
  /** Papers it did not. Empty when nothing is typed. */
  unmatched: MapPoint[];
  /** Whether a query is active, which decides if there are two series to key. */
  filtered: boolean;
  onSelect: (arxivId: string) => void;
}) {
  if (map.points.length === 0) {
    return (
      <div className="mt-4 border border-rule bg-background p-5 text-sm leading-relaxed text-foreground/70">
        No map. It appears once {map.min_papers || 12} papers carry an
        embedding vector. Below that, the layout follows the seed more than the
        papers.
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs text-muted">
        UMAP places each paper from its {map.dim}-dimensional{" "}
        {map.model || "embedding"} vector (n = {map.n} papers). Only the
        distance between dots carries information; the axes carry no units.
      </p>
      {/* Square and centred. See the note at the top of this file. */}
      <div className="mx-auto aspect-square w-full max-w-[640px] border border-rule bg-background p-4 md:p-6">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 28 }}>
            <XAxis {...axisProps("x")}>
              <Label
                value="UMAP axis 1 (no units)"
                position="insideBottom"
                offset={-12}
                fill="var(--muted)"
                fontSize={12}
              />
            </XAxis>
            <YAxis {...axisProps("y")}>
              <Label
                value="UMAP axis 2 (no units)"
                angle={-90}
                position="insideLeft"
                offset={0}
                fill="var(--muted)"
                fontSize={12}
                style={{ textAnchor: "middle" }}
              />
            </YAxis>
            {/* Fixed area, so the dot encodes position only. 110 gives a
                radius just under 6px, over the 8px-diameter floor. */}
            <ZAxis range={[110, 110]} />
            <Tooltip
              content={<PointTooltip />}
              cursor={{ stroke: "var(--rule)" }}
            />
            {/* Always present, including at one series: the chart rules ask
                for a key on every chart. The formatter puts the label on a
                text token; recharts otherwise paints it in the series colour,
                which leaves "Not matched" too pale to read. */}
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 20 }}
              iconType="circle"
              formatter={(value: string) => (
                <span className="text-muted">{value}</span>
              )}
            />
            {/* Drawn first, so no matched dot sits under an unmatched one. */}
            {filtered && (
              <Scatter
                name="Not matched"
                data={unmatched}
                // An opaque blend, not `fillOpacity`: recharts paints the key's
                // swatch from `fill` alone and ignores the opacity, so a
                // translucent series gets a swatch far darker than its dots.
                // color-mix keeps the blend correct in both themes.
                fill="color-mix(in oklab, var(--muted) 35%, var(--background))"
                isAnimationActive={false}
              />
            )}
            <Scatter
              name={filtered ? "Matched" : "Paper"}
              data={matched}
              fill="var(--chart-1)"
              // A 2px ring in the surface colour separates two overlapping dots.
              stroke="var(--background)"
              strokeWidth={2}
              isAnimationActive={false}
              onClick={(point: unknown) => {
                const arxivId = (point as MapPoint | undefined)?.arxiv_id;
                if (arxivId) onSelect(arxivId);
              }}
              className="cursor-pointer"
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 space-y-2 text-xs text-muted">
        <p>Click a dot to jump to its paper.</p>
        {map.knn_overlap !== null && (
          <p>
            Each paper keeps {Math.round(map.knn_overlap * 100)}% of its{" "}
            {map.knn_k} nearest neighbours after the projection. Two dots close
            together are usually close in the embedding. Two dots far apart are
            not reliably far.
          </p>
        )}
        <p>
          UMAP, cosine distance, n_neighbors = {map.n_neighbors}, min_dist ={" "}
          {map.min_dist}, seed = {map.seed}.
        </p>
      </div>
    </div>
  );
}
