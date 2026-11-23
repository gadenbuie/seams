---
name: seam-review
description: 'Review or repair a seams documentation system. Use for authority conflicts, stale or duplicated documents, exploration mistaken for commitments, tracker cutover problems, context-routing audits, work-record reconciliation, or post-adoption review. Do not use as a generic code-review replacement or permission to rewrite product commitments.'
---

# Review the seams system

Examine whether the documentation and work records are load-bearing, current, and usable by
bounded-context workers. Review the repository's actual artifacts and reality evidence, not just its
conformance to filenames or templates.

Read the [constitution](../../docs/constitution.md) and the relevant
[framework guide](../../docs/framework.md) sections. The host project's own contracts govern product
behavior. This skill reviews the information system; it does not certify software correctness or
select new work.

## Inputs

Identify a bounded review object:

- the operator's question or suspected failure;
- entry point and document/tracker map;
- relevant stable documents, exploration records, and active or recently completed work;
- decision records and background only where needed;
- code, tests, fixtures, or runtime evidence needed to check current reality; and
- the revision or document snapshot being reviewed.

For a focused review, start with one task or artifact boundary. Do not turn every audit into a
whole-repository rewrite.

## Review questions

### Authority and ownership

- Can a reader distinguish possibilities, exploration, commitments, selected work, and reality?
- Does every design statement support a choice, constraint, or concrete review finding?
- Are exploratory evidence, candidate options, and recommendations explicitly non-normative?
- Does a project plan identify what is selected rather than authorizing every imagined child?
- Is there exactly one active status source for each outcome?
- Are decision records explanatory rather than duplicate current specifications?

### Tracker independence and recovery

- Does the entry point name the chosen tracker and link its adapter?
- Can participants retrieve selection, scope, acceptance, dependencies, progress, evidence, and
  handoffs without the dispatch conversation?
- Does the adapter use native tracker capabilities rather than a redundant state machine?
- Are active records distinguishable from historical Markdown logs or a previous tracker?
- Can interrupted work resume from revision state, checks, blockers, and a next action?

### Context and usability

- Does the entry point route by task to the smallest sufficient reading set?
- Can a mechanical task or clear bug fix proceed without unnecessary design ceremony?
- Can a fresh worker identify objective, exclusions, contracts, write scope, exemplar, and checks?
- Are constraints discoverable at the moment they are needed?
- Do stale links, duplicated summaries, and irrelevant catalogs impose unnecessary context cost?

### Reality and evidence

- Do claims about current behavior match code, tests, fixtures, and runtime evidence?
- Are intended commitments distinguished from implemented behavior?
- Do records contain actual commands/results and disclose unavailable checks?
- Is acceptance observable and independently reviewable?
- Are durable contracts updated with the behavior they govern?

## Procedure

1. **Define the object.** For example, review one selected outcome and its governing contract, or
   test whether a fresh agent can route to one active unit. Record the revision or snapshot.
1. **Build a temporary authority map.** Classify only the involved artifacts as direction,
   exploration, principle, commitment, selected work, rationale, background, or current reality. Do
   not create a permanent meta-document unless requested.
1. **Walk representative paths.** Start at the entry point, follow a worker's actual links, retrieve
   work from the chosen tracker, read governing sections, and inspect reality evidence. Attempt to
   answer scope, permission, acceptance, and handoff questions.
1. **Report concrete findings.** Do not infer a defect merely because a document is short, a
   template section is empty, or the project uses a different tracker.
1. **Repair only when requested and within scope.** Update the authoritative artifact rather than
   adding a competing summary. Preserve useful exploration and historical work; relabel it rather
   than silently promoting or deleting it.
1. **Reconcile and verify.** Check local links, tracker accessibility, active-status uniqueness, and
   the final diff. Run relevant documentation and project checks. Record remaining questions in the
   selected work record, not a parallel status file.

Each finding should include:

- **Severity:** critical, high, medium, or low;
- **Location:** file, section, or work reference;
- **Defect and consequence:** how it could cause wrong work, unsafe action, duplicated effort, or a
  false completion claim;
- **Evidence:** the artifact or reality path demonstrating it; and
- **Repair boundary:** the artifact or selected workflow that should fix it.

Escalate a repair that changes product behavior, persistent data, cross-component boundaries,
safety, or acceptance rather than silently rewriting it. Use "no findings" when appropriate.

## Output

Return scope and revision, authority map, findings with consequences, any requested repairs, checks
actually run, and open operator decisions. Use `seam-adopt` for broad migration and `seam-shape` for
new uncertainty exposed by the review.
