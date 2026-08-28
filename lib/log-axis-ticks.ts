/**
 * Domain and ticks for the growth chart's log y-axis.
 *
 * Recharts hands a log axis straight to d3, which walks whole decades:
 * m x 10^k for m in 1..9. Over the 1M range, data [56.2, 147.1], that gives
 * 60, 70, 80, 90, 100 and then jumps to 200, which is off the axis -- so the
 * top of the plot carried no label and no gridline. Over 1Y, data
 * [67.0, 5865.8], it swung the other way and emitted 17.
 *
 * Three cases, in order:
 *
 * 1. The data sits within a factor of SYMMETRY_LIMIT of 100 on both sides.
 *    Centre the axis on 100 and place ticks in reciprocal pairs, so a series
 *    that halves sits as far below the baseline as one that doubles sits
 *    above it. This is the growth chart's normal case.
 * 2. The data spreads by LADDER_THRESHOLD or more. Use a mantissa ladder,
 *    thinned until it fits. Symmetry is not available here: on the 2Y range
 *    the data runs [100.0, 5865.8], so centring on 100 would leave the whole
 *    lower half of the plot empty.
 * 3. Anything else. Round linear steps, which still sit at logarithmic
 *    positions.
 */

/** Ticks aim for this many; a case may return fewer. */
const TARGET_TICK_COUNT = 6;
const MAX_TICK_COUNT = 8;

/**
 * How far from 100 the data may sit and still get a symmetric axis. Past
 * this, mirroring the far side wastes more of the plot than the symmetry is
 * worth.
 */
const SYMMETRY_LIMIT = 4;

/**
 * Data spread, hi/lo, at which the mantissa ladder beats round linear steps.
 * Below 10 the 6M range, data [65.7, 627.7], took linear steps of 100 and so
 * labelled nothing under the baseline; the ladder puts a tick at 70.
 */
const LADDER_THRESHOLD = 5;

/**
 * Ratios for the symmetric case. Every one gives a round number on both
 * sides of 100 -- 1.25 gives 80 and 125, 2.5 gives 40 and 250 -- so the
 * axis reads in whole index points either way. 1.5 is left out: its
 * reciprocal is 66.67.
 */
const SYMMETRIC_RATIOS = [1.25, 1.6, 2, 2.5, 4];

/** Tried densest first; the first that fits MAX_TICK_COUNT wins. */
const MANTISSA_LADDERS = [
  [1, 2, 3, 5, 7],
  [1, 2, 5],
  [1, 3],
  [1],
];

/** The index every series is normalised to at the start of the range. */
const BASELINE = 100;

export interface LogAxis {
  ticks: number[];
  /** Undefined means "leave the domain to recharts" (i.e. the data bounds). */
  domain: [number, number] | undefined;
}

const EMPTY_AXIS: LogAxis = { ticks: [], domain: undefined };

function roundStep(raw: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

/** Rounds off the float error that 100 / 1.6 and friends carry. */
function tidy(value: number): number {
  return Number(value.toPrecision(12));
}

function symmetricAxis(lo: number, hi: number): LogAxis | null {
  const needed = Math.max(hi / BASELINE, BASELINE / lo);
  if (needed > SYMMETRY_LIMIT) return null;

  const outer = SYMMETRIC_RATIOS.find((ratio) => ratio >= needed);
  if (outer === undefined) return null;

  const ticks = [BASELINE];
  for (const ratio of SYMMETRIC_RATIOS) {
    if (ratio > outer) break;
    ticks.push(tidy(BASELINE / ratio), tidy(BASELINE * ratio));
  }
  ticks.sort((a, b) => a - b);

  return {
    ticks,
    domain: [tidy(BASELINE / outer), tidy(BASELINE * outer)],
  };
}

export function logAxis(lo: number, hi: number): LogAxis {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo <= 0 || hi <= lo) {
    // Nothing sensible to draw. The caller passes undefined to recharts, so
    // its own generator handles the degenerate case.
    return EMPTY_AXIS;
  }

  const symmetric = symmetricAxis(lo, hi);
  if (symmetric) return symmetric;

  if (hi / lo >= LADDER_THRESHOLD) {
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
    return { ticks, domain: undefined };
  }

  const step = roundStep((hi - lo) / TARGET_TICK_COUNT);
  const ticks: number[] = [];
  for (let value = Math.ceil(lo / step) * step; value <= hi; value += step) {
    // tidy because the accumulating += drifts off round values.
    ticks.push(tidy(value));
  }
  return { ticks, domain: undefined };
}
