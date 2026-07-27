// Illustrative/inspirational framing text, not a rigorously scoped
// taxonomy — don't treat this list as ground truth to audit the corpus
// or its tagging against (see docs/las-canon-addendum.md).
const TAGS = [
  "Network science",
  "Social network analysis",
  "Macroprudential regulation",
  "Market microstructure",
  "Multi-agent evaluations",
  "Behavioural evaluations",
  "Population modelling",
];

const AXES = [
  {
    label: "System type",
    detail:
      "production economy, social network, labour market, financial system.",
  },
  {
    label: "Participant mix",
    detail: "purely AI, or a mix of humans and AI.",
  },
  {
    label: "Observability",
    detail:
      "whether aggregates, agent interactions, and agents themselves are accessible to a monitor.",
  },
];

export function Disciplines() {
  return (
    <section
      id="disciplines"
      className="scroll-mt-20 border-b border-rule px-6 py-24 md:px-12"
    >
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-2 md:items-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
            Disciplines
          </p>
          <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight md:text-4xl">
            Large agent problems are highly cross-disciplinary.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-foreground/80">
            The appropriate lens for a given system problem depends on:
          </p>
          <ol className="mt-3 max-w-md list-decimal space-y-2 pl-5 text-base leading-relaxed text-foreground/80">
            {AXES.map((axis) => (
              <li key={axis.label}>
                <strong className="font-semibold text-foreground">
                  {axis.label}
                </strong>{" "}
                - {axis.detail}
              </li>
            ))}
          </ol>
          <p className="mt-3 max-w-md text-base leading-relaxed text-foreground/80">
            Along each axis, different knowledge can be brought to bear.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 border border-rule p-8">
          {TAGS.map((tag, i) => (
            <span
              key={tag}
              className="border border-rule px-3 py-1.5 text-sm"
              style={{
                fontSize: `${0.75 + (i % 4) * 0.12}rem`,
                color: i % 3 === 0 ? "var(--accent)" : "var(--foreground)",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
