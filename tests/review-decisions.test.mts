/**
 * Tests for the review queue's decision log.
 *
 * Run with `npm test`. No network: every case reads and writes a temp file.
 */

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, describe, it } from "node:test";

import {
  decisionsPath,
  forgetDecision,
  readDecisions,
  recordDecision,
  writeDecisions,
  type Decision,
} from "../review/decisions.mts";

const dir = mkdtempSync(join(tmpdir(), "review-decisions-"));
const path = decisionsPath(dir);

after(() => rmSync(dir, { recursive: true, force: true }));
afterEach(() => rmSync(path, { force: true }));

function decision(id: string, kind: "added" | "skipped" = "added"): Decision {
  return {
    arxiv_id: id,
    decision: kind,
    decided_at: "2026-09-01T02:00:00.000Z",
    note: "",
    airtable_ok: true,
    airtable_error: "",
  };
}

describe("readDecisions", () => {
  it("returns an empty log when the file is missing", () => {
    assert.equal(readDecisions(path).size, 0);
  });

  it("returns an empty log for an unparseable file", () => {
    writeFileSync(path, "{not json", "utf8");
    assert.equal(readDecisions(path).size, 0);
  });

  it("returns an empty log for an array, which is the wrong shape", () => {
    writeFileSync(path, "[]", "utf8");
    assert.equal(readDecisions(path).size, 0);
  });

  it("drops a row whose decision is not one of the two words", () => {
    writeFileSync(
      path,
      JSON.stringify({
        "2608.1": { decision: "added", decided_at: "x", note: "", airtable_ok: true },
        "2608.2": { decision: "maybe" },
        "2608.3": null,
      }),
      "utf8",
    );
    const log = readDecisions(path);
    assert.deepEqual([...log.keys()], ["2608.1"]);
  });

  it("fills the id in from the key", () => {
    writeFileSync(path, JSON.stringify({ "2608.9": { decision: "skipped" } }), "utf8");
    assert.equal(readDecisions(path).get("2608.9")?.arxiv_id, "2608.9");
  });

  it("defaults a missing airtable_ok to true, and honours an explicit false", () => {
    writeFileSync(
      path,
      JSON.stringify({
        a: { decision: "added" },
        b: { decision: "added", airtable_ok: false },
      }),
      "utf8",
    );
    const log = readDecisions(path);
    assert.equal(log.get("a")?.airtable_ok, true);
    assert.equal(log.get("b")?.airtable_ok, false);
  });
});

describe("writeDecisions", () => {
  it("round-trips a log", () => {
    const log = new Map([["2608.1", decision("2608.1")]]);
    writeDecisions(path, log);
    assert.deepEqual(readDecisions(path).get("2608.1"), decision("2608.1"));
  });

  it("writes the same bytes for the same decisions, whatever order they arrived", () => {
    writeDecisions(
      path,
      new Map([
        ["b", decision("b")],
        ["a", decision("a")],
      ]),
    );
    const first = readFileSync(path, "utf8");
    writeDecisions(
      path,
      new Map([
        ["a", decision("a")],
        ["b", decision("b")],
      ]),
    );
    assert.equal(readFileSync(path, "utf8"), first);
  });

  it("leaves no temp file behind", () => {
    writeDecisions(path, new Map([["a", decision("a")]]));
    assert.equal(readDecisions(`${path}.tmp`).size, 0);
  });

  it("creates the state directory", () => {
    const nested = join(dir, "deep", "state", "decisions.json");
    writeDecisions(nested, new Map([["a", decision("a")]]));
    assert.equal(readDecisions(nested).size, 1);
    rmSync(join(dir, "deep"), { recursive: true, force: true });
  });
});

describe("recordDecision and forgetDecision", () => {
  it("adds a decision", () => {
    const log = recordDecision(path, decision("2608.1"));
    assert.equal(log.size, 1);
    assert.equal(readDecisions(path).size, 1);
  });

  it("replaces a decision on the same paper rather than doubling it", () => {
    recordDecision(path, decision("2608.1", "added"));
    const log = recordDecision(path, decision("2608.1", "skipped"));
    assert.equal(log.size, 1);
    assert.equal(readDecisions(path).get("2608.1")?.decision, "skipped");
  });

  it("keeps the decisions it did not touch", () => {
    recordDecision(path, decision("a"));
    recordDecision(path, decision("b"));
    assert.equal(readDecisions(path).size, 2);
  });

  it("forgets one decision and leaves the others", () => {
    recordDecision(path, decision("a"));
    recordDecision(path, decision("b"));
    const log = forgetDecision(path, "a");
    assert.deepEqual([...log.keys()], ["b"]);
    assert.deepEqual([...readDecisions(path).keys()], ["b"]);
  });

  it("forgetting an id that was never decided is not an error", () => {
    recordDecision(path, decision("a"));
    assert.equal(forgetDecision(path, "nothing").size, 1);
  });
});
