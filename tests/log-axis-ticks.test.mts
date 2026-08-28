import assert from "node:assert/strict";
import test, { describe } from "node:test";

import { logAxisTicks } from "../lib/log-axis-ticks.ts";

describe("logAxisTicks", () => {
  test("labels above the last whole decade, which d3 does not", () => {
    // The bug this exists to fix. d3's own ticks for this range are
    // [60, 70, 80, 90, 100] -- nothing above 100, though the data reaches
    // 147.1, so the top of the plot was blank.
    const ticks = logAxisTicks(56.2, 147.1);
    assert.deepEqual(ticks, [60, 80, 100, 120, 140]);
    assert.ok(ticks.filter((t) => t > 100).length >= 2);
  });

  test("keeps every tick inside the data range", () => {
    for (const [lo, hi] of [
      [56.2, 147.1],
      [77.7, 145.2],
      [67, 5865.8],
      [100, 5865.8],
      [1, 1_000_000],
    ]) {
      for (const tick of logAxisTicks(lo, hi)) {
        assert.ok(tick >= lo && tick <= hi, `${tick} outside [${lo}, ${hi}]`);
      }
    }
  });

  test("uses the 1-2-5 ladder once the range spans a decade", () => {
    assert.deepEqual(logAxisTicks(67, 5865.8), [100, 200, 500, 1000, 2000, 5000]);
  });

  test("thins the ladder rather than emitting a tick per mantissa", () => {
    // Six decades on the 1-2-5 ladder would be 19 ticks.
    const ticks = logAxisTicks(1, 1_000_000);
    assert.ok(ticks.length <= 9, `got ${ticks.length} ticks`);
    assert.deepEqual(ticks, [1, 10, 100, 1000, 10_000, 100_000, 1_000_000]);
  });

  test("returns round values, not float drift", () => {
    for (const tick of logAxisTicks(56.2, 147.1)) {
      assert.equal(tick, Math.round(tick));
    }
  });

  test("returns nothing for a degenerate or invalid range", () => {
    assert.deepEqual(logAxisTicks(100, 100), []);
    assert.deepEqual(logAxisTicks(150, 100), []);
    assert.deepEqual(logAxisTicks(0, 100), []);
    assert.deepEqual(logAxisTicks(-5, 100), []);
    assert.deepEqual(logAxisTicks(Number.NaN, 100), []);
    assert.deepEqual(logAxisTicks(1, Number.POSITIVE_INFINITY), []);
  });

  test("gives a usable count on every range the presets produce", () => {
    // Measured from the live CSV on 2026-08-28, one row per range preset.
    const ranges: [string, number, number][] = [
      ["1M", 56.2, 147.1],
      ["3M", 77.7, 145.2],
      ["1Y", 67, 5865.8],
      ["2Y", 100, 5865.8],
    ];
    for (const [label, lo, hi] of ranges) {
      const ticks = logAxisTicks(lo, hi);
      assert.ok(ticks.length >= 3, `${label}: only ${ticks.length} ticks`);
      assert.ok(ticks.length <= 9, `${label}: ${ticks.length} ticks`);
    }
  });
});
