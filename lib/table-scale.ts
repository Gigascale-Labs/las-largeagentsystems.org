/**
 * The cell shading.
 *
 * The scale is relative to the largest cell in the table currently on screen,
 * not to a fixed count. Fixed thresholds were 1 / 2-3 / 4+, which worked while
 * the corpus was thinly tagged and stopped working when it was not: on
 * 2026-09-01 the canon reached 442 filled dimension cells of 450, most pairs
 * cleared 4 papers, and every shaded cell rendered at the top step. A scale
 * whose every cell is the same colour carries no information.
 *
 * Rebasing on the view's own maximum means the darkest cell is always the
 * largest one there, whichever pair of dimensions is selected and whichever
 * corpus the component was handed. The cost is that a shade means a different
 * count in each view, so the key prints the count range of every step and the
 * heading prints the maximum it is scaled to.
 *
 * One hue, light to dark: this is a magnitude scale, not a set of categories.
 */
// The class strings stay literal here. Tailwind scans source for them, so a
// class built by interpolating an opacity would never reach the stylesheet.
const RAMPS: Record<number, readonly string[]> = {
  1: ["bg-accent/60"],
  2: ["bg-accent/30", "bg-accent/60"],
  3: ["bg-accent/20", "bg-accent/40", "bg-accent/60"],
  4: ["bg-accent/15", "bg-accent/30", "bg-accent/45", "bg-accent/60"],
};

export type Band = {
  /** The Tailwind background class for this step. */
  className: string;
  /** Lowest and highest paper count this step covers, both inclusive. */
  lower: number;
  upper: number;
};

/**
 * The bands for one table, given its largest cell.
 *
 * At most four steps, because four is what a reader can tell apart at a
 * glance. Fewer when the maximum is smaller: a table topping out at 2 gets two
 * steps, so no step covers an empty range of counts.
 */
export function scaleBands(max: number): Band[] {
  if (max < 1) return [];
  const steps = Math.min(4, max);
  const edge = (i: number) => Math.ceil((max * i) / steps);
  return RAMPS[steps].map((className, i) => ({
    className,
    lower: edge(i) + 1,
    upper: edge(i + 1),
  }));
}

/**
 * The band a count falls in. 0 papers is unshaded, and is not a band.
 *
 * It reads the bands rather than recomputing the bucket from `max`. The first
 * version did recompute it, with `ceil(count * steps / max)`, and that
 * disagreed with `scaleBands` wherever the two roundings differed: at max 5 the
 * key said the lightest step covered 1-2 and a cell holding 2 drew one step
 * darker. Deriving both from one list is what makes them agree.
 */
export function shadeFor(count: number, bands: Band[]): string {
  if (count < 1 || bands.length === 0) return "";
  const band = bands.find((b) => count <= b.upper) ?? bands[bands.length - 1];
  return band.className;
}

/** "3" when a band covers one count, "4-7" when it covers several. */
export function bandLabel(band: Band): string {
  return band.lower === band.upper
    ? `${band.lower}`
    : `${band.lower}\u2013${band.upper}`;
}
