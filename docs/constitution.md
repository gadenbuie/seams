# Constitution

The small normative core of **seams**, the documentation framework for coding agents and the humans
steering them. It is stable enough to quote in a repository's `AGENTS.md` and general enough to
reuse across projects.

For artifact details and lifecycle guidance, see [the framework guide](framework.md). For its
reasoning and evidence, see [supporting evidence](supporting-evidence.md).

## 1. Purpose

A project needs to preserve several different kinds of knowledge:

- the future it is aiming toward;
- possibilities and questions worth exploring;
- evidence and options discovered before design;
- choices an implementation must respect;
- work someone has selected;
- discoveries made while doing that work; and
- what the software actually does.

When these are mixed together, detail masquerades as authority. An agent cannot tell whether a
future feature is a requirement, an exploration is a decision, or an old plan is current, so the
operator must repeatedly decode the repository. More prose makes that problem worse.

The organizing principle is **authority**, not document format:

> **Vision expresses direction. Design records commitments. Work authorizes implementation. Code and
> tests establish reality.**

Principles guide decisions across all four. Exploration informs them without becoming a hidden
contract. The agent entry point routes readers to the right artifact and the chosen work tracker.

## 2. Operator-centered engineering

seams is one layer of a larger engineering system:

- **Operator judgment** sets direction, selects work, and adjudicates consequential tradeoffs.
- **Project artifacts** hold shared authority, context, decisions, and evidence.
- **Composable skills and workflows** explore, shape, implement, review, and recover work.
- **Executable feedback** tests reality and exposes defects.

The intended model is **bounded-context collaboration**, not an omniscient agent running for days
until it declares the software finished. The repository must make incomplete or incorrect
contributions cheap to detect, contain, and correct without simply buying a larger model.

seams is **not** a router, role hierarchy, tracker, or required agent pipeline. Those are optional
execution mechanisms. They read and write the artifacts defined here; they do not acquire authority
over the project's contracts.

## 3. Articles

### I. Possibilities never authorize work

An idea, future feature, roadmap, change case, or detailed project plan is not a delivery
commitment. Only an operator-selected outcome authorizes implementation. A parent plan does not
silently select every child it imagines.

A direct operator request to implement a small change is itself selection. Record it in the chosen
tracker; do not require a separate approval ritual.

### II. Design contains only enforceable commitments

Every statement in a design contract must guide a choice, constrain an implementation, or support a
concrete review finding:

> **Would violating this statement give a reviewer a concrete reason to reject an implementation?**

Unselected feature catalogs, execution order, implementation status, exploratory options, and
speculative extension points do not belong in the enforceable contract. Design may precede code; it
must not imply that the code exists.

### III. Detail follows selection, risk, and uncertainty

Elaborate work when it is selected and when decisions become necessary. Resolve consequential
product, persistent-data, cross-boundary, safety, and acceptance decisions before implementation;
leave local reversible choices to the implementer.

**Needs design, not needs code, is the threshold for design work.** A mechanical change or
well-understood bug fix with clear expected behavior needs tracking, reproduction or diagnosis as
appropriate, and verification—not a vision document, component contract, or design ceremony.
Unexpected product behavior, data migration, interface change, safety exposure, or architectural
tradeoff moves the work back into shaping.

### IV. Exploration informs; it does not silently decide

Exploration is legitimate selected work with a question, scope, and stopping point. Preserve its
verified findings, evidence, candidate approaches, tradeoffs, assumptions, unknowns, and handoffs as
non-normative context. Do not turn a recommendation into a commitment through detail, recency, or an
agent's confidence.

Promote conclusions deliberately: durable constraints to design, significant rationale to a decision
record, and delivery scope and acceptance to selected work. Keep the exploration as cited background
rather than a second specification. A spike or prototype establishes what was tried, not what the
production system must become.

### V. Work has one home; its storage is replaceable

Every change that modifies the project needs a work record, however small. It identifies the
objective, acceptance, relevant authority, and where progress and evidence live. Complex selected
outcomes additionally need scope, non-goals, consequential decisions, dependencies, and verifiable
units.

The record may live in an issue tracker, database, or Markdown file. **Markdown is an adapter, not
the framework.** Choose one authoritative tracker for each outcome; do not maintain parallel status
records. All participants must be able to retrieve the selected scope, current state, decisions, and
handoffs. A tracker that cannot preserve these properties is incomplete, not exempt from them.

### VI. Durable truth is separated from temporary progress

Contracts and rationale outlive a work item. Sequencing, status, implementation discoveries, and
handoffs belong with the work. Stable documents change in place; completed work remains historical
and stops acting as a current specification.

### VII. Only code and verification establish what exists

Selection is not evidence of completion, and a checked box is not a substitute for acceptance
evidence. Inspect code, tests, fixtures, and runtime evidence rather than inferring reality from
design prose, tracker status, or an implementer's summary.

### VIII. Context is a scoped input, not a memory test

A worker receives the smallest sufficient reading set and a concrete exemplar where one exists. It
need not absorb the whole project, every exploration, or the entire execution process. If a task
needs a frontier model mainly because it is broad or ambiguous, reshape the task before escalating
the model.

### IX. Quality comes from feedback and recoverable boundaries

Small reviewable changes, executable checks, independent review, and explicit handoffs contain
defects and turn recovery into ordinary work. Prefer repair, replacement, or revert over
compensating layers. Escalate to a more capable model for genuinely difficult judgment, not as the
default remedy for poor task shaping.

## 4. Authority is scoped

Authority is not a contest between filenames:

- a component contract governs its component;
- the system design governs cross-component commitments;
- a work record governs only its selected scope;
- a decision record explains rationale and may be superseded;
- exploration, notes, and vision entries inform judgment without authorizing implementation; and
- code and tests establish current reality.

The operator decides product direction and resolves consequential conflicts. An agent must not
silently choose between contradictory commitments or promote background material into a contract.
Record the durable result in its proper home rather than leaving the repository dependent on a
conversation.

## 5. Stable documents and work records

**Stable named documents** are ongoing interfaces: the agent entry point, vision, principles,
design, component contracts, and directory guides. Update them in place when their meaning changes;
do not create a dated copy for every revision.

**Work records** follow the life of a selected outcome or task. Their names, identifiers, fields,
and storage belong to the chosen tracker adapter. The adapter must preserve selection, scope,
status, acceptance, dependencies, discoveries, verification, and handoffs in proportion to the work.
It must also provide a durable reference that other artifacts can cite.

**Exploration records** may be a note linked from the tracker or an exploration issue with findings
in its body or attachments. They remain non-normative even when an exploration issue is closed:
closure means the question was investigated, not that its options were selected.

## 6. Non-goals

seams does not claim that:

- one set of filenames or one tracker is universally optimal;
- every project needs every artifact;
- every bug fix or mechanical task needs design;
- every idea deserves exploration or a fully specified backlog item;
- more documentation is always better;
- small agents are always cheaper or more capable than large agents;
- a long autonomous run is inherently desirable;
- a checklist is evidence that behavior works; or
- documentation can replace operator judgment, tests, review, or runtime evidence.

The measure of the system is whether a newcomer can tell what is possible, what has been learned,
what is required, what is selected, and what exists—without asking the operator to decode the
documents.
