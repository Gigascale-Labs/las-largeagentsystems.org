/**
 * Schema for the LAS paper canon (`data/las-canon.csv`) and the
 * contribute-a-source intake pipeline.
 *
 * All six dimension columns are tagged for the 45 corpus entries, per
 * `las-canon-and-open-problems-spec.md` (Task A) and
 * `las-canon-dimension-tagging-spec.md`. `claim_type` uses the 9-value
 * paper-type taxonomy from the canon addendum rather than that spec's
 * 4-value diagnosis/mechanism/evidence/policy scheme — see
 * docs/las-canon-addendum.md for why the two conflicting definitions
 * exist and which one this repo treats as authoritative.
 */

/**
 * The real-world system a paper is about.
 *
 * `general purpose` is the fallback and is filled ONLY IF none of the four
 * named systems fits. It is not a catch-all: a row that is not about a system
 * of AI agents at all leaves this dimension empty instead. The two-part test,
 * the rows it was applied to, and the rows deliberately left empty are in
 * docs/las-canon-addendum.md, "The `general purpose` system type".
 */
export const SYSTEM_TYPES = [
  "production economy",
  "social network",
  "labour market",
  "financial system",
  "general purpose",
] as const;

export const PARTICIPANT_MIXES = [
  "pure-AI",
  "hybrid - human, AI, other",
] as const;

/**
 * How much of a system is visible, as one ordered scale.
 *
 * It replaces the three-value set `aggregates observable`,
 * `interactions observable`, `agents observable`, which was not a scale: the
 * three were tagged together, so a row could claim to see agent internals and
 * only population aggregates at once, and the column said nothing about *who*
 * could see.
 *
 * The scale is ordinal, most visible first. Four things can be visible, and
 * each step drops one:
 *
 * | Step | reasoning | agents | interactions | aggregates |
 * |---|---|---|---|---|
 * | fully observable | yes | yes | yes | yes |
 * | agents and interactions only | no | yes | yes | yes |
 * | interactions only | no | no | yes | yes |
 * | aggregates only | no | no | no | yes |
 * | unobservable | no | no | no | no |
 *
 * One value per column. Two steps on one column would be a contradiction, not
 * a pair of facts; `tests/canon-dimensions.test.mts` asserts it against the
 * data.
 */
export const OBSERVABILITY_SCALE = [
  "fully observable - reasoning, agents, and interactions",
  "partially observable - agents and interactions only",
  "partially observable - interactions only",
  "partially observable - aggregates only",
  "unobservable - neither reasoning, agents, interactions, nor aggregates",
] as const;

/**
 * The three parties the scale is recorded for. Same scale, different vantage
 * point: a system where agents read each other's messages, the operator logs
 * everything, and the public sees a monthly total scores differently in each
 * column, and the difference is the point.
 */
export const OBSERVABILITY_VIEWERS = [
  "participant_observability",
  "operator_observability",
  "public_observability",
] as const;

export const FOCUS_AREAS = [
  "Monitoring",
  "Steering",
  "Simulation",
  "Redesign",
  "Design",
] as const;

export const THREAT_MODELS = [
  "Gradual Disempowerment",
  "Systemic Instability",
  "Inequality",
  "Collective Superintelligence",
  "Partially Observable Systems",
  "Power Concentration",
  "Outdated Models",
  "Emergent Goals",
] as const;

export const CLAIM_TYPES = [
  "theoretical/conceptual framework",
  "empirical study",
  "survey/taxonomy",
  "proposed method/system",
  "position/opinion",
  "threat model articulation",
  "policy/regulatory analysis",
  "dataset/tool",
  "live deployment",
] as const;

export type SystemType = (typeof SYSTEM_TYPES)[number];
export type ParticipantMix = (typeof PARTICIPANT_MIXES)[number];
export type ObservabilityLevel = (typeof OBSERVABILITY_SCALE)[number];
export type ObservabilityViewer = (typeof OBSERVABILITY_VIEWERS)[number];
export type FocusArea = (typeof FOCUS_AREAS)[number];
export type ThreatModel = (typeof THREAT_MODELS)[number];
export type ClaimType = (typeof CLAIM_TYPES)[number];

/** Multi-value dimension columns store semicolon-separated values on disk. */
export type MultiValue<T extends string> = T[];

export interface CanonDimensions {
  system_type?: MultiValue<SystemType>;
  participant_mix?: MultiValue<ParticipantMix>;
  /** What one participant can observe of the others. One value. */
  participant_observability?: MultiValue<ObservabilityLevel>;
  /** What whoever runs the system can observe. One value. */
  operator_observability?: MultiValue<ObservabilityLevel>;
  /** What someone outside the system can observe. One value. */
  public_observability?: MultiValue<ObservabilityLevel>;
  focus_area?: MultiValue<FocusArea>;
  threat_model?: MultiValue<ThreatModel>;
  claim_type?: MultiValue<ClaimType>;
}

export type TagConfidence = "full-text" | "summary-only";

export interface CanonEntry extends CanonDimensions {
  title: string;
  itemType: string;
  creators: string;
  date: string;
  url: string;
  tags: string;
  summary: string;
  /** Whether tagging was grounded in the fetched paper (`full-text`) or
   * the corpus's existing `summary` field alone (`summary-only`). All 45
   * corpus entries are currently `summary-only`. */
  tag_confidence: TagConfidence;
  /**
   * Institutions represented among the paper's authors, semicolon-separated,
   * open-ended (not a closed set like the six dimensions above). Not part
   * of any of the three spec files — added to let the Research Agendas
   * section (Task C) cross-correlate informal author-collaboration
   * clusters against formal institutional affiliation. Researched via web
   * search per paper, not fetched from a structured API; blank where no
   * confident affiliation was found (e.g. no stated affiliation, or an
   * institutional creator with no named authors).
   */
  institutions?: string[];
}

export type SubmissionStatus = "pending" | "approved" | "rejected";

/**
 * A source submitted through the contribute-a-source intake pipeline.
 * Never merged directly into the canon — see docs/las-canon-addendum.md,
 * Task F, for the intake -> tag -> queue -> review -> merge flow.
 */
export interface PendingSubmission extends CanonEntry {
  submitted_by: string;
  status: SubmissionStatus;
  /** Optional free-text context from whoever submitted the URL — not part
   * of the canon schema proper, dropped (or folded into `summary` by a
   * reviewer) if the submission is approved. */
  submitter_note?: string;
  /** Required when status is "rejected", so the same bad submission
   * isn't reconsidered from scratch. */
  rejection_reason?: string;
}
