# Plan templates

Replace `<...>` and drop lines that do not apply.
Use the tracker's own fields for parent, blockers, tier, and labels where it has them, and keep the body for what the fields cannot hold.

## Leaf

```markdown
Part of <root ref>[ / <container ref>]. Proposal: <path>. Canon: <docs/design/invariants.md#section, ...>.
Reference: <path or URL to the reference implementation, for a port>.
Documentation: <user documents and design overviews to update, and the update each needs | none affected>.
Branch: work lands on <integration or target branch>[; commit to <slice branch> while the container is open].

<What this unit changes and why, in terms of what a user would see.>

## Scope
- <file>: <symbol>: <change>
- <new file> (new): <what it holds>
- Decisions already made: <mechanism decisions>

Out of scope: <item> (owned by <ref>); <item> (not planned).
Shared files: <files another open unit also edits> (<ref>).
Blocked by <ref> because <reason>.

## Verify
- Documentation: <claims, code references, and links checked against named code and tests | no documentation affected>
- <observable outcome: command and expected result, exact output, or scenario>
- <expected output changes>
- Try it: <command or steps that show the new behavior | not user-visible>
- Targeted tests: `<command>`
- Baseline: <checks verified green at <sha>; no need to rerun | none>

## Done when
<End state: what exists, what passes, what is recorded on this unit.>

Do not stop to ask about anything you can work out yourself from this body, canon, the proposal, or
the reference. If canon does not answer a consequential question, record it on this unit as
seams-work says and stop that path. If you are blocked, first try <fallback 1>, <fallback 2>,
<fallback 3>. Report back only after concrete progress or after exhausting reasonable options.
```

## Container

```markdown
Part of <root ref>. Proposal: <path>.
Lands as one merge on the integration branch. Children start from and land on the container's slice branch.

<What the unit delivers once landed.>

Children, in order (their bodies own their scope):
- <ref> <title>: <tier>
- <ref> <title>: <tier>, blocked by <ref> because <reason>

Verify for the unit: <end-to-end outcome after all children land>.

## Before starting work under this unit
Once, when the first child starts; record the result here:
- <e.g., review the plan and the children's bodies against what has landed since; adjust and comment what changed>

## Before closing this work
Once, after every child has landed:
- <e.g., review and verify the whole unit's diff against <target branch>; run <full checks>>
```

The two sections fit an epic body too.
Include them only when needed.

## Planning leaf (rolling waves)

For very large or complicated work only.
Blocked by the wave it follows.
Tier `medium` unless the repository says otherwise.

```markdown
Planning only; do not implement or land code. After <previous wave ref> lands, reconcile
<next wave ref> against the landed code, the proposal, canon, and <reference>.
Focus: <questions this wave must settle>.

Read the hand-offs and decisions on <previous wave>'s closed leaves, then plan the wave following
the seams-plan skill (steps 2 to 4; ask the operator only if the wave changes what gets built).
Update later units that the landed work overturned. No child may start before this leaf closes.

Done when the wave's leaves are written and blocked correctly, and this leaf closes with their refs
and a short outline. Leave the implementation undispatched.
```

## Read-back

Write it in the operator's terms.
Keep it short enough to check in a few minutes.

```markdown
Read-back for <proposal title>

What will be built, in the order you can try it:
1. <first usable interface>: you can try it with <command or steps>.
2. <next piece>: <what it adds>.

What the implementers may not do:
- <e.g., change the public interface of X; touch stored data; add a dependency>

When they will stop and ask you:
- <decisions the plan left open on purpose>

Not selected in this plan:
- <items from the proposal or nearby ideas that this plan leaves out>
```

## Hand-off comment on the root

```markdown
Plan (seams-plan): <one-line goal>. Proposal: <path>. Target branch: <branch>.

Units:
- <ref> <title>: <tier>; parallel with <ref> | after <ref> (<reason>)
Once per unit: <container ref> before starting: <step>; before closing: <step>.
[Later waves: <ref> <title>, planned by <planning leaf ref>.]

Deferred: <item> -> <ref or backlog ref>.
Decisions: <question>: <choice> (<reason>).
Read-back: <confirmed read-back, or a link to the comment that holds it>.
Next: /seams-route <root ref>
```
