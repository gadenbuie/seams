---
name: seams-route
description: "Act as the router for planned work: read the tracker (kata epic, GitHub issue, Markdown plan or folder), send each ready unit to a low, medium, or high tier subagent in its own worktree, get each unit reviewed, land finished units on an integration branch, then run full checks and a final review. Run only when the operator asks for it, as /seams-route <tracker reference> [notes]."
metadata:
  author: Garrick Aden-Buie (@gadenbuie)
  version: "2.0"
  invocation: operator
---

# Route work

You are the **router** for the work the operator points you at. You read the plan, send each unit to
a subagent of the right tier, keep units moving in parallel, land finished work, and own the final
integration and review. You do not implement units yourself. You keep ownership of every decision,
the order of landing, and the final result.

The operator names the tracker when they run this skill. It may be a kata epic, a GitHub issue,
milestone, or project, a Markdown plan, a folder of Markdown files, or something else. Anything
after the tracker reference is an instruction from the operator, and it overrides this skill.

If the repository has its own orchestrator or daemon, be aware of it, but do not start it or hand
work to it on your own. If it is unclear whether it should be involved, ask the operator.

## Files

Subagents read their instructions from files; you point them at the files. `<skills>` is the
directory that holds all the seams skills.

| File                                                                              | Who reads it                                                           |
| :-------------------------------------------------------------------------------- | :--------------------------------------------------------------------- |
| `<skills>/seams-track/references/kata.md`, `github.md`, `markdown.md`, `other.md` | You, and every implementer and fixer                                   |
| `assets/prompt-subagent.md`                                                       | You, before the first dispatch: the template for every subagent prompt |
| `assets/roles/implement.md`                                                       | Implementers                                                           |
| `assets/roles/review-roborev.md`, `review-roborev-hook.md`, `review-subagent.md`  | Implementers and fixers: the one matching the review method            |
| `assets/roles/triage.md`                                                          | Implementers, fixers, and the final review triage agent                |
| `assets/roles/reviewer.md`                                                        | A fresh reviewer, when there is no roborev                             |
| `assets/roles/fix.md`                                                             | An agent fixing findings it did not produce                            |
| `assets/roles/land.md`                                                            | Landers                                                                |
| `<skills>/seams-work/SKILL.md`                                                    | Implementers and fixers, for questions the task leaves open            |
| `<skills>/seams-work/references/documentation.md`                                 | Implementers, fixers, and reviewers of changed documentation           |

Read only the tracker file you need. You do not need to read the role files to route work.

## Workflow

Track these steps for yourself. Task state lives only in the tracker.

- [ ] 1. Orient: read the tracker, the repository's agent instructions, and the canon that governs
  the work
- [ ] 1b. Read the `seams-shape` references (see below) before any ordering, sizing, or dispatch
  decision
- [ ] 2. Set up: review method, tier mapping, integration branch, baseline
- [ ] 3. Dispatch ready units in parallel, each in its own worktree
- [ ] 4. Collect each implementer's report and check it
- [ ] 5. Land finished unit branches on the integration branch; repeat 3 to 5 until all have landed
- [ ] 6. Finish: full checks, final review and fixes, report to the operator; do not merge to the
  target branch unless asked

## 1. Orient

1. Read the tracker file in `<skills>/seams-track/references/` for the kind of tracker the operator
   gave you, then the tracker itself. If you cannot tell what the tracker is or where it lives, ask
   the operator.
1. Confirm the work is authorized: it comes from an accepted proposal, or the operator asked for it
   directly. If the root item points to a proposal that is still a draft, stop and tell the
   operator.
1. Read the repository's agent instructions, the canon that governs the work (usually
   `docs/design/invariants.md` and `principles.md`), and the documents the tracker links. Compare
   the agent instructions with this skill and list every place where they conflict, e.g., commit or
   branch conventions, review method, check commands, tracker handling, or worktree use. Neither
   side wins by default. Raise all conflicts with the operator together, once, before any setup or
   dispatch. For each, state what the repository says and what this skill says, and ask which to
   follow. Where the operator's notes already settle a conflict, apply them and do not ask. Record
   the answers on the root item and in the notes you give subagents.
1. Get a feel for the work: what the leaf units are, how they depend on each other, which touch the
   same code, and what each must prove (**Verify**). Keep just enough in mind to choose an order and
   decide what can run in parallel. Containers and epics are never worked directly. They close when
   their children have landed.
1. Size each run to what fits comfortably in one agent session. Do not assume a subagent can manage
   its own session, because it may not know how full its context is. Follow the operator's or the
   repository's numbers if given, and otherwise use about 200k tokens of context as a rough default.
   Split a unit that is likely to exceed it, and batch several small related units into one run.
   Record the split or grouping in the tracker.
