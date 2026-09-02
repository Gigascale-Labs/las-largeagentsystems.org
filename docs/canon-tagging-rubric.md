# Canon tagging rubric

The definitions a tagger works from. This file is the source: `AGENTS.md`
points at it, and every pass over the canon since 2026-09-02 has used it.

An agent tagging a paper should be given this file and told to follow it. That
is what "the autotagger" is — there is no tagging service in this repo. The
pipeline that screens new arXiv papers lives in `las-new-papers` and does not
assign these dimensions; a reviewer does, through Airtable.

## Two rules that override everything below

**1. Read the paper. Quote the passage.** Every value carries a quote copied
from the source and a section pointer. A term count is evidence that a passage
exists, not that the paper takes a position, and a term list is only as good as
its coverage — read the section headings, not only the hits. Both of those
rules were bought with an error; `las-canon-addendum.md` records them.

**2. A value applies only if its topic is a main setting of the paper, or
appears at heading level.** At least one must hold:

- the topic names a section or subsection heading, the abstract, or the title
- the topic is where the paper's experiments, model, or data live
- the topic is what the paper's central argument is about

These do not clear it: a topic in a motivation list, in a related-work sentence
about someone else's work, in a future-work or limitations line, or a term that
recurs but is never the thing under study.

**Exception: surveys.** A row whose `claim_type` is `survey/taxonomy` may be
tagged with what it surveys, tested against its own section headings.

## system_type — the real-world system the paper is about

| Value | The paper is about |
|---|---|
| `production economy` | firms, supply chains, production of goods or services, corporate operations, an economy of producing agents, task or service marketplaces |
| `social network` | social media, online platforms, opinion or information diffusion, agent societies with social ties, forums, recommendation feeds |
| `labour market` | employment, jobs, wages, hiring, worker displacement, the labour transition |
| `financial system` | trading, markets, banking, credit, insurance, price setting, financial stability, collusion on price |
| `general purpose` | a system of two or more AI agents that is none of the four above |

`general purpose` is the fallback, filled only when none of the four fits AND
the paper is about a system of two or more AI agents. A paper about a single
model alone, a non-agent mathematical object, or a two-party protocol between
organisations leaves `system_type` empty. The full two-part test is in
`las-canon-addendum.md`, "The `general purpose` system type".

## participant_mix — who is in the system

| Value | Tag when |
|---|---|
| `pure-AI` | agents interact with other agents, no human in the interaction loop |
| `hybrid - human, AI, other` | humans are in the loop, or the system mixes agents with humans or with non-AI components |

## The three observability columns

One ordinal scale, recorded once per viewer. **Exactly one value per column.**

| Value | reasoning | agents | interactions | aggregates |
|---|---|---|---|---|
| `fully observable - reasoning, agents, and interactions` | yes | yes | yes | yes |
| `partially observable - agents and interactions only` | no | yes | yes | yes |
| `partially observable - interactions only` | no | no | yes | yes |
| `partially observable - aggregates only` | no | no | no | yes |
| `unobservable - neither reasoning, agents, interactions, nor aggregates` | no | no | no | no |

What each thing means: **reasoning** is chain of thought, scratchpads, internal
states, activations, weights. **agents** is which agents exist, their identity,
configuration, prompts, source code. **interactions** is the messages, actions
or transactions between them. **aggregates** is population-level statistics
only.

| Column | Who | The question |
|---|---|---|
| `participant_observability` | one participant inside the system | What can one agent see of the others? |
| `operator_observability` | whoever runs or deploys it | What can the operator or experimenter see? |
| `public_observability` | anyone outside | What can an outsider, auditor or regulator see? |

In a paper that runs its own experiment the authors are the operator: if they
log every message and every chain of thought, `operator_observability` is
`fully observable`.

`unobservable` is a positive claim that a viewer sees nothing, used when the
paper's argument or design turns on it. It is not a synonym for "the paper does
not say" — that is an empty column, with the reason recorded.

These columns are read off the paper's own setting, so the heading-level
threshold does not gate them. What gates them is whether a passage establishes
what that viewer can see.

## focus_area — what the paper does

| Value | Tag when the paper |
|---|---|
| `Monitoring` | observes, measures, evaluates, detects, audits, benchmarks, or documents behaviour |
| `Steering` | intervenes to change a system's behaviour: governance, regulation, incentives, control |
| `Simulation` | builds or uses a simulated population of agents, an agent-based model, or a synthetic society |
| `Redesign` | proposes changing an existing institution, market, protocol, or piece of infrastructure |
| `Design` | designs a new agent system, framework, protocol, architecture, or standard |

Usually one or two values, not five. A paper that runs experiments and then has
a two-paragraph "policy implications" section is `Monitoring`, not `Monitoring`
plus `Steering`.

