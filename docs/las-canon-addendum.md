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

All 90 canon rows carry values on all six dimension columns, subject to the
empties named below.

### The full-text pass, 2026-09-01

One agent per paper read the paper and returned each value with a quoted
passage and a section pointer. Every value was checked against the closed set
in `lib/canon-schema.ts` before it was written. 89 of the 90 rows reached the
full text and are now `tag_confidence: full-text`. The 90th, "New Report
Analysing Multi-Agent Risks", is a 2,051-character announcement page whose
report sits behind a download link; it stays `summary-only`.

MEASURED, dimension coverage over the 90 rows:

| Dimension | Before | After |
|---|---|---|
| `system_type` | 36 | 71 |
| `participant_mix` | 90 | 89 |
| `observability` | 64 | 90 |
| `focus_area` | 90 | 90 |
| `threat_model` | 40 | 88 |

Filled dimension cells: 320 of 450 before, 428 of 450 after. 769 values added,
15 removed, 0 rows left with no value on any dimension.

### The 15 removals

A read removed an existing value only when the text contradicted it or no
passage stood behind it. Each removal names a passage or a named absence.

| Row | Dimension | Removed | Reason |
|---|---|---|---|
| A global comparison of social media bot and human characteristics | `observability` | agents observable | BotHunter scores tweet text, metadata and ego-network structure; no internals |
| AgentScope 1.0 | `focus_area` | Simulation | "simulation" occurs once, in a cited title; 1.0 is not the 0.x simulation framework |
| An Economy of AI Agents | `system_type` | labour market | The chapter puts labour markets out of scope in its second paragraph |
| Artificial Intelligence & Collusion | `threat_model` | Systemic Instability | The mechanism stabilises the market; the paper never returns to the chaos thread |
| Causal Emergence 2.0 | `participant_mix` | pure-AI | The objects are 8-state Markov chains; "agent" appears only in a reference title |
| Causal Emergence 2.0 | `threat_model` | Collective Superintelligence | Macro-beats-micro is about coarse-grained descriptions, not agent groups |
| Detecting Multi-Agent Collusion | `threat_model` | Systemic Instability | 0 hits for cascad/systemic/contagion/instabilit in the body |
| Generative AI as Economic Agents | `focus_area` | Simulation | Closed-form two-player games; the paper explicitly separates itself from simulation work |
| LLM Agents Grounded in Self-Reports | `system_type` | social network | 1,052 isolated agents; "social network" and "social media" absent from 86 pages |
| LLM economicus? | `system_type` | production economy | No firm, supply chain or marketplace; the framing is investor behaviour |
| Scenarios for the Transition to AGI | `threat_model` | Power Concentration | A representative agent owns all capital; distribution is listed as future work |
| The Moltbook Observatory Archive | `observability` | agents observable | The archive holds public profile metadata only |
| When Preferences Fail to Become Incentives | `observability` | agents observable | Utilities are fitted from pairwise choices; reasoning mode off, traces never read |
| zkLLM | `participant_mix` | pure-AI | Two parties, both human organisations; "agent" absent from the body |
| zkLLM | `observability` | agents observable | The scheme's purpose is that parameters stay concealed |

### What stays empty, and why

22 dimension cells of 450 hold no value after the pass. All are argued in the
per-paper output, each naming the value it came closest to using.

| Dimension | Empty | Cause |
|---|---|---|
| `system_type` | 19 | The four values name specific real-world systems. 19 papers study a multi-agent system that is none of them — a framework, a safety argument, a maths paper, a crypto protocol. |
| `threat_model` | 2 | AgentScope 1.0 and Causal Emergence 2.0 name no harm to any party. |
| `participant_mix` | 1 | Causal Emergence 2.0 models Markov chains, not agents. |

INFERRED: `system_type` is the binding constraint on coverage. A fifth value
covering a general-purpose multi-agent system would close most of the 19. That
is a schema change and has not been made.

NOT CHECKED: any assignment against a second independent reader. The n=1
per-paper read is the whole evidence base. Re-reading a sample of 10 and
comparing tags would give an error rate.

The evidence sits in `docs/canon-tag-evidence.json`: one object per row,
holding the fetched URL, how much of it was read, a quote and section pointer
for every value assigned, a reason for every dimension left empty, and the
removals. Nothing imports it and nothing renders it — it is a record, and it
holds quoted text from outside this site, so treat it as untrusted if anything
ever does read it (see `docs/untrusted-input.md`).

### `observability` on "Multi-Agent Risks from Advanced AI"

An earlier hand pass on 2026-09-01 left this dimension empty, on the grounds
that the 18 passages holding "interpretability", "white-box", "partially
observable" and "aggregate" all describe interpretability as a method or what
one agent observes of another. The full-text pass reversed that and assigned
all three values. Its evidence:

| Value | Passage |
|---|---|
| `agents observable` | §3.5.3 "Mutual Simulation and Transparency": "such agents are written in code that can – in theory – be read or understood by other agents" |
| `interactions observable` | §2.3.2: "To try to prevent collusion, we could monitor and constrain their communication" |
| `aggregates observable` | §3.2.3 "Evaluating and Monitoring Networks": "the frequency, proportion, and features of human-human, AI-human, and AI-AI interactions" |

OBSERVED: the earlier pass searched a term list that did not include §3.5.3's
own vocabulary, so it never opened the section whose whole argument is that an
agent's internals can be read by another agent. The paper hedges that section
("in theory", "has yet to find practical applications") and §3.1.3 states the
opposite case, black-box access to a sender. The tag stands on the section
being a named direction of the report.

The rule the earlier error produced still holds: **a term count is evidence
that a passage exists, not that the paper takes a position.** The correction
adds a second: **a term list is only as good as its coverage.** Read the
section headings, not only the hits.

## How broadly to tag

**Tag every dimension a paper supports, and leave one empty only when no value
on its closed list fits.** This reverses the narrow rule this section carried
until 2026-09-01, on the spec owner's instruction, given twice: first for
"Multi-Agent Risks from Advanced AI" ("I think multi-agent risk needs to show
up in all the categories it mentions"), then for the corpus ("please tag
everything with every box unless there's really no appropriate label — way too
many are missing tags").

The narrow rule's argument was that `/survey` renders `focus_area ×
threat_model` as a cross-tab, so a row tagged with everything appears in every
cell. MEASURED across the five non-`claim_type` dimensions, dimensions carried
per row, immediately before and after the full-text pass:

| Dimensions carried | Rows before | Rows after |
|---|---|---|
| 0 | 0 | 0 |
| 1 | 0 | 0 |
| 2 | 11 | 1 |
| 3 | 29 | 1 |
| 4 | 39 | 17 |
| 5 | 11 | 71 |

Median 4 before, 5 after. The "before" column is the state after the
summary-only fill earlier the same day, not the original tagging: that carried
a median of 2, with 3 rows at 0 and 1 row at 5.

A value still needs a passage behind it. Breadth is not permission to tag from
a title, a term count, or what a paper of that kind usually contains.

Each axis of the cross-table ends in a derived `Not tagged` value, so a paper
carrying nothing on a dimension lands in that row or column rather than falling
off the table. See `lib/canon-dimensions.ts`. Before that existed, 80 of the 90
rows were absent from the default view.

Nothing in this repo retags a canon row from a file. Airtable is the source of
truth, and no path pushes file edits back to it.

**Closed-set gaps:** `system_type` has one, above. Every other dimension found
a value on its closed list for every paper that needed one.

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
