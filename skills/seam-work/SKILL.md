---
name: seam-work
description: 'Implement, resume, repair, or reconcile tracked work using seams. Use for coding tasks, clear bug fixes, mechanical changes, bounded implementation units, checkpoints, interrupted work, and completion evidence. Do not use to select unrequested features or to guess consequential design decisions; return those to seam-shape or the operator.'
---

# Execute and reconcile work

Deliver a bounded selected task with the smallest sufficient context. Keep its status and
discoveries in the chosen tracker. Preserve existing safety rules, unrelated edits, and recovery
paths.

Read the project's entry point, selected work record, governing contracts, and relevant code/tests.
Use the project's tracker adapter. For kata, also use `seam-track-kata`; for Markdown, follow its
[adapter](../../docs/adapters/markdown.md). This skill does not require a specific tracker or agent
pipeline.

## Route the request

- **Clear mechanical change:** record objective, exclusions, and checks. No design ceremony.
- **Well-understood bug fix:** record observed behavior, expected behavior, relevant contract, and
  regression evidence. Reproduce or diagnose proportionately.
- **Unclear cause, disputed behavior, or new interface/data/safety decision:** use `seam-shape` for
  exploration or shaping before choosing a fix.
- **Feature or other design-sensitive work:** confirm selection and read its shaped acceptance and
  contracts before implementing.
- **Review or explanation with no edits:** answer from evidence; do not manufacture an
  implementation item or make unrequested changes.

A small direct implementation request is operator selection. Do not demand an additional approval
artifact. Every actual project change still needs a work record, however compact.

## Execute

1. Search for an existing record for the same outcome. Reuse it instead of creating a duplicate.
1. Confirm objective, exclusions, acceptance, permitted writes, and the current revision. Identify
   any existing worktree changes and preserve unrelated work.
1. Read only named contracts, relevant exploration, affected code/tests, and a canonical exemplar
   when available. A worker need not read the whole vision or every project note.
1. Establish a targeted baseline where practical. Keep production data and irreversible actions
   behind the host project's controls.
1. Make the smallest coherent change. Keep schema and wire-format transitions atomic when they must
   land together.
1. Record discoveries, actual dependencies, and decisions in the existing work record. Do not copy
   temporary status into durable design.
1. Run targeted checks, inspect the actual diff, and obtain independent review appropriate to the
   risk. Then run the repository's integration checks before claiming completion.

If implementation exposes a missing or conflicting commitment, stop the affected path. Record the
specific uncertainty and return to `seam-shape` or the operator. Do not silently choose new product
behavior, persistent-data semantics, public interfaces, or safety policy.

## Resume or repair

Before changing anything:

1. Read the existing work record and its last handoff.
1. Inspect branch/base/head or equivalent revision, actual diff, and worktree state.
1. Identify verified behavior, incomplete work, and checks already run. Re-establish a baseline when
   the current state differs.
1. Continue the smallest safe next unit. Do not restart from a blank prompt when a recoverable
   artifact exists.

For a defect, give the repair a concrete finding, expected behavior, affected paths, and missing
test or evidence. For repeated failures, stop fan-out and inspect the packet, mechanism, exemplar,
and review boundary before increasing model size or autonomy.

When unsafe or unrecoverable, preserve evidence and restore a known-good state using the project's
approved recovery procedure. Do not layer compensating changes over an unknown state.

## Leave a partial handoff

If stopping before completion, record in the tracker:

- branch/base/head or equivalent revision and worktree state;
- what changed and what evidence passed;
- what remains incomplete or unverified;
- commands run and any checks unavailable;
- unresolved decisions or blockers; and
- the next concrete action.

Leave the record open. A partial summary is not a completion claim.

## Reconcile and finish

Before closing:

- compare actual behavior and diff with acceptance;
- run targeted and repository-wide checks, reporting unavailable checks honestly;
- update durable contracts with the behavior change that required them;
- record significant non-obvious rationale in a decision record;
- keep exploration non-normative and revise direction or notes when realized or invalidated;
- ensure completed records no longer act as a competing current specification; and
- close using the tracker's evidence mechanism, with remaining follow-ups explicitly recorded.

Return a concise report: work reference, changes, evidence, documentation reconciliation, and any
remaining decision or follow-up. Do not claim that a checklist, ready label, or implementation
summary alone proves the outcome.
