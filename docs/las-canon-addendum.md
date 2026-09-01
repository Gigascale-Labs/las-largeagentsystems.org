# LAS Canon & Site — Implementation Notes

Implementation record reconciling three spec documents against the real
45-paper canon (`data/las-canon.csv`, supplied mid-implementation as
`LAS_sources`):

- `las-canon-dimension-tagging-spec.md` — the original Task A: five
  dimension columns (`system_type`, `participant_mix`, `observability`,
  `focus_area`, `threat_model`), no `claim_type`.
- `las-canon-and-open-problems-spec.md` — a later revision covering Tasks
  A-D: Task A already includes a sixth `claim_type` column, plus Tasks B
  (Open Questions synthesis), C (research-agenda clustering), D (heatmap).
- The canon addendum (implemented first, before the two files above were
  available) — adds its own `claim_type` amendment to Task A, plus Tasks
  C, D, E (Foundational Works), F (Contribute-a-Source), and a Disciplines
  caveat correction.

The addendum names `las-canon-and-open-problems-spec.md` as what it
supplements, but was evidently written against an earlier state of that
file (5 dimensions, no Tasks C/D yet) — the two documents disagree on one
column and on a clustering threshold. Both conflicts are called out below
along with which definition this repo uses.

## Task A: six-dimension tagging

