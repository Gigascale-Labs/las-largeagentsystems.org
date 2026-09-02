/**
 * Tests for the cross-table's colour scale.
 *
 * The property that matters, and the one the fixed thresholds lost: the
 * darkest step is always reached, and the lightest step is always reached,
 * whatever the largest cell in the view holds. A scale that puts every cell
 * on one step shows nothing, which is what 1 / 2-3 / 4+ did once the canon was
 * broadly tagged.
 *
 * Run with `npm test`.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bandLabel, scaleBands, shadeFor } from "../lib/table-scale.ts";

/** Every count from 1 to max, and the class each one renders at. */
function classesOver(max: number): string[] {
  const bands = scaleBands(max);
  return Array.from({ length: max }, (_, i) => shadeFor(i + 1, bands));
}

describe("scaleBands", () => {
  it("gives four steps once the maximum reaches four", () => {
    for (const max of [4, 5, 12, 90, 1000]) {
      assert.equal(scaleBands(max).length, 4, `max ${max}`);
    }
  });

  it("gives one step per count while the maximum is under four", () => {
    for (const max of [1, 2, 3]) {
      assert.equal(scaleBands(max).length, max, `max ${max}`);
    }
  });

  it("gives no steps for an empty table", () => {
    assert.deepEqual(scaleBands(0), []);
    assert.deepEqual(scaleBands(-1), []);
  });

  it("covers every count from 1 to max exactly once", () => {
    for (const max of [1, 2, 3, 4, 7, 23, 90]) {
      const bands = scaleBands(max);
      assert.equal(bands[0].lower, 1, `max ${max} starts at 1`);
      assert.equal(bands[bands.length - 1].upper, max, `max ${max} ends at max`);
      for (let i = 1; i < bands.length; i++) {
        assert.equal(
          bands[i].lower,
          bands[i - 1].upper + 1,
          `max ${max} band ${i} is contiguous`,
        );
      }
    }
  });

  it("never gives a step an empty range", () => {
    for (let max = 1; max <= 200; max++) {
      for (const band of scaleBands(max)) {
        assert.ok(band.lower <= band.upper, `max ${max}: ${band.lower}-${band.upper}`);
      }
    }
  });
});

describe("shadeFor", () => {
  it("leaves an empty cell unshaded", () => {
    assert.equal(shadeFor(0, scaleBands(90)), "");
  });

  it("puts the smallest count on the darkest step, at every maximum", () => {
    // Inverted on purpose: the reader is hunting thin cells, not fat ones.
    for (let max = 1; max <= 200; max++) {
      const classes = classesOver(max);
      assert.equal(classes[0], "bg-accent/60", `max ${max}`);
    }
  });

  it("puts the largest cell on the lightest step, once there is more than one step", () => {
    for (let max = 2; max <= 200; max++) {
      const classes = classesOver(max);
      const bands = scaleBands(max);
      assert.equal(classes[max - 1], bands[bands.length - 1].className, `max ${max}`);
      assert.notEqual(classes[max - 1], "bg-accent/60", `max ${max}`);
    }
  });

  it("uses every step it declares", () => {
    // This is the regression. With fixed thresholds and a max of 23, every
    // shaded cell landed on one class.
    for (let max = 1; max <= 200; max++) {
      const used = new Set(classesOver(max));
      assert.equal(used.size, scaleBands(max).length, `max ${max}`);
    }
  });

  it("never darkens as the count rises", () => {
    // Band order is still low-to-high by count; the classes attached to those
    // bands run dark-to-light. Walking counts upward must walk bands forward.
    for (const max of [1, 3, 4, 9, 23, 90]) {
      const bands = scaleBands(max);
      let seen = 0;
      for (let n = 1; n <= max; n++) {
        const i = bands.findIndex((b) => b.className === shadeFor(n, bands));
        assert.ok(i >= seen, `max ${max}, count ${n}`);
        seen = i;
      }
    }
  });

  it("hands out the ramp darkest-first", () => {
    assert.deepEqual(
      scaleBands(90).map((b) => b.className),
      ["bg-accent/60", "bg-accent/45", "bg-accent/30", "bg-accent/15"],
    );
  });

  it("agrees with the band ranges the key prints", () => {
    for (const max of [1, 2, 3, 4, 5, 17, 90]) {
      const bands = scaleBands(max);
      for (const band of bands) {
        for (let n = band.lower; n <= band.upper; n++) {
          assert.equal(shadeFor(n, bands), band.className, `max ${max}, count ${n}`);
        }
      }
    }
  });

  it("clamps a count above the maximum rather than reading past the ramp", () => {
    // Above the top band it falls to the last band, which is now the lightest.
    const bands = scaleBands(10);
    assert.equal(shadeFor(99, bands), bands[bands.length - 1].className);
    assert.equal(shadeFor(99, bands), "bg-accent/15");
  });
});

describe("bandLabel", () => {
  it("prints one number when a step covers one count", () => {
    assert.deepEqual(scaleBands(3).map(bandLabel), ["1", "2", "3"]);
  });

  it("prints a range when a step covers several", () => {
    assert.deepEqual(scaleBands(8).map(bandLabel), ["1–2", "3–4", "5–6", "7–8"]);
  });

  it("uses an en dash, not a hyphen", () => {
    assert.match(bandLabel(scaleBands(90)[0]), /–/);
  });
});
