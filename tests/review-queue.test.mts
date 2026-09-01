/**
 * Tests for what the review page shows: the papers still to decide, and the
 * last few already decided.
 *
 * Run with `npm test`. Pure: `buildQueue` reads no file.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildQueue } from "../review/queue.mts";
import type { Decision, DecisionLog } from "../review/decisions.mts";
import type { PaperDay } from "../lib/papers-schema.ts";

function paper(arxivId: string) {
  return {
    arxiv_id: arxivId,
    title: `Paper ${arxivId}`,
    authors: ["A Author"],
    url: `https://arxiv.org/abs/${arxivId}`,
    one_sentence: "A sentence.",
    nearest_anchor_id: "2509.10147",
    nearest_anchor_title: "Virtual Agent Economies",
    open_questions: ["A question?"],
  };
}

function day(date: string, ids: string[]): PaperDay {
  return { date, counts: {}, papers: ids.map(paper) };
}

/** `getPaperDays` returns days newest first, which is the order the page uses. */
const days: PaperDay[] = [
  day("2026-08-27", ["2608.1", "2608.2"]),
  day("2026-08-26", ["2608.3"]),
];

function log(entries: Array<[string, Partial<Decision>]>): DecisionLog {
  return new Map(
    entries.map(([id, row]) => [
      id,
      {
        arxiv_id: id,
        decision: "added",
        decided_at: "2026-09-01T00:00:00.000Z",
        note: "",
        airtable_ok: true,
        airtable_error: "",
        ...row,
      } as Decision,
    ]),
  );
}

describe("buildQueue", () => {
  it("puts every paper in the queue when nothing is decided", () => {
    const queue = buildQueue(days, new Map());
    assert.deepEqual(
      queue.undecided.map((item) => item.paper.arxiv_id),
      ["2608.1", "2608.2", "2608.3"],
    );
    assert.equal(queue.total, 3);
    assert.equal(queue.added, 0);
    assert.equal(queue.skipped, 0);
    assert.deepEqual(queue.recent, []);
  });

  it("keeps the newest day first and the day's own order within it", () => {
    const queue = buildQueue(days, new Map());
    assert.deepEqual(
      queue.undecided.map((item) => item.date),
      ["2026-08-27", "2026-08-27", "2026-08-26"],
    );
  });

  it("takes a decided paper out of the queue and into recent", () => {
    const queue = buildQueue(days, log([["2608.2", { decision: "added" }]]));
    assert.deepEqual(
      queue.undecided.map((item) => item.paper.arxiv_id),
      ["2608.1", "2608.3"],
    );
    assert.deepEqual(
      queue.recent.map((item) => item.paper.arxiv_id),
      ["2608.2"],
    );
  });

  it("counts added and skipped apart", () => {
    const queue = buildQueue(
      days,
      log([
        ["2608.1", { decision: "added" }],
        ["2608.2", { decision: "skipped" }],
        ["2608.3", { decision: "skipped" }],
      ]),
    );
    assert.equal(queue.added, 1);
    assert.equal(queue.skipped, 2);
    assert.equal(queue.undecided.length, 0);
  });

  it("orders recent by decision time, newest first", () => {
    const queue = buildQueue(
      days,
      log([
        ["2608.1", { decided_at: "2026-09-01T01:00:00.000Z" }],
        ["2608.2", { decided_at: "2026-09-01T03:00:00.000Z" }],
        ["2608.3", { decided_at: "2026-09-01T02:00:00.000Z" }],
      ]),
    );
    assert.deepEqual(
      queue.recent.map((item) => item.paper.arxiv_id),
      ["2608.2", "2608.3", "2608.1"],
    );
  });

  it("caps recent, so the page does not grow with the log", () => {
    const many = [day("2026-08-27", ["a", "b", "c", "d", "e"])];
    const queue = buildQueue(
      many,
      log(["a", "b", "c", "d", "e"].map((id) => [id, {}] as [string, Partial<Decision>])),
      2,
    );
    assert.equal(queue.recent.length, 2);
    assert.equal(queue.added, 5);
  });

  it("counts decisions whose paper has left the 60-day window", () => {
    const queue = buildQueue(days, log([["2608.1", {}], ["2501.99", {}]]));
    assert.equal(queue.added, 2);
    assert.equal(queue.offWindow, 1);
    // The paper is gone, so it cannot appear in recent either.
    assert.deepEqual(
      queue.recent.map((item) => item.paper.arxiv_id),
      ["2608.1"],
    );
  });

  it("shows a paper once when two days list it", () => {
    const repeated = [day("2026-08-27", ["2608.1"]), day("2026-08-26", ["2608.1"])];
    const queue = buildQueue(repeated, new Map());
    assert.equal(queue.undecided.length, 1);
    assert.equal(queue.total, 1);
    // The newest day wins, because it is read first.
    assert.equal(queue.undecided[0].date, "2026-08-27");
  });

  it("handles no days at all", () => {
    const queue = buildQueue([], new Map());
    assert.equal(queue.total, 0);
    assert.equal(queue.undecided.length, 0);
  });
});
