export function ComplexSystem() {
  return (
    <section
      id="framing"
      className="scroll-mt-20 border-b border-rule px-6 py-24 md:px-12"
    >
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[1fr_2fr]">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Framing
          </p>
          <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight md:text-4xl">
            A new type of system.
          </h2>
        </div>
        <div className="space-y-5 text-base leading-relaxed text-foreground/80 md:text-lg">
          <p>
            Human systems were designed for humans. Large-scale changes to
            the participant mix on large systems has historically led to
            sudden, severe systemic failures - including the GFC, the 2010
            Flash Crash, and US political polarisation, partially induced
            by bot farms. With agentic AI, these changes could be
            catastrophic. A humanity disempowered by its tools may be unable
            to meaningfully change course when economic incentives turn
            against it. A rapid concentration of power could upend social
            contracts, leading to prolonged instability and diminishing the
            world&apos;s ability to respond to other threats. Alternative
            threat models focus on collections of distributed agents
            developing emergent capabilities, similar to the OpenAI Hack, or
            even superintelligence.
          </p>
          <p>
            Safety lacks the methods and threat model awareness to deal
            with large, distributed systems of agents like those seen in
            the OpenAI Hack, particularly when these threats become
            decentralised and intermingled with human actors. Expense and
            mismatched assumptions of system observability prevent a clean
            application of existing methods at emerging agentic scale.
            Meanwhile, agentic infrastructure and live deployments continue
            to grow, creating an abundance of unmonitored interactions and
            unmitigated risks.
          </p>
        </div>
      </div>
    </section>
  );
}
