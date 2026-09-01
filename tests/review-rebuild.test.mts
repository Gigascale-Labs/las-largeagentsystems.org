/**
 * Tests for the two guards on the "Sync and publish" button: what counts as a
 * dirty checkout, and the lock that stops two runs at once.
 *
 * Run with `npm test`. Nothing here runs git, npm or the network — `runRebuild`
 * itself is exercised by pressing the button, not by this file.
 *
 * NOT COVERED: `runRebuild` end to end. It fast-forwards a branch and pushes to
 * a live remote, so a test of it needs a throwaway remote and a throwaway
 * checkout. Building those two fixtures is the test that would settle it.
 */

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, describe, it } from "node:test";

import {
  acquireLock,
  dirtyOutsideData,
  lastRunPath,
  lockPath,
  readLastRun,
} from "../review/rebuild.mts";

const dir = mkdtempSync(join(tmpdir(), "review-rebuild-"));
after(() => rmSync(dir, { recursive: true, force: true }));
afterEach(() => rmSync(lockPath(dir), { recursive: true, force: true }));

describe("dirtyOutsideData", () => {
  it("passes a tree that is clean", () => {
    assert.deepEqual(dirtyOutsideData(""), []);
    assert.deepEqual(dirtyOutsideData("\n  \n"), []);
  });

  it("passes a tree dirty only under data/", () => {
    const porcelain = [
      " M data/las-canon.airtable.json",
      "M  data/las-new-papers.json",
      "?? data/las-new-papers-map.json",
    ].join("\n");
    assert.deepEqual(dirtyOutsideData(porcelain), []);
  });

  it("names a file changed outside data/", () => {
    const porcelain = " M app/page.tsx\n M data/las-new-papers.json";
    assert.deepEqual(dirtyOutsideData(porcelain), ["app/page.tsx"]);
  });

  it("names both sides of a rename, so a move out of data/ is caught", () => {
    assert.deepEqual(
      dirtyOutsideData("R  data/old.json -> lib/new.json"),
      ["lib/new.json"],
    );
    assert.deepEqual(
      dirtyOutsideData("R  lib/old.json -> data/new.json"),
      ["lib/old.json"],
    );
  });

  it("strips the quotes git puts round a path with a space", () => {
    assert.deepEqual(dirtyOutsideData('?? "review/a b.mts"'), ["review/a b.mts"]);
  });

  it("reports a path once however many lines mention it", () => {
    assert.deepEqual(
      dirtyOutsideData("?? review/x.mts\n M review/x.mts"),
      ["review/x.mts"],
    );
  });

  it("does not mistake a directory that merely starts with the four letters", () => {
    assert.deepEqual(dirtyOutsideData("?? database/x.sql"), ["database/x.sql"]);
  });
});

describe("acquireLock", () => {
  it("takes the lock and creates the directory", () => {
    const release = acquireLock(dir);
    assert.ok(release);
    assert.ok(existsSync(lockPath(dir)));
    release();
    assert.ok(!existsSync(lockPath(dir)));
  });

  it("refuses a second holder while the first has it", () => {
    const first = acquireLock(dir);
    assert.ok(first);
    assert.equal(acquireLock(dir), null);
    first();
  });

  it("is available again once released", () => {
    acquireLock(dir)!();
    const second = acquireLock(dir);
    assert.ok(second);
    second();
  });
});

describe("readLastRun", () => {
  it("returns null before the first run", () => {
    rmSync(lastRunPath(dir), { force: true });
    assert.equal(readLastRun(dir), null);
  });
});
