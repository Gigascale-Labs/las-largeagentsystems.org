/**
 * The six dimensions the canon explorer crosses, and the rule that makes every
 * paper appear somewhere on the cross-table.
 *
 * ## Why `UNTAGGED` exists
 *
 * A cross-table cell holds the papers carrying `row` on one dimension and
 * `col` on the other. A paper with no value on either dimension matched no
 * cell, so it was absent from the table entirely — not shown as a zero,
 * shown nowhere.
 *
 * Measured 2026-09-01 over the 90 canon rows, papers absent from the table by
 * axis pair:
 *
 * | Axis pair | Absent |
 * |---|---|
 * | Observability × Threat Model | 85 of 90 |
 * | Focus Area × Threat Model, the default view | 80 of 90 |
 * | Participant Mix × Claim Type, the best pair | 20 of 90 |
 *
 * Tagging coverage is thin and uneven — `claim_type` is complete at 90 of 90,
 * `threat_model` reaches 21 — so the default view was showing 10 papers of 90
 * and giving no sign that the other 80 existed.
 *
 * `valuesFor` now returns `[UNTAGGED]` for a dimension a paper carries no
 * value on. Every paper therefore lands in at least one cell on every axis
 * pair, and the count in an `UNTAGGED` row or column is the tagging gap, read
 * off the table rather than inferred from its absence.
 *
 * This is a display rule, not a tag. Nothing writes `UNTAGGED` to a file or to
 * Airtable, and it is not a member of any closed set in `canon-schema.ts`.
 *
 * ## What it does not fix
 *
 * A paper still appears in one cell per value it carries, so a paper with two
 * threat models appears twice on any pair that crosses them. Cell counts
 * therefore sum to more than the corpus, and always did. The table answers
 * "how many papers carry this pair", not "how does the corpus divide".
 */

// Explicit .ts extension, like `lib/papers-data.ts`: this module is exercised
// directly by Node's type-stripping test runner
// (tests/canon-dimensions.test.mts), which does not resolve an extensionless
// import. tsconfig's allowImportingTsExtensions exists for exactly this.
import {
  CLAIM_TYPES,
  FOCUS_AREAS,
  OBSERVABILITY_SCALE,
  OBSERVABILITY_VIEWERS,
  PARTICIPANT_MIXES,
  SYSTEM_TYPES,
  THREAT_MODELS,
  type CanonEntry,
} from "./canon-schema.ts";

export type DimensionKey =
  | "system_type"
  | "participant_mix"
  | "participant_observability"
  | "operator_observability"
  | "public_observability"
  | "focus_area"
  | "threat_model"
  | "claim_type";

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  system_type: "System Type",
  participant_mix: "Participant Mix",
  participant_observability: "Participant Obs.",
  operator_observability: "Operator Obs.",
  public_observability: "Public Obs.",
  focus_area: "Focus Area",
  threat_model: "Threat Model",
  claim_type: "Claim Type",
};

export const DIMENSION_KEYS = Object.keys(DIMENSION_LABELS) as DimensionKey[];

/**
 * The axis value for a paper carrying nothing on that dimension.
 *
 * Not a tag. It is absent from every closed set in `canon-schema.ts`, so a
 * paper can never be given this value — `valuesFor` derives it.
 */
export const UNTAGGED = "Not tagged";

/** The closed vocabulary each dimension draws from, without `UNTAGGED`. */
export const CLOSED_SET_VALUES: Record<DimensionKey, readonly string[]> = {
  system_type: SYSTEM_TYPES,
  participant_mix: PARTICIPANT_MIXES,
  participant_observability: OBSERVABILITY_SCALE,
  operator_observability: OBSERVABILITY_SCALE,
  public_observability: OBSERVABILITY_SCALE,
  focus_area: FOCUS_AREAS,
  threat_model: THREAT_MODELS,
  claim_type: CLAIM_TYPES,
};

/**
 * One paper's values on one dimension, for the table.
 *
 * Never empty: a paper with no value carries `UNTAGGED`, which is what puts it
 * on the table. Blank strings are dropped — the CSV loader can produce one
 * from a trailing separator, and a blank is an absent value, not a value.
 */
export function valuesFor(entry: CanonEntry, key: DimensionKey): string[] {
  const values = (entry[key] ?? []).filter((value) => value.trim() !== "");
  return values.length > 0 ? values : [UNTAGGED];
}

/** One axis, in closed-set order with `UNTAGGED` last. */
export function axisValues(key: DimensionKey): string[] {
  return [...CLOSED_SET_VALUES[key], UNTAGGED];
}

/** Whether one paper belongs in the cell at (`dimA` = `a`, `dimB` = `b`). */
export function inCell(
  entry: CanonEntry,
  dimA: DimensionKey,
  a: string,
  dimB: DimensionKey,
  b: string,
): boolean {
  return valuesFor(entry, dimA).includes(a) && valuesFor(entry, dimB).includes(b);
}

/** The papers in one cell. */
export function papersInCell(
  entries: CanonEntry[],
  dimA: DimensionKey,
  a: string,
  dimB: DimensionKey,
  b: string,
): CanonEntry[] {
  return entries.filter((entry) => inCell(entry, dimA, a, dimB, b));
}

/**
 * Short display labels for values whose stored form is too long for a table
 * header.
 *
 * The stored value is the whole sentence, because that sentence is the
 * definition and shortening it in Airtable would lose what the level means.
 * The header shows the short form and carries the full one as its `title`.
 * Any value absent from this map renders as itself.
 */
export const VALUE_LABELS: Record<string, string> = {
  "fully observable - reasoning, agents, and interactions": "Full",
  "partially observable - agents and interactions only": "Agents + interactions",
  "partially observable - interactions only": "Interactions only",
  "partially observable - aggregates only": "Aggregates only",
  "unobservable - neither reasoning, agents, interactions, nor aggregates":
    "Unobservable",
};

export function valueLabel(value: string): string {
  return VALUE_LABELS[value] ?? value;
}

/** Whether a dimension holds at most one value per paper. */
export function isSingleValue(key: DimensionKey): boolean {
  return (OBSERVABILITY_VIEWERS as readonly string[]).includes(key);
}