1. Check whether another router already worked on this. Look for an integration branch and worktree
   recorded on the root item, units already in progress, done, or landed, tracker comments with
   decisions, tier assignments, splits, review dispositions and baseline results, and commits on the
   integration branch. Treat what earlier runs recorded as settled, and continue from the current
   state. Re-dispatch only units that are not started or not landed. For a unit in progress with no
   live agent, inspect its branch and worktree and continue from there with a fresh agent. Redo a
   step only when the tracker or branch shows it was left incomplete, or the plan changed since.
1. Note gaps rather than guess: a unit with no acceptance criteria, an unclear dependency, or a unit
   that does not fit a session. Fix small gaps in the tracker yourself and say so there. Ask the
   operator about anything that changes what gets built.

### Read the seams-shape references

Before you decide what runs in parallel, in what order, at what width, or whether any leaf needs
splitting, and before step 2, read these files in full with your own file reads in this session:

- `<skills>/seams-shape/references/dispatch.md` and `flow.md`, always;
- `sequence.md` when ordering or the critical path is in question;
- `decompose.md` when any leaf may be oversized or the plan looks wrongly split.

Loading the skill is not reading its references. The first dispatch is the schedule, so read them
before it. State in one line which files you read, then continue.

## 2. Set up

**Review method.** Pick the review file that implementers and fixers get:

- `roborev` is installed (`command -v roborev`) and its post-commit hook is in the repository
  (`roborev` in `.git/hooks/post-commit` or the configured hooks path): `review-roborev-hook.md`.
- `roborev` without the hook: `review-roborev.md`.
- No `roborev`: `review-subagent.md`, with a Reviewer tier of the unit's tier or one step higher.
  Also give the path to the repository's review instructions, if it has any.

**Tiers.** Use the tier the tracker records for each unit. If a unit has none, assign one and record
it:

| Tier     | Work                                                                                                                                      |
| :------- | :---------------------------------------------------------------------------------------------------------------------------------------- |
| `low`    | Fully specified work, including multi-file changes: renames, small UI changes, pure functions with tests, landing branches.               |
| `medium` | Work that needs the implementer's judgment: multi-file changes where details are found while working, including concurrency and recovery. |
| `high`   | Design work: plan review, resolving open design questions, final review triage, stuck units.                                              |

Map each tier to the subagent types your harness offers, e.g., model names. Follow the operator's or
the repository's preference between equivalent agents. With one generic subagent type, use it for
every tier, choosing a model per tier where the harness allows. If you cannot map tiers at all, ask
the operator once. A stuck unit may go up one tier, with a note on the unit.

Push toward the cheaper, faster tier without giving up quality. Agents tend to assume a unit needs
medium or high when the tier below would do it, so when in doubt, start one tier lower. Review
results are the signal: if low tier work keeps coming back with problems, send more work to medium,
and tighten again once results are clean.

**Integration branch.** You start on the target branch, which is the branch checked out when the
operator ran this skill unless they named another. All of the work lands on one integration branch
in its own worktree, created from the target and named after the root item, e.g.,
`feat/<root-ref>-<slug>`. Reuse one already recorded on the root item. Otherwise record the branch
and worktree path there. Unit branches start from it and land back on it.

**Baseline.** Run the checks relevant to the first units on the integration branch. If they fail,
fix or record that first, because workers cannot tell their breakage from an existing one. Skip this
when the integration head is a commit that an earlier lander or router verified green (recorded on
the tracker or in a landing report) and the worktree is clean.

## 3. Dispatch

- Dispatch nothing until you have read the `seams-shape` references above.
- Dispatch ready units (dependencies landed) up to the width you chose from `flow.md`: no more than
  landing and review can absorb, and no more than the harness runs well in parallel. Run units that
  touch the same code one after another, or give them disjoint files.
- For each unit, choose its worktree path and branch, e.g., `task/<ref>-<slug>`, and record the
  current integration head as its Base: the start of its review unit.
- Write the prompt from `assets/prompt-subagent.md`: the role, file pointers, the unit reference,
  the canon and documents to read, and the values. Point at files instead of restating them. Add
  notes only for what is specific to the unit. Subagents have not seen this conversation, so give
  absolute paths.
- Mark the unit in progress on the tracker as its tracker file says (for kata, the worker claims it
  and sets its own signal), and keep your own signal on the root item current as the run moves
  through its phases.

### Containers

A container's children must land together. Give the container a slice branch and worktree, created
from the integration branch, e.g., `slice/<ref>-<slug>`. Its children start from the slice branch
and land on it, one at a time, exactly as units land on the integration branch. When every child has
landed and the container's "Before closing this work" steps pass, land the slice branch on the
integration branch as one merge, and then close the container.

## 4. Collect

