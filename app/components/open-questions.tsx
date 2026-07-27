const QUESTIONS = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit?",
  "Ut enim ad minim veniam, quis nostrud exercitation ullamco?",
  "Duis aute irure dolor in reprehenderit in voluptate velit?",
  "Excepteur sint occaecat cupidatat non proident sunt in culpa?",
];

export function OpenQuestions() {
  return (
    <section
      id="questions"
      className="scroll-mt-20 border-b border-rule px-6 py-24 md:px-12"
    >
      <div className="mx-auto max-w-4xl">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          Open Questions
        </p>
        <h2 className="mt-4 font-serif text-3xl font-semibold leading-tight md:text-4xl">
          Open questions.
        </h2>

        <ul className="mt-12 divide-y divide-rule border-y border-rule">
          {QUESTIONS.map((question, i) => (
            <li key={question} className="flex gap-6 py-6">
              <span className="font-serif text-xl text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <p className="text-lg leading-relaxed">{question}</p>
                <p className="mt-2 text-sm italic text-muted">
                  Excerpt from paper - placeholder.
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
