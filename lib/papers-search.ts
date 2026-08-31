/**
 * Matches a query against the reading list. Supports quoted phrases, AND / OR
 * / NOT, brackets, `field:value`, and wildcards.
 *
 * `liqe` parses and matches. It is a grammar, so a query it cannot parse
 * raises; `searchPapers` catches that and returns a message instead.
 *
 * The query does not leave the browser. The page holds every paper it lists,
 * so this filters what is already on screen. There is no endpoint, and this
 * site's server never sees a query.
 *
 * Three steps run before liqe matches anything:
 *
 * | Step | What it does |
 * |---|---|
 * | Cap | Truncates the query at `MAX_QUERY_CHARS` |
 * | Clean | Runs `sanitizeText`, which strips invisible and control characters |
 * | Rewrite | Turns each quoted phrase into a case-insensitive regex |
 *
 * The third step corrects a liqe behaviour. Measured: liqe compiles an
 * unquoted term to `/term/ui` and a quoted one to `/term/u`, so
 * `"large agent systems"` matched 0 of 52 papers while `"Large Agent Systems"`
 * matched 1. See `caseInsensitivePhrases`.
 */

import { filter, parse } from "liqe";
import type { PaperDay } from "./papers-schema";
import { sanitizeText } from "./sanitize.ts";

/**
 * Query length cap. 200 characters holds a query of several clauses.
 *
 * The language includes regular expressions, so an unbounded query can cost
 * unbounded time. That time falls on the browser of whoever typed it, because
 * the match runs client-side. I did not measure the worst-case cost of a
 * pathological regex under this cap; timing `/(a+)+$/` over 480 papers would
 * settle whether 200 is low enough.
 */
export const MAX_QUERY_CHARS = 200;

/**
 * One paper as the search matches it. Seven fields, named for what a person
 * types, not for the shape of `Paper`.
 *
 * `url` is absent. Every paper's URL contains "arxiv.org", so an unqualified
 * search for that string would match all 52 papers on file.
 */
export interface PaperSearchRecord {
  id: string;
  date: string;
  title: string;
  author: string[];
  summary: string;
  question: string[];
  anchor: string;
}

/** The fields a `field:value` clause can name. The page prints this as help. */
export const SEARCH_FIELDS: ReadonlyArray<{ name: string; holds: string }> = [
  { name: "title", holds: "the paper's title" },
  { name: "author", holds: "any author's name" },
  { name: "summary", holds: "the one-sentence summary" },
  { name: "question", holds: "any of its open questions" },
  { name: "anchor", holds: "the nearest canon paper's title" },
  { name: "id", holds: "the arXiv id" },
  { name: "date", holds: "the day it was kept, YYYY-MM-DD" },
];

/** Flattens every paper on the page into the records the search matches. */
export function toSearchRecords(days: PaperDay[]): PaperSearchRecord[] {
  return days.flatMap((day) =>
    day.papers.map((paper) => ({
      id: paper.arxiv_id,
      date: day.date,
      title: paper.title,
      author: paper.authors,
      summary: paper.one_sentence,
      question: paper.open_questions,
      anchor: paper.nearest_anchor_title,
    })),
  );
}

/**
 * Escapes a phrase for use inside a regular expression body.
 *
 * The set includes `/` as well as the usual metacharacters. liqe reads a regex
 * out of a `/body/flags` string, so an unescaped slash inside a phrase ends the
 * body early and changes what matches.
 */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
}

type AstNode = Record<string, unknown>;

/**
 * Rewrites every quoted phrase in the parse tree as a case-insensitive regular
 * expression.
 *
 * liqe compiles an unquoted term to `/term/ui` and a quoted one to `/term/u`.
 * Quoting a phrase therefore makes it case-sensitive, which is not what a
 * person quoting a phrase asks for.
 *
 * The rewrite escapes the phrase and adds the `ui` flags. It leaves wildcard
 * handling alone: liqe expands `*` and `?` only in unquoted terms, and a `?`
 * inside a phrase must stay a literal. `tests/papers-search.test.mts` covers
 * both, with `"What is the limit?"` matching 1 of 3 test papers.
 */
function caseInsensitivePhrases(node: unknown): void {
  if (!node || typeof node !== "object") return;
  const current = node as AstNode;

  const expression = current.expression as AstNode | undefined;
  if (
    current.type === "Tag" &&
    expression?.type === "LiteralExpression" &&
    expression.quoted === true &&
    typeof expression.value === "string"
  ) {
    current.expression = {
      type: "RegexExpression",
      location: expression.location,
      value: `/${escapeRegex(expression.value)}/ui`,
    };
    return;
  }

  for (const key of ["left", "right", "operand", "expression"]) {
    caseInsensitivePhrases(current[key]);
  }
}

export type SearchOutcome =
  /** No query. The page shows every paper. */
  | { status: "all" }
  /** The query parsed. `ids` holds the arXiv ids it matched. */
  | { status: "matched"; ids: Set<string> }
  /** The query did not parse. The page prints `message` under the box. */
  | { status: "error"; message: string };

/**
 * Runs `query` over `records`. Does not throw.
 *
 * A query the grammar rejects returns `status: "error"`. A half-typed query is
 * the normal state of a search box while someone types into it.
 */
export function searchPapers(
  query: string,
  records: PaperSearchRecord[],
): SearchOutcome {
  const cleaned = sanitizeText(query.slice(0, MAX_QUERY_CHARS), MAX_QUERY_CHARS);
  if (!cleaned) return { status: "all" };

  try {
    const ast = parse(cleaned);
    caseInsensitivePhrases(ast);
    const matched = filter(ast, records);
    return { status: "matched", ids: new Set(matched.map((row) => row.id)) };
  } catch {
    // liqe's message names a column in a string the reader cannot see
    // ("Syntax error at line 1 column 8"), so this replaces it.
    return {
      status: "error",
      message:
        "That query did not parse. Check the quotes and brackets are closed.",
    };
  }
}