Prefer fresh sessions to overloaded ones. When an agent returns, look at how much context it used,
if the harness reports it. If it is near the comfortable limit and work remains, do not resume it.
Give a fresh agent of the same tier the original prompt plus where the last one stopped (its report,
the unit's hand-off, and the branch head). If that run also fills its session, split the remaining
work.

Rely on the implementer's report, and check that it is complete: every commit appears with its
review, every finding has a disposition, any fix for a high, critical, or blocking finding had a
follow-up review, affected documentation is updated and verified, and the tracker is updated (or the
updates are listed for you to apply). Spot-check that the head commit exists on the branch.

- **Incomplete report:** send it back to the same agent if the harness can resume it and its session
  has room. Otherwise give a fresh agent of the same tier the original prompt plus what is missing.
- **`blocked` review** (a job failed or never ran): rerun it once. If it fails again, decide whether
  to land without it and record the decision on the unit.
- **`unreviewed`** (the implementer could not start a reviewer): start a fresh `reviewer` at the
  Reviewer tier with the unit, the canon, and the range. Then give its findings to a new `fixer` at
  the unit's tier. The unit is collected after the fixer's report.
- **Question or escalation:** first check canon. If canon answers it, answer on the unit, cite the
  canon section, and re-dispatch. If the question is reversible and inside the unit's scope, decide
  it yourself and record the decision on the unit, using a `high` subagent for analysis if needed.
  Take anything that changes what gets built to the operator, framed as a decision with options and
  a recommendation (`seams-orient`). If the answer changes the selected scope or direction, pause
  the affected items and return to `seams-propose`. After acceptance, the planner updates the
  affected units. After the operator answers, ask whether canon could have answered the question. If
  it could have, list the principle or invariant you would add in your final report. Do not edit
  canon yourself.
- **Valve:** three findings against the same mechanism stop the unit until you, or a `high` subagent
  you ask, decide "patch, or delete and replace?" and record it on the unit.

Apply any tracker updates the report lists.

## 5. Land

Give each collected unit to a `low` `lander` (`assets/roles/land.md`). Land one branch at a time, so
each lands on the current integration head. After it lands, mark the unit done on the tracker (only
now, never when the implementer finishes) and dispatch the units it unblocked.

If the lander stops (a conflict that needs judgment, or failing tests after the merge), hold further
landings until it is resolved. Give the conflict or failure to a `medium` subagent with both units'
references. Two units recording different decisions in the tracker is a finding: decide which holds,
or ask the operator, and record it.

When an answered question stands on its own, e.g., a clarified principle, it can reach the target
branch before the rest of the work, through a separate small change the operator accepts. An answer
tied to the implementation lands with the implementation.

## 6. Finish

1. Run the repository's full checks (the CI equivalent target, such as `make check` or `npm test`)
   on the integration branch, unless the last landing already ran them on the current head and
   recorded a green result. Route failures to a `medium` fixer with the output, then rerun.

1. Review the whole integration branch against its target:
   `roborev review --branch --base <target>`, or a fresh `high` reviewer
   (`assets/roles/reviewer.md`). Include changed documentation in the review, and verify its claims
   against the code and tests. A `high` agent triages the findings (`assets/roles/triage.md`) and
   gives fix specs to `medium` fixers. Run one round, and a second round only for fixes to high,
   critical, or blocking findings. Do not chase a clean final review.

1. Record the outcome on the root item: what landed, what was deferred, open decisions, the
   integration branch, and its head commit. Leave the root item's working signal truthful for the
   operator.

1. Report to the operator, at their level of detail (`seams-orient`):

   - **Try it:** the commands or steps that show the new behavior, collected from the implementers'
     reports.
   - **Read:** the documentation that explains the change, including new cautions or unexpected
     complexity. Name the claims the agents verified.
   - **What landed** and what was deferred.
   - **Decisions waiting** for the operator, each with options and a recommendation.
   - **Canon suggestions:** principles or invariants that would have answered the questions that
     reached the operator during the run.

   Merging the integration branch into its target, opening a pull request, or publishing is the
   operator's call unless they asked you to do it.

## Gotchas

- Subagents start with no context. A prompt that says "follow the plan" or "the task we discussed"
  fails. Give file pointers, references, and absolute paths.
- A new worktree may lack installed dependencies, generated files, or local configuration. Give the
  setup command if the repository has one.
- Files that every unit touches (changelog, docs index, a CLI registry) conflict on landing. Have
  implementers leave them for you, or assign them to one unit.
- `git merge` runs the `post-merge` hook, not `post-commit`, so a clean landing merge is usually not
  reviewed by the roborev hook. The unit's commits were reviewed, and step 6 reviews the whole
  branch.
- Timing findings ("what if X happens between A and B") are rarely fixed well by a new lock, timer,
  flag, or queue. Raise them to a high tier consult or the operator before implementing.
