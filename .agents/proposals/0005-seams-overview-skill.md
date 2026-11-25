---
title: A seams-overview skill
description: Read when the operator asks to create or refresh a design overview, or when deciding what the seams-overview skill covers.
status: accepted
created: 2026-11-25
source: Operator request in session on 2026-11-25
---

# Proposal: A seams-overview skill

Accepted on 2026-11-25.

- **Related:** [0002-documentation-as-memory.md](0002-documentation-as-memory.md), the shared procedure in `seams-work/references/documentation.md`, and [the design overviews index](../../docs/design/overviews/index.md).

## Summary

seams gains a skill named `seams-overview` that runs when the operator asks to create or refresh a design overview.
The skill researches the code, scopes the document with the operator, writes it, and verifies its claims against the code and tests it names.
The shared writing and verification rules stay in the documentation reference in `seams-work`, and the other skills keep the roles they have.

## Motivation

The operator can ask for a proposal with `/seams-propose` and a plan with `/seams-plan`.
There is no matching way to ask for a design overview.
When the operator says "let's create a design overview", no skill loads, and the agent improvises from the writing rules in `seams-work/references/documentation.md`.
Those rules are written for an agent maintaining documentation inside a unit of work, not for a standalone authoring session, so they leave the scoping, research, and hand-off steps to improvisation.

Verified today:

- The nine skills are `seams-adopt`, `seams-orient`, `seams-plan`, `seams-propose`, `seams-reconcile`, `seams-route`, `seams-shape`, `seams-track`, and `seams-work`.
  None is invoked for the overview moment.
- `seams-work/references/documentation.md` holds the overview writing rules under "Create a design overview", addressed to an agent doing implementation work.
- `docs/design/overviews/index.md` states that seams does not need a separate documentation or memory skill, and its skill table describes what each existing skill contributes to overviews.

## Relation to proposal 0002

Proposal 0002 set aside a focused documentation skill and a general memory skill.
The operator chose to keep memory procedures in the existing skills because a general skill would overlap with `seams-propose`, `seams-track`, and `seams-reconcile`.

This proposal stays inside that decision.
`seams-overview` is not a general documentation or memory skill.
It is the entry point for one document type at the operator's request, in the same way `seams-propose` is the entry point for proposals and `seams-plan` is the entry point for plans.
It owns the operator-initiated moment only.
The writing and verification rules remain in the shared reference, which the skill points to rather than repeats, and maintenance during ordinary units of work stays with `seams-work`.

## Agreed

From the operator's request and replies on 2026-11-25:

- Add a skill for design overviews, invoked by the operator, for the moment they ask to create one.
- The skill also covers refreshing an existing overview.
- The shared procedure stays in `seams-work/references/documentation.md`, and the new skill points to it.
- The work starts from this proposal rather than as an untracked direct change.

## Set aside

- **Extend `seams-work` instead of adding a skill.**
  The operator chose a separate skill because the standalone moment needs an entry point an agent can load, and `seams-work` addresses agents working inside a unit.
- **A general documentation or memory skill.**
  Remains set aside from proposal 0002 for the reasons recorded there.
  This proposal names one document type and leaves the other memory work to the skills that already own it.

## Open questions

None.
The skill name and its scope are part of the work this proposal selects, and the operator confirms both by accepting it.

## Changes on acceptance

### Canon

None.
Design overviews are memory, and the skills are procedures, not canon.
The vision outcome about reading maintained overviews already covers what this skill serves.

### Work selected

- Create `skills/seams-overview/SKILL.md` with `metadata.invocation: operator`, invoked as `/seams-overview <subject | path-to-overview> [notes]`.
  Its workflow:
  1. Orient.
     Read the documentation homes in `AGENTS.md`, the design and overview indexes, canon, and the existing overviews.
     Apply the creation test from the shared procedure.
     When the design is cheaply recoverable from code and user documentation, or an existing document already owns the explanation, say so and stop.
  2. Scope with the operator.
     Settle the audience, what the document leaves to code, tests, and user documentation, the filename, and the index entry.
     Nothing is written until the operator confirms.
  3. Research.
     Read the code and tests the claims rest on, and collect exact file and symbol references, standing cautions, and past decisions that explain the present shape.
  4. Write.
     Follow the shared procedure and `seams-orient`, including the frontmatter `title` and `description` and the "read it when" entry in the overviews index.
  5. Verify.
     Check every claim against the code and tests it names, follow the links, run the project checks, and report contradictions rather than resolving them silently.
  6. Hand off.
     Give the operator a read-back in their terms.
     The operator reads the overview and tries the software before the work closes.
  For a refresh, the skill reads the existing overview, verifies each claim, rewrites the current explanation in place, and reports what changed and why.
- Add the symlink in `.agents/skills/` so the skill loads in this project.
- Update `docs/design/overviews/index.md`: add a row to the skill table and revise the sentence that says seams does not need a separate documentation skill, so it describes what the new skill does and does not own.
- Add a pointer from `seams-work/references/documentation.md` to the new skill for the standalone moment.
- List the skill in the human documents that name the skills, e.g., `README.md` and `docs/guide.md`.
- `make check` passes with the new skill in place.

What acceptance does not select: changes to vision, principles, or invariants; CLI commands for authoring overviews; new frontmatter fields; changes to how the other skills handle documentation.

Documentation affected: `README.md`, `docs/guide.md`, and `docs/design/overviews/index.md`.
No new overview is expected; the skill folder and the shared reference are the product this work ships.
