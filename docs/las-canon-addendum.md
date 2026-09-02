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

8 dimension cells of 450 hold no value. All are argued in the per-paper output,
each naming the value it came closest to using.

| Dimension | Empty | Cause |
|---|---|---|
| `system_type` | 5 | The rows are not about a system of AI agents. See the next section. |
| `threat_model` | 2 | AgentScope 1.0 and Causal Emergence 2.0 name no harm to any party. |
| `participant_mix` | 1 | Causal Emergence 2.0 models Markov chains, not agents. |

The full-text pass left 19 `system_type` cells empty. A fifth value, `general
purpose`, closed 14 of them; the remaining 5 are the ones that value must not
absorb.

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

## The `general purpose` system type

`system_type` records **the real-world system a paper is about**. Four values
name a specific domain. The fifth, `general purpose`, is the fallback.

**Fill `general purpose` only if none of the four named systems fits.** It is
never a second value beside one of them, and it is not a catch-all: a row that
is not about a system of AI agents at all leaves `system_type` empty instead.

### The two-part test

Both parts must hold.

**Part 1 — none of the four fits.** Name the closest of the four and the
passage that fails to support it. If one of the four fits, use it and stop.

| Value | The paper is about |
|---|---|
| `production economy` | firms, supply chains, production of goods or services, corporate operations, an economy of producing agents, task or service marketplaces |
| `social network` | social media, online platforms, opinion or information diffusion, agent societies with social ties, forums, recommendation feeds |
| `labour market` | employment, jobs, wages, hiring, worker displacement, the labour transition |
| `financial system` | trading, markets, banking, credit, insurance, price setting, financial stability, collusion on price |

**Part 2 — the paper is about a system of two or more AI agents.** The object
of study is a population, network, deployment, pipeline, framework, protocol,
benchmark, or governance regime involving two or more AI agents or models, or
the mechanisms and risks that arise between them.

Part 2 counts:

- agents that talk to each other, or act on a shared environment
- a population of agents that do not talk, when the population is the object
- one model acting on another: an overseer and an overseen model, a teacher and
  a student, an attacker and a target
- a framework, protocol or standard built for such systems
- a governance or safety argument whose subject is such systems

Part 2 does not count, and the row leaves `system_type` **empty**:

- a single model studied on its own, including one human talking to one model
- a mathematical, physical or statistical object that is not an agent
- a protocol or legal argument between humans or organisations, where the model
  is the thing held rather than a participant
- a pipeline where a second model is only a measuring instrument, such as an LLM
  judge, and the object of study is the first model on its own

Empty means "this row is not about a system of AI agents". `general purpose`
means "it is, and the system is none of the four named domains". The two states
are different, and the difference is what keeps `general purpose` from becoming
the place every unclassified row lands.

### The pass that applied it, 2026-09-01

One agent per row re-read the paper and returned a verdict with a quoted
passage. All 19 agreed with Part 1. 14 took the value; 5 did not.

MEASURED, the clause of Part 2 that decided each of the 14:

| Clause | Rows |
|---|---|
| agents talk to each other or act on a shared environment | Agent Smith; Agentic AI Needs a Systems Theory; Differences in Alignment Behaviour; Emergent Coordination in Multi-Agent Language Models; Group size effects; OpenAI/Hugging Face incident |
| a framework, protocol or standard built for such systems | AgentScope 1.0; Very Large-Scale Multi-Agent Simulation in AgentScope |
| a governance or safety argument about such systems | Agent Properties for Safe Interactions; Beyond Single-Agent Safety; Scaling AI Safety for a Multi-Agent World |
| one model acting on another | Are we existentially threatened…; Language models transmit behavioural traits |
| a population of agents that do not talk | LLM Agents Grounded in Self-Reports |

The 5 that stayed empty, and the clause that excluded each:

| Row | Excluded by |
|---|---|
| Agentic Interpretability | one human talking to one model; 0 uses of "multi-agent" in the text |
| Causal Emergence 2.0 | a statistical object that is not an agent — 8-state Markov chains |
| Frontier AI Regulation | a legal argument between humans and organisations; its 24 uses of "agent" are biological agents |
| When Preferences Fail to Become Incentives | the LLM judge panel is a measuring instrument; the object is each actor model alone |
| zkLLM | a two-party protocol; the model is held, not a participant |

