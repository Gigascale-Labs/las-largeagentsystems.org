/**
 * Tests for the canon cross-table's axis rule.
 *
 * The property that matters, and the one that failed before `UNTAGGED`
 * existed: every paper appears in at least one cell, on every axis pair. It is
 * asserted twice here — over synthetic entries, and over the real
 * `data/las-canon.airtable.json`, which is where the regression would actually
 * show up.
 *
 * Run with `npm test`.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  axisValues,
  CLOSED_SET_VALUES,
  DIMENSION_KEYS,
  inCell,
  papersInCell,
  isSingleValue,
  UNTAGGED,
  valueLabel,
  valuesFor,
  type DimensionKey,
} from "../lib/canon-dimensions.ts";
import {
  OBSERVABILITY_SCALE,
  OBSERVABILITY_VIEWERS,
  SYSTEM_TYPES,
  THREAT_MODELS,
  type CanonEntry,
} from "../lib/canon-schema.ts";

function entry(overrides: Partial<CanonEntry> = {}): CanonEntry {
  return {
    title: "A paper",
    itemType: "preprint",
    creators: "A Author",
    date: "2026",
    url: "https://arxiv.org/abs/2608.00001",
    tags: "",
    summary: "",
    tag_confidence: "summary-only",
    ...overrides,
  } as CanonEntry;
}

/** Every ordered pair of two different dimensions: 30 of them. */
function axisPairs(): Array<[DimensionKey, DimensionKey]> {
  const pairs: Array<[DimensionKey, DimensionKey]> = [];
  for (const a of DIMENSION_KEYS) {
    for (const b of DIMENSION_KEYS) if (a !== b) pairs.push([a, b]);
  }
  return pairs;
}

/** How many cells one paper lands in, on one axis pair. */
function cellsHolding(paper: CanonEntry, dimA: DimensionKey, dimB: DimensionKey) {
  let n = 0;
  for (const a of axisValues(dimA)) {
    for (const b of axisValues(dimB)) if (inCell(paper, dimA, a, dimB, b)) n++;
  }
  return n;
}

describe("valuesFor", () => {
  it("returns the values a paper carries", () => {
    assert.deepEqual(
      valuesFor(entry({ threat_model: ["Inequality"] }), "threat_model"),
      ["Inequality"],
    );
  });

  it("returns UNTAGGED for an empty dimension", () => {
    assert.deepEqual(valuesFor(entry({ threat_model: [] }), "threat_model"), [
      UNTAGGED,
    ]);
  });

  it("returns UNTAGGED for an absent dimension", () => {
    assert.deepEqual(valuesFor(entry(), "threat_model"), [UNTAGGED]);
  });

  it("treats a blank string as an absent value, not a value", () => {
    // The CSV loader can produce one of these from a trailing separator.
    assert.deepEqual(
      valuesFor(entry({ focus_area: ["", "  "] } as unknown as Partial<CanonEntry>), "focus_area"),
      [UNTAGGED],
    );
  });

  it("keeps real values when a blank sits beside them", () => {
    assert.deepEqual(
      valuesFor(entry({ focus_area: ["Steering", ""] } as unknown as Partial<CanonEntry>), "focus_area"),
      ["Steering"],
    );
  });

  it("never returns an empty list, whatever the dimension", () => {
    for (const key of DIMENSION_KEYS) {
      assert.ok(valuesFor(entry(), key).length > 0, key);
    }
  });
});

describe("axisValues", () => {
  it("is the closed set with UNTAGGED last", () => {
    const values = axisValues("threat_model");
    assert.deepEqual(values.slice(0, -1), [...THREAT_MODELS]);
    assert.equal(values[values.length - 1], UNTAGGED);
  });

  it("adds exactly one value to every dimension", () => {
    for (const key of DIMENSION_KEYS) {
      assert.equal(axisValues(key).length, CLOSED_SET_VALUES[key].length + 1, key);
    }
  });

  it("holds no duplicates", () => {
    for (const key of DIMENSION_KEYS) {
      const values = axisValues(key);
      assert.equal(new Set(values).size, values.length, key);
    }
  });

  it("UNTAGGED is not a member of any closed vocabulary", () => {
    // If it were, a real tag would silently merge with the derived one.
    for (const key of DIMENSION_KEYS) {
      assert.ok(!CLOSED_SET_VALUES[key].includes(UNTAGGED), key);
    }
  });
});

describe("every paper appears on the table", () => {
  it("holds for a paper with no tags at all", () => {
    const paper = entry();
    for (const [dimA, dimB] of axisPairs()) {
      assert.equal(cellsHolding(paper, dimA, dimB), 1, `${dimA} x ${dimB}`);
    }
  });

  it("holds for a paper tagged on one axis only", () => {
    const paper = entry({ claim_type: ["survey/taxonomy"] });
    for (const [dimA, dimB] of axisPairs()) {
      assert.ok(cellsHolding(paper, dimA, dimB) >= 1, `${dimA} x ${dimB}`);
    }
  });

  it("puts a paper with two values on a dimension in two cells", () => {
    const paper = entry({ threat_model: ["Inequality", "Power Concentration"] });
    assert.equal(cellsHolding(paper, "focus_area", "threat_model"), 2);
  });

  it("holds for every entry in the real canon, on every axis pair", () => {
    const path = join(process.cwd(), "data", "las-canon.airtable.json");
    if (!existsSync(path)) return; // nothing synced; the synthetic cases still ran
    const entries = JSON.parse(readFileSync(path, "utf8")) as CanonEntry[];
    assert.ok(entries.length > 0);
    for (const [dimA, dimB] of axisPairs()) {
      for (const paper of entries) {
        assert.ok(
          cellsHolding(paper, dimA, dimB) >= 1,
          `"${paper.title}" is absent from ${dimA} x ${dimB}`,
        );
      }
    }
  });
});

