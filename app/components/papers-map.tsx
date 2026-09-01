"use client";

import {
  Label,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { PapersMap } from "@/lib/papers-schema";
import type { AnchorAgreement, AnchorGroup, AnchorShape } from "@/lib/papers-anchors";

/**
 * Draws one dot per paper, placed by UMAP over the embedding vectors the
 * upstream pipeline used to rank each day, and coloured by the canon paper
 * each one sits nearest to.
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
 *
 * The key is HTML below the plot, not recharts' `Legend`. Its rows carry paper
 * titles, which run to 100 characters and do not fit a legend strip. Colour is
 * never the only channel: each group also carries a marker shape, and the key
 * and the tooltip both name the canon paper in text. `lib/papers-anchors.ts`
 * holds the colour and shape assignment and the measurements behind it.
 */

/** One paper as the chart draws it: its place, plus the text the tooltip prints. */
export interface MapPoint {
  arxiv_id: string;
  date: string;
  title: string;
  /** Title of the canon paper it sits nearest to. "" when none was recorded. */
  anchorTitle: string;
  x: number;
  y: number;
}

/** One colour group: its identity, its size on the map, and what is drawn now. */
export interface AnchorSeries {
  group: AnchorGroup;
  /** Papers in this group on the map, before any query. The key prints it. */
  total: number;
  /** Papers in this group the query matched. Every one, when nothing is typed. */
  points: MapPoint[];
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

/** The key's swatch. Same four shapes recharts draws in the plot. */
function ShapeSwatch({
  shape,
  colour,
  hollow,
}: {
  shape: AnchorShape;
  colour: string;
  hollow: boolean;
}) {
  const paint = hollow
    ? { fill: "none", stroke: colour, strokeWidth: 1.5 }
    : { fill: colour };
  return (
    <svg
      viewBox="0 0 14 14"
      className="mt-[3px] h-3.5 w-3.5 shrink-0"
      aria-hidden="true"
    >
      {shape === "circle" && <circle cx="7" cy="7" r="5" {...paint} />}
      {shape === "square" && (
        <rect x="2.2" y="2.2" width="9.6" height="9.6" {...paint} />
      )}
      {shape === "triangle" && <path d="M7 1.6 L12.6 11.6 H1.4 Z" {...paint} />}
      {shape === "diamond" && (
        <path d="M7 1.2 L12.8 7 L7 12.8 L1.2 7 Z" {...paint} />
      )}
    </svg>
  );
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
      {point.anchorTitle && (
        <p className="mt-1 font-mono text-[10px] text-muted">
          Nearest in the canon: {point.anchorTitle}
        </p>
      )}
    </div>
  );
}

export function PapersMap({
  map,
  series,
  unmatched,
  filtered,
  agreement,
  onSelect,
}: {
  map: PapersMap;
  /** The papers the query matched, split by colour group. Every paper, when nothing is typed. */
  series: AnchorSeries[];
  /** Papers it did not. Empty when nothing is typed. */
  unmatched: MapPoint[];
  /** Whether a query is active, which decides if the unmatched series is drawn. */
  filtered: boolean;
  /** How far the colouring tracks the layout. Null below two anchored papers. */
  agreement: AnchorAgreement | null;
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

  // The catch-all groups are drawn first, so no coloured dot sits under a grey
  // one. The key below keeps the ranked order instead.
  const drawn = [...series].sort(
    (a, b) => Number(b.group.anchorId === "") - Number(a.group.anchorId === ""),
  );
  // Every count in the caption and the key is summed from the series, so none
  // of it goes stale as the 60-day window moves.
  const named = series.filter((entry) => entry.group.anchors === 1);
  const namedPapers = named.reduce((sum, entry) => sum + entry.total, 0);
  const plotted = series.reduce((sum, entry) => sum + entry.total, 0);
  const anchors = series.reduce((sum, entry) => sum + entry.group.anchors, 0);
  const pooled = anchors - named.length;

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs text-muted">
        UMAP places each paper from its {map.dim}-dimensional{" "}
        {map.model || "embedding"} vector (n = {map.n} papers). Colour and shape
        mark the canon paper each one is nearest to, as recorded upstream:{" "}
        {named.length} of the {anchors} canon papers named carry a colour,
        covering {namedPapers} of the {plotted} papers plotted
        {pooled > 0 && `, and the other ${pooled} share one grey`}. Only the
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
            {/* Fixed area, so the mark encodes position only. 110 gives a
                radius just under 6px, over the 8px-diameter floor. */}
            <ZAxis range={[110, 110]} />
            <Tooltip
              content={<PointTooltip />}
              cursor={{ stroke: "var(--rule)" }}
            />
            {/* Drawn first, so no matched dot sits under an unmatched one. */}
            {filtered && (
              <Scatter
                name="Not matched"
                data={unmatched}
                // An opaque blend, not `fillOpacity`: an opacity on a fill
                // leaves the mark's edge and the key's swatch disagreeing
                // about the colour. color-mix keeps the blend correct in both
                // themes.
                fill="color-mix(in oklab, var(--muted) 35%, var(--background))"
                shape="circle"
                isAnimationActive={false}
              />
            )}
            {drawn.map(({ group, points }) => (
              <Scatter
                key={group.key}
                name={group.label}
                data={points}
                fill={group.hollow ? "none" : group.colour}
                shape={group.shape}
                // A 2px ring in the surface colour separates two overlapping
                // marks. The hollow group draws its own outline instead.
                stroke={group.hollow ? group.colour : "var(--background)"}
                strokeWidth={group.hollow ? 1.5 : 2}
                isAnimationActive={false}
                onClick={(point: unknown) => {
                  const arxivId = (point as MapPoint | undefined)?.arxiv_id;
                  if (arxivId) onSelect(arxivId);
                }}
                className="cursor-pointer"
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* The key. Rows hold every group whether or not a query emptied it, so
          typing never repaints a colour. */}
      <ul className="mx-auto mt-4 max-w-[640px] space-y-1.5 text-xs text-muted">
        {series.map(({ group, total }) => (
          <li key={group.key} className="flex items-start gap-2">
            <ShapeSwatch
              shape={group.shape}
              colour={group.colour}
              hollow={group.hollow}
            />
            <span className="leading-snug">
              {/* The label wears a text token; the swatch beside it carries the
                  colour. Two of the light-mode slots sit under 3:1 against the
                  page, so a coloured label would be hard to read. */}
              {group.label}{" "}
              <span className="whitespace-nowrap">({total})</span>
            </span>
          </li>
        ))}
        {filtered && (
          <li className="flex items-start gap-2">
            <svg
              viewBox="0 0 14 14"
              className="mt-[3px] h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            >
              <circle
                cx="7"
                cy="7"
                r="5"
                fill="color-mix(in oklab, var(--muted) 35%, var(--background))"
              />
            </svg>
            <span className="leading-snug">
              Not matched ({unmatched.length})
            </span>
          </li>
        )}
      </ul>

      <div className="mt-3 space-y-2 text-xs text-muted">
        <p>Click a dot to jump to its paper.</p>
        {agreement && agreement.n > 1 && (
          <p>
            Measured over the {agreement.n} papers on the map that carry a canon
            paper: {agreement.shared} of {agreement.n} (
            {((agreement.shared / agreement.n) * 100).toFixed(1)}%) have a
            nearest neighbour on the plot naming the same one, against{" "}
            {(agreement.chance * 100).toFixed(1)}% if the canon papers were
            dealt out at random. Median distance in plot radii, where the plot radius
            is 1: {agreement.sameMedian.toFixed(3)} between two papers naming
            the same canon paper (n = {agreement.samePairs} pairs),{" "}
            {agreement.otherMedian.toFixed(3)} between two naming different ones
            (n = {agreement.otherPairs} pairs).
          </p>
        )}
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
          {map.min_dist}, seed = {map.seed}. Colour ranks the canon papers by
          how many papers name them, so a day that reorders the top{" "}
          {named.length} reassigns their colours.
        </p>
      </div>
    </div>
  );
}
