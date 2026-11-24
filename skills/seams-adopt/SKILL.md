---
name: seams-adopt
description: "Set up seams in a new project, or move an existing project's documentation and work tracking to seams: create canon and design overviews in docs/design/ or a compatible project-specific home, the .agents/ folders, a short AGENTS.md, and choose a work tracker. For existing projects, sort current documents by type before moving anything. Run only when the operator asks for it, as /seams-adopt [notes]."
metadata:
  author: Garrick Aden-Buie (@gadenbuie)
  version: "2.0"
  invocation: operator
---

# Adopt seams

Set up only what the project needs now.
A new project needs a short `AGENTS.md`, a few lines of vision, and a tracker.
Principles and invariants come later, from real decisions.
In an existing project, the main risk is turning old notes into rules or old plans into active work, so sort before you move.

Read the project's own instructions and its actual files before editing anything.
Preserve uncommitted work that isn't yours.

## Choose the design root

1. Keep a useful existing home for the same kind of documentation.
   Record it in `AGENTS.md` instead of moving documents to a new default.
1. Otherwise, use `docs/design/` when it can coexist with package builds, generated documentation sites, and the project's publishing conventions.
   Move generated output or exclude maintainer-only source files when the project's tools allow it.
1. When repo-level `docs/` is unavailable, use `.agents/design/` with the same structure.
   Ensure Git tracks the files and agents can discover them through `AGENTS.md`.
   Stop and ask the operator when ignore rules or local conventions would leave the documents untracked or hard to find.

Use `<design-root>` below for the chosen path.
Follow `<skills>/seams-work/references/documentation.md` when creating or moving design overviews.

## The layout

```text
AGENTS.md            where things live, which tracker to use, how to run checks
<design-root>/      the chosen design root
  index.md           navigation for canon and design overviews
  vision.md          purpose, users, outcomes, non-goals
  principles.md      how the project decides between options
  invariants.md      rules that must hold; planned ones are marked Planned
  invariants/        optional canon files when invariants are split by topic
  overviews/         maintained memory about the current design
    index.md         navigation for the overviews
    <system-or-subsystem>.md
    concept_<topic-slug>.md  optional standalone cross-cutting concept
    flow_<flow-slug>.md      optional standalone cross-subsystem flow
.agents/proposals/   proposals (seams-propose)
.agents/plans/       plans and notes
<tracker>            work items: kata, GitHub issues, Markdown, or another tracker
```

The named root files and optional `invariants/` folder are canon.
Everything under `overviews/` is memory.
The index files provide navigation and don't make independent rules.
When invariants are split by topic, `invariants.md` becomes an index and each invariant lives in exactly one topic file.

Most concepts and flows belong in their owning subsystem overview.
Use the optional prefixes only for standalone documents that cross subsystem boundaries or need shared links.
Don't create an overview for every file, feature, or unit of work.

If the project already keeps these things under other names, keep its names and record where each type lives in `AGENTS.md`.
The types and their limits matter, and the file names do not.

## AGENTS.md

`AGENTS.md` is read in every session, so every line should change how an agent behaves.
Keep it short, and point to files instead of copying them.
Include:

- one or two sentences on what the project is;
- where canon lives, and the rule that only the operator changes it;
- where design overviews and user documentation live;
- where proposals and plans live, and that they authorize nothing until accepted;
- the tracker, and the `seams-track` reference to use;
- setup and check commands;
- safety limits, e.g., what agents must never run or touch.

Leave out feature lists, architecture essays, and anything already in canon.

## New project

1. Choose the design root with the operator using the rules above.
1. With the operator, write `<design-root>/vision.md`: purpose, users, outcomes, and non-goals.
   A few lines is enough.
1. Add `principles.md` and `invariants.md` only if the operator already holds principles or rules.
   Do not fill them with guesses.
1. Write `<design-root>/index.md` as a short index of the canon files and overviews.
   Create `overviews/index.md`, but don't write individual overviews before there is a design to explain.
1. Choose a tracker with the operator.
   An existing tracker wins over introducing a second one.
1. Write `AGENTS.md`.
1. Create `.agents/proposals/` and `.agents/plans/`.
1. Pick the first piece of work with the operator.
   Use `seams-propose` if it needs discussion, or `seams-work` if it is a clear change.

## Existing project

### 1. Set the scope

Identify what the operator wants moved, the documents and trackers involved, the active work, and the current revision.
Record what must not change.
Do not rewrite product commitments to fit seams.

### 2. Sort statements by type

Sort statements, not files.
One document often mixes several types.

| What the statement is                                          | Where it goes                                                                                                                            |
| :------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose, direction, users, non-goals                           | `vision.md`                                                                                                                              |
| A reusable way of choosing between options                     | `principles.md`                                                                                                                          |
| A rule a reviewer would reject a change for breaking           | `invariants.md` (mark it **Planned** if the code doesn't follow it yet)                                                                  |
| A plan, idea, option, or investigation that was never accepted | `.agents/plans/` or a proposal, as memory                                                                                                |
| The reasoning behind a past decision                           | The proposal or record it came from; turn it into a principle if it applies widely                                                       |
| Selected scope, status, sequence, hand-offs                    | The tracker                                                                                                                              |
| A description of current behavior or system structure          | Check it against the code and tests, then keep it in its owning user document or design overview. Fix or remove prose that misstates it. |

Present the sorted list to the operator before moving anything.
When two documents contradict each other, ask the operator which holds.
Do not pick the longest or newest one by default.
Nothing becomes canon without the operator's acceptance, so present the proposed canon files to them as a proposal (`seams-propose`) or as a reviewed change.

### 3. Choose or keep the tracker

Keep the existing tracker if agents can use it to find, read, and record work, mark open questions, and close on evidence (see `seams-track`).
Move active work only: its objective, acceptance, scope, dependencies, decisions, evidence, and next action.
Keep completed work as read-only history.
Do not turn old ideas into active items.

### 4. Cut over

1. Move or relabel documents according to the sorted list.
   Keep canon and design overviews physically separate.
   Give each rule, contract, and status one owning home.
   Let design overviews repeat enough context to explain connections, with links to the owning documents.
1. Update `AGENTS.md` and every affected link in the same change.
1. Name one active status source for each piece of work, and stop updating any other.

### 5. Check representative paths

Walk at least these paths as a fresh agent would:

- from `AGENTS.md` to an active work item, the canon that governs it, and the checks;
- from the design index to a relevant overview and the code and tests that support its claims;
- a small mechanical task that reaches its checks without reading a proposal;
- a draft proposal or old plan that a reader can tell apart from canon and current-state overviews.

Run the project's checks.
Report unresolved conflicts and any check you could not run.

## Output

Report the tracker, the design root, the canon files and overview index created, what was moved and where, the cutover point, the paths you checked, and the decisions still waiting for the operator.
Installing the seams skills in an agent harness is a separate step from adopting the conventions.
