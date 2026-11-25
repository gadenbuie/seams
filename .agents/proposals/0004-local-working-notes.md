---
title: A local home for working notes
description: Read when deciding where short-lived research, experiments, and background belong and how agents should discover them.
status: accepted
created: 2026-11-25
source: Direct request from the operator on 2026-11-25
---

# Proposal: A local home for working notes

Accepted on 2026-11-25.

- **Related:** [Invariant 1](../../docs/design/invariants.md#1-each-statement-lives-in-the-home-that-matches-its-type),
  [invariant 3](../../docs/design/invariants.md#3-memory-never-becomes-canon-just-because-it-persists-is-detailed-or-is-recent),
  [invariant 8](../../docs/design/invariants.md#8-agents-coordinate-only-through-artifacts-that-any-agent-can-read),
  [Documentation as part of project memory](0002-documentation-as-memory.md), and
  [An npm CLI for seams](0003-npm-cli.md)

## Summary

seams would give short-lived working notes a home of their own and record that home in `.agents/seams.json`.
Notes would hold experiments, research, and background that may help a future proposal or other work.
They could come from the operator or an agent, and the convention would recommend leaving them uncommitted.

Adoption would look for an existing operator convention and then ask the operator to confirm a notes home, suggesting `_dev/notes/` when no clear convention appears.
The CLI could discover an existing `_dev/notes/` without a manifest entry, but it would not create or assume a home that does not exist.
Notes would remain exploratory memory, not plans, maintained documentation, or shared decision records.

## Motivation

Research and experiments often produce useful material before there is a proposal or selected work to hold it.
The material may be worth keeping for a few sessions without becoming a plan with a status or a document that needs permanent maintenance.

Today, invariant 1 accidentally groups notes with plans and findings, but does not give them a distinct home or explain how local notes relate to shared work.
Notes are fundamentally different from the durable content that drives a project forward.
Without a named boundary, ephemeral research, discovery, and testing material can mix with selected plans, appear to be agent-owned, enter public documentation, and contaminate higher-quality information.

A local home makes this material easier to keep without giving it more authority or maintenance than its useful lifetime deserves.

**Verified before acceptance from the files and code:**

- Invariant 1 grouped `Plan, note, finding` under `.agents/` or the tracker.
- The guide and `seams-adopt` placed working notes beside plans in `.agents/plans/`, but plans carried status and creation metadata.
- The manifest supported `design`, `overviews`, `proposals`, and `plans` paths. It had no `notes` path.
- CLI discovery gave every document one of four types: canon, overview, proposal, or plan. Its checks expected a title and description for every discovered document and additional status metadata for proposals and plans.
- This repository had no dedicated notes directory and no project ignore rule for one.

## Agreed

- seams should recognize working notes for experiments, research, background, and similar material that is useful for a limited time and may support future work.
- A project should record its notes home in `.agents/seams.json`, alongside the other documentation homes.
- Notes can be written by the operator or an agent. The location should not imply that all notes are agent-written.
- The convention should recommend leaving notes uncommitted.
- Notes are the lowest-weight kind of project memory. They may describe an experimental idea that failed, code that works only on a particular branch, or an artifact used during development to prove out an idea.
- Notes do not authorize work, change scope, or become canon by persisting.
- General `seams list` and `seams find` omit notes. Both include notes only when the caller selects `--type notes`, and `seams read` opens a note explicitly by path.
- Notes require no frontmatter. The CLI falls back to the first H1 or filename for a title, and missing note metadata is not a check failure.
- Adoption starts with a bounded search for the operator's existing notes conventions. The operator confirms a discovered home or chooses another one; the agent suggests `_dev/notes/` when no clear convention exists. seams does not choose a home on its own.
- Without `paths.notes`, the CLI discovers `_dev/notes/` only when that directory already exists. It does not create the directory or treat it as the notes home when absent.

## Location options

An existing useful home wins under every option. The choice below sets the convention when a project has no notes home yet.

### `_dev/notes/`

This treats notes as durable local artifacts rather than agent configuration or public documentation.
The name is neutral about who wrote them, and `_dev/` can hold related experiment files beside Markdown notes.
A project needs an ignore rule for the notes home, and contributors who do not already use `_dev/` need to learn the convention.

### No conventional home

Every project would choose and record a notes home during adoption.
This preserves local conventions and avoids an unsuitable default, but adds a required decision and makes fresh agents rely entirely on the manifest and `AGENTS.md`.

### Existing-folder detection without a default

Adoption would first look for existing operator conventions and ask the operator to confirm the home.
It would suggest `_dev/notes/` when no clear convention appears, but would not choose for the operator.
Outside adoption, the CLI could use an existing `_dev/notes/` while doing nothing when the directory is absent.
This preserves the opt-in choice without requiring a manifest entry for an already established local convention.

## Location decision

Use existing-folder detection without a default.
`_dev/notes/` is the suggested choice when adoption finds no existing convention, not a home that seams creates or selects on its own.
The adoption procedure should ignore the notes directory itself rather than assuming that all of `_dev/` is disposable or ignored.

## Proposed design

The agreed behavior above is normative. The details here remain proposed until acceptance.

### Local notes and shared work have different jobs

Notes are available to people and agents working in the same checkout.
They are not coordination artifacts for fresh worktrees, other clones, or selected work.

When a proposal, work item, review, or maintained document relies on information from a note, the needed content moves into that shared artifact in full.
A link to an uncommitted note can provide optional background, but it cannot be the only record of a decision, acceptance criterion, scope, or evidence.

### The manifest records the home

The manifest would accept an optional `paths.notes` entry:

```json
{
  "$schema": "https://pkg.garrickadenbuie.com/seams/schemas/v1/seams.schema.json",
  "schemaVersion": 1,
  "seamsVersion": "0.1.0",
  "paths": {
    "design": "docs/design",
    "overviews": "docs/design/overviews",
    "proposals": ".agents/proposals",
    "plans": ".agents/plans",
    "notes": "_dev/notes"
  },
  "reconcile": {
    "lastReconciledRevision": null
  }
}
```

The path would follow the existing manifest rules: relative to the repository root, inside the repository, and written with forward slashes.
When the entry is absent, the CLI would probe for `_dev/notes/` and use it only if the directory already exists.
No notes directory would be created as a side effect of reading, listing, searching, or checking.
A missing notes directory would not produce a warning, whether the home comes from the manifest or existing-folder detection, because notes are optional and local.
`seams-adopt` would begin with a bounded search for existing conventions, present what it finds, and suggest `_dev/notes/` if no clear candidate appears.
After the operator confirms a home, adoption would record it in `AGENTS.md` and the manifest and offer an ignore rule for that directory rather than unrelated files.

### Notes require explicit selection

The CLI would understand a fifth document type, `note`, with the authority label `note (not authorization)`.
`seams read` would open a note by path, and `seams list --type notes` and `seams find --type notes` would select them.
General `seams list` and `seams find` would omit notes.

This keeps the lowest-weight memory out of higher-quality document collections and search results unless the reader deliberately asks for it.
The notes home could contain subfolders and supporting experiment files; CLI search and listing would cover Markdown files as it does for overviews.

### Notes need little structure

Notes would not need frontmatter, a status, a template, or a creation command.
For listing and search, the CLI could use the first H1 or filename as the title, as it already does for incomplete documents, without reporting missing note metadata as a check failure.
An operator or agent could add frontmatter when it helps, but the convention would not require it.

Notes would have no automatic retention period or cleanup process.
When information becomes durable, the operator or agent moves it into the proposal, tracker, canon, user documentation, or design overview that owns it.

## Set aside

- **`.agents/notes/`.** Considered and discarded because it suggests agent authorship and mixes local exploratory material with tracked agent instructions and settings.
- **`docs/notes/`.** Considered and discarded because it suggests maintained, commit-worthy documentation and may expose notes through documentation builds or publishing.
- **Manifest path only.** The operator chose a distinct note type with explicit listing, search, and reading rather than configuration alone.
- **A general catalog group.** Considered and then discarded after review. General listings and searches leave out the lowest-weight memory so notes do not contaminate higher-quality information.
- **Strict manifest-only discovery.** The operator chose to detect an existing `_dev/notes/` even without a manifest entry.
- **An unconditional `_dev/notes/` fallback.** The directory is used only when it exists. seams does not create or select a notes home by default.
- **Automatic selection during adoption.** The agent first makes a bounded search for existing conventions, and the operator confirms the home.
- **Required note frontmatter.** The operator chose no required metadata so plain notes remain cheap to write.
- **A definition or home for findings.** The operator removed `finding` from invariant 1 rather than leaving another broad category that could repeat the notes problem. Findings need separate consideration later.

## Open questions

None remain for acceptance.
Local choices such as how to bound the adoption search and how to structure the note discovery code belong to planning and implementation.

## Accepted changes

Acceptance selected the canon changes and work below. It did not start implementation.
The canon edits remain unapplied and land with the implementation work.

### Canon

#### `docs/design/principles.md`

Add this principle:

> ## Make room for scratchpads
>
> Experiments, research, and background can be useful without becoming plans or maintained documentation.
> Give these low-friction notes their own home and keep them out of general listings and searches.
> Move any content that informs a decision or selected work into the artifact that owns it.

#### `docs/design/invariants.md`

In invariant 1, replace the `Plan, note, finding` entry with:

> - Plan
>   - **Location:** `.agents/` or the tracker
>   - **Weight and context:** Working weight for linked work.
>     It provides analysis and context, but can't independently change accepted direction or scope.
> - Note
>   - **Location:** The project's configured notes home, or an existing `_dev/notes/` when the manifest is silent.
>     Adoption suggests `_dev/notes/` only after checking for existing operator conventions, and the operator confirms the home.
>   - **Weight and context:** The lowest-weight exploratory memory.
>     It may hold failed experiments, branch-specific code, development artifacts, research, and background, but it authorizes nothing and is not a shared decision or work record.
>     Notes are local and uncommitted by default, and general document listings and searches omit them.

In the metadata paragraph of invariant 1, add:

> Notes do not require frontmatter or a status.

In invariant 1, replace the final sentence with:

> An existing home for the same kind of statement wins over the default.

In invariant 8, add:

> Local notes are not coordination artifacts.
> When shared work relies on information from a note, the proposal, work item, repository file, or commit records the needed content in full.
> A link to an uncommitted note may provide optional background, but it cannot be the only record of a decision, scope, acceptance criterion, or evidence.

`docs/design/vision.md` and invariant 3 need no changes.

### Work selected

Acceptance selected these outcomes:

- Add `paths.notes` to the project manifest and schema with existing path validation, plus read-only detection of an existing `_dev/notes/` when the manifest is silent.
- Add notes as a distinct CLI document type with explicit authority, opt-in listing and search, explicit reading, optional metadata, and no missing-directory warnings or directory creation.
- Update adoption so the operator can keep or choose a notes home, the manifest and `AGENTS.md` record it, and the recommended ignore rule keeps note contents uncommitted without ignoring unrelated files.
- Update the proposal and documentation procedures so temporary research can stay in notes while decisions and durable explanations move into their owning shared artifacts.
- Apply the convention in this repository by recording `_dev/notes/` in its manifest and `AGENTS.md` and ignoring that directory's contents.
- Add schema, configuration, discovery, reading, search, check, and package tests for notes, including custom homes, ignored local content, plain Markdown without frontmatter, and the boundary between general and note-specific listing and search.

Acceptance did not select a note template, `seams new note`, note statuses, automatic cleanup or retention, automatic promotion into proposals, or a requirement that every project keep notes.
It did not make notes shared tracker records or evidence that work is done.

Documentation affected: `docs/guide.md`, `AGENTS.md`, `skills/seams-adopt/`, `skills/seams-propose/`, `skills/seams-work/references/documentation.md`, and `docs/design/overviews/npm-cli.md`.
The manifest reference, schema, CLI commands, and affected tests would also change.
No new design overview is expected.
