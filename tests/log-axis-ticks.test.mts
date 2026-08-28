import assert from "node:assert/strict";
import test, { describe } from "node:test";

import { logAxis } from "../lib/log-axis-ticks.ts";

/** Log distance, so "symmetric about 100" can be asserted rather than eyeballed. */
function logGap(a: number, b: number): number {
  return Math.abs(Math.log10(a) - Math.log10(b));
}

describe("logAxis", () => {
  test("labels above the baseline, which d3 does not", () => {
    // The bug this exists to fix. d3's own ticks for this range are
    // [60, 70, 80, 90, 100] -- nothing above 100, though the data reaches
    // 147.1, so the top of the plot was blank.
    const { ticks } = logAxis(56.2, 147.1);
    assert.ok(ticks.filter((t) => t > 100).length >= 2);
  });

  test("mirrors ticks about 100 when the data is close to it", () => {
    const { ticks, domain } = logAxis(56.2, 147.1);
    assert.deepEqual(ticks, [50, 62.5, 80, 100, 125, 160, 200]);
    assert.deepEqual(domain, [50, 200]);

    assert.equal(ticks.filter((t) => t < 100).length, ticks.filter((t) => t > 100).length);
    for (let i = 0; i < ticks.length; i++) {
      const mirrored = ticks[ticks.length - 1 - i];
      assert.ok(
        logGap(ticks[i], 100) - logGap(mirrored, 100) < 1e-9,
        `${ticks[i]} and ${mirrored} are not equidistant from 100`,
      );
    }
  });

  test("centres the domain on 100 and keeps the data inside it", () => {
    for (const [lo, hi] of [
      [56.2, 147.1],
      [77.7, 145.2],
      [95, 105],
      [30, 110],
    ]) {
      const { domain } = logAxis(lo, hi);
      assert.ok(domain, `no domain for [${lo}, ${hi}]`);
      assert.ok(logGap(domain[0], 100) - logGap(domain[1], 100) < 1e-9);
      assert.ok(domain[0] <= lo && domain[1] >= hi, `[${lo}, ${hi}] falls outside ${domain}`);
    }
  });

  test("keeps every tick inside the domain", () => {
    for (const [lo, hi] of [
      [56.2, 147.1],
      [77.7, 145.2],
      [67, 5865.8],
      [100, 5865.8],
      [1, 1_000_000],
    ]) {
      const { ticks, domain } = logAxis(lo, hi);
      const [min, max] = domain ?? [lo, hi];
      for (const tick of ticks) {
        assert.ok(tick >= min && tick <= max, `${tick} outside [${min}, ${max}]`);
      }
    }
  });

  test("drops symmetry when the data is far from 100", () => {
    // 2Y runs [100.0, 5865.8]. A symmetric axis would reach down to 1.7 and
    // leave the entire lower half of the plot empty.
    const { ticks, domain } = logAxis(100, 5865.8);
    assert.equal(domain, undefined);
    assert.deepEqual(ticks, [100, 200, 500, 1000, 2000, 5000]);
  });

  test("thins the ladder rather than emitting a tick per mantissa", () => {
    // Six decades on the 1-2-5 ladder would be 19 ticks.
    const { ticks } = logAxis(1, 1_000_000);
    assert.ok(ticks.length <= 9, `got ${ticks.length} ticks`);
    assert.deepEqual(ticks, [1, 10, 100, 1000, 10_000, 100_000, 1_000_000]);
  });

  test("returns round tick values, not float drift", () => {
    for (const [lo, hi] of [
      [56.2, 147.1],
      [77.7, 145.2],
      [67, 5865.8],
    ]) {
      for (const tick of logAxis(lo, hi).ticks) {
        assert.equal(tick, Number(tick.toPrecision(12)));
        assert.ok(String(tick).length <= 7, `${tick} is too long to label`);
      }
    }
  });

  test("returns nothing for a degenerate or invalid range", () => {
    for (const [lo, hi] of [
      [100, 100],
      [150, 100],
      [0, 100],
      [-5, 100],
      [Number.NaN, 100],
      [1, Number.POSITIVE_INFINITY],
    ]) {
      const axis = logAxis(lo, hi);
      assert.deepEqual(axis.ticks, [], `[${lo}, ${hi}] returned ticks`);
      assert.equal(axis.domain, undefined);
    }
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
      const { ticks } = logAxis(lo, hi);
      assert.ok(ticks.length >= 3, `${label}: only ${ticks.length} ticks`);
      assert.ok(ticks.length <= 9, `${label}: ${ticks.length} ticks`);
    }
  });
});
