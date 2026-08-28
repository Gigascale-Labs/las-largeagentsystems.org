/**
 * Ticks for the log y-axis.
 *
 * Recharts hands a log axis straight to d3, which walks whole decades:
 * m x 10^k for m in 1..9. Over the 1M range, data [56.2, 147.1], that gives
 * 60, 70, 80, 90, 100 and then jumps to 200, which is off the axis -- so the
 * top of the plot carries no label and no gridline. Over 1Y, data
 * [67.0, 5865.8], it swings the other way and emits 17.
 *
 * Generate them here instead. A range spanning a decade or more gets a
 * mantissa ladder, thinned until it fits; a narrower one gets round linear
 * steps, which still sit at logarithmic positions.
 */
const TARGET_TICK_COUNT = 6;
const MAX_TICK_COUNT = 9;
const MANTISSA_LADDERS = [
  [1, 2, 5],
  [1, 3],
  [1],
];

function roundStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

export function logAxisTicks(lo: number, hi: number): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo <= 0 || hi <= lo) {
    // Nothing sensible to draw. The caller passes undefined to recharts, so
    // its own generator handles the degenerate case.
    return [];
  }

  if (hi / lo >= 10) {
    let ticks: number[] = [];
    for (const mantissas of MANTISSA_LADDERS) {
      ticks = [];
      for (
        let k = Math.floor(Math.log10(lo));
        k <= Math.ceil(Math.log10(hi));
        k++
      ) {
        for (const mantissa of mantissas) {
          const value = mantissa * 10 ** k;
          if (value >= lo && value <= hi) ticks.push(value);
        }
      }
      if (ticks.length <= MAX_TICK_COUNT) break;
    }
    return ticks;
  }

  const step = roundStep((hi - lo) / TARGET_TICK_COUNT);
  const ticks: number[] = [];
  for (let value = Math.ceil(lo / step) * step; value <= hi; value += step) {
    // toPrecision because the accumulating += drifts off round values.
    ticks.push(Number(value.toPrecision(12)));
  }
  return ticks;
}
