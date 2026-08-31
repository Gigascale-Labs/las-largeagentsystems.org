/**
 * Tests for reading the UMAP projection of the reading list.
 *
 * Run with `npm test`. No network: every case reads a temp file.
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, describe, it } from "node:test";

import { getPapersMap } from "../lib/papers-data.ts";
import type { PaperDay } from "../lib/papers-schema.ts";

const dir = mkdtempSync(join(tmpdir(), "papers-map-test-"));
const filePath = join(dir, "map.json");

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

afterEach(() => {
  rmSync(filePath, { force: true });
});

/** Two days holding three papers, the set every point is checked against. */
const days: PaperDay[] = [
  {
    date: "2026-08-26",
    counts: {},
    papers: [
      paper("2608.26081"),
      paper("2608.25937"),
    ],
  },
  { date: "2026-08-25", counts: {}, papers: [paper("2608.25001")] },
];

function paper(arxivId: string) {
  return {
    arxiv_id: arxivId,
    title: "A paper",
    authors: [],
    url: "",
    one_sentence: "",
    nearest_anchor_id: "",
    nearest_anchor_title: "",
    open_questions: [],
  };
}

function write(payload: unknown) {
  writeFileSync(filePath, JSON.stringify(payload), "utf8");
}

function mapFile(points: unknown[]) {
  return {
    model: "allenai/specter2_base",
    dim: 768,
    n: points.length,
    n_neighbors: 15,
    min_dist: 0.1,
    seed: 20260826,
    min_papers: 12,
    points,
  };
}

const point = (arxiv_id: string, x = 0.1, y = 0.2, date = "2026-08-26") => ({
  arxiv_id,
  date,
  x,
  y,
});

describe("a map file that is not there or not readable", () => {
  it("returns an empty map when the file is missing", () => {
    const map = getPapersMap(days, join(dir, "nothing-here.json"));
    assert.deepEqual(map.points, []);
    assert.equal(map.n, 0);
  });

  it("returns an empty map for unparseable JSON", () => {
    writeFileSync(filePath, "{not json", "utf8");
    assert.deepEqual(getPapersMap(days, filePath).points, []);
  });

  it("returns an empty map when the file is an array, not an object", () => {
    write([1, 2, 3]);
    assert.deepEqual(getPapersMap(days, filePath).points, []);
  });

  it("returns an empty map when points is missing or the wrong type", () => {
    write({ model: "m" });
    assert.deepEqual(getPapersMap(days, filePath).points, []);
    write({ ...mapFile([]), points: "nope" });
    assert.deepEqual(getPapersMap(days, filePath).points, []);
  });
});

describe("reading the points", () => {
  it("keeps a well-formed point and its parameters", () => {
    write(mapFile([point("2608.26081", -0.5, 0.25)]));
    const map = getPapersMap(days, filePath);
    assert.deepEqual(map.points, [
      { arxiv_id: "2608.26081", date: "2026-08-26", x: -0.5, y: 0.25 },
    ]);
    assert.equal(map.model, "allenai/specter2_base");
    assert.equal(map.dim, 768);
    assert.equal(map.n_neighbors, 15);
    assert.equal(map.min_papers, 12);
  });

  it("reports n as the points it kept, not the number the file claims", () => {
    write({ ...mapFile([point("2608.26081")]), n: 999 });
    assert.equal(getPapersMap(days, filePath).n, 1);
  });
});

describe("points that must not reach the chart", () => {
  it("drops a point for a paper the page does not list", () => {
    // A dot with no card to scroll to does nothing when clicked.
    write(mapFile([point("2608.26081"), point("9999.99999")]));
    assert.deepEqual(
      getPapersMap(days, filePath).points.map((p) => p.arxiv_id),
      ["2608.26081"],
    );
  });

  it("drops a coordinate that is not a finite number", () => {
    write(
      mapFile([
        { arxiv_id: "2608.26081", date: "2026-08-26", x: "0.1", y: 0.2 },
        { arxiv_id: "2608.25937", date: "2026-08-26", x: null, y: 0.2 },
        { arxiv_id: "2608.25001", date: "2026-08-25", x: 0.1 },
      ]),
    );
    assert.deepEqual(getPapersMap(days, filePath).points, []);
  });

  it("drops a coordinate outside the range the build script writes", () => {
    // One point at 1e9 would flatten every other paper into a single dot.
    write(mapFile([point("2608.26081", 1e9, 0), point("2608.25937", 0.5, 0.5)]));
    assert.deepEqual(
      getPapersMap(days, filePath).points.map((p) => p.arxiv_id),
      ["2608.25937"],
    );
  });

  it("drops a point that is not an object, and one with no id", () => {
    write(mapFile([null, "x", 7, { x: 0.1, y: 0.2 }, point("2608.26081")]));
    assert.deepEqual(
      getPapersMap(days, filePath).points.map((p) => p.arxiv_id),
      ["2608.26081"],
    );
  });
});

describe("hostile text in the map file", () => {
  it("strips invisible characters from the id before matching on it", () => {
    // The id is the join key between the map and the list. Cleaning runs
    // first, so an id carrying a zero-width space still finds its paper
    // rather than silently dropping a point that looks correct in the file.
    write(mapFile([point("2608.2\u200B6081")]));
    assert.deepEqual(
      getPapersMap(days, filePath).points.map((p) => p.arxiv_id),
      ["2608.26081"],
    );
  });

  it("cleans the model name it prints under the chart", () => {
    write({
      ...mapFile([point("2608.26081")]),
      model: "specter\u202Ereversed",
    });
    const map = getPapersMap(days, filePath);
    assert.ok(!map.model.includes("\u202E"));
    assert.equal(map.model, "specterreversed");
  });

  it("replaces a non-numeric parameter with zero rather than rendering it", () => {
    write({ ...mapFile([point("2608.26081")]), dim: "768", seed: null });
    const map = getPapersMap(days, filePath);
    assert.equal(map.dim, 0);
    assert.equal(map.seed, 0);
  });
});