describe("the general purpose system type", () => {
  // The rule the addendum states: `general purpose` is the fallback, filled
  // only if none of the four named systems fits. A row carrying it beside a
  // named value means the rule was broken upstream in Airtable, which is the
  // only place system_type is edited.
  it("never sits beside a named system type, in the real canon", () => {
    const path = join(process.cwd(), "data", "las-canon.airtable.json");
    if (!existsSync(path)) return;
    const entries = JSON.parse(readFileSync(path, "utf8")) as CanonEntry[];
    for (const paper of entries) {
      const values = paper.system_type ?? [];
      if (values.includes("general purpose")) {
        assert.deepEqual(
          values,
          ["general purpose"],
          `"${paper.title}" carries general purpose beside ${JSON.stringify(values)}`,
        );
      }
    }
  });

  it("is the last value on the closed set, before UNTAGGED on the axis", () => {
    assert.equal(SYSTEM_TYPES[SYSTEM_TYPES.length - 1], "general purpose");
    const axis = axisValues("system_type");
    assert.deepEqual(axis.slice(-2), ["general purpose", UNTAGGED]);
  });
});

describe("the observability scale", () => {
  // One ordinal scale per viewer. Two steps on one viewer is a contradiction,
  // not a pair of facts — which is exactly what the column this replaced did:
  // before the 2026-09-02 recoding, 54 of 90 rows carried all three of its
  // values at once. Airtable is the only place these are edited and its
  // multiple-select fields would happily take a second value, so this is the
  // only thing standing between the data and that failure returning.
  const VIEWERS = [
    "participant_observability",
    "operator_observability",
    "public_observability",
  ] as const;

  it("holds at most one value per viewer, in the real canon", () => {
    const path = join(process.cwd(), "data", "las-canon.airtable.json");
    if (!existsSync(path)) return;
    const entries = JSON.parse(readFileSync(path, "utf8")) as CanonEntry[];
    for (const paper of entries) {
      for (const viewer of VIEWERS) {
        const values = paper[viewer] ?? [];
        assert.ok(
          values.length <= 1,
          `"${paper.title}" has ${values.length} values on ${viewer}: ${JSON.stringify(values)}`,
        );
      }
    }
  });

  it("gives every viewer the same five steps, in the same order", () => {
    for (const viewer of VIEWERS) {
      assert.deepEqual(CLOSED_SET_VALUES[viewer], OBSERVABILITY_SCALE);
    }
  });

  it("names every viewer in OBSERVABILITY_VIEWERS", () => {
    assert.deepEqual([...OBSERVABILITY_VIEWERS], [...VIEWERS]);
    for (const viewer of VIEWERS) assert.ok(isSingleValue(viewer));
  });

  it("marks no other dimension single-value", () => {
    for (const key of DIMENSION_KEYS) {
      assert.equal(
        isSingleValue(key),
        (VIEWERS as readonly string[]).includes(key),
        key,
      );
    }
  });

  it("shortens every scale step for display, and shortens nothing else", () => {
    // A header showing the whole sentence would be taller than the table.
    for (const step of OBSERVABILITY_SCALE) {
      assert.notEqual(valueLabel(step), step, step);
      assert.ok(valueLabel(step).length < 25, step);
    }
    assert.equal(valueLabel("Monitoring"), "Monitoring");
    assert.equal(valueLabel(UNTAGGED), UNTAGGED);
  });
});

describe("papersInCell", () => {
  const entries = [
    entry({ title: "tagged", focus_area: ["Steering"], threat_model: ["Inequality"] }),
    entry({ title: "half", focus_area: ["Steering"] }),
    entry({ title: "bare" }),
  ];

  it("returns the papers carrying both values", () => {
    assert.deepEqual(
      papersInCell(entries, "focus_area", "Steering", "threat_model", "Inequality")
        .map((e) => e.title),
      ["tagged"],
    );
  });

  it("puts a half-tagged paper in the UNTAGGED column, not nowhere", () => {
    assert.deepEqual(
      papersInCell(entries, "focus_area", "Steering", "threat_model", UNTAGGED)
        .map((e) => e.title),
      ["half"],
    );
  });

  it("puts an untagged paper in the corner cell", () => {
    assert.deepEqual(
      papersInCell(entries, "focus_area", UNTAGGED, "threat_model", UNTAGGED)
        .map((e) => e.title),
      ["bare"],
    );
  });

  it("accounts for every paper across one axis pair", () => {
    const seen = new Set<string>();
    for (const a of axisValues("focus_area")) {
      for (const b of axisValues("threat_model")) {
        for (const paper of papersInCell(entries, "focus_area", a, "threat_model", b)) {
          seen.add(paper.title);
        }
      }
    }
    assert.equal(seen.size, entries.length);
  });
});

