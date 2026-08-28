const BARRIERS = [
  {
    title: "Collective Action Problem",
    description:
      "Many elements of large agent safety are not in the business interest of any individual company. Consequently we see a lack of investment in multi-agent evals and little discussion of large-agent safety at frontier labs.",
  },
  {
    title: "Lack of Data",
    description:
      "Pure-AI LAS are few; agent presence on mixed systems is hard to identify; and large-scale simulation papers rarely publish their simulation data.",
  },
  {
    title: "Inter-disciplinary Collaboration",
    description:
      "LAS calls for highly interdisciplinary specialised teams, drawing on AI safety, social sciences, and scaling engineering. It takes time and contact to connect fields who don't usually talk, particularly going outside the academy.",
  },
  {
    title: "Streetlight Effects",
    description:
      "LAS work is new, highly specialised, and outside the curriculum of major AI safety training programmes like ARENA, making it costlier for new people to enter the space than to work on established agendas like mechanistic interpretability or single-agent evals.",
  },
];

export function Barriers() {
  return (
    <section
      id="barriers"
      className="scroll-mt-20 border-b border-rule px-6 py-24 md:px-12"
    >
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Barriers
        </p>
        <h2 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight md:text-4xl">
          Barriers to overcome.
        </h2>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {BARRIERS.map((barrier) => (
            <div key={barrier.title}>
              <h3 className="font-serif text-xl font-semibold">
                {barrier.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-foreground/70">
                {barrier.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