`system_type` coverage: 71 of 90 before the value existed, 85 of 90 after.
Filled dimension cells: 428 of 450, then 442 of 450.

NOT CHECKED: the 71 rows that already carried one of the four. This pass only
looked at rows holding nothing, so it cannot find a row that took a named value
it does not deserve.

## How broadly to tag

**A value applies only if its topic is a main setting of the paper, or appears
at heading level.** At least one must hold:

- the topic names a section or subsection heading, the abstract, or the title
- the topic is where the paper's experiments, model, or data live
- the topic is what the paper's central argument is about

These do not clear it: a topic in a motivation list, in a related-work sentence
about someone else's paper, in a future-work or limitations line, or a term that
recurs but is never the thing under study.

**Exception: surveys.** A row whose `claim_type` is `survey/taxonomy` may be
tagged with what it surveys, tested against its own section headings.

### The rule has now moved twice, and this is the third position

| Date | Rule | Set by |
|---|---|---|
| before 2026-09-01 | tag what a paper is the source for, not what it mentions | the original pass |
| 2026-09-01 | tag every dimension a paper supports; leave one empty only when no value fits | spec owner, twice |
| 2026-09-02 | main setting or heading level, surveys excepted | spec owner, with a worked example |

The 2026-09-01 broad pass produced rows carrying everything. The spec owner's
example: "On the Limits of Agency in Agent-Based Models" tagged `labour market`.

MEASURED after the 2026-09-02 reread, values on the four dimensions that
existed under both rules:

| Dimension | Broad pass | Threshold pass |
|---|---|---|
| `system_type` | 134 | 90 |
| `participant_mix` | 140 | 114 |
| `focus_area` | 269 | 172 |
| `threat_model` | 344 | 229 |
| total | 887 | 605 |

488 values were considered and recorded as below threshold, each with the
passage that failed the test. They are in `docs/canon-tag-evidence.json` under
`below_threshold`, so a dropped value can be argued back rather than
rediscovered.

### The worked example kept its label

OBSERVED: the reread kept `labour market` on "On the Limits of Agency in
Agent-Based Models", against the spec owner's instinct. The paper simulates
8.4 million agents in New York City, and §4 couples disease spread to a labour
model: "We simulate dynamics of disease spread and labor market in New York
City from December 2020 to April 2021". Unemployment is one of the two error
metrics in Table 1. That is a main setting, not a mention.

Seven other values on that row did not survive: `Monitoring`, `Steering`,
`hybrid - human, AI, other`, `social network`, `general purpose`, `Inequality`,
`Collective Superintelligence`. The row went from 11 values to 8, of which 3 are
observability levels that did not exist before.

INFERRED: the row read as over-tagged because it was, on seven counts. The one
value that drew the complaint is the one with a section behind it. NOT CHECKED
with the spec owner, who may still want it gone; `below_threshold` records the
reasoning either way.

## Observability: one scale, three viewers

`observability` held `aggregates observable`, `interactions observable` and
`agents observable`, tagged together. Two faults. The three were treated as
independent tags, so a row could assert that agent internals were visible and
that only population aggregates were. MEASURED over the 90 rows before the
recoding: 13 carried one value, 23 carried two, and 54 carried all three. A
column where 60 percent of rows hold every value separates nothing. And it
never said who could see.

It is now one ordinal scale, recorded once per viewer, one value each.

| Step | reasoning | agents | interactions | aggregates |
|---|---|---|---|---|
| `fully observable - reasoning, agents, and interactions` | yes | yes | yes | yes |
| `partially observable - agents and interactions only` | no | yes | yes | yes |
| `partially observable - interactions only` | no | no | yes | yes |
| `partially observable - aggregates only` | no | no | no | yes |
| `unobservable - neither reasoning, agents, interactions, nor aggregates` | no | no | no | no |

| Column | Who | The question |
|---|---|---|
| `participant_observability` | one participant inside the system | What can one agent see of the others? |
| `operator_observability` | whoever runs or deploys it | What can the operator or experimenter see? |
| `public_observability` | anyone outside | What can an outsider, auditor or regulator see? |

MEASURED over the 90 rows:

| Level | participant | operator | public |
|---|---|---|---|
| fully observable | 1 | 42 | 4 |
| agents and interactions only | 25 | 36 | 15 |
| interactions only | 35 | 3 | 12 |
| aggregates only | 13 | 2 | 17 |
| unobservable | 5 | 0 | 2 |
| empty | 11 | 7 | 40 |

