const CLUSTERS = [
  {
    name: "Tomašev, Franklin & Osindero",
    institution: "Google DeepMind",
    summary: "DeepMind's running thread on the AI agent economy.",
    papers: [
      {
        title: "Virtual Agent Economies",
        url: "https://arxiv.org/abs/2509.10147",
      },
      {
        title: "AI Agent Traps",
        url: "https://www.rivista.ai/wp-content/uploads/2026/04/ssrn-6372438.pdf",
      },
      {
        title: "Intelligent AI Delegation",
        url: "https://arxiv.org/abs/2602.11865",
      },
      {
        title: "Distributional AGI Safety",
        url: "https://arxiv.org/abs/2512.16856",
      },
    ],
  },
  {
    name: "Bisconti, Pierucci & Galisai",
    institution: "DEXAI – Icaro Lab",
    summary: "Microfoundations of macro safety.",
    papers: [
      {
        title: "Beyond Single-Agent Safety",
        url: "https://arxiv.org/abs/2512.02682",
      },
      {
        title: "Agentic Microphysics",
        url: "https://arxiv.org/abs/2604.15236",
      },
    ],
  },
  {
    name: "Hammond & Chan",
    institution: "Cooperative AI Foundation × GovAI",
    summary: "Multi-agent risk and coordination infrastructure.",
    papers: [
      {
        title: "Multi-Agent Risks from Advanced AI",
        url: "https://arxiv.org/abs/2502.14143",
      },
      { title: "IDs for AI Systems", url: "https://arxiv.org/abs/2406.12137" },
    ],
  },
];

export function ResearchAgendas() {
  return (
    <section
      id="agendas"
      className="scroll-mt-20 border-b border-rule px-6 py-24 md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Research Agendas
        </p>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
          Groups.
        </h2>

        <div className="mt-12 grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {CLUSTERS.map((cluster) => (
            <div key={cluster.name} className="border-t-2 border-accent pt-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
                {cluster.institution}
              </p>
              <h3 className="mt-2 font-serif text-xl font-semibold">
                {cluster.name}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                {cluster.summary}
              </p>
              <ul className="mt-5 space-y-2">
                {cluster.papers.map((paper) => (
                  <li key={paper.url}>
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs uppercase tracking-widest text-muted transition-colors hover:text-accent"
                    >
                      {paper.title} →
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
