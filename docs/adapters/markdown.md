# Adapter: Markdown work records

Use this adapter when the operator deliberately chooses Markdown files as the work tracker. It is
optional. Do not create Markdown work logs merely because a repository uses Markdown for durable
documentation.

The normative requirements are in [the constitution](../constitution.md) and the abstract tracker
contract is in [the framework guide](../framework.md#4-work-records-and-replaceable-trackers).

## Convention

Keep selected outcomes in a declared directory such as `.agents/work/`. Name each record:

```text
{iso-date}_{kebab-cased-slug}.md
```

For example, `2026-11-23_work-record-adapter.md`. Use the creation date in the operator's local
timezone and one record per outcome, not a daily diary. Small tasks may use the existing tracker's
short item or a compact Markdown record; do not manufacture ceremony to satisfy a filename.

The directory's `README.md` is the stable adapter contract. It must explain selection, status,
naming, handoffs, closure, and how exploration notes relate to selected work. Individual records
hold temporary status, never project-wide implementation status.

## Work record template

```markdown
# <Outcome>

**Status:** selected | exploring | shaping | ready | in progress | blocked | done | abandoned

## Outcome and acceptance

## Scope, non-goals, and governing contracts

## Decisions, unknowns, and exploration

## Units, dependencies, and verification

## Progress, discoveries, and handoffs

## Completion and documentation reconciliation
```

Include only useful sections. For a mechanical change, objective, expected behavior, and
verification may be enough. Link to exploration and component contracts rather than copying them.

## Operating rules

1. Search existing records before creating another. Reuse the record for the same outcome.
1. Record operator selection before implementation. A direct implementation request is selection.
1. Keep scope, status, discoveries, actual dependencies, and evidence in this record.
1. Put verified exploration findings and options in a linked non-normative note or a clearly marked
   exploration section. Promote commitments explicitly to the appropriate durable document.
1. On interruption, record revision state, completed evidence, incomplete work, blockers, and the
   next concrete action.
1. Close only after acceptance is demonstrated and durable documents are reconciled. Closed records
   are history, not alternate current specifications.
1. Never create a second Markdown status file when a tracker already owns the work.

## Moving to another tracker

Choose the destination first. For each active record, migrate its current objective, selection,
acceptance, dependencies, state, evidence, and handoff. Update all entry-point links before making
the new tracker authoritative. Preserve completed files as clearly marked history or archive them;
do not import their old status into the active queue. Leave one unambiguous pointer during the
transition, then remove duplicated active status.
