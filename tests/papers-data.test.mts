/**
 * Tests for reading and sanitizing the las-new-papers daily feed.
 *
 * Run with `npm test`. No network: every case reads/writes a temp file.
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, describe, it } from "node:test";

import {
  countPapers,
  countQuestions,
  getOldestDate,
  getPaperDays,
} from "../lib/papers-data.ts";
import { keptPerDaySeries } from "../lib/papers-series.ts";
import type { Paper, PaperDay } from "../lib/papers-schema.ts";

const dir = mkdtempSync(join(tmpdir(), "papers-data-test-"));
const filePath = join(dir, "papers.json");

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

afterEach(() => {
  rmSync(filePath, { force: true });
});

function basePaper(overrides: Partial<Paper> = {}): Paper {
  return {
    arxiv_id: "2608.24400",
    title: "Multilevel Fair Allocation under Additive Preferences",
    authors: ["Maxime Lucet", "Nawal Benabbou"],
    url: "https://arxiv.org/abs/2608.24400",
    one_sentence: "Studies fair allocation with tree-structured hierarchies.",
    nearest_anchor_id: "2509.10147",
    nearest_anchor_title: "Virtual Agent Economies",
    open_questions: ["Does the algorithm guarantee all three notions?"],
    ...overrides,
  };
}

function baseDay(overrides: Partial<PaperDay> = {}): PaperDay {
  return {
    date: "2026-08-25",
    counts: {
      fetched: 243,
      unseen: 234,
      screened: 200,
      relevant: 17,
      kept: 1,
      anchors: 20,
    },
    papers: [basePaper()],
    ...overrides,
  };
}

function writeDays(days: unknown) {
  writeFileSync(filePath, JSON.stringify(days));
}

describe("getPaperDays", () => {
  it("returns [] when the file does not exist", () => {
    assert.deepEqual(getPaperDays(join(dir, "missing.json")), []);
  });

  it("returns [] for malformed JSON", () => {
    writeFileSync(filePath, "not json");
    assert.deepEqual(getPaperDays(filePath), []);
  });

  it("returns [] when the parsed JSON is not an array", () => {
    writeFileSync(filePath, JSON.stringify({ not: "an array" }));
    assert.deepEqual(getPaperDays(filePath), []);
  });

  it("returns [] for an empty array", () => {
    writeDays([]);
    assert.deepEqual(getPaperDays(filePath), []);
  });

  it("round-trips a well-formed day without dropping anything it should keep", () => {
    writeDays([baseDay()]);
    const days = getPaperDays(filePath);
    assert.equal(days.length, 1);

    const [day] = days;
    assert.equal(day.date, "2026-08-25");
    assert.deepEqual(day.counts, {
      fetched: 243,
      unseen: 234,
      screened: 200,
      relevant: 17,
      kept: 1,
      anchors: 20,
    });
    assert.deepEqual(day.papers[0], basePaper());
  });

  it("keeps a day with no papers", () => {
    writeDays([baseDay({ date: "2026-08-22", papers: [] })]);
    const days = getPaperDays(filePath);
    assert.equal(days.length, 1);
    assert.deepEqual(days[0].papers, []);
  });

  it("preserves the given order, newest first", () => {
    writeDays([
      baseDay({ date: "2026-08-25" }),
      baseDay({ date: "2026-08-24" }),
      baseDay({ date: "2026-08-23" }),
    ]);
    assert.deepEqual(
      getPaperDays(filePath).map((day) => day.date),
      ["2026-08-25", "2026-08-24", "2026-08-23"],
    );
  });

  it("strips invisible characters from a title", () => {
    const zeroWidthSpace = String.fromCharCode(0x200b);
    const rightToLeftOverride = String.fromCharCode(0x202e);
    const tagLatinA = String.fromCodePoint(0xe0041);
    writeDays([
      baseDay({
        papers: [
          basePaper({
            title: `${zeroWidthSpace}Fair${rightToLeftOverride} Allocation${tagLatinA}`,
          }),
        ],
      }),
    ]);
    assert.equal(getPaperDays(filePath)[0].papers[0].title, "Fair Allocation");
  });

  it("caps an overlong title, summary and question", () => {
    writeDays([
      baseDay({
        papers: [
          basePaper({
            title: "A".repeat(600),
            one_sentence: "B".repeat(1200),
            open_questions: ["C".repeat(1200)],
          }),
        ],
      }),
    ]);
    const [paper] = getPaperDays(filePath)[0].papers;
    assert.equal(paper.title.length, 503); // 500 + "..."
    assert.ok(paper.title.endsWith("..."));
    assert.equal(paper.one_sentence.length, 1003);
    assert.equal(paper.open_questions[0].length, 1003);
  });

  it("sanitizes every author and question, not just the first", () => {
    const zeroWidthSpace = String.fromCharCode(0x200b);
    writeDays([
      baseDay({
        papers: [
          basePaper({
            authors: ["Ada", `Grace${zeroWidthSpace}`],
            open_questions: ["First?", `Second${zeroWidthSpace}?`],
          }),
        ],
      }),
    ]);
    const [paper] = getPaperDays(filePath)[0].papers;
    assert.deepEqual(paper.authors, ["Ada", "Grace"]);
    assert.deepEqual(paper.open_questions, ["First?", "Second?"]);
  });

  it("drops a link whose scheme is not http or https", () => {
    writeDays([
      baseDay({
        papers: [basePaper({ url: "javascript:alert(1)" })],
      }),
    ]);
    assert.equal(getPaperDays(filePath)[0].papers[0].url, "");
  });

  it("tolerates a day whose papers field is missing or not an array", () => {
    writeDays([{ date: "2026-08-25" }, { date: "2026-08-24", papers: "nope" }]);
    const days = getPaperDays(filePath);
    assert.equal(days.length, 2);
    assert.deepEqual(days[0].papers, []);
    assert.deepEqual(days[1].papers, []);
  });
});

describe("day helpers", () => {
  it("getOldestDate returns the last day held", () => {
    writeDays([baseDay({ date: "2026-08-25" }), baseDay({ date: "2026-08-20" })]);
    assert.equal(getOldestDate(getPaperDays(filePath)), "2026-08-20");
  });

  it("getOldestDate returns an empty string with no days", () => {
    assert.equal(getOldestDate([]), "");
  });

  it("countPapers and countQuestions total across days", () => {
    writeDays([
      baseDay({
        date: "2026-08-25",
        papers: [
          basePaper({ open_questions: ["a?", "b?"] }),
          basePaper({ arxiv_id: "2608.1", open_questions: ["c?"] }),
        ],
      }),
      baseDay({ date: "2026-08-24", papers: [] }),
    ]);
    const days = getPaperDays(filePath);
    assert.equal(countPapers(days), 2);
    assert.equal(countQuestions(days), 3);
  });
});

describe("keptPerDaySeries", () => {
  it("reverses newest-first days into oldest-first points", () => {
    writeDays([
      baseDay({ date: "2026-08-25", papers: [basePaper(), basePaper()] }),
      baseDay({ date: "2026-08-24", papers: [basePaper()] }),
    ]);
    assert.deepEqual(keptPerDaySeries(getPaperDays(filePath)), [
      { date: "2026-08-24", kept: 1 },
      { date: "2026-08-25", kept: 2 },
    ]);
  });

  it("keeps a day that kept nothing as a zero", () => {
    writeDays([baseDay({ date: "2026-08-22", papers: [] })]);
    assert.deepEqual(keptPerDaySeries(getPaperDays(filePath)), [
      { date: "2026-08-22", kept: 0 },
    ]);
  });

  it("counts the papers held, not the day's own kept count", () => {
    // `counts.kept` is the pipeline's record of its run; the chart plots what
    // the page can actually show. They match in practice and must not be
    // assumed to.
    writeDays([
      baseDay({ date: "2026-08-25", counts: { kept: 99 }, papers: [basePaper()] }),
    ]);
    assert.deepEqual(keptPerDaySeries(getPaperDays(filePath)), [
      { date: "2026-08-25", kept: 1 },
    ]);
  });

  it("returns [] with no days", () => {
    assert.deepEqual(keptPerDaySeries([]), []);
  });

  it("does not mutate the order of the days it is given", () => {
    writeDays([baseDay({ date: "2026-08-25" }), baseDay({ date: "2026-08-24" })]);
    const days = getPaperDays(filePath);
    keptPerDaySeries(days);
    assert.deepEqual(
      days.map((day) => day.date),
      ["2026-08-25", "2026-08-24"],
    );
  });
});