OBSERVED: the three columns separate cleanly. The operator sees most — 42 rows
fully observable, mostly papers whose authors ran the experiment and logged
every message and chain of thought. Participants see less, concentrated on
`interactions only`. The public sees least: 40 rows establish nothing about an
outside view, and of those that do, `aggregates only` is the mode. A single
column could not have shown any of that.

`unobservable` is a positive claim that a viewer sees nothing, not a synonym for
"the paper does not say". Empty is the second one.

## `Outdated Models` narrowed, 2026-09-02

The value read "models, regulations, institutions or human mental models
failing to keep pace with what they describe or govern". Under that reading it
landed on **55 of the 90 rows** — more than any other threat model, and more
than half the corpus. A label carried by 61 percent of a corpus selects
nothing.

It now reads: **the paper identifies a model that was valid on an existing
human or algorithmic system, and shows it is no longer valid with AI in the
mix, because AI violates its assumptions.** Four tests, all required, in
`docs/canon-tagging-rubric.md`: a named model, prior validity, a violated
assumption, consequent invalidity.

One agent per paper reread all 90 against the new tests. MEASURED:

| Outcome | Rows |
|---|---|
| kept the label | 23 |
| removed | 32 |
| added | 4 |
| stayed off | 31 |
| **carrying it, before → after** | **55 → 27** |

### Test 2 is what did the removing

Prior validity, not the violated assumption, is where most of the 32 failed.
When the model being refuted is itself an AI method — an alignment technique,
an LLM evaluation, an assumption about LLM diversity — it was never valid on a
human or pre-AI algorithmic system, so nothing was invalidated by AI entering.
"Correlated Errors in Large Language Models" is the clean case: it refutes the
assumption that model diversity buys error independence, but that assumption
was always about LLMs.

The rest failed on the patterns tabled in the rubric: research gaps, calls for
new work, regulatory lag stated as a date, bare insufficiency, arms races, a
paper's own novelty pitch, and limitations of the paper itself.

### It added four rows as well as removing thirty-two

The new definition is not simply narrower — it is a different shape, so it
reaches papers the old one missed. Four rows gained the label: "AI agents can
coordinate beyond human scale" (Dunbar-style bounds on consensus group size
assume cognitive limits that LLMs do not have), "Emergent social conventions
and collective bias in LLM populations", "New Report Analysing Multi-Agent
Risks", and "Retrieval Collapses When AI Pollutes the Web" (BM25 and neural
rankers assume coherence and fluency separate quality from spam).

### The worked example

"On the Limits of Agency in Agent-Based Models" lost the label. Its passage was
the Lucas Critique — that historical data cannot predict behaviour under a new
policy. That is the classic policy-change critique, and it names no assumption
that AI violates. It would have failed test 3 in 1976.

### The front page changed with it

`app/components/threat-models.tsx` quoted a magnitude from Meng & Chen — tail
loss of 18-54 percent against Basel III buffers. A magnitude is a finding, not
the threat. The card now quotes Theorem 3.15 from the same paper, which is the
threat: standard correlated-signal models assume agent precision is exogenous
and time-invariant, AI makes it endogenous through skill degradation, and the
models' prediction of zero hysteresis stops holding. Verified character for
character against the source.

### Where the definitions live now

`docs/canon-tagging-rubric.md`. Before this, the working definitions existed
only in the prompt each tagging pass was given, which is why the value drifted:
nothing in the repo said what it meant. `AGENTS.md` routes a tagger there and
`docs/airtable-spec-for-ai.md` points at it from the choice lists.

## `participant_mix` renamed

`mixed human+AI` is now `hybrid - human, AI, other`. Same meaning, and the new
name covers the case the old one did not: a system mixing agents with non-AI
components rather than only with humans. `pure-AI` is unchanged. Canon reads 59
`pure-AI` and 55 `hybrid - human, AI, other` after the pass.

The rename is an append, not a rename, because Airtable's API will not modify
an existing select field's choices — 422 on every shape tried, n=5, with the
schema scope present. `docs/airtable-spec-for-ai.md` has the measurements.
`mixed human+AI` therefore survives on the choice list with 0 rows using it,
until someone removes it in the UI.

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
