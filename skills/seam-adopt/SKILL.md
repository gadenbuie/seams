---
name: seam-adopt
description: "Adopt seams in a new project or migrate an existing project's documentation and work tracking. Use when starting fresh, establishing VISION/PRINCIPLES/DESIGN and agent routing, choosing or replacing a work tracker, classifying legacy documents, or cutting over active work. Do not use for routine feature shaping or implementation."
---

# Adopt or migrate seams

Establish only the artifacts and tracker a project needs. Preserve authority distinctions during
migration; do not turn old notes into requirements or bulk-import history into the active queue.

Read the host repository's instructions and inspect its actual files before editing. The
[constitution](../../docs/constitution.md) owns the rules; the
[framework guide](../../docs/framework.md) explains artifacts, tracker contracts, and cutover.

## Fresh project

1. Establish purpose, desired outcomes, users, non-goals, fixed constraints, and safety boundaries
   with the operator.
1. Choose a work tracker before implementation. Record its adapter and access requirements in the
   agent entry point. An existing tracker wins over introducing a duplicate.
1. Create a short `AGENTS.md` or equivalent containing:
   - project purpose and repository map;
   - the authority rule and task-based reading paths;
   - the chosen work tracker and how to find current work;
   - safety boundaries and setup/verification commands; and
   - the rule that possibilities and exploration do not authorize implementation.
1. Add only artifacts that carry known information: vision for direction, principles for recurring
   choices, and design for commitments already made. Do not prefill empty directories or templates.
1. Select the first outcome with the operator. Use `seam-shape` if exploration or consequential
   design is needed; use `seam-work` for a clear implementation.
1. Walk one path from the entry point to the work, its governing constraints, and verification.
   Remove anything that does not help a real task.

A blank project does not need every named document. It needs an honest map, a tracker, explicit
selection, and safe feedback.

## Existing project migration

### 1. Define the migration scope

Identify the operator's requested result, affected documents and trackers, active outcomes, current
revision, and what must not change. Preserve unrelated uncommitted work. Do not rewrite product
commitments merely to fit the framework.

### 2. Inventory by authority

Classify each relevant statement, not just each file:

| Classification                                         | Destination                                                             |
| :----------------------------------------------------- | :---------------------------------------------------------------------- |
| Purpose, direction, future possibilities               | Vision or non-normative notes                                           |
| Exploratory findings, prototypes, candidate approaches | Exploration record or notes; never a silent requirement                 |
| Reusable decision strategies                           | Principles                                                              |
| Enforceable constraints, boundaries, behavior          | System or component design                                              |
| Significant rationale and tradeoffs                    | Decision record                                                         |
| Selected scope, status, sequence, handoffs             | Chosen tracker                                                          |
| Observed current behavior                              | Code, tests, fixtures, runtime evidence; update prose that misstates it |

Mark mixed documents for careful separation. Resolve contradictory commitments with the operator; do
not choose the longest or newest by default.

### 3. Choose or replace the work tracker

Evaluate the existing tracker first. It is sufficient when participants can retrieve selection,
scope, acceptance, dependencies, state, discoveries, evidence, and handoffs. Markdown is optional,
not the default requirement.

Write or adopt a small adapter describing the tracker's native mapping. Use
[the kata adapter](../../docs/adapters/kata.md) or
[the Markdown adapter](../../docs/adapters/markdown.md) when appropriate. Do not add metadata that
duplicates a usable native status field.

For active work, migrate the current objective, selection, acceptance, scope, dependencies,
decisions, verification, and next action. Link old and new references during cutover. Preserve
completed records as history rather than reopening them. Do not turn unselected ideas into active
issues.

### 4. Cut over coherently

1. Move or relabel documentation according to the authority map.
1. Update durable contracts when their actual meaning changes; preserve historical rationale where
   useful.
1. Update the entry point, tracker adapter, and all affected links in the same change.
1. Name one cutover point and one active status source. Stop updating duplicated active status in
   the old location.
1. Preserve useful exploration as non-normative background with links from the work it informs.

### 5. Verify representative paths

Test at least one path for each applicable situation:

- a new worker finding and resuming active work;
- a mechanical task reaching its constraints and checks without reading the whole framework;
- an exploration record informing design without being mistaken for approval; and
- a reader distinguishing current commitments from old plans and actual code behavior.

Run documentation checks and the project's relevant verification. Report unresolved conflicts and
checks that could not run. Do not claim migration is complete while two active status sources
remain.

## Output

Report the chosen tracker, artifacts created or reclassified, cutover boundary, verification paths,
and remaining operator decisions. Use `seam-review` for later audits and `seam-shape` for new
features or design-sensitive work. Installing skills in an agent harness is separate from adopting
the convention.
