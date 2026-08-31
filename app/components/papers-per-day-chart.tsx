"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
// Types only, from the types-only module: this is a client component and
// `lib/papers-data.ts` reads the synced file with `fs`. The repo URL arrives
// as a prop for the same reason.
import type { KeptPerDayPoint } from "@/lib/papers-schema";

/**
 * Draws one bar per day on file: the papers kept that day, or the papers a
 * query matched that day.
 *
 * Built to the chart rules in `docs/synced-dataset-pattern.md`: the caption
 * says what the chart plots and over how many days without claiming anything
 * about it, both axes carry labels, the single series carries a key, and one
 * colour draws one thing.
 *
 * `keptPerDaySeries` counts every number here from the days in
 * `data/las-new-papers.json`, so none of it goes stale as the 60-day window
 * moves. `filtered` says whether a query narrowed those counts, which changes
 * the caption and the key but nothing else.
 */

/** "2026-08-20" -> "20 Aug". Returns the input unchanged if it is not a date. */
function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function PapersPerDayChart({
  points,
  sourceUrl,
  filtered = false,
}: {
  points: KeptPerDayPoint[];
  sourceUrl: string;
  /** True when a query narrowed the counts. Changes the caption and the key. */
  filtered?: boolean;
}) {
  // No empty state here: `PapersList` below already says there are no days.
  if (points.length === 0) return null;

  const chartData = points.map((p) => ({ ...p, label: shortDate(p.date) }));
  const first = points[0].date;
  const last = points[points.length - 1].date;
  const total = points.reduce((sum, point) => sum + point.kept, 0);
  const series = filtered ? "Papers matching" : "Papers kept";

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs text-muted">
        {filtered ? "Papers matching the query" : "Papers kept"} per day,{" "}
        {first} to {last} (n = {points.length} day
        {points.length === 1 ? "" : "s"}, {total} paper
        {total === 1 ? "" : "s"})
      </p>
      <div className="h-[320px] w-full border border-rule bg-background p-4 md:p-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 24 }}
          >
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="var(--muted)"
              tickLine={false}
              axisLine={{ stroke: "var(--rule)" }}
              fontSize={12}
            >
              <Label
                value="Day announced (UTC)"
                position="insideBottom"
                offset={-16}
                fill="var(--muted)"
                fontSize={12}
              />
            </XAxis>
            <YAxis
              stroke="var(--muted)"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              allowDecimals={false}
              width={56}
            >
              <Label
                value={series}
                angle={-90}
                position="insideLeft"
                fill="var(--muted)"
                fontSize={12}
                style={{ textAnchor: "middle" }}
              />
            </YAxis>
            <Tooltip
              cursor={{ fill: "var(--rule)", fillOpacity: 0.4 }}
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--rule)",
                fontSize: 12,
              }}
              // The axis is abbreviated to fit; the tooltip gives the full date.
              labelFormatter={(_label, payload) =>
                payload?.[0]?.payload?.date ?? ""
              }
            />
            {/* Same formatter as papers-map.tsx: the label wears a text
                token, and the swatch beside it carries the series colour. */}
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 24 }}
              formatter={(value: string) => (
                <span className="text-muted">{value}</span>
              )}
            />
            <Bar
              dataKey="kept"
              name={series}
              fill="var(--chart-1)"
              maxBarSize={32}
              radius={[4, 4, 0, 0]}
              // Same reasoning as org-type-chart.tsx: don't animate bars in on
              // mount, so counts are correct immediately.
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-muted">
        Source:{" "}
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted/40 underline-offset-4 hover:text-foreground"
        >
          Gigascale-Labs/las-new-papers
        </a>
        , read daily.
      </p>
    </div>
  );
}
