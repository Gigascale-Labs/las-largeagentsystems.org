export function Hero() {
  return (
    <section
      id="hero"
      className="scroll-mt-20 border-b border-rule px-6 py-28 md:px-12 md:py-36"
    >
      <div className="mx-auto max-w-4xl">
        <p className="mb-6 font-mono text-xs uppercase tracking-[0.2em] text-muted">
          LargeAgentSystems.org
        </p>
        <h1 className="max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
          For AI to go well, we need a new science of large agent systems.
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed text-foreground/80">
          As millions of AI agents permeate human economies, societies, and
          cultures, systemic risks from instability, inequality, emergent
          capabilities, and disempowerment are growing. Meeting these
          challenges demands a concerted cross-disciplinary effort, drawing on
          social sciences, computer science, and AI safety in equal measure.
          We&apos;ve put together this resource to summarise approaches and
          challenges in the safe transition to large-scale, possibly mixed
          systems of humans and AI. We refer to the hybrid and AI-only systems
          as &ldquo;large agent systems&rdquo;, to distinguish them from the
          typically small-scale, centralised, or closed systems studied in
          multi-agent systems research.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="#problem"
            className="border border-foreground px-5 py-2.5 text-sm font-medium uppercase tracking-wide transition-colors hover:border-accent hover:text-accent"
          >
            The problem
          </a>
          <a
            href="#join"
            className="bg-foreground px-5 py-2.5 text-sm font-medium uppercase tracking-wide text-background transition-colors hover:bg-accent"
          >
            Join the community
          </a>
        </div>
      </div>
    </section>
  );
}
