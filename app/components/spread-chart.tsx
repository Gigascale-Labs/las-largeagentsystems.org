"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const spreadData = [
  { system: "Forums", value: 38 },
  { system: "Human Rep.", value: 22 },
  { system: "Skill Sharing", value: 17 },
  { system: "Culture", value: 29 },
  { system: "Economy", value: 24 },
  { system: "Simulation", value: 15 },
];

export function SpreadChart() {
  return (
    <>
      <div className="mt-12 h-[360px] w-full border border-rule bg-background p-4 md:p-8">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={spreadData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--rule)" vertical={false} />
            <XAxis
              dataKey="system"
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
            />
            <Tooltip
              contentStyle={{
                background: "var(--background)",
                border: "1px solid var(--rule)",
                fontSize: 12,
              }}
            />
            <Bar dataKey="value" name="Illustrative agent presence" fill="#7a2118" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-xs italic text-muted">
        Illustrative, placeholder data shown for layout purposes only — not
        sourced.
      </p>
    </>
  );
}
