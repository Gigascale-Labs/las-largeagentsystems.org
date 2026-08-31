import { parseCSV } from "./csv";

const MASTER_CSV_URL =
  "https://raw.githubusercontent.com/Gigascale-Labs/las-usage-stats/main/data_outputs/master_agent_stats_daily.csv";

export const USAGE_STATS_SOURCE_URL =
  "https://github.com/Gigascale-Labs/las-usage-stats";

export interface UsageStatsSeriesConfig {
  id: string;
  label: string;
  column: string;
  url: string;
  colorVar: string;
  /** True: the fetch and parse keep it, and the page draws no line for it. */
  hidden?: boolean;
}

/**
 * One flagship metric per tracked source, in a fixed order (matches the
 * fixed-order categorical palette in globals.css — never reorder per-chart).
 * n8n is tracked in the source repo too but is left out here to keep the
 * series count at 8, the palette's validated cap; see its own dashboard for
 * the full set. An entry marked `hidden` stays in the parse and reaches no
 * page. Render from USAGE_STATS_CHART_SERIES, not from this list.
 */
export const USAGE_STATS_SERIES: UsageStatsSeriesConfig[] = [
  {
    id: "clawhub",
    label: "ClawHub skills published",
    column: "clawhub_cumulative_skills_published",
    url: "https://clawhub.ai",
    colorVar: "var(--chart-1)",
  },
  {
    id: "evomap",
    label: "EvoMap nodes",
    column: "evomap_total_nodes",
    url: "https://evomap.ai",
    colorVar: "var(--chart-2)",
  },
  {
    id: "moltbook",
    label: "MoltBook verified users",
    column: "moltbook_human_verified",
    url: "https://www.moltbook.com/",
    colorVar: "var(--chart-3)",
  },
  {
    id: "olas",
    label: "OLAS daily active agents",
    column: "olas_total_daily_active_agents",
    url: "https://olas.network",
    colorVar: "var(--chart-4)",
    // Off the page. The chain is too narrow to stand for agentic growth:
    // its agents run prediction markets and little else.
    hidden: true,
  },
  {
    id: "langgraph",
    label: "LangGraph GitHub stars",
    column: "langgraph_github_stars_cumulative",
    url: "https://github.com/langchain-ai/langgraph",
    colorVar: "var(--chart-5)",
  },
  {
    id: "crewai",
    label: "CrewAI GitHub stars",
    column: "crewai_github_stars_cumulative",
    url: "https://github.com/crewAIInc/crewAI",
    colorVar: "var(--chart-6)",
  },
  {
    id: "agentFramework",
    label: "Microsoft Agent Framework GitHub stars",
    column: "agent_framework_github_stars_cumulative",
    url: "https://github.com/microsoft/agent-framework",
    colorVar: "var(--chart-7)",
  },
  {
    id: "smithery",
    label: "Smithery MCP servers listed",
    column: "smithery_total_servers",
    url: "https://smithery.ai",
    colorVar: "var(--chart-8)",
  },
];

/**
 * The series the page draws and tables: 7 of the 8 in USAGE_STATS_SERIES.
 *
 * Same fixed order and same colours. A hidden series leaves a gap in the
 * palette (chart-4 is unused) rather than shifting every colour after it.
 */
export const USAGE_STATS_CHART_SERIES: UsageStatsSeriesConfig[] =
  USAGE_STATS_SERIES.filter((s) => !s.hidden);

export interface UsageStatsRow {
  date: string;
  values: Record<string, number | null>;
}

export interface UsageStatsData {
  rows: UsageStatsRow[];
}

/**
 * Fetches the daily-updating master CSV from las-usage-stats and parses the
 * flagship series out of it. Revalidates once a day, matching that repo's
 * own daily scrape cadence. Server-only — do not import from a Client
 * Component (the fetch cache options are a no-op there and the point of
 * this module is to keep the fetch on the server).
 */
export async function getUsageStatsData(): Promise<UsageStatsData | null> {
  try {
    const res = await fetch(MASTER_CSV_URL, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const text = await res.text();
    const table = parseCSV(text);
    if (table.length < 2) return null;

    const header = table[0];
    const dateIdx = header.indexOf("date");
    if (dateIdx === -1) return null;

    const columnIdx: Record<string, number> = {};
    for (const series of USAGE_STATS_SERIES) {
      const idx = header.indexOf(series.column);
      if (idx !== -1) columnIdx[series.id] = idx;
    }

    const rows: UsageStatsRow[] = table
      .slice(1)
      .filter((r) => r[dateIdx])
      .map((r) => {
        const values: Record<string, number | null> = {};
        for (const series of USAGE_STATS_SERIES) {
          const idx = columnIdx[series.id];
          const raw = idx !== undefined ? r[idx] : undefined;
          values[series.id] = raw && raw.trim() !== "" ? Number(raw) : null;
        }
        return { date: r[dateIdx], values };
      });

    if (rows.length === 0) return null;
    return { rows };
  } catch {
    return null;
  }
}
