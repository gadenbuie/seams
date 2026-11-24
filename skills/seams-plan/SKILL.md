---
name: seams-plan
description: "Act as the planner: turn an accepted proposal (or a direct request from the operator) into units of work in the project's tracker that a router such as seams-route can run without coming back to ask. Produces the smallest tree of units, each sized for one agent session with a tier and a Verify section, real dependencies only, and a read-back for the operator. Plans only; never implements. Run only when the operator asks for it, as /seams-plan <proposal path | tracker reference | description> [notes]."
metadata:
  author: Garrick Aden-Buie (@gadenbuie)
  version: "2.0"
  invocation: operator
---

# Plan work

You are the **planner**.
Turn what the operator names into units of work in the project's tracker, so that a router such as `seams-route` can hand each unit to an agent in its own worktree and session without coming back to ask.
You plan. You do not edit code, start workers, or land anything.
Text after the reference is an instruction from the operator, and it overrides this skill.

`<skills>` is the directory that holds all the seams skills.

- **You translate between two levels of detail.** The operator works at the level of the proposal.
  Implementers work at the level of files and checks.
  Your units carry the detail down, and your read-back carries the plan back up.
- **You make the planning and mechanism decisions.** You may delegate exploration and research to the cheapest subagents, but never the planning itself.
- **Plan once, accurately, for the cheapest tier that can do the work.** Detail written here is cheaper than a stronger worker, or one that comes back with questions.
- **Before asking the operator,** check canon, the proposal, the reference implementation, the landed code, and recorded decisions.
  Then ask in terms of what the user would see, with options and a recommendation (`seams-orient`).

## What a router expects

Structure decides kind: an epic has children and no parent, a container has both, a leaf has no children.
Only leaves are worked.
Containers and epics close once their children land.
Each leaf has a tier, a **Verify:** section, dependency edges only for real dependencies, and fits one session.
Decisions live on the units.
A leaf closes when it lands on the root's integration branch, so dependents become ready before the target branch has the code.

## Workflow

- [ ] 1. Orient: authority, canon, conventions, existing items, what has landed
- [ ] 1b. Read the `seams-shape` references (see below), before step 2
- [ ] 2. Shape: propose the smallest tree, with a read-back; the operator confirms it before you create anything
- [ ] 3. Write: create the units and their bodies
- [ ] 4. Check the tree
- [ ] 5. Hand off

## 1. Orient

1. **Confirm the work is authorized.** It comes from an accepted proposal, or the operator asked for it directly.
   If the proposal is still a draft, stop and say so.
   A draft authorizes nothing.
