import { getOrgTypeTimeline } from "@/lib/org-map";
import { getUsageStatsData } from "@/lib/usage-stats";
import { OrgTypeChart } from "./org-type-chart";
import { UsageStatsChart } from "./usage-stats-chart";

export async function GrowthChart() {
  const [usageStats, orgTypeTimeline] = await Promise.all([
    getUsageStatsData(),
    getOrgTypeTimeline(),
  ]);

  return (
    <section
      id="growth"
      className="scroll-mt-20 border-b border-rule px-6 py-24 md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Trajectory
        </p>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
          Agentic systems are growing fast.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-foreground/80 md:text-lg">
          Founded largely in the past year, early examples of purely-AI
          large agent systems have hundreds of thousands of participants.
        </p>

        <UsageStatsChart data={usageStats} />

        <h3 className="mt-16 max-w-2xl font-serif text-xl font-semibold leading-tight md:text-2xl">
          Live deployments are growing in number.
        </h3>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-foreground/80 md:text-lg">
          The number of companies implementing large agent systems and agent
          infrastructure is growing.
        </p>

        <OrgTypeChart data={orgTypeTimeline} />
      </div>
    </section>
  );
}