All 45 corpus entries are tagged across all six dimension columns plus
`tag_confidence`, in `data/las-canon.csv`. Tagging was done from the
`summary` field (title/summary/tags), not by fetching each paper's full
abstract — so every row is `tag_confidence: summary-only`. `full-text`
tagging (per the dimension-tagging spec's methodology) is a follow-up
pass, not done here.

**`claim_type` conflict.** The two base-spec files define this column
differently:

- Canon addendum (used here): 9-value paper-type taxonomy —
  `theoretical/conceptual framework`, `empirical study`,
  `survey/taxonomy`, `proposed method/system`, `position/opinion`,
  `threat model articulation`, `policy/regulatory analysis`,
  `dataset/tool`, `live deployment`.
- `las-canon-and-open-problems-spec.md`: 4-value argument-structure
  taxonomy — `diagnosis`, `mechanism`, `evidence`, `policy` — explicitly
  designed so a paper can carry several at once (e.g. diagnose a problem
  *and* propose a mechanism for it).

Confirmed with the spec owner: the 9-value addendum scheme is
authoritative. `lib/canon-schema.ts` and `data/las-canon.csv` use it. The
4-value scheme is not implemented as a separate column.

**Flagged rows** (no value in any of the five non-`claim_type` dimensions, per
both specs' flagging requirement): none, as of 2026-09-01.

"Multi-Agent Risks from Advanced AI" was the one flagged row, on the grounds
that a field-level survey describes no single system type, observability
regime or named threat. It carries 11 values as of 2026-09-01:

| Dimension | Values | Evidence |
|---|---|---|
| `system_type` | production economy, social network, financial system | Worked examples: the 2010 flash crash (§3.2.2, §3.4.2), moderation bots (§3.6.2), trading and markets throughout |
| `participant_mix` | pure-AI, mixed human+AI | Agent-to-agent risk throughout; principal-agent framing, 16 uses of "principal" |
| `observability` | none | See below |
| `focus_area` | Monitoring, Steering, Simulation | §4.2 Governance; the Directions subsection of each of §3.1–3.7 |
| `threat_model` | Systemic Instability, Partially Observable Systems, Emergent Goals | §3.4 Destabilising Dynamics, §3.1 Information Asymmetries, §3.6 Emergent Agency |
| `claim_type` | survey/taxonomy | unchanged |

`labour market` and `Outdated Models` are absent from the paper: 0 hits for
either across 433,843 characters.

**`observability` stays empty, and it is worth writing down why**, because a
term count said otherwise. The full text holds 12 uses of "interpretability",
2 of "white-box", 2 of "partially observable" and 2 of "aggregate". Reading all
18 passages: every one is about interpretability as a *method*, or about what
one agent observes of another. None places a system at an observability level,
which is what this dimension records. One passage argues against the tag the
count suggested — that single-agent interpretability methods "might not be
easily applied to group-level emergent goals".

INFERRED from that: a term count is evidence that a passage exists, not that
the paper takes a position. Read the passages before tagging from a count.

## How broadly to tag a survey

The rule the row above follows: **tag what a paper is the source for, not what
it mentions.** `/survey` renders the dimensions as a `focus_area × threat_model`
cross-tab that a reader clicks to filter, so a row tagged with everything
appears in every cell — noise in every query rather than signal in one.

MEASURED 2026-09-01 over the 90 canon rows, dimensions carried per row out of
the five non-`claim_type` ones:

| Dimensions | Rows |
|---|---|
| 0 | 3 |
| 1 | 22 |
| 2 | 34 |
| 3 | 15 |
| 4 | 15 |
| 5 | 1 |

Median 2. The nine `survey/taxonomy` rows carry 0 to 3, none more, and no row
in the canon carries more than 2 threat models. The closest precedent is the
sibling row "New Report Analysing Multi-Agent Risks", a write-up of this same
report, which carries one dimension: `participant_mix = pure-AI`.

If a paper needs to be findable for a reason the dimensions do not capture,
`tags` is the lever. It is free text, and it already reads `Surveys` on this
row.

Tagging narrowly does not hide a paper. Each axis of the cross-table ends in a
derived `Not tagged` value, so a paper carrying nothing on a dimension lands in
that row or column rather than falling off the table. See
`lib/canon-dimensions.ts`. Before that existed, 80 of the 90 rows were absent
from the default view.

Nothing in this repo retags a canon row from a file. Airtable is the source of
truth, and no path pushes file edits back to it.

**Closed-set gaps:** none encountered — every paper that needed a
dimension value found one already on a closed list.

## Task B: Cross-Cutting Open Problems Synthesis

Out of scope here — `las-canon-and-open-problems-spec.md` requires a
hand-picked core-paper list ("researcher already has candidates in
mind... confirm final list before running") that hasn't been supplied.
The current `OpenQuestions` component on the site is still placeholder
copy; this task is unblocked once that list arrives.

## Task C: Research Agendas — threshold correction

`las-canon-and-open-problems-spec.md`'s Task C sets the clustering rule
as "any set of ≥2 papers in the canon sharing ≥2 authors," and explicitly
requires reporting rather than silently adjusting the threshold, and
flagging borderline cases rather than silently including or excluding
them. The first implementation of `app/components/research-agendas.tsx`
used a looser rule (any single author appearing on 2+ papers), which
doesn't match this. Corrected:

**Clusters (≥2 shared authors, ≥2 shared papers):**

1. **Tomašev, Franklin & Osindero** (4 papers, 3 shared authors) — Virtual
   Agent Economies, AI Agent Traps, Intelligent AI Delegation,
   Distributional AGI Safety.
2. **Bisconti, Galisai, Pierucci, Bracale & Prandi** (2 papers, 5 shared
   authors) — Beyond Single-Agent Safety (ESRH), Agentic Microphysics.
3. **Lewis Hammond & Alan Chan** (2 papers, 2 shared authors) —
   Multi-Agent Risks from Advanced AI, IDs for AI Systems.

**Flagged as borderline, not shown as clusters:** Hammond's third paper
(Habermolt) shares only Hammond, not Chan, with the pair above — one
shared author, not two. Noam Kolt and David Krueger each co-author IDs
for AI Systems and one further paper (Regulating AI Agents; Gradual
Disempowerment, respectively), but share only themselves — not a second
author — across the pair, so neither qualifies as a 2-shared-author
cluster on its own. All three are noted in the site component rather than
either folded into a cluster or dropped silently.

These clusters cover the two named as illustrative examples in the canon
addendum (1 and 2 above), confirming that the ≥2-shared-authors rule
still finds them; the difference from the addendum's looser rule only
shows up in the smaller, single-author bridge cases.

### Institutional cross-correlation (not in any of the three specs)

Added on request: each cluster's authors were cross-checked against their
institutional affiliations (researched per paper via web search, since
none of the three specs track this — it's a new `institutions` column on
`CanonEntry`, paper-level and open-ended rather than a closed taxonomy).
The result distinguishes two different kinds of "cluster":

- **Tomašev, Franklin & Osindero** and **Bisconti, Galisai, Pierucci,
  Bracale & Prandi** are each **single-institution** clusters — Google
  DeepMind and DEXAI – Icaro Lab respectively. The informal
  (co-authorship) and formal (institutional) groupings are identical here:
  one lab's output, in sequence.
- **Lewis Hammond & Alan Chan** is **cross-institutional** — Hammond
  (Cooperative AI Foundation) and Chan (Centre for the Governance of AI)
  collaborate across two separate organizations. The informal
  collaboration graph catches something the institutional view alone
  would miss: two different labs choosing to co-publish, not one lab's
  internal output.
- The borderline bridges (Kolt, Krueger) both run through **IDs for AI
  Systems**, which is itself a ten-author, multi-institution coalition
  paper (GovAI, Cooperative AI Foundation, Cambridge, Toronto, and
  others) — explaining why it bridges to otherwise-unconnected authors
  rather than anchoring a tight single-lab cluster the way the two clean
  clusters above do.

Institution data is web-search-sourced per paper, not from a structured
API (OpenAlex and Semantic Scholar's APIs weren't reachable from this
environment), and is left blank for 4 papers where no confident
affiliation was found (an MDPI paper with no stated affiliation, and the
three no-creator live-system/homepage entries). Not exhaustive across all
45 papers' full author lists — verified at the level needed to place each
paper's primary institution(s), not every co-author's.

## Task D: Dimension Heatmap (spec only, not implemented)

Functional requirement, recorded for whoever builds the interface later.
Reconciles the addendum's version with `las-canon-and-open-problems-spec.md`'s
Task D, which adds one detail the addendum didn't mention:

- User selects two dimensions from `system_type`, `participant_mix`,
  `observability`, `focus_area`, `threat_model`, `claim_type`, **plus the
  free-text `tags` column as a seventh option** (more granular than any
  single closed dimension).
- Grid: rows = dimension 1 values, columns = dimension 2 values, cell =
  count of papers carrying both values. A paper with multiple values in
  either dimension counts toward every cell its values touch.
- Cell shading by count, so sparse/empty cells are visually distinct from
  populated ones or a loading state.
- Clicking a cell surfaces the matching paper list via the same query
  logic as the Task A filter table — not a second, separately-built
  system.
- Open: exact page placement, and tech stack (depends on the still-unresolved
  choice for the rest of the site), and default dimension pair on load.

## Task E: Foundational Works — gate checked, still blocked

Now that all five base dimensions are tagged, the gate is actually
checkable (previously it wasn't, because none of the three dimensions
existed). Per-value counts across the 45-paper corpus:

- **`focus_area` — passes.** Monitoring 6, Steering 5, Simulation 11,
  Redesign 3. Every value clears the 2-3 paper minimum.
- **`system_type` — passes.** Production economy 3, social network 11,
  labour market 3, financial system 3. Every value clears the minimum.
- **`threat_model` — fails.** Systemic Instability 4, Collective
  Superintelligence 3, Inequality 2, but **Gradual Disempowerment 1**,
  **Power Concentration 1**, and **Partially Observable Systems 0** /
  **Outdated Models 0** — four of seven values are under-represented.

Per the addendum's gate rule, any under-represented value blocks
proceeding to citation ranking. `threat_model` fails, so Task E stays
blocked overall — but the failure is now specific rather than a blanket
"no data yet": the targeted-expansion step (search for known/likely
foundational papers specifically in Partially Observable Systems,
Outdated Models, Gradual Disempowerment, and Power Concentration) is the
concrete next step, not run as part of this change since it means adding
new papers to the canon — a curation decision worth its own pass rather
than folding into a schema-reconciliation change.

## Task F: Contribute-a-Source Intake (backend design)

Unchanged by this reconciliation. `lib/canon-schema.ts`'s
`PendingSubmission` type now also carries `tag_confidence`, inherited
from the corrected `CanonEntry` shape.

## Disciplines caveat correction

Unchanged — see the code comment in `app/components/disciplines.tsx`.
