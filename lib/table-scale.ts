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
 * Rebasing on the view's own range means the scale always spans it, whichever
 * pair of dimensions is selected and whichever corpus the component was
 * handed. The cost is that a shade means a different count in each view, so
 * the key prints the count range of every step and the heading prints the
 * maximum it is scaled to.
 *
 * **The ramp is inverted: the fewest papers get the darkest cell.** A reader
 * of this table is looking for the thin cells, not the fat ones. The corpus is
 * lumpy — on Focus Area x Observability the largest cell holds 78 of 90 rows —
 * so a conventional ramp paints the four or five well-covered pairs dark and
 * leaves everything a reader wants to find as the faintest wash on the page.
 * Inverting it makes a rare pair the thing the eye lands on.
 *
 * A cell holding 0 papers stays unshaded, so "nothing here" and "one paper
 * here" do not collide. That is the one discontinuity in the ramp, and it is
 * deliberate: an empty cell is also disabled and renders an en dash rather
 * than a number, so it is marked twice over.
 *
 * One hue, dark to light: this is still a magnitude scale, not a set of
 * categories. Only the direction changed.
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
  // Reversed: band 0 covers the lowest counts and takes the darkest class.
  // See the note above on why a rare pair is what the reader is hunting for.
  const ramp = [...RAMPS[steps]].reverse();
  return ramp.map((className, i) => ({
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
