"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ORG_MAP_SOURCE_URL, ORG_TYPES, type OrgTypeTimeline } from "@/lib/org-map";

const TYPE_COLOR_VARS: Record<(typeof ORG_TYPES)[number], string> = {
  "Research Nonprofit": "var(--chart-1)",
  Company: "var(--chart-2)",
  "Protocol/Network": "var(--chart-3)",
  "Academic Programme/Lab": "var(--chart-4)",
  Funder: "var(--chart-5)",
  Other: "var(--chart-6)",
};

const CHART_START_YEAR = 2020;

const DISPLAYED_TYPES = ORG_TYPES.filter(
  (t) =>
    t !== "Academic Programme/Lab" &&
    t !== "Funder" &&
    t !== "Other" &&
    t !== "Research Nonprofit",
);

export function OrgTypeChart({ data }: { data: OrgTypeTimeline | null }) {
  if (!data || data.points.length === 0) {
    return (
      <div className="mt-12 border border-rule bg-background p-8 text-sm text-muted">
        Organization data is temporarily unavailable.{" "}
        <a
          href={ORG_MAP_SOURCE_URL}
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

  const chartData = data.points
    .filter((p) => p.year >= CHART_START_YEAR)
    .map((p) => ({ year: String(p.year), ...p.counts }));

  if (chartData.length === 0) {
    return (
      <div className="mt-12 border border-rule bg-background p-8 text-sm text-muted">
        No organization data is available from {CHART_START_YEAR} onward.{" "}
        <a
          href={ORG_MAP_SOURCE_URL}
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
      <p className="mb-2 text-xs text-muted">
        Organizations, cumulative by type, {CHART_START_YEAR}–present
      </p>
      <div className="h-[360px] w-full border border-rule bg-background p-4 md:p-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="year"
              stroke="var(--muted)"
              tickLine={false}
              axisLine={{ stroke: "var(--rule)" }}
              fontSize={12}
            />
            <YAxis
              stroke="var(--muted)"
              tickLine={false}
              axisLine={false}
              fontSize={12}
              allowDecimals={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--rule)",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
            {DISPLAYED_TYPES.map((type, i) => (
              <Bar
                key={type}
                dataKey={type}
                name={type}
                stackId="orgs"
                fill={TYPE_COLOR_VARS[type]}
                stroke="var(--background)"
                strokeWidth={2}
                maxBarSize={24}
                radius={i === DISPLAYED_TYPES.length - 1 ? [4, 4, 0, 0] : undefined}
                // Same reasoning as usage-stats-chart.tsx's Line: don't
                // animate bars in on mount, so counts are correct immediately.
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-muted">
        Cumulative count of catalogued organizations by founding year. Bars
        cover {DISPLAYED_TYPES.join(" and ")} only.
        {data.excludedFromTimelineCount > 0 && (
          <>
            {" "}
            The chart drops {data.excludedFromTimelineCount} of{" "}
            {data.totalOrgs} organisations in the Org Map due to missing
            founding year or type.
          </>
        )}
      </p>
      <p className="mt-2 text-xs text-muted">
        Source:{" "}
        <a
          href={ORG_MAP_SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-muted/40 underline-offset-4 hover:text-foreground"
        >
          Gigascale-Labs/map.largeagentsystems.org
        </a>
        .
      </p>
    </div>
  );
}
