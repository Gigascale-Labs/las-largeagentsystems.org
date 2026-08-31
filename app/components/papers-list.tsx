import type { DayCounts, Paper, PaperDay } from "@/lib/papers-schema";

/**
 * One continuous scroll of papers grouped by day, newest day first, beside a
 * day index that jumps down the page. Every jump is a plain anchor to the
 * day's `id`, and the open-questions toggle is a `<details>/<summary>` pair,
 * which is keyboard-operable and legible to a screen reader on its own.
 *
 * `matchedIds` filters it. `null` shows every paper; a set shows only those.
 * A day whose papers all fail the filter keeps its heading and reports the
 * count it hid. The day index lists every day held, so a day that vanished
 * would leave an index entry jumping nowhere.
 *
 * Nothing here argues for a paper. No score, no similarity value, no
 * screening reason, and no approachability label on a question — those fields
 * never reach this component, because `scripts/sync-las-new-papers.mjs` drops
 * them. The title, the one-sentence summary and the questions are the whole
 * case for reading a paper.
 */

/**
 * Returns the DOM id of one paper's card. The map scrolls to this id, so both
 * sides read the name from here rather than composing it twice.
 *
 * The prefix matters: a bare arXiv id starts with a digit, and a fragment
 * must not.
 */
export function paperElementId(arxivId: string): string {
  return `paper-${arxivId}`;
}

/** arXiv abstract page for a canon anchor, from its id. */
function anchorHref(arxivId: string): string {
  return `https://arxiv.org/abs/${encodeURIComponent(arxivId)}`;
}

function countsLine(counts: DayCounts): string {
  const value = (n: number | undefined) => (typeof n === "number" ? n : "?");
  return [
    `${value(counts.fetched)} fetched`,
    `${value(counts.screened)} screened`,
    `${value(counts.relevant)} relevant`,
    `${value(counts.kept)} kept`,
  ].join(" · ");
}

function PaperCard({ paper }: { paper: Paper }) {
  const questions = paper.open_questions.filter(Boolean);

  return (
    <article id={paperElementId(paper.arxiv_id)} className="scroll-mt-24 border border-rule p-5">
      <h3 className="font-serif text-base font-semibold leading-snug">
        {paper.url ? (
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent"
          >
            {paper.title}
          </a>
        ) : (
          paper.title
        )}
      </h3>

      {paper.authors.length > 0 && (
        <p className="mt-1.5 text-sm text-foreground/70">
          {paper.authors.join(", ")}
        </p>
      )}

      <p className="mt-1.5 font-mono text-xs text-muted">
        {paper.arxiv_id}
        {paper.nearest_anchor_title && (
          <>
            {" · nearest in the canon: "}
            {paper.nearest_anchor_id ? (
              <a
                href={anchorHref(paper.nearest_anchor_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {paper.nearest_anchor_title}
              </a>
            ) : (
              paper.nearest_anchor_title
            )}
          </>
        )}
      </p>

      {paper.one_sentence && (
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/80">
          {paper.one_sentence}
        </p>
      )}

      {questions.length > 0 && (
        // Closed by default. A day of ten papers is a page of titles you can
        // scan; opening one paper's questions is a decision to read that
        // paper, not a wall you scroll past.
        <details className="group mt-4">
          <summary className="inline-flex w-fit cursor-pointer list-none items-center gap-2 border border-rule px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-accent transition-colors hover:border-accent [&::-webkit-details-marker]:hidden">
            <span
              aria-hidden="true"
              className="inline-block transition-transform group-open:rotate-90 motion-reduce:transition-none"
            >
              ▸
            </span>
            {questions.length} open question{questions.length === 1 ? "" : "s"}
          </summary>
          <ul className="mt-4 max-w-2xl space-y-3">
            {questions.map((question, index) => (
              <li
                key={index}
                className="border-l-2 border-rule pl-3 font-serif text-sm italic leading-relaxed text-foreground/70"
              >
                &ldquo;{question}&rdquo;
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

function DaySection({
  day,
  matchedIds,
}: {
  day: PaperDay;
  matchedIds: Set<string> | null;
}) {
  const papers = matchedIds
    ? day.papers.filter((paper) => matchedIds.has(paper.arxiv_id))
    : day.papers;
  const hidden = day.papers.length - papers.length;

  return (
    // The bare date is the id, so the feed's own entry links
    // (/papers#YYYY-MM-DD) land on the right day. scroll-mt clears the sticky
    // site header.
    <section id={day.date} className="scroll-mt-24">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-rule pb-2">
        <h2 className="font-mono text-sm font-semibold tracking-wide">
          {day.date}
        </h2>
        <p className="font-mono text-xs text-muted">{countsLine(day.counts)}</p>
      </div>

      {day.papers.length === 0 ? (
        <p className="mt-4 max-w-2xl border border-rule px-5 py-4 text-sm leading-relaxed text-foreground/70">
          0 papers kept. {day.counts?.screened ?? "?"} screened,{" "}
          {day.counts?.relevant ?? "?"} judged relevant, none cleared the
          judge&apos;s gates.
        </p>
      ) : papers.length === 0 ? (
        <p className="mt-4 max-w-2xl border border-rule px-5 py-4 text-sm leading-relaxed text-foreground/70">
          {hidden} paper{hidden === 1 ? "" : "s"} kept on this day, none
          matching the query.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {papers.map((paper) => (
            <PaperCard key={`${day.date}-${paper.arxiv_id}`} paper={paper} />
          ))}
        </div>
      )}
    </section>
  );
}

export function PapersList({
  days,
  matchedIds = null,
}: {
  days: PaperDay[];
  matchedIds?: Set<string> | null;
}) {
  if (days.length === 0) {
    return (
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        No days yet — check back after the next daily run.
      </p>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[9rem_minmax(0,1fr)] lg:items-start lg:gap-12">
      {/* A sticky index on wide screens, a horizontal strip on narrow ones. */}
      <nav aria-label="Days" className="lg:sticky lg:top-24">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
          Days
        </p>
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:mt-2 lg:flex-col lg:gap-0 lg:overflow-x-visible lg:pb-0">
          {days.map((day) => (
            <li key={day.date} className="shrink-0">
              <a
                href={`#${day.date}`}
                className="flex items-baseline justify-between gap-3 whitespace-nowrap border border-rule px-2 py-1 font-mono text-xs text-muted transition-colors hover:text-accent lg:border-y-0 lg:border-r-0 lg:border-l-2 lg:border-transparent lg:hover:border-accent"
              >
                <span>{day.date}</span>
                <span className="tabular-nums text-muted/60">
                  {matchedIds
                    ? day.papers.filter((p) => matchedIds.has(p.arxiv_id)).length
                    : day.papers.length}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-14">
        {days.map((day) => (
          <DaySection key={day.date} day={day} matchedIds={matchedIds} />
        ))}
      </div>
    </div>
  );
}