## threat_model — the harm the paper articulates, analyses or evidences

| Value | The paper is about |
|---|---|
| `Gradual Disempowerment` | humans progressively losing influence over societal systems as AI substitutes for human roles |
| `Systemic Instability` | cascades, flash crashes, correlated failure, contagion, destabilising feedback, monoculture fragility |
| `Inequality` | benefits, harms, or power distributed unequally across people or groups |
| `Collective Superintelligence` | groups of agents exceeding individual or human capability by acting collectively |
| `Partially Observable Systems` | humans or principals unable to see what agents are doing: information asymmetry, hidden coordination, opaque collusion |
| `Power Concentration` | control over AI or over a system concentrating in few hands |
| `Outdated Models` | a model valid on a human or pre-AI algorithmic system is no longer valid with AI in the mix, because AI violates its assumptions — see below |
| `Emergent Goals` | goals or objectives arising at the group level that no individual agent holds |

### `Outdated Models` has its own four tests

This value was the loosest on the list. Before 2026-09-02 it read "models,
regulations or institutions failing to keep pace", and 55 of the 90 canon rows
carried it — more than any other threat model, and more than half the corpus. A
label that broad selects nothing.

**It applies when the paper identifies a model that was valid on an existing
human or algorithmic system, and shows it is no longer valid with AI in the
mix, because AI violates its assumptions.**

"Model" is broad: an economic model, a forecasting model, a detection
algorithm, a stress test, an evaluation method, a statistical assumption, a
legal test, a regulatory framework, a professional mental model. What matters
is the shape of the argument, not the kind of thing.

All four must hold.

| # | Test | You must be able to |
|---|---|---|
| 1 | a named model | point to the specific model, method, law or framework |
| 2 | prior validity | show the paper treats it as having worked, or been appropriate, for humans or pre-AI algorithmic systems |
| 3 | a violated assumption | name the assumption AI agents break — the paper must identify it, not merely imply things are harder now |
| 4 | consequent invalidity | show the paper concludes it now gives wrong answers, misses what it was built to catch, or no longer holds |

Test 3 does the work. "This is difficult", "this is new" and "nobody has
studied it" are not violated assumptions.

**What this is not.** Each of these was tagged under the old definition:

| Pattern | Wording that gave it away | Why it fails |
|---|---|---|
| a research gap | "methods for characterizing agent types are largely absent from current research" | nothing was valid and then stopped being; it never existed |
| a call for new work | "we will need new methods and theories" | no model is identified as invalidated |
| regulatory lag by date | "promulgated prior to the development of AI agents" | names a date, not an assumption |
| bare insufficiency | "current approaches are insufficient for agentic systems" | no prior validity, no named assumption |
| an arms race | "bots evolve faster than bot detection" | continuous escalation, not an assumption falsified |
| the paper's own novelty pitch | "we introduce a new framework" | proposing better is not showing the old one violated |
| a limitation of the paper itself | "our evaluations may stop working soon" | about this work, not a model of the world |

**Three shapes that pass**, each drawn from a row that holds the value:

| Shape | The row | The assumption AI violates |
|---|---|---|
| an instrument calibrated on humans | Meng & Chen, systemic risk | correlated-signal models assume agent precision is exogenous and time-invariant; AI degrades human skill endogenously, so hysteresis is no longer zero |
| a legal test built around human conduct | Ezrachi & Stucke, AI & collusion | antitrust assumes supra-competitive pricing requires an agreement between humans; self-learning algorithms reach it with neither agreement nor intent |
| a safety method built for one model | Beyond Single-Agent Safety | "these mechanisms assume a dyadic setting: one model responding to one user under stable oversight" |

Prior validity is where most candidates fail. If the model being refuted is
itself an AI method — an alignment technique, an LLM evaluation, an assumption
about LLM diversity — it was never valid on a human or pre-AI algorithmic
system, and test 2 fails. That removed 32 rows on 2026-09-02.

## claim_type — check, do not extend

| Value |
|---|
| `theoretical/conceptual framework`, `empirical study`, `survey/taxonomy`, `proposed method/system`, `position/opinion`, `threat model articulation`, `policy/regulatory analysis`, `dataset/tool`, `live deployment` |

Report it only if an existing value is clearly wrong.

## Output

Record, per row: every value with a quote of 8 to 40 words copied from the
source and a section pointer; a reason for every dimension left empty; and the
values considered and rejected, with the passage that failed the test.
`docs/canon-tag-evidence.json` is the accumulated record and shows the shape.

Rejected values are worth writing down. They are what lets a dropped label be
argued back rather than rediscovered, and they are how the 2026-09-02 pass
found four rows that the previous definition of `Outdated Models` had excluded.
