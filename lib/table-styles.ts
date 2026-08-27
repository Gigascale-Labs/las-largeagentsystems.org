/**
 * One border treatment for every data table on the site.
 *
 * A single `border-b border-rule` per row was not enough to separate them:
 * --rule is #ddd7c6 against a #f7f5ef page, so the line is nearly the same
 * value as the paper it sits on, and a dense row of small text reads as one
 * block. Three things fix that together — an outer border so the table is a
 * bounded object, a row rule that still reads, and a faint stripe on
 * alternate rows so the eye can track across a wide row without a ruler.
 *
 * The stripe and the header wash are `foreground` at low alpha, not a fixed
 * colour, so they invert with the theme: a wash slightly darker than the page
 * in light mode, slightly lighter in dark. Both stay well under the contrast
 * of the text above them, so nothing overlays two elements in one colour.
 *
 * Kept as strings rather than a <Table> component: the two tables differ in
 * width, column layout and cell content, and only the borders should be
 * shared.
 */

/** Wraps the table. Carries the outer border and the horizontal scroll. */
export const TABLE_WRAP = "overflow-x-auto border border-rule";

/** The header row: a wash, and a full-strength rule under it. */
export const TABLE_HEAD_ROW =
  "border-b border-rule bg-foreground/[0.04] text-left font-mono " +
  "text-[10px] font-normal uppercase tracking-widest text-muted";

/**
 * A body row. `last:border-b-0` because the wrapper's own border already
 * closes the table, and two lines there read as a mistake.
 */
export const TABLE_ROW =
  "border-b border-rule/70 align-top odd:bg-foreground/[0.02] last:border-b-0";