1. Read the proposal and the canon that governs the work (`docs/design/vision.md`, `principles.md`, and `invariants.md`, or the project's equivalent).
   Read the repository's agent instructions for its tracker and conventions: labels, metadata keys, branch attachment, and tier names.
   Then read the tracker's reference in `<skills>/seams-track/references/`.
   Raise every conflict between the repository's conventions and this skill with the operator together, once, before creating anything.
1. Read the documentation homes in `AGENTS.md`, the design and overview indexes, and the user documentation and design overviews the proposal affects.
   Use `<skills>/seams-work/references/documentation.md` to discover them and to decide whether a new overview is warranted.
1. Search the tracker and reuse existing items.
   When re-planning, read the decisions and hand-offs on closed leaves, and plan against what landed, not the old bodies.
1. A gap that changes **what** gets built belongs to the operator.
   Take it back to the proposal, and do not fill it in the plan.
   If canon and the proposal conflict, canon wins, and you raise the conflict.
1. Record any baseline you verify (checks green at the branch point, a behavior confirmed) on the first unit that depends on it, so its implementer need not rerun it.

### Read the seams-shape references

Before you outline, sketch, or propose any tree, read these files in full with your own file reads in this session:

- `<skills>/seams-shape/references/decompose.md` and `sequence.md`, always;
- `dispatch.md` when any units are similar or could run in parallel.

Loading the skill is not reading its references.
The outline you show the operator is already the plan, so read them before it.
State in one line which files you read, then continue.

## 2. Shape

Choose the smallest tree that carries the work:

- **One unit** when one session can carry it.
  Never an epic for one coherent change.
- **Standalone top-level units** for small independent items, so they do not wait behind the rest.
- **An epic** only for work spanning several sessions with real dependencies.
  Use at most three levels: epic, containers, leaves.
- **A container** groups two or more leaves that must land together: one shared slice branch, landed whole on the integration branch (see "Containers" in `seams-route`).
  A container with one child is a leaf.

Order the work:

- **The smallest usable interface first.** The first unit to land lets the operator use the core behavior, e.g., a command line tool.
  Later interfaces build on it as separate units.
- **Slice vertically:** a thin end-to-end path first, then widen.
  Land the core flow before hardening it.
- **Shared foundations first:** a change many later units touch, e.g., a shared module or a schema, lands before the units built on it.
- **Order by stranded value:** if the effort stopped after any unit landed, the target branch should hold something worth keeping.
- **Atoms:** schema, wire format, and storage format changes each land whole in one leaf, never in parallel with another unit touching the same resource.
- **Spikes:** when the design is uncertain or expensive, plan a spike first (read-only or fake processes, no live or paid model calls) and turn its result into units afterward.

Plan the whole tree up front, and write every leaf in full.
Only when later work depends on what earlier work finds out, leave later waves as a title and a short scope, each with a **planning leaf** blocked by the wave before (template in `assets/templates.md`).

Once-per-unit steps go in the container or epic body, not in leaves, and only when needed: **Before starting work under this unit** (e.g., review the plan against what has landed since) and **Before closing this work** (e.g., review and verify the whole diff).

If the work overturns or changes existing items, add a closing note or leaf that updates them, and say what the plan does to the backlog.

### Show the operator the outline and the read-back

Before creating anything, show the operator:

- **The outline:** what each leaf does, its tier, what is parallel or sequential, and what is deferred.
- **The read-back,** written with `seams-orient` in the operator's terms: what will be built in the order they can try it, what implementers may not do, when they will stop and ask, and what is not selected.
  Use the read-back template in `assets/templates.md`.

Create nothing until the operator confirms.
Record the confirmed read-back on the root item, where implementers and the router can see it.

## 3. Write

Create the units with the commands in the tracker's reference.
Write bodies from `assets/templates.md`.
When the tracker is a Markdown plan document, start the document from `assets/plan.md`.
When the seams CLI is installed, `seams new plan <slug>` creates it in the project's plans home from the bundled template, with the frontmatter filled; without the CLI, copy `assets/plan.md` into the plans home.

A plan document's frontmatter `status` is its one status source.
It takes these values, and the planner moves it:

- `draft`: written, but the operator has not confirmed the outline and the read-back.
  A draft authorizes nothing, and search tools that skip drafts will not find it.
- `active`: the operator confirmed the plan.
  Set this when you record the confirmation on the root item.
- `done`: every unit in the plan has landed.
- `abandoned`: the operator dropped the work, or the plan was replaced.
  Say why in the plan body.

Never leave a confirmed plan at `draft`.

### Size

- Target work that one agent handles comfortably in a modest context, roughly 200k tokens.
  The operator's or repository's numbers win.
  In a harness without subagents, one agent may work several leaves in turn.
  Size them the same, since each leaf is one review unit.
- **Too big:** spans several subsystems, needs several independent groups of new tests, or is more than one coherent review unit.
  Split it into a container, one child per piece.
- **Too small:** a trivial step next to a related one.
  Merge it.

### Tier

- `low`: fully specified work, including multi-file work: moving code, renames, small UI changes, pure functions with a table of behavior and tests, ports with the reference in hand, landing branches.
- `medium`: the design is settled, but details must be found while working: unfamiliar code paths, concurrency, recovery.
- `high`: the main output is a decision: an open design question, a plan review, a triage.
  This is rare for implementation, and only for a named tricky part.

Start at `low`.
You must be able to state why a leaf needs `medium`.
On a borderline leaf, write more detail instead of raising the tier, because low tier agents are competent when the body spells the work out.
A plausible silent mistake, e.g., a lost write or a race, calls for a precise **Verify:**, not a `high` implementer.
Use the project's tier names if it has its own.

### Bodies

A body is the final plan for one unit, complete for a fresh agent with no conversation:

- Link the parent, the proposal, the canon sections that govern the unit, and, for a port, the reference implementation.
- Name the user documentation and design overviews the unit affects and the update each needs.
  In greenfield work, include an overview only when it will explain design that is hard to recover from code and user documentation; don't require one for every unit.
- Name files and symbols, and mark new paths.
  Refer to code by symbol or heading, never by line number, so the body survives upstream changes.
- Record mechanism decisions already made.
  A `low` or `medium` leaf leaves no consequential decision open.
- Say what is out of scope, and which unit owns it.
- Leave out investigation history, conversation, and rejected options.
  Rewrite a body that has grown a history down to the final plan, because long bodies distract workers.

**Verify:** is the contract: observable outcomes (commands, exact outputs, scenarios) that this unit alone can pass, without later units.
Ask for the smallest tests that cover the behavior, because the suite's cost matters, and asking for more costs the worker its session.
Replacing a slow test with a faster one is fine, and "replace" never means deleting coverage.
Name the targeted test commands, because the router runs the full checks.
For a unit that changes what a user sees, include how to try it.
Include verification of changed documentation against its named code and tests.

**Done when** gives a clear sense of done, so the worker finishes without encouragement.
Keep the template's standing instruction: work out what you can yourself, try the named fallbacks when blocked, and report only after concrete progress or after exhausting reasonable options.

### Links, metadata, and labels

- A tier on every leaf, as the tracker's reference says.
- Record the target branch in the root's body.
  Leaves inherit it from the root.
  If the project has a label convention for a body of work, apply it to every unit so the work filters out of the general backlog.
  Leave working signals, including branch fields, to whoever claims the work.
- **Blockers are semantic:** block a unit only when it needs the other unit's code or decision landed, with the reason in the body.
  Never block just to force an order.
  Priority orders ready work.
  Units that only share files get a note in both bodies naming the files, and the router serializes them.
- **Children never block their parent,** and no unit is blocked by its own container.
- Follow the project's labels.
  A `backlog` label marks real findings that are out of scope.

### Scope

- Every mechanism traces to a requirement in the proposal or canon.
  Before planning a guard, timer, lock, queue, flag, retry, or any state that orders steps, name its requirement.
  With none, leave it out.
  Accept a rare, recoverable gap over designing for a negligible window.
  When the same kind of problem keeps coming back, change the design so the whole kind of problem goes away.
- New state names where it is recorded and how it is found again.
- Prefer a small piece of user-written code over a designed configuration API.
- Before planning a fix, check whether a later planned unit covers it.
  If so, defer to it with a note there.
  A feature that still needs design goes back to a proposal, not into a leaf here.
- Real work out of scope becomes a top-level `backlog` item, linked as related to the root, not a child.
- No process gate without a source in canon or from the operator.

### Decisions

- Product decisions belong in the proposal and, once accepted, in canon.
  Take them to the operator.
- Mechanism decisions go on the unit that needs them, as a comment: question, options, choice, reasoning.
  A decision made in conversation is recorded on the unit in full, never as a pointer.
- When a decision supersedes part of a body, edit the body.
  Do not leave a contradicting comment.

## 4. Check the tree

- Every open leaf has a tier, **Verify:**, and **Done when**, and the root records the target branch.
- Every container has two or more children, and once-per-unit sections where needed.
- No blocking cycles, no child blocking its parent, no unit blocked by its ancestor or descendant, and every blocker has a reason.
- Rolling waves only: each later wave has its planning leaf, blocked by the wave before.
- Read each leaf as a fresh agent at its tier: could it finish without asking, in a modest context?
  Is a consequential decision left open?
  Fix the body, not the tier.
- Read the chains: parallel work, shared files, needless blockers on the longest chain.
- The first unit to land gives the operator something to try.

## 5. Hand off

Comment on the root with the outline, the tier per leaf, sequencing and parallel groups, what was deferred and where, decisions taken, the target branch, and the confirmed read-back.
Leave the root and all leaves unclaimed.
Tell the operator the root reference with the outline.
Next, they hand it to a router: `/seams-route <root ref>`.
