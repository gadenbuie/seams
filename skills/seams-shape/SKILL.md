---
name: seams-shape
description: "Patterns for shaping work before it is dispatched: split it into units with a real dependency graph, sequence by risk and critical path, land the smallest usable interface first, dispatch an exemplar before fanning out similar units, and keep flow bounded and resumable. Load when you are about to write a plan for non-trivial work (tasks, issues, or a dependency graph), or to schedule an existing plan (what runs in parallel, what stays serial, in what order, with how many workers). Load alongside seams-plan and seams-route. Do not load for a single atomic task."
metadata:
  author: Garrick Aden-Buie (@gadenbuie)
  version: "2.0"
  invocation: agent
---

# Shape work

How work is split, ordered, and dispatched changes its cost, speed, and correctness more than who carries it out.
The planner or router owns the tracker and workflow, and it uses these patterns to shape the work.

**The one thing to get right:** two opposite errors cost the same.
One is serializing independent work, e.g., seven identical units handed to one worker.
The other is parallelizing dependent work, e.g., B needs A's output.
Verify independence before choosing how many units run at once.
When units are independent and similar, do one first as a verified exemplar, then fan out the rest against it.

## Read the references before you plan or schedule

Read the reference files for the patterns that change outcomes, including the independence test, the exemplar brief, sizing a leaf, width and pacing, and resuming a failed run.
Skimming this overview and planning from memory is the common failure.

1. Before you write, outline, or propose any plan, or decide any order, width, or parallelism, open the reference files for your situation (table below) with your own file reads.
   Do it now, not "before the final plan", because the first outline is already the plan.
1. A reference you intended to read later is a reference you did not read.
1. After reading, say in one line which files you read and the one change they made to your plan.
   If they changed nothing, re-read the one that matches your riskiest unit.

## In a seams-plan or seams-route session

If the operator ran `seams-plan` or `seams-route`, that skill is the primary workflow, and this one supplies reading for it.
Those skills set the tree limits, tiers, sizing, landing, and review rules.
Do not override them.

### In seams-plan (step 2 Shape, step 4 Check the tree)

- **Most relevant:** `references/decompose.md` (shape per sub-problem, the 100% rule, edges with reasons, and §4 on undersized leaves) and `references/sequence.md` §1 to §2 (smallest usable interface first, risk first, critical path).
- **Repeated similar units:** plan the first as the exemplar leaf.
  Each fan-out leaf is blocked by it, with the reason ("needs the exemplar's pattern landed") in the body and the exemplar linked as the reference implementation.
  Its **Verify:** is the exemplar's acceptance criteria.
  See `references/dispatch.md` §1.
- **Blockers:** use the independence test in `references/dispatch.md` §2.
  Units that only share files get a note in both bodies.
  Units that must land together become a container.
- **Checking the tree:** look for needless blockers on the longest chain (`sequence.md` §3) and edges with no reason (`decompose.md` §3).
- **Skip:** `flow.md`, beyond keeping leaf steps safe to re-run.

### In seams-route (steps 3 Dispatch, 4 Collect, 5 Land)

- **Most relevant:** `references/dispatch.md`.
  Dispatch the exemplar alone, check it against its **Verify:**, then dispatch the dependents with its branch head or landed commit as the reference.
  If the exemplar shows a defect, fix it before any fan-out worker starts.
- **Width and pacing:** `references/flow.md` §1 to §2 and `references/sequence.md` §4.
  Landing is one at a time, so it is usually the constraint.
  Do not release more workers than landing and review can absorb.
- **Failures:** `references/flow.md` §5 to §6 and the recovery questions.
  Isolate per-unit failures, resume from the branch and hand-off, and never restart.
- **Leaf size:** do not trust that each leaf is sized for one worker.
  Check each against `references/decompose.md` §4 before dispatch, and split any that are several units.
- **Plan gaps:** if units look wrongly split or ordered, fix small gaps in the tracker with `decompose.md` and `sequence.md`.
  Take changes to what gets built to the operator.

### Neither running

Apply the patterns directly, and keep the shape note (below) with the plan.

## Which reference answers your question

If you are asking any of these, read the file before answering from memory.
When unsure which applies, read `decompose.md` and `dispatch.md`.

| Question                                                                                                                          | Read                      |
| :-------------------------------------------------------------------------------------------------------------------------------- | :------------------------ |
| How should I split this? Is each piece the right size for one worker? Did I leave a gap or overlap? What really depends on what?  | `references/decompose.md` |
| What goes first? What can the operator use soonest? What is risky? Which chain sets the pace, and what is the bottleneck?         | `references/sequence.md`  |
| Can these units run in parallel, or must they stay serial? Should one go first as an example? What does each worker's brief need? | `references/dispatch.md`  |
| How many should run at once? How big a batch? What happens if a run fails halfway, and can it resume safely?                      | `references/flow.md`      |

## Quick triage

1. **More than one unit?** If not, there is nothing to shape.
1. **Something the operator can use early?** Land the smallest usable interface first (`sequence.md`).
1. **Same operation on different data?** Exemplar, then fan out (`dispatch.md`).
1. **Does any unit need another's output, or write the same file, record, or resource?** That is a blocker, and the pair stays serial.
1. **Anything uncertain or expensive to get wrong?** It goes first, as a spike or an exemplar (`sequence.md`).
1. **Long chain or one bottleneck step?** Find the critical path and the constraint, and spend the strongest worker only there.
1. **Could failure halfway leave a mess?** Use idempotent steps, checkpoints, and isolated failures (`flow.md`).

## Output

Write a short shape note in the plan or as a comment on the root item, not in a separate document:

- **Units** and what each proves.
- **First usable interface:** the unit the operator can try first, and how.
- **Edges** with the reason for each.
  Everything else is parallel.
- **Critical path** and the constraint.
- **Exemplar**, its acceptance criteria, and the units that fan out after it.
- **Serial points:** shared writes, irreversible actions, schema atoms.
- **Width:** how many run at once, and why that number.
