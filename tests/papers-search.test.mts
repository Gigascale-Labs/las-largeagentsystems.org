/**
 * Tests for the /papers query language.
 *
 * Run with `npm test`. No network, no files: the search runs in the browser
 * over papers the page already holds, so these are pure function calls.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_QUERY_CHARS,
  searchPapers,
  toSearchRecords,
  type PaperSearchRecord,
} from "../lib/papers-search.ts";
import type { PaperDay } from "../lib/papers-schema.ts";

const days: PaperDay[] = [
  {
    date: "2026-08-26",
    counts: { kept: 2 },
    papers: [
      {
        arxiv_id: "2608.26081",
        title: "SwarmWorld: Stigmergic evolution in societies of agents",
        authors: ["Subhadeep Pal", "Fiona Y. Wang"],
        url: "https://arxiv.org/abs/2608.26081",
        one_sentence: "Agents coordinate through a shared environment.",
        nearest_anchor_id: "2506.12078",
        nearest_anchor_title: "Modeling Earth-Scale Human-Like Societies",
        open_questions: ["Which task properties decide whether sharing wins?"],
      },
      {
        arxiv_id: "2608.25937",
        title: "Market design for large agent systems",
        authors: ["Ada Lovelace"],
        url: "https://arxiv.org/abs/2608.25937",
        one_sentence: "A mechanism for pricing agent labour.",
        nearest_anchor_id: "2509.10147",
        nearest_anchor_title: "Virtual Agent Economies",
        open_questions: [],
      },
    ],
  },
  {
    date: "2026-08-25",
    counts: { kept: 1 },
    papers: [
      {
        arxiv_id: "2608.25001",
        title: "Alignment under partial observability",
        authors: ["Alan Turing"],
        url: "https://arxiv.org/abs/2608.25001",
        one_sentence: "No swarms are studied here.",
        nearest_anchor_id: "",
        nearest_anchor_title: "",
        open_questions: ["What is the limit?"],
      },
    ],
  },
];

const records = toSearchRecords(days);

/** The ids a query matches, sorted, or the outcome's status when it did not. */
function ids(
  query: string,
  rows: PaperSearchRecord[] = records,
): string[] | string {
  const outcome = searchPapers(query, rows);
  if (outcome.status !== "matched") return outcome.status;
  return [...outcome.ids].sort();
}

describe("flattening papers for search", () => {
  it("takes every paper across every day, with its date", () => {
    assert.equal(records.length, 3);
    assert.deepEqual(
      records.map((r) => r.date),
      ["2026-08-26", "2026-08-26", "2026-08-25"],
    );
  });

  it("leaves the url out, because every paper shares a host", () => {
    assert.ok(!("url" in records[0]));
    assert.deepEqual(ids("arxiv.org"), []);
  });
});

describe("bare terms", () => {
  it("matches a substring in any searched field, in any case", () => {
    assert.deepEqual(ids("swarm"), ["2608.25001", "2608.26081"]);
    assert.deepEqual(ids("SWARM"), ["2608.25001", "2608.26081"]);
  });

  it("reads two terms as AND, the classical default", () => {
    assert.deepEqual(ids("agent market"), ["2608.25937"]);
    // Both terms must land on the same paper, not merely somewhere.
    assert.deepEqual(ids("stigmergic market"), []);
  });

  it("returns nothing for a term no paper carries", () => {
    assert.deepEqual(ids("thermodynamics"), []);
  });

  it("shows everything when the box is empty or only spaces", () => {
    assert.equal(searchPapers("", records).status, "all");
    assert.equal(searchPapers("   ", records).status, "all");
  });
});

describe("quoted phrases", () => {
  it("matches the phrase, not the words apart", () => {
    assert.deepEqual(ids('"large agent systems"'), ["2608.25937"]);
    assert.deepEqual(ids('"agent large systems"'), []);
  });

  it("ignores case, which is what a person quoting a phrase means", () => {
    // liqe matches a quoted literal case-sensitively; lib/papers-search.ts
    // rewrites it. Without that rewrite this is the case that fails.
    assert.deepEqual(ids('"MARKET DESIGN"'), ["2608.25937"]);
    assert.deepEqual(ids('"Market design"'), ["2608.25937"]);
  });

  it("treats ? and * inside a phrase as characters, not wildcards", () => {
    assert.deepEqual(ids('"What is the limit?"'), ["2608.25001"]);
    assert.deepEqual(ids('"What is the limit!"'), []);
  });

  it("keeps a slash inside a phrase from ending the pattern early", () => {
    // The phrase becomes a regex body, so an unescaped "/" would close it.
    assert.equal(searchPapers('"a/b"', records).status, "matched");
    assert.deepEqual(ids('"a/b"'), []);
  });
});

describe("operators", () => {
  it("AND requires both", () => {
    assert.deepEqual(ids("swarm AND societies"), ["2608.26081"]);
    assert.deepEqual(ids("swarm AND thermodynamics"), []);
  });

  it("OR takes either", () => {
    assert.deepEqual(ids("stigmergic OR pricing"), ["2608.25937", "2608.26081"]);
  });

  it("NOT excludes", () => {
    assert.deepEqual(ids("agent NOT market"), ["2608.26081"]);
  });

  it("brackets group", () => {
    assert.deepEqual(ids("(stigmergic OR pricing) AND agent"), [
      "2608.25937",
      "2608.26081",
    ]);
  });
});

describe("field qualifiers", () => {
  it("restricts a term to one field", () => {
    assert.deepEqual(ids("title:swarm"), ["2608.26081"]);
    // The word is in the summary of one paper and the title of another.
    assert.deepEqual(ids("summary:swarm"), ["2608.25001"]);
  });

  it("searches inside the author and question lists", () => {
    assert.deepEqual(ids("author:Lovelace"), ["2608.25937"]);
    assert.deepEqual(ids("question:sharing"), ["2608.26081"]);
  });

  it("matches the anchor, the id and the date", () => {
    assert.deepEqual(ids("anchor:Economies"), ["2608.25937"]);
    assert.deepEqual(ids("id:2608.25001"), ["2608.25001"]);
    assert.deepEqual(ids("date:2026-08-25"), ["2608.25001"]);
  });

  it("takes a quoted phrase after a field, case-insensitively", () => {
    assert.deepEqual(ids('title:"market design"'), ["2608.25937"]);
  });
});

describe("a query the grammar rejects", () => {
  it("reports it instead of throwing", () => {
    for (const bad of ["(", '"unclosed', "AND", ")(", "a AND", "OR OR"]) {
      const outcome = searchPapers(bad, records);
      assert.equal(outcome.status, "error", `expected ${bad} to be an error`);
      if (outcome.status === "error") assert.ok(outcome.message.length > 0);
    }
  });
});

describe("cleaning the query", () => {
  it("strips invisible characters before parsing", () => {
    // A zero-width space inside a term would otherwise make the term match
    // nothing while looking exactly like one that matches.
    assert.deepEqual(ids("swar\u200Bm"), ["2608.25001", "2608.26081"]);
  });

  it("strips a control character before it reaches the parser", () => {
    assert.deepEqual(ids("market\u0007"), ["2608.25937"]);
  });

  it("caps the length, and a capped query still parses", () => {
    const outcome = searchPapers("a".repeat(MAX_QUERY_CHARS * 3), records);
    assert.equal(outcome.status, "matched");
    assert.deepEqual([...(outcome.status === "matched" ? outcome.ids : [])], []);
  });
});
