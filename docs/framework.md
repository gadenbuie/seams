# Framework guide

The practical companion to the [constitution](constitution.md). It defines artifact contracts,
proportionate workflows, bounded-context work, replaceable trackers, and recovery patterns.

seams is project-neutral. Adapt names and storage to the host project; preserve authority
boundaries. For research and intellectual lineage, see
[supporting evidence](supporting-evidence.md). For focused procedures, use the
[skills](../README.md#start-here) rather than loading this entire guide for every task.

## 1. Authority and lifecycle

| Kind of statement                  | Home                                       | What it authorizes                                    | Lifetime                             |
| :--------------------------------- | :----------------------------------------- | :---------------------------------------------------- | :----------------------------------- |
| Purpose and desired outcomes       | Vision                                     | Choosing and evaluating directions                    | Until direction changes              |
| Plausible future change            | Vision, project plan, or notes             | Evaluating direction or boundaries; no implementation | Until selected, rejected, or revised |
| Exploratory question and evidence  | Exploration record, linked to tracked work | Further investigation and shaping; no implementation  | As useful non-normative context      |
| Reusable decision strategy         | Principles                                 | Resolving a class of choices                          | Until experience improves it         |
| System-wide rule or boundary       | Design                                     | Requiring conformance in selected work                | Until deliberately changed           |
| Capability behavior and ownership  | Component contract                         | Implementing and reviewing that capability            | While the commitment remains         |
| Reason for a significant choice    | Decision record                            | Understanding and revisiting the choice               | Historical; may be superseded        |
| Selected outcome and acceptance    | Work record                                | Implementing the stated scope                         | Until completed or abandoned         |
| Sequence, progress, discoveries    | Same work record                           | Coordinating and resuming selected work               | Temporary                            |
| Research and rejected explorations | Notes or exploration records               | Informing future judgment; no conformance             | As useful background                 |
| Observable implementation          | Code and tests                             | Claiming what exists and works                        | Current reality                      |

A small project can combine artifacts if their authority remains explicit. Split them when mixed
authority starts causing mistakes. Do not create a parallel status system when a tracker already
owns status.

## 2. Artifact contracts

### 2.1 Agent entry point: orientation and routing

**Question:** How do I work here safely and find the information this task needs?

Include a short project description, repository map, task-relevant reading paths, setup and
verification commands, safety boundaries, authority rules, and the **chosen work tracker and its
adapter**. `AGENTS.md` is a common entry point, not a requirement.

Exclude feature catalogs, architecture essays, and duplicated specifications. This file is loaded
often, so every line should regularly change an agent's behavior.

A worker should be able to answer: **What is my task? Which few files govern it? What may I change?
Where do I record progress? How will my work be judged?** Put role-specific procedure in the
relevant skill, not in every worker's mandatory reading.

### 2.2 Vision: direction and possibility

**Question:** What future are we aiming toward, and what possibilities should we preserve?

Include purpose, users, desired outcomes, capability themes, explicit non-goals, and change cases
that should inform architectural evaluation. A vision entry is not a requirement, priority,
estimate, or promise. Raw ideas may remain in notes until coherent enough to inform direction.

### 2.3 Principles: decision-resolution strategies

**Question:** When several approaches could work, which considerations should decide?

Include reusable strategies, the tension each resolves, and guidance for applying it. Prefer
"preserve useful behavior when a dependency fails" over a particular endpoint's error payload.
Project-specific mechanisms and exact thresholds belong in the relevant contract.

### 2.4 Design: the system contract

**Question:** What have we decided must be true of the system?

Include the minimum durable, cross-work-item contract:

- fixed constraints and external context;
- architectural boundaries and ownership;
- cross-component interfaces and invariants;
- data ownership and consistency rules;
- security, failure, and operational behavior;
- quality requirements and their verification approach; and
- dependencies or technologies whose choice constrains future work.

Exclude unselected feature catalogs, execution order, implementation status, exploratory options,
detailed internal algorithms with no external consequence, and lengthy rejected alternatives. Link
to component contracts and decision records instead of reproducing them.

### 2.5 Component contracts: local commitments

**Question:** What must this selected capability or component do, and what does it own?

Create one when a capability is selected or a durable boundary needs more detail than the system
contract should hold. It may live beside the component or in another predictable location.

Include only the necessary subset of purpose and scope, observable behavior, owned state and
invariants, public interfaces, dependencies, failure and operational behavior, and acceptance and
verification requirements.

A component contract can be committed before implementation. That makes it a design commitment, not
a delivery commitment or evidence of completion.

### 2.6 Decision records: significant rationale

**Question:** Why was this consequential choice made, and what would justify revisiting it?

Use a short record when a choice is expensive to reverse, has non-obvious tradeoffs, or is likely to
be questioned later. Record context, options where useful, the decision, consequences, and
revisiting conditions. Do not create one for every local implementation choice.

A decision record explains history; it is not a second current specification. When a decision
changes, update the governing contract in the same change and mark the old record superseded where
appropriate.

### 2.7 Work records: selected outcomes and execution

**Question:** What are we doing now, and how will we prove it?

A work record is the bridge between direction and implementation. Its storage belongs to the chosen
[tracker adapter](#4-work-records-and-replaceable-trackers). Include enough of:

- selected objective and why it matters;
- scope, non-goals, and relevant contracts;
- exploration findings and decisions that affect implementation;
- risks, unknowns, and any spike needed to resolve them;
- verifiable units, actual dependencies, and acceptance evidence;
- progress, discoveries, open questions, and handoffs; and
- final outcome and documentation reconciliation.

A small, well-understood change may need only a short issue with expected behavior and acceptance. A
complex outcome may need linked design artifacts and a durable execution plan. Scale the record to
coordination needs, not ceremony.

### 2.8 Exploration and notes: non-normative context

**Question:** What have we learned, and what might help a future decision?

Use an exploration record for pre-design investigation, a note for general research, or both when
they serve different needs. An exploration record can be a linked Markdown note, tracker issue,
document, or attachment. A `docs/explorations/` directory is convenient, not mandatory.

Keep the question and scope, verified findings with evidence, assumptions, candidate approaches and
tradeoffs, design implications as hypotheses, unresolved questions, and the next useful action.
Distinguish observation from inference. Link prototypes and experiments rather than implying they
are production behavior.

Exploration may itself be selected and tracked. Closing it means the investigation is complete; it
does not select a solution or authorize implementation. When shaping resumes, cite the useful
findings and promote conclusions explicitly. Do not copy the entire exploration into design.

## 3. Stable documents, temporary work, and project plans

Stable named documents are updated in place. Work records follow the lifecycle and naming rules of
their tracker. Completed work remains historical and does not become a durable contract through
detail or recency.

A **project plan** is not a special authority tier. Classify its contents:

- direction and change cases belong in vision;
- committed constraints belong in design;
- significant rationale belongs in decision records;
- selected outcomes, sequence, and status belong in the tracker; and
- options, research, and uncertain futures remain non-normative.

A roadmap or parent issue can group possibilities without selecting them all. Record the selection
boundary explicitly: "this plan authorizes only X" or "these are candidates; the operator selects
each outcome." Never infer delivery commitment from a plan's completeness.

## 4. Work records and replaceable trackers

The work record is a required information role; its storage is a replaceable implementation choice.
A project may use kata, GitHub Issues, Linear, a database, or Markdown. The entry point must name
one default tracker and link to its adapter.

### 4.1 Adapter contract

Every adapter must explain how to:

1. search for existing work and obtain a durable reference;
1. distinguish selected implementation, exploration, and unselected possibilities;
1. record objective, scope, acceptance, governing artifacts, and any design links;
1. record dependencies and ownership without implying a ceremonial sequence;
1. update progress, decisions, discoveries, blockers, and handoffs;
1. preserve verification evidence and close or abandon the record; and
1. resume after interruption without depending on a private conversation.

An adapter need not duplicate a field when the tracker already has a native equivalent. Avoid a
second status machine in labels or metadata unless it supplies information the tracker lacks.

### 4.2 Choose once, use one source

For each outcome, one tracker owns current selection, sequence, and status. Stable documents link to
the record rather than duplicating its progress. A mirror may provide a view, but it must not become
an independently edited authority.

The record must be accessible to the humans and agents doing the work. A local file no one knows to
read, a private chat, or an inaccessible external issue is not a sufficient work record.

### 4.3 Included adapters

- [kata](adapters/kata.md): issue bodies for scope and acceptance, relationships for dependencies,
  comments for discoveries and handoffs, and typed close evidence. Use
  [`seam-track-kata`](../skills/seam-track-kata/SKILL.md) for the CLI workflow.
- [Markdown](adapters/markdown.md): one dated record per selected outcome and a stable directory
  contract. Use `seam-shape` or `seam-work` with this adapter; no separate skill is needed.

Other trackers need only a small adapter that honors the same contract. They do not require a new
version of the constitution or a fork of every skill.

### 4.4 Change trackers deliberately

To migrate, inventory active outcomes and their current state, choose the destination, and migrate
current scope, acceptance, decisions, dependencies, evidence, and handoffs. Do not bulk-import old
ideas as selected work or resurrect completed history as open tasks.

Update the entry point, references, and skill configuration before cutover. During a short
transition, identify the authoritative source explicitly. Afterwards, preserve the old records as
read-only history or archive them and stop updating duplicate status. Verify that a fresh worker can
find and resume one real active outcome through the new path.

## 5. Entry points and proportionate workflows

These are ways into the system, not a mandatory pipeline. A request may enter, leave, or revisit any
stage as evidence changes.

### 5.1 Start a fresh project

Use [`seam-adopt`](../skills/seam-adopt/SKILL.md).

1. Capture purpose, desired outcome, non-goals, fixed constraints, and current safety requirements.
1. Choose a work tracker before implementation starts.
1. Create a short agent entry point with reading paths and verification commands.
1. Write only the direction, principles, and commitments already known. Do not prefill a complete
   document hierarchy.
1. Select the first concrete outcome. Explore unresolved questions or shape it proportionately.
1. Add component contracts and decision records only when real boundaries and consequences justify
   them.

A blank repository does not need every artifact. It needs an honest map, chosen direction, safe
feedback, and a clear next selected outcome.

### 5.2 Migrate existing documentation

Use `seam-adopt`, then `seam-review` for a focused audit.

1. Preserve the original revision and inventory documents, trackers, active work, and reality
   evidence.
1. Classify statements by authority before moving them: direction, exploration, commitment,
   selection, rationale, background, or observed reality.
1. Choose the tracker and cutover boundary. Preserve active work; mark completed logs historical.
1. Reconcile contradictions with the operator rather than silently choosing the most detailed
   document.
1. Move or relabel content, update links, and replace the old routing instructions in the same
   change.
1. Walk representative task paths. Do not require every old template to survive.

Exploratory material remains useful non-normative context. Migration is not permission to promote it
into a contract or delete it because it is not a contract.

### 5.3 Plan a project

Planning is not necessarily implementation. Establish outcomes, constraints, dependencies, risks,
and possible sequencing at the level current evidence supports. Use change cases to evaluate
boundaries. Keep uncertain candidates non-authorizing.

Record which outcome, if any, is selected now. Shape that outcome; leave later candidates at a
coarser level until selection or new evidence justifies detail. Do not generate a complete backlog
merely because the project has a vision.

### 5.4 Explore a feature, project, or technical question

Use [`seam-shape`](../skills/seam-shape/SKILL.md) in exploration mode.

1. State the question, scope, evidence needed, and stopping condition.
1. Track the investigation separately from implementation selection.
1. Record findings with links, experiments, assumptions, options, tradeoffs, and open questions.
1. Stop with a handoff: continue exploration, choose an option for shaping, record a decision to
   stop, or request operator adjudication.
1. When a direction is selected, promote the relevant evidence and constraints; leave the
   exploration as non-normative context.

This also supports architecture spikes, dependency evaluations, design research, and unfamiliar bug
diagnosis. An unresolved defect may need exploration before its fix can be shaped.

### 5.5 Plan a feature or other design-sensitive work

Use `seam-shape`. Features are one instance; the same path applies to APIs, data migrations,
architecture changes, safety changes, operational changes, and complex documentation systems.

Read the selected objective, relevant vision and principles, current contracts, exploration, and
reality evidence. Resolve external behavior, state ownership, interfaces, failure behavior,
security, acceptance, and migration where consequential. Leave local reversible choices open.

The readiness test is:

> **Can a fresh worker implement this without silently making a product, persistent-data,
> cross-boundary, safety, or acceptance decision?**

If not, explore or escalate the specific uncertainty. Do not compensate with more prose everywhere.

### 5.6 Plan new work in an existing project

First classify the request:

| Situation                                                                                    | Minimum path                                                                                            |
| :------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| Clear mechanical change, rename, formatting, dependency patch with established verification  | Track objective, exclusions, and checks; implement without design ceremony                              |
| Reproducible bug with clear expected behavior and local repair                               | Track reproduction/diagnosis, expected behavior, and regression evidence; inspect the relevant contract |
| Bug with unknown cause or disputed expected behavior                                         | Explore or shape before choosing a repair                                                               |
| Feature, new interface, persistent data, architecture, security, or cross-component behavior | Select and shape enough to resolve consequential decisions                                              |
| Research, comparison, prototype, or open design question                                     | Track exploration and preserve non-normative findings                                                   |
| Review, audit, or explanation with no requested edits                                        | Review the named artifacts; do not manufacture a work item or implementation                            |
| Consequential decision discovered during any task                                            | Pause the affected path, record the conflict, and return to shaping or the operator                     |

"Bug fix" and "mechanical" are not exemptions from tracking, tests, safety, or existing contracts.
They are exemptions from unnecessary design when behavior and acceptance are already clear.

### 5.7 Implement, resume, review, repair, and finish

Use [`seam-work`](../skills/seam-work/SKILL.md) for implementation and handoffs, and
[`seam-review`](../skills/seam-review/SKILL.md) for a documentation-system review. Ordinary code
review still needs the project's own review procedure.

Resume from the work record, actual revision, diff, and checks—not from a blank prompt. When a task
is too broad, split at a real boundary. When reality conflicts with a contract, surface the
conflict; do not code around it silently. Reconcile durable truth with the change and close only on
evidence.

## 6. Progressive commitment and bounded work

Work moves through decisions, not a mandatory document pipeline.

1. **Select:** the operator chooses the outcome or change. A direct implementation request is
   selection for that scope.
1. **Explore if needed:** obtain evidence without preselecting its conclusion.
1. **Shape proportionately:** establish scope, acceptance, and ownership of consequential choices.
1. **Deliver verifiable units:** keep actual dependencies, progress, and discoveries with the work.
1. **Reconcile:** update durable documents and close or abandon the record explicitly.

A dispatchable unit needs a **task packet**, whether it is part of the work record or a prompt
assembled from it:

- one objective and explicit exclusions;
- the minimum governing documents and relevant sections;
- the input revision, files, fixtures, and any canonical exemplar;
- permitted write scope and safety limits;
- expected artifacts and acceptance checks; and
- where to record progress, decisions, blockers, and the handoff.

Point to artifacts rather than copying their contents. A packet is complete when a fresh worker can
act without the dispatch conversation, not when it contains the entire project history.

Size units for bounded implementation and review. Keep schema and wire-format transitions atomic
when they must land together. For repeated similar work, verify one exemplar before fan-out.

## 7. Composable execution

The following responsibilities are interfaces, not mandatory jobs:

- **Direction and adjudication:** choose outcomes and resolve consequential conflicts.
- **Exploration:** answer a bounded question and preserve evidence and options.
- **Shaping:** resolve consequential uncertainty and supply testable boundaries.
- **Coordination:** choose ready units, control shared writes, and keep the work record current.
- **Implementation:** change one bounded unit and report evidence and unresolved decisions.
- **Review:** compare the resulting diff with the same task and contracts.
- **Repair:** receive specific findings and missing evidence, not a vague request to improve.

A person, one agent, a router with workers, or another tool may perform any responsibility. No
particular skill, tracker, worktree layout, model tier, or review service is required.

| Boundary                         | Input                                      | Output                                                        |
| :------------------------------- | :----------------------------------------- | :------------------------------------------------------------ |
| Direction → exploration or work  | Direction, principles, current reality     | Selected question or outcome                                  |
| Exploration → shaping            | Evidence, options, unknowns                | Non-normative findings and explicit decisions to make         |
| Shaping → execution              | Selected outcome, contracts, evidence      | Scoped record and verifiable units                            |
| Execution → review               | Task packet, base revision, implementation | Diff/artifacts, targeted evidence, and handoff                |
| Review → repair or integration   | Same task and contracts, actual diff       | Located findings or a clean review                            |
| Any workflow → durable knowledge | Decision or discovered reality             | Updated contract, decision, exploration, note, or work record |

A workflow may add temporary state, but it must not create a competing specification or status
source. It should be replaceable by another workflow honoring the same boundaries.

## 8. Verification, recovery, and conflicts

Use a verification ladder:

1. **Baseline:** establish whether relevant checks passed before the change.
1. **Targeted evidence:** prove this unit with tests, fixtures, CLI/HTTP checks, or visual
   inspection.
1. **Independent review:** inspect the actual diff against the task and contracts.
1. **Integration evidence:** run the repository's full checks and exercise the affected boundaries.
1. **Reconciliation:** update durable truth and record remaining work before completion.

When a check is unavailable, record that limitation rather than implying it ran. A checklist can
guide inspection; it is not evidence by itself.

| Observation                           | Default response                                                         |
| :------------------------------------ | :----------------------------------------------------------------------- |
| Missing or ambiguous acceptance       | Return to shaping; do not ask an implementer to guess                    |
| Unknown cause or competing approaches | Explore a bounded question before committing to a solution               |
| Task too broad or context exhausted   | Split at a real seam; resume from the recorded checkpoint                |
| Local defect with a clear finding     | Give a bounded fixer the finding, expected behavior, and missing test    |
| Repeated defects in one mechanism     | Stop fan-out; re-examine the mechanism or exemplar                       |
| Contract conflicts with reality       | Record and escalate the consequential decision                           |
| Unsafe or irreversible action         | Stop the affected path; preserve evidence and restore a known-good state |

For a partial handoff, record branch/base/head or equivalent revision, evidence, incomplete work,
commands run, and next concrete action. Prefer repair, replacement, or revert over compensating
layers. Escalate a model only for genuinely difficult judgment, not to compensate for poor shaping.

## 9. Compact templates

### Exploration record

Store in the project's chosen non-normative location and link it from tracked exploration.

```markdown
# Exploring <feature or question>

**Status:** exploring | concluded | superseded

## Question, scope, and stopping condition

## Findings and supporting evidence

## Assumptions and unknowns

## Candidate approaches and tradeoffs

## Possible design implications (not commitments)

## Handoff and next useful question
```

### Work record

Use the chosen tracker's native fields where possible. This template also works in an issue body.

```markdown
## Outcome and acceptance

## Scope, non-goals, and governing contracts

## Exploration, decisions, and open questions

## Units, dependencies, and verification

## Progress, discoveries, and handoffs

## Completion and documentation reconciliation
```

A small task may need only the first and fourth sections. The
[Markdown adapter](adapters/markdown.md) adds its optional dated-file convention.

### Task packet

```markdown
## Objective and exclusions

## Governing documents and sections

## Input revision, files, fixtures, and exemplar

## Permitted writes and safety limits

## Expected artifacts and acceptance checks

## Progress, decisions, blockers, and handoff location
```

### Decision record

```markdown
# <Decision>

**Status:** proposed | accepted | superseded by <record>

## Context and forces

## Options considered

## Decision

## Consequences

## Revisit when
```

### Component contract

```markdown
# <Component> contract

## Purpose and scope

## Observable behavior

## State and ownership

## Interfaces and dependencies

## Failure and operational behavior

## Acceptance and verification
```

These are prompts for necessary thinking, not sections that must be filled performatively.
