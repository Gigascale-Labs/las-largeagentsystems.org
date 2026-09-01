"use client";

const THREATS = [
  {
    title: "Gradual Disempowerment",
    excerpt:
      "We argue that this dynamic could lead to an effectively irreversible loss of human influence over crucial societal systems, precipitating an existential catastrophe through the permanent disempowerment of humanity.",
    source: "Kulveit et al., 2025",
    url: "https://arxiv.org/abs/2501.16946",
  },
  {
    title: "Systemic Instability",
    excerpt:
      "Our current trajectory points toward a spontaneous emergence of a vast and highly permeable AI agent economy, presenting us with opportunities for an unprecedented degree of coordination as well as significant challenges, including systemic economic risk and exacerbated inequality.",
    source: "Tomašev et al., 2025a",
    url: "https://arxiv.org/abs/2509.10147",
  },
  {
    title: "Inequality",
    excerpt:
      "We define this emerging challenge as ‘agentic inequality’: disparities in power, opportunity, and outcomes arising from unequal access to, and capabilities of, AI agents.",
    source: "Sharp et al., 2025",
    url: "https://arxiv.org/abs/2510.16853",
  },
  {
    title: "Collective Superintelligence",
    excerpt:
      "The alternative AGI emergence hypothesis, where general capability levels are first manifested through coordination in groups of sub-AGI individual agents with complementary skills and affordances, has received far less attention.",
    source: "Tomašev et al., 2025b",
    url: "https://arxiv.org/abs/2512.16856",
  },
  {
    title: "Partially Observable Systems",
    excerpt:
      "Current interpretability techniques, developed primarily for static models, show limitations when applied to agentic systems.",
    source: "Zhu et al., 2026",
    url: "https://arxiv.org/abs/2601.17168",
  },
  {
    title: "Power Concentration",
    excerpt:
      "Historically unprecedented levels of automation could concentrate the power to get stuff done, by reducing the value of human labour, empowering small groups with big AI workforces, and potentially giving one AI developer a huge capabilities advantage.",
    source: "Hadshar, 2025",
    url: "https://80000hours.org/problem-profiles/extreme-power-concentration/",
  },
  {
    title: "Outdated Models",
    excerpt:
      "The model implies tail-loss amplification of 18–54%, economically significant relative to Basel III countercyclical buffers.",
    source: "Meng & Chen, 2026",
    url: "https://arxiv.org/abs/2604.03272",
  },
  {
    title: "Emergent Goals",
    excerpt:
      "For example, a group of moderation bots on a major social networking site could subtly but systematically manipulate the overall political perspectives of the user population, even though, individually, each agent is programmed to simply increase user engagement or filter out dis-preferred content.",
    source: "Hammond et al., 2025",
    url: "https://arxiv.org/abs/2502.14143",
  },
];

function scrollToJoin() {
  document.getElementById("join")?.scrollIntoView({ behavior: "smooth" });
}

export function ThreatModels() {
  return (
    <section
      id="threats"
      className="scroll-mt-20 border-b border-rule px-6 py-24 md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Threat Models
        </p>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
          Threat models in large agent systems.
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
          {THREATS.map((threat) => (
            <div key={threat.title} className="bg-background p-8">
              <h3 className="font-serif text-lg font-semibold">
                {threat.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-foreground/70">
                &ldquo;{threat.excerpt}&rdquo;
              </p>
              <a
                href={threat.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-block text-xs uppercase tracking-widest text-muted transition-colors hover:text-accent"
              >
                {threat.source} →
              </a>
            </div>
          ))}
          <button
            type="button"
            onClick={scrollToJoin}
            className="flex flex-col items-start justify-between bg-background p-8 text-left transition-colors hover:bg-accent/5"
          >
            <h3 className="font-serif text-lg font-semibold text-accent">
              Add yours
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-foreground/70">
              What are we missing? Join the community and bring it to light.
            </p>
            <span className="mt-6 inline-block text-xs uppercase tracking-widest text-accent">
              Go to Join →
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
