"use client";

import { MAX_QUERY_CHARS, SEARCH_FIELDS } from "@/lib/papers-search";

/**
 * Renders the query box, its syntax help, and the line reporting what the
 * query matched.
 *
 * The help sits in a `<details>` pair, closed by default. That is the same
 * control the open questions use further down the page: keyboard-operable, and
 * legible to a screen reader without JavaScript.
 *
 * This component talks to no server. `lib/papers-search.ts` matches the query
 * in the browser.
 */

const EXAMPLES: ReadonlyArray<{ query: string; means: string }> = [
  { query: "market design", means: "both words, anywhere in a paper" },
  { query: '"market design"', means: "that phrase, in any case" },
  { query: "swarm OR stigmergy", means: "either word" },
  { query: "agent NOT market", means: "the first without the second" },
  { query: "title:alignment", means: "one field only" },
  { query: "(a OR b) AND c", means: "brackets group" },
];

export function PapersSearchBox({
  query,
  onQueryChange,
  status,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  /** The line under the box: what matched, or why nothing did. */
  status: string;
}) {
  return (
    <div>
      <label
        htmlFor="paper-search"
        className="font-mono text-[10px] uppercase tracking-widest text-muted"
      >
        Search
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          id="paper-search"
          type="search"
          value={query}
          maxLength={MAX_QUERY_CHARS}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={'e.g. "large agent systems" AND title:market'}
          className="w-full max-w-xl border border-rule bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted/70 focus:border-accent"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="font-mono text-xs uppercase tracking-[0.2em] text-muted underline underline-offset-4 hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-muted" role="status" aria-live="polite">
        {status}
      </p>

      <details className="group mt-3">
        <summary className="inline-flex w-fit cursor-pointer list-none items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          <span
            aria-hidden="true"
            className="inline-block transition-transform group-open:rotate-90 motion-reduce:transition-none"
          >
            ▸
          </span>
          Query syntax
        </summary>

        <div className="mt-3 grid gap-6 border border-rule p-4 md:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Examples
            </p>
            <table className="mt-2 w-full text-left text-xs">
              <tbody>
                {EXAMPLES.map((example) => (
                  <tr key={example.query}>
                    <td className="whitespace-nowrap py-1 pr-4 font-mono text-foreground/80">
                      {example.query}
                    </td>
                    <td className="py-1 text-muted">{example.means}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted">
              Fields
            </p>
            <table className="mt-2 w-full text-left text-xs">
              <tbody>
                {SEARCH_FIELDS.map((field) => (
                  <tr key={field.name}>
                    <td className="whitespace-nowrap py-1 pr-4 font-mono text-foreground/80">
                      {field.name}:
                    </td>
                    <td className="py-1 text-muted">{field.holds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Two words with no operator between them mean both. A term matches
              part of a word, so <span className="font-mono">agent</span> finds
              &ldquo;agentic&rdquo;. Your browser runs the query. It reaches no
              server.
            </p>
          </div>
        </div>
      </details>
    </div>
  );
}
