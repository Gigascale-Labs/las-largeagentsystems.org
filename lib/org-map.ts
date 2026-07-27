import { parseCSV } from "./csv";

const ORG_MAP_CSV_URL =
  "https://raw.githubusercontent.com/Gigascale-Labs/map.largeagentsystems.org/main/LAS_organisations%20-%20LAS_organisations.csv.csv";

export const ORG_MAP_SOURCE_URL =
  "https://github.com/Gigascale-Labs/map.largeagentsystems.org";

/**
 * Fixed order (palette-stable -- color follows the category, not its rank).
 * Any "type" value from the CSV that isn't one of these folds into "Other".
 */
export const ORG_TYPES = [
  "Research Nonprofit",
  "Company",
  "Protocol/Network",
  "Academic Programme/Lab",
  "Funder",
  "Other",
] as const;

export type OrgType = (typeof ORG_TYPES)[number];

export interface OrgTypeYearPoint {
  year: number;
  counts: Record<OrgType, number>;
}

export interface OrgTypeTimeline {
  points: OrgTypeYearPoint[];
  totalOrgs: number;
  /** Catalogued orgs with no recorded founding year and/or type, so they can't be placed on the timeline. */
  excludedFromTimelineCount: number;
}

function normalizeType(raw: string): OrgType {
  const t = raw.trim();
  return (ORG_TYPES as readonly string[]).includes(t) ? (t as OrgType) : "Other";
}

/**
 * Fetches the hand-curated org CSV from map.largeagentsystems.org and builds
 * a cumulative-count-by-type-by-founding-year timeline. Revalidates once a
 * day. Server-only, same pattern as lib/usage-stats.ts.
 */
export async function getOrgTypeTimeline(): Promise<OrgTypeTimeline | null> {
  try {
    const res = await fetch(ORG_MAP_CSV_URL, { next: { revalidate: 86400 } });
    if (!res.ok) return null;

    const text = await res.text();
    const table = parseCSV(text);
    if (table.length < 2) return null;

    const header = table[0];
    const typeIdx = header.indexOf("type");
    const foundedIdx = header.indexOf("founded");
    if (typeIdx === -1 || foundedIdx === -1) return null;

    const rows = table.slice(1).filter((r) => r.length > 1 || r[0]);
    const totalOrgs = rows.length;

    const foundings: { year: number; types: OrgType[] }[] = [];
    let excludedFromTimelineCount = 0;

    for (const row of rows) {
      const foundedRaw = (row[foundedIdx] ?? "").trim();
      const year = /^\d{3,4}$/.test(foundedRaw) ? Number(foundedRaw) : null;

      const typeRaw = (row[typeIdx] ?? "").trim();
      const types = typeRaw
        ? Array.from(new Set(typeRaw.split(";").map((t) => normalizeType(t))))
        : [];

      if (year == null || types.length === 0) {
        excludedFromTimelineCount++;
        continue;
      }
      foundings.push({ year, types });
    }

    if (foundings.length === 0) return null;

    const years = Array.from(new Set(foundings.map((f) => f.year))).sort((a, b) => a - b);
    const running = Object.fromEntries(ORG_TYPES.map((t) => [t, 0])) as Record<OrgType, number>;

    const points: OrgTypeYearPoint[] = years.map((year) => {
      for (const f of foundings) {
        if (f.year === year) {
          for (const t of f.types) running[t] += 1;
        }
      }
      return { year, counts: { ...running } };
    });

    return { points, totalOrgs, excludedFromTimelineCount };
  } catch {
    return null;
  }
}
