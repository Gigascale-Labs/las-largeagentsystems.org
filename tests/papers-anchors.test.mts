/**
 * Tests for the map's colour groups: which canon paper each group stands for,
 * and how far the colouring tracks the layout.
 *
 * Run with `npm test`. No network and no filesystem: every case is a literal.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  anchorAgreement,
  groupAnchors,
  NAMED_ANCHORS,
  NONE_KEY,
  OTHER_KEY,
} from "../lib/papers-anchors.ts";
import type { PaperDay } from "../lib/papers-schema.ts";

let nextId = 0;

/** One paper naming `anchor` as its nearest canon paper. "" means none. */
function paper(anchor: string) {
  nextId += 1;
  return {
    arxiv_id: `2608.${String(10000 + nextId)}`,
    title: `Paper ${nextId}`,
    authors: [],
    url: "",
    one_sentence: "",
    nearest_anchor_id: anchor,
    nearest_anchor_title: anchor ? `Canon ${anchor}` : "",
    open_questions: [],
  };
}

/** One day holding a paper per entry of `anchors`. */
function day(date: string, anchors: string[]): PaperDay {
  return { date, counts: {}, papers: anchors.map(paper) };
}

/** `counts` papers naming each anchor, over one day. */
function days(counts: Record<string, number>): PaperDay[] {
  const anchors: string[] = [];
  for (const [anchor, n] of Object.entries(counts)) {
    for (let i = 0; i < n; i++) anchors.push(anchor);
  }
  return [day("2026-08-26", anchors)];
}

describe("groupAnchors", () => {
  it("returns no groups for no days", () => {
    const grouping = groupAnchors([]);
    assert.deepEqual(grouping.groups, []);
    assert.equal(grouping.papers, 0);
    assert.equal(grouping.anchors, 0);
  });

  it("names the most-cited canon papers and pools the rest", () => {
    const grouping = groupAnchors(
      days({ a: 7, b: 5, c: 4, d: 3, e: 2, f: 1 }),
    );

    assert.equal(grouping.papers, 22);
    assert.equal(grouping.anchors, 6);
    assert.deepEqual(
      grouping.groups.map((group) => [group.key, group.count]),
      [
        ["a", 7],
        ["b", 5],
        ["c", 4],
        ["d", 3],
        [OTHER_KEY, 3],
      ],
    );
    assert.equal(grouping.groups.length, NAMED_ANCHORS + 1);
    // The pool says how many canon papers it stands for.
    assert.equal(grouping.groups[NAMED_ANCHORS].anchors, 2);
    assert.equal(grouping.groups[NAMED_ANCHORS].label, "Other canon paper");
  });

  it("leaves out the pool when every canon paper is named", () => {
    const grouping = groupAnchors(days({ a: 3, b: 2 }));
    assert.deepEqual(
      grouping.groups.map((group) => group.key),
      ["a", "b"],
    );
  });

  it("gives every group its own colour and shape", () => {
    const grouping = groupAnchors(days({ a: 6, b: 5, c: 4, d: 3, e: 2 }));
    const colours = grouping.groups.map((group) => group.colour);
    const shapes = grouping.groups.map((group) => group.shape);
    assert.equal(new Set(colours).size, colours.length);
    // The pool reuses a shape; its colour is what separates it.
    assert.equal(new Set(shapes.slice(0, NAMED_ANCHORS)).size, NAMED_ANCHORS);
  });

  it("breaks a tie on the anchor id, not on the input order", () => {
    const forward = groupAnchors(days({ b: 2, a: 2, c: 1 }));
    const backward = groupAnchors(days({ a: 2, b: 2, c: 1 }));
    assert.deepEqual(
      forward.groups.map((group) => group.key),
      backward.groups.map((group) => group.key),
    );
    assert.equal(forward.groups[0].key, "a");
  });

  it("counts a canon paper once across days", () => {
    const grouping = groupAnchors([
      day("2026-08-26", ["a", "b"]),
      day("2026-08-25", ["a"]),
    ]);
    assert.equal(grouping.anchors, 2);
    assert.equal(grouping.groups[0].count, 2);
  });

  it("holds papers with no canon paper in their own group", () => {
    const grouping = groupAnchors(days({ a: 2, "": 3 }));
    const none = grouping.groups.find((group) => group.key === NONE_KEY);
    assert.ok(none);
    assert.equal(none.count, 3);
    assert.equal(none.hollow, true);
    assert.equal(none.anchors, 0);
    // 3 unanchored papers are not 3 more canon papers.
    assert.equal(grouping.anchors, 1);
  });

  it("keys every paper, and only to a group it holds", () => {
    const grouping = groupAnchors(days({ a: 3, b: 2, c: 2, d: 1, e: 1, f: 1 }));
    const keys = new Set(grouping.groups.map((group) => group.key));
    assert.equal(grouping.keyOf.size, 10);
    for (const key of grouping.keyOf.values()) assert.ok(keys.has(key));
    assert.equal([...grouping.keyOf.values()].filter((k) => k === OTHER_KEY).length, 2);
  });

  it("falls back to the title when upstream recorded no arXiv id", () => {
    const only = day("2026-08-26", ["a"]);
    only.papers[0].nearest_anchor_id = "";
    only.papers[0].nearest_anchor_title = "A canon paper off arXiv";
    const grouping = groupAnchors([only]);
    assert.equal(grouping.groups[0].key, "A canon paper off arXiv");
    assert.equal(grouping.groups[0].label, "A canon paper off arXiv");
  });
});

describe("anchorAgreement", () => {
  /** Two tight pairs, each pair on one canon paper. */
  const tight = [
    { arxiv_id: "p1", x: 0, y: 0 },
    { arxiv_id: "p2", x: 0.01, y: 0 },
    { arxiv_id: "p3", x: 1, y: 1 },
    { arxiv_id: "p4", x: 1.01, y: 1 },
  ];
  const byPair = new Map([
    ["p1", "a"],
    ["p2", "a"],
    ["p3", "b"],
    ["p4", "b"],
  ]);

  it("returns null below two anchored papers", () => {
    assert.equal(anchorAgreement([], new Map()), null);
    assert.equal(anchorAgreement(tight, new Map([["p1", "a"]])), null);
  });

  it("scores a perfect split at 1", () => {
    const result = anchorAgreement(tight, byPair);
    assert.ok(result);
    assert.equal(result.n, 4);
    assert.equal(result.shared, 4);
    // 2 same-anchor pairs of 6 pairs.
    assert.equal(result.chance, 2 / 6);
    assert.equal(result.samePairs, 2);
    assert.equal(result.otherPairs, 4);
    assert.ok(result.sameMedian < result.otherMedian);
  });

  it("scores an interleaved layout at 0", () => {
    const interleaved = new Map([
      ["p1", "a"],
      ["p2", "b"],
      ["p3", "a"],
      ["p4", "b"],
    ]);
    const result = anchorAgreement(tight, interleaved);
    assert.ok(result);
    assert.equal(result.shared, 0);
    assert.ok(result.sameMedian > result.otherMedian);
  });

  it("ignores points whose paper carries no canon paper", () => {
    const result = anchorAgreement(tight, new Map([["p1", "a"], ["p2", "a"]]));
    assert.ok(result);
    assert.equal(result.n, 2);
    assert.equal(result.shared, 2);
    assert.equal(result.chance, 1);
  });
});
