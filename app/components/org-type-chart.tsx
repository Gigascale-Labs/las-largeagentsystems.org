"use client";

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
import { ORG_MAP_SOURCE_URL, ORG_TYPES, type OrgTypeTimeline } from "@/lib/org-map";

const TYPE_COLOR_VARS: Record<(typeof ORG_TYPES)[number], string> = {
  "Research Nonprofit": "var(--chart-1)",
  Company: "var(--chart-2)",
  "Protocol/Network": "var(--chart-3)",
  "Academic Programme/Lab": "var(--chart-4)",
  Funder: "var(--chart-5)",
  Other: "var(--chart-6)",
};

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

  const chartData = data.points.map((p) => ({ year: p.year, ...p.counts }));

  return (
    <div className="mt-12">
      <p className="mb-2 text-xs text-muted">
        Organizations, cumulative by founding year
      </p>
      <div className="h-[360px] w-full border border-rule bg-background p-4 md:p-8">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="year"
              type="number"
              domain={["dataMin", "dataMax"]}
              stroke="var(--muted)"
              tickLine={false}
              axisLine={{ stroke: "var(--rule)" }}
              fontSize={12}
              tickFormatter={(value: number) => String(value)}
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
            {ORG_TYPES.map((type) => (
              <Line
                key={type}
                type="linear"
                dataKey={type}
                name={type}
                stroke={TYPE_COLOR_VARS[type]}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={{ r: 4, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs text-muted">
        Cumulative count of catalogued organizations by type, by founding
        year.
        {data.excludedFromTimelineCount > 0 && (
          <>
            {" "}
            {data.excludedFromTimelineCount} additional catalogued
            organization{data.excludedFromTimelineCount === 1 ? "" : "s"}{" "}
            {data.excludedFromTimelineCount === 1 ? "has" : "have"} no
            recorded founding year or type and{" "}
            {data.excludedFromTimelineCount === 1 ? "isn't" : "aren't"}{" "}
            reflected above.
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
