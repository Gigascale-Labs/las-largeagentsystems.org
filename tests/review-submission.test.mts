/**
 * Tests for the scraped-paper-to-Pending-Queue-row mapping.
 *
 * Run with `npm test`. Pure: nothing here calls Airtable.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  announcementYear,
  provenanceNote,
  toPendingSubmission,
} from "../review/submission.mts";
import { CLAIM_TYPES } from "../lib/canon-schema.ts";
import type { Paper } from "../lib/papers-schema.ts";

function paper(overrides: Partial<Paper> = {}): Paper {
  return {
    arxiv_id: "2608.26849",
    title: "LiveSim: Simulating Environment-Shaped Users",
    authors: ["Jiaqi Xu", "Yiran Qiao", "Jing Chen"],
    url: "https://arxiv.org/abs/2608.26849",
    one_sentence: "Presents LiveSim, an LLM framework.",
    nearest_anchor_id: "2409.10568",
    nearest_anchor_title: "On the limits of agency in agent-based models",
    open_questions: ["Does it hold at scale?"],
    ...overrides,
  };
}

describe("announcementYear", () => {
  it("reads the year off a new-style arXiv id", () => {
    assert.equal(announcementYear("2608.26849"), "2026");
    assert.equal(announcementYear("2409.10568"), "2024");
    assert.equal(announcementYear("0704.0001"), "2007");
  });

  it("accepts a version suffix and four-digit sequence numbers", () => {
    assert.equal(announcementYear("2608.2684v3"), "2026");
    assert.equal(announcementYear("2601.0001"), "2026");
  });

  it("trims surrounding space", () => {
    assert.equal(announcementYear("  2608.26849 "), "2026");
  });

  it("returns nothing it cannot read, rather than guessing", () => {
    for (const id of [
      "",
      "not-an-id",
      "2613.00001", // month 13
      "2600.00001", // month 00
      "608.26849", // too few digits
      "math/0501001", // old-style id
    ]) {
      assert.equal(announcementYear(id), "", id);
    }
  });
});

describe("provenanceNote", () => {
  it("names the scrape, the id and the nearest canon paper", () => {
    const note = provenanceNote(paper(), "2026-08-27");
    assert.equal(
      note,
      "Picked from the daily arXiv scrape of 2026-08-27. arXiv 2608.26849. " +
        "Nearest in the canon: On the limits of agency in agent-based models.",
    );
  });

  it("leaves out what it does not have", () => {
    const note = provenanceNote(
      paper({ nearest_anchor_title: "", arxiv_id: "" }),
      "",
    );
    assert.equal(note, "Picked from the daily arXiv scrape.");
  });
});

describe("toPendingSubmission", () => {
  const options = { reviewer: "papers-review", note: "" };

  it("fills the bibliographic fields from the paper", () => {
    const row = toPendingSubmission(paper(), "2026-08-27", options);
    assert.equal(row.title, "LiveSim: Simulating Environment-Shaped Users");
    assert.equal(row.creators, "Jiaqi Xu; Yiran Qiao; Jing Chen");
    assert.equal(row.url, "https://arxiv.org/abs/2608.26849");
    assert.equal(row.summary, "Presents LiveSim, an LLM framework.");
    assert.equal(row.date, "2026");
  });

  it("uses the itemType and status Airtable's choice lists hold", () => {
    const row = toPendingSubmission(paper(), "2026-08-27", options);
    assert.equal(row.itemType, "preprint");
    assert.equal(row.status, "pending");
    assert.equal(row.tag_confidence, "summary-only");
    assert.equal(row.submitted_by, "papers-review");
  });

  it("invents no tag the reviewer did not choose", () => {
    const row = toPendingSubmission(paper(), "2026-08-27", options);
    assert.deepEqual(row.system_type, []);
    assert.deepEqual(row.participant_mix, []);
    assert.deepEqual(row.participant_observability, []);
    assert.deepEqual(row.operator_observability, []);
    assert.deepEqual(row.public_observability, []);
    assert.deepEqual(row.focus_area, []);
    assert.deepEqual(row.threat_model, []);
    assert.deepEqual(row.claim_type, []);
    assert.equal(row.tags, "");
    // Nothing above guesses at a claim_type, though the vocabulary exists.
    assert.ok(CLAIM_TYPES.length > 0);
  });

  it("puts the reviewer's note ahead of the provenance", () => {
    const row = toPendingSubmission(paper(), "2026-08-27", {
      reviewer: "papers-review",
      note: "Anchors the simulation section.",
    });
    assert.ok(row.submitter_note?.startsWith("Anchors the simulation section. Picked from"));
  });

  it("carries the provenance when the reviewer typed nothing", () => {
    const row = toPendingSubmission(paper(), "2026-08-27", options);
    assert.ok(row.submitter_note?.startsWith("Picked from the daily arXiv scrape"));
  });

  it("strips invisible characters out of the reviewer's note", () => {
    const row = toPendingSubmission(paper(), "2026-08-27", {
      reviewer: "papers-review",
      note: "clean​text‮reversed",
    });
    assert.ok(!/[​‮]/.test(row.submitter_note ?? ""));
    assert.ok(row.submitter_note?.startsWith("cleantextreversed"));
  });

  it("caps a note that is far too long", () => {
    const row = toPendingSubmission(paper(), "2026-08-27", {
      reviewer: "papers-review",
      note: "x".repeat(10_000),
    });
    assert.ok((row.submitter_note ?? "").length <= 2003);
  });

  it("leaves the date empty when the id is not readable", () => {
    const row = toPendingSubmission(paper({ arxiv_id: "junk" }), "2026-08-27", options);
    assert.equal(row.date, "");
  });

  it("handles a paper with no authors", () => {
    const row = toPendingSubmission(paper({ authors: [] }), "2026-08-27", options);
    assert.equal(row.creators, "");
  });
});
