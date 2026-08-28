export function Join() {
  return (
    <section
      id="join"
      className="scroll-mt-20 border-b border-rule px-6 py-28 md:px-12"
    >
      <div className="mx-auto max-w-3xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Community
        </p>
        <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight md:text-5xl">
          Join the community.
        </h2>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-foreground/80 md:text-lg">
          We run a Slack community for AI safety researchers, social
          scientists, and policy and strategy experts working on large agent
          systems.
        </p>
        <a
          href="https://forms.gle/4YSjPwHw16RDTAiV9"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-block bg-foreground px-8 py-3.5 text-sm font-medium uppercase tracking-wide text-background transition-colors hover:bg-accent"
        >
          Request to join
        </a>
      </div>
    </section>
  );
}
