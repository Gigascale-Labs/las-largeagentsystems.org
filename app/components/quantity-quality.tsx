const CARDS = [
  {
    title: "Single-Agent",
    bullets: [
      "One agent.",
      "Focused on alignment, interpretability, and control.",
      "Historically dominant focus of AI safety and governance.",
      "Strong political and regulatory attention.",
    ],
    source: "Amodei et al., 2016",
    sourceExcerpt:
      "The problem of accidents in machine learning systems, defined as unintended and harmful behavior that may emerge from poor design of real-world AI systems.",
    url: "https://arxiv.org/abs/1606.06565",
  },
  {
    title: "Multi-Agent System",
    bullets: [
      "Two to dozens of agents.",
      "Focused on communication, coordination, and monitoring.",
      "A focus of safety and governance research since 2021.",
      "Emerging regulatory attention.",
    ],
    source: "Hammond et al., 2025",
    sourceExcerpt:
      "Today, AI systems are beginning to autonomously interact with one another and adapt their behaviour accordingly, forming multi-agent systems.",
    url: "https://arxiv.org/abs/2502.14143",
  },
  {
    title: "Large Agent System",
    bullets: [
      "Thousands to billions of agents.",
      "Focused on aggregate outcomes, system mechanisms, scalable safety.",
      "Technical research emerging since 2025.",
      "Some political attention due to impact on human employment.",
    ],
  },
];

export function QuantityQuality() {
  return (
    <section
      id="scale"
      className="scroll-mt-20 border-b border-rule px-6 py-24 md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Scale
        </p>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
          Large systems are different.
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden border border-rule bg-rule md:grid-cols-3">
          {CARDS.map((card) => (
            <div key={card.title} className="bg-background p-8">
              <h3 className="font-serif text-xl font-semibold">
                {card.title}
              </h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-foreground/80">
                {card.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="text-accent">-</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              {card.source && (
                <div className="mt-5 border-t border-rule pt-4">
                  <p className="text-xs italic text-foreground/60">
                    &ldquo;{card.sourceExcerpt}&rdquo;
                  </p>
                  <a
                    href={card.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs uppercase tracking-widest text-muted transition-colors hover:text-accent"
                  >
                    {card.source} →
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
