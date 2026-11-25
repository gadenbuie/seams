---
name: seams-overview
description: "Create or refresh a design overview when the operator asks for one: orient and apply the creation test, scope the document with the operator before writing anything, research the code, write it with the shared procedure in seams-work and seams-orient, verify every claim against the code and tests it names, and hand off with a read-back. Run only when the operator asks for it, as /seams-overview <subject | path-to-overview> [notes]."
metadata:
  author: Garrick Aden-Buie (@gadenbuie)
  version: "1.0"
  invocation: operator
---

# Create or refresh a design overview with the operator

A design overview explains how a system or subsystem works now and why its difficult parts are shaped that way.
The operator asks for one when the explanation is worth keeping but no unit of work owns it: a subsystem has settled, a big change is coming, or a maintainer needs to catch up.

This skill owns that standalone moment, in the same way `seams-propose` owns proposals and `seams-plan` owns plans.
It is not a general documentation or memory skill: it is the entry point for one document type.
The writing and verification rules live in [`<skills>/seams-work/references/documentation.md`](../seams-work/references/documentation.md), under "Create a design overview".
Follow that procedure instead of repeating its rules here.
Maintaining the overviews a unit of work touches stays with `seams-work`.

## Start

1. Read what the operator gave you: `<subject | path-to-overview>` and any `[notes]`.
   A path names an existing overview, so this is a refresh; go to **Refresh an overview**.
   A subject names a system or subsystem to explain; go to **Create an overview**.
1. Read the documentation homes in `AGENTS.md`, the design index, and the design overviews index.
   Read the existing overviews whose subjects neighbor the one at hand, so the new document does not duplicate an explanation another document already owns.
1. Read the canon that governs the subject, and read the code and user documentation well enough to say what exists today.
1. Apply the creation test from the shared procedure.
   When the design is cheaply recoverable from code and user documentation, or an existing document already owns the explanation, say so and stop.
   An existing document can also need a small correction rather than a new one, and the operator decides what to do instead.

## Create an overview

1. **Scope with the operator before writing anything.** Settle the audience, what the document leaves to code, tests, user documentation, and work records, the filename, and the "read it when" entry it gets in the overviews index.
   Offer your reading of the subject and the shape you propose, and keep the recommendation separate from the options (`seams-orient`).
   Nothing is written until the operator confirms the scope.
1. **Research.** Read the code and tests the claims will rest on.
   Collect exact file and symbol references, standing cautions, and the past decisions that explain the present shape, with links to the proposals or canon that hold them.
1. **Write.** Follow the shared procedure and `seams-orient`.
   Give the document the frontmatter `title` and a `description` that says when to read it, use the agreed filename, and add the "read it when" entry to the overviews index.
1. **Verify.** Check every claim against the code and tests it names, follow the links, and run the project's checks.
   Report contradictions between the document and reality rather than resolving them silently.
1. **Hand off.** Give the operator a read-back in their terms (`seams-orient`): what the document explains, what it leaves out, and where to start reading.
   The operator reads the overview and tries the software before the work closes.

## Refresh an overview

1. Read the existing overview in full before changing it.
   Read what prompted the refresh in `[notes]`, or ask the operator.
1. Verify each claim against the code and tests it names.
   Report contradictions rather than resolving them silently.
1. Rewrite the current explanation in place, following the shared procedure and `seams-orient`.
   Update the frontmatter `description` and the index entry when what the document is for has changed.
1. Run the project's checks, then hand off with a read-back of what changed and why, with the evidence for each change.

## Rules

- Nothing is written before the operator confirms the scope.
- An overview is maintained memory, not canon.
  It never authorizes work, never overrides canon, and never becomes a decision log.
- Write the current explanation instead of appending a narrative of the latest change.
- Keep the creation test honest.
  When the subject does not need its own document, say so, even if the operator asked for one.
