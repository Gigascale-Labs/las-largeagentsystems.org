"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  USAGE_STATS_SERIES,
  USAGE_STATS_SOURCE_URL,
  type UsageStatsData,
} from "@/lib/usage-stats";

type Granularity = "daily" | "monthly";

interface RangePreset {
  id: string;
  label: string;
  months: number | null;
  granularity: Granularity;
}

const RANGE_PRESETS: RangePreset[] = [
  { id: "1m", label: "1M", months: 1, granularity: "daily" },
  { id: "3m", label: "3M", months: 3, granularity: "monthly" },
  { id: "6m", label: "6M", months: 6, granularity: "monthly" },
  { id: "1y", label: "1Y", months: 12, granularity: "monthly" },
  { id: "2y", label: "2Y", months: 24, granularity: "monthly" },
  { id: "5y", label: "5Y", months: 60, granularity: "monthly" },
  { id: "all", label: "All", months: null, granularity: "monthly" },
];

const DEFAULT_RANGE_ID = "2y";

function bucketKey(date: string, granularity: Granularity): string {
  return granularity === "daily" ? date : date.slice(0, 7);
}

function formatBucketLabel(key: string, granularity: Granularity): string {
  const iso = granularity === "daily" ? `${key}T00:00:00Z` : `${key}-01T00:00:00Z`;
  const d = new Date(iso);
  return granularity === "daily"
    ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit", timeZone: "UTC" })
    : d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

interface BucketRow {
  key: string;
  label: string;
  raw: Record<string, number | null>;
}

function computeView(rows: UsageStatsData["rows"], preset: RangePreset) {
  if (rows.length === 0) return { chartData: [], tableRows: [] as BucketRow[] };

  const lastDate = new Date(`${rows[rows.length - 1].date}T00:00:00Z`);
  let cutoff: Date | null = null;
  if (preset.months != null) {
    cutoff = new Date(lastDate);
    cutoff.setUTCMonth(cutoff.getUTCMonth() - preset.months);
  }

  const visible = cutoff
    ? rows.filter((r) => new Date(`${r.date}T00:00:00Z`) >= (cutoff as Date))
    : rows;

  const bucketMap = new Map<string, Record<string, number | null>>();
  const order: string[] = [];
  for (const row of visible) {
    const key = bucketKey(row.date, preset.granularity);
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {});
      order.push(key);
    }
    const bucket = bucketMap.get(key)!;
    for (const series of USAGE_STATS_SERIES) {
      const v = row.values[series.id];
      if (v != null) bucket[series.id] = v; // rows are chronological, so last write wins
    }
  }

  const tableRows: BucketRow[] = order.map((key) => ({
    key,
    label: formatBucketLabel(key, preset.granularity),
    raw: bucketMap.get(key) ?? {},
  }));

  const baselines: Record<string, number> = {};
  for (const series of USAGE_STATS_SERIES) {
    const first = tableRows.find((r) => {
      const v = r.raw[series.id];
      return v != null && v > 0;
    });
    if (first) baselines[series.id] = first.raw[series.id] as number;
  }

  const chartData = tableRows.map((r) => {
    const point: Record<string, number | string | null> = { x: r.label };
    for (const series of USAGE_STATS_SERIES) {
      const base = baselines[series.id];
      const v = r.raw[series.id];
      const indexed = base && v != null ? (v / base) * 100 : null;
      // A log-scale axis can't plot zero/negative; treat as a gap like any other missing point.
      point[series.id] = indexed != null && indexed > 0 ? indexed : null;
    }
    return point;
  });

  return { chartData, tableRows };
}

export function UsageStatsChart({ data }: { data: UsageStatsData | null }) {
  const [rangeId, setRangeId] = useState(DEFAULT_RANGE_ID);
  const [showTable, setShowTable] = useState(false);
  const preset = RANGE_PRESETS.find((p) => p.id === rangeId) ?? RANGE_PRESETS[4];

  const { chartData, tableRows } = useMemo(
    () => computeView(data?.rows ?? [], preset),
    [data, preset],
  );

  if (!data || data.rows.length === 0) {
    return (
      <div className="mt-12 border border-rule bg-background p-8 text-sm text-muted">
        Usage stats are temporarily unavailable.{" "}
        <a
          href={USAGE_STATS_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted/40 underline-offset-4 hover:text-foreground"
        >
          View the source data directly
        </a>
        .
      </div>
    );
  }

  return (
    <div className="mt-12">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2 font-mono text-xs uppercase tracking-[0.2em]">
        <span className="mr-2 text-muted">Range</span>
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setRangeId(p.id)}
            className={
              p.id === rangeId
                ? "px-2 py-1 text-accent underline underline-offset-4"
                : "px-2 py-1 text-muted hover:text-foreground"
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted">
        Growth index, log scale (100 = start of range)
      </p>
      <div className="mt-2 h-[400px] w-full border border-rule bg-background p-4 md:p-8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="x"
              stroke="var(--muted)"
              tickLine={false}
              axisLine={{ stroke: "var(--rule)" }}
              fontSize={12}
              minTickGap={24}
            />
            <YAxis
              scale="log"
              domain={["auto", "auto"]}
              allowDataOverflow
              stroke="var(--muted)"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              width={56}
              tickFormatter={(value: number) => value.toLocaleString()}
            />
            <Tooltip
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--rule)",
                fontSize: 12,
              }}
              formatter={(value) => (typeof value === "number" ? value.toFixed(0) : String(value ?? ""))}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
            {USAGE_STATS_SERIES.map((series) => (
              <Line
                key={series.id}
                type="linear"
                dataKey={series.id}
                name={series.label}
                stroke={series.colorVar}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ r: 4, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                connectNulls={false}
                // Recharts' default ~1.5s draw-in animation means a line
                // that's already in view on page load (or reached by a quick
                // scroll) briefly renders as half-drawn -- looks like the
                // data hasn't loaded rather than an animation still playing.
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">
          Each source is indexed to 100 at its first tracked point in the
          selected range, since not every source has been measured for the
          same length of time.
        </p>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="whitespace-nowrap font-mono text-xs uppercase tracking-[0.2em] text-muted underline underline-offset-4 hover:text-foreground"
        >
          {showTable ? "Hide data table" : "View data as table"}
        </button>
      </div>

      {showTable && (
        <div className="mt-4 max-h-72 overflow-auto border border-rule">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-background">
              <tr>
                <th className="border-b border-rule px-2 py-1 font-mono uppercase tracking-[0.1em] text-muted">
                  Date
                </th>
                {USAGE_STATS_SERIES.map((series) => (
                  <th
                    key={series.id}
                    className="whitespace-nowrap border-b border-rule px-2 py-1 text-right font-mono uppercase tracking-[0.1em] text-muted"
                  >
                    {series.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.key}>
                  <td className="whitespace-nowrap border-b border-rule/50 px-2 py-1 font-mono tabular-nums">
                    {row.label}
                  </td>
                  {USAGE_STATS_SERIES.map((series) => {
                    const v = row.raw[series.id];
                    return (
                      <td
                        key={series.id}
                        className="whitespace-nowrap border-b border-rule/50 px-2 py-1 text-right font-mono tabular-nums"
                      >
                        {v != null ? v.toLocaleString() : "-"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-3 text-xs text-muted">
        Source:{" "}
        <a
          href={USAGE_STATS_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted/40 underline-offset-4 hover:text-foreground"
        >
          Gigascale-Labs/las-usage-stats
        </a>
        , scraped daily.
      </p>
    </div>
  );
}
