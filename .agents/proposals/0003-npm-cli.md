---
title: An npm CLI for seams
description: Read when working on the seams npm CLI, document navigation, or skill installation.
status: accepted
created: 2026-11-24
source: a design conversation between the operator and Pi on 2026-11-24
---

# Proposal: An npm CLI for seams

## Summary

seams would gain a public npm package named `@grrrck/seams`.
The package would install the seams skills, start agent-led adoption, and help agents find and read project information without losing its authority.
It would also provide mechanical commands for creating documents, finding documentation affected by source changes, collecting reconciliation evidence, and checking project conventions.

The CLI would support existing ways of working.
It would not infer an agent's role, manage work, replace a tracker, run agents, or write canon and design overviews on its own.
Agents would choose what to look up and what to read.
The CLI would handle deterministic file, search, validation, and installation work.

The main value is selective access to project memory.
Easy setup and skill installation make that value available without requiring a project to adopt a new execution system.

## Motivation

The seams conventions give information a home and distinguish canon, memory, working records, and reality.
The skills explain how to use those records, but an agent still needs to discover paths, read indexes, search files, inspect long documents, and remember mechanical maintenance steps.
Those steps consume context and are easy to skip.

Installing the skills also requires knowing where each agent harness stores them.
A project may use several harnesses, and installed copies can become outdated or diverge from the package.
Setup should be easy for a person to start and safe for an agent to continue.

A CLI can help with these problems without changing the authority model.
Search results can say whether a statement is canon, current memory, a draft proposal, or accepted history.
Outlines and section reads can reduce the amount of text an agent loads.
Documentation impact reports can list files to review without claiming that they are stale.

The CLI should stay within that information boundary.
Workflow orchestration would make seams harder to adopt and would duplicate tools that projects already use.

## Agreed

### Scope and authority

- The CLI supports shared project memory and the movement of information between people and agents.
- The CLI does not decide how work gets done.
  It does not assign work, infer an agent's role, or assemble role-specific work packets.
- Agents lead lookup and reading.
  The CLI responds to explicit queries, paths, and document types.
- Every retrieval command preserves the authority of its results.
  A draft proposal remains clearly marked as a draft, and an overview remains memory that needs verification against reality.
- The CLI does not become a tracker, an autonomous agent runner, or an automatic writer of canon or design overviews.
- The CLI is optional for using seams.
  The skills and conventions still work through ordinary file reads and shell commands when the CLI is unavailable.

### Setup and skills

- The public package name is `@grrrck/seams`.
- Getting started should require little explanation.
  The website can tell someone to ask their agent to run `npx @grrrck/seams init`.
- Adoption remains agent-led through `seams-adopt`, for both new and existing projects.
  The CLI does not scaffold canon or migrate existing documents on its own.
- `init` supports an explicit `--agent` mode and automatic agent detection.
  Agent mode provides instructions directly to the current agent and never opens an interactive prompt.
- Skill management has a separate `skills` command family.
  Someone can list, inspect, or install the bundled skills without installing other integrations.
- Installation and update reports should identify modified, missing, and divergent skill copies.

### Document navigation and creation

- Document commands live at the top level instead of under a `docs` namespace.
- The first navigation commands are `list`, `find`, and `read`. `read outline` is a subcommand because outline output does not combine with section or line selection.
- Canon and design overviews use lightweight YAML frontmatter with only `title` and `description` fields.
  Proposals and plans add `status` and `created`, and proposals may include `source`.
  The description says when to read the document.
  The CLI uses these fields to build listings, while existing indexes remain reading guides.
  Documents do not repeat frontmatter fields in their body text.
  The CLI does not require a separate catalog or model-based search.
- `new <proposal|plan|overview> <slug>` handles naming conventions, duplicate checks, and templates.
  Proposal and plan templates are useful.
  An overview remains minimal because seams does not require a fixed overview structure.
- There is no `status`, `context`, or `why` command in the selected design.

### Mechanical maintenance

- `impact` accepts either explicit paths or `--git-diff`.
  It finds references to those files in canon, design overviews, proposals, and plans.
- Impact results are candidates for review, not proof that a document is stale.
- `reconcile --since <revision>` is a bounded shortcut for the mechanical steps in reconciliation.
  It collects evidence for the agent-led `seams-reconcile` skill and does not interpret drift or change canon.
- The first reconciliation command requires an explicit starting revision.
  It does not need stored state and must not record that reconciliation finished merely because it collected evidence.
- `check` validates project documentation and conventions. `skills check` has the separate job of checking installed skill copies and available updates.

### Configuration and output

- A tracked `.agents/seams.json` manifest records documentation homes, package and schema versions, and optional reconciliation state.
- A versioned JSON Schema describes the manifest.
  The schema is available at a published URL and inside the npm package for editor, agent, and offline use.
- Read commands provide stable JSON output as well as text for people.
- Commands support noninteractive use.
  Installation and update commands support dry runs and preserve existing content.
- Output is bounded where a command searches or collects evidence.
  Exact paths, headings, and line ranges let an agent continue with a deeper read.

### Later work

- Harness hooks are deferred until use shows where agents go off script and which reminders would help.
  Hooks should not be added speculatively.
- An MCP server is an interesting later interface over the same read commands.
  It is not part of the first release.
- Work and review orchestration is off the table for this CLI.

## Research findings

### `flawless-ui-ux`

The [`flawless-ui-ux`](https://github.com/smokeeaasd/flawless-ui-ux) package provides useful installation and maintenance patterns.
Version 3.0.0 supports project and global scopes, several agent harnesses, dry runs, JSON output, and diagnosis of modified or divergent skill copies.
Its installer records package versions and file hashes.

Its current release moved contextual initialization out of the terminal and into the coding agent.
The CLI handles deterministic installation and inspection, while the agent asks questions and writes product context. seams would use the same division: the CLI installs and supplies instructions, and `seams-adopt` leads adoption.

The unscoped npm package named `seams` is unrelated.
It is a markup-based static-site CMS that stores content in MongoDB, and its latest version was published in 2017.
The scoped package name avoids that conflict.

### Coding patterns from past work

A documentation skill from the operator's past work uses a small Node script to list Markdown documents and inspect their outlines.
Its catalog includes descriptions and byte sizes.
Its outline output includes headings, inclusive line ranges, and section sizes while ignoring headings inside frontmatter and fenced code blocks.

The skill tells agents to choose the smallest relevant sections and to keep a compact note of what they read.
A navigation subagent can return paths, ranges, and reasons instead of copying complete documents into the parent context.

seams can adopt the skill's lightweight frontmatter without adopting its other conventions.
A `title` and short `description` would let the CLI build a listing directly from documents in the configured documentation homes.
The documentation-as-memory proposal already identifies titles and descriptions as useful selection aids.
Existing indexes remain useful reading guides, but the CLI would not depend on duplicate index entries or require a second catalog.

### The npm `skills` package

The [`skills`](https://github.com/vercel-labs/skills) package provides a documented programmatic API for framework CLIs.
Version 1.9.0 exports source resolution, skill installation, installed skill listing, removal, agent detection, and supported-agent discovery.
Local directories are supported sources, so the seams package can install skills bundled in its npm tarball.

The public API follows semver and does not prompt, print, or exit the process.
It supports project and global scopes, copy and symlink modes, lock files, content hashes, and many harnesses.
It is ESM-only and requires Node 22.20 or later. seams should disable the library's telemetry in its own calls.

The library does not remove every seams-specific maintenance concern.
The implementation must not leave an ephemeral npx cache path as the only identity for an installed skill.
Installation metadata needs a stable package identity and enough version and hash information for `doctor`, `skills check`, and `skills update`.
Those commands can compare installed copies with the skills bundled in the running seams package.

### Harness hooks and MCP

Claude Code, Codex, and Pi currently provide lifecycle extension mechanisms.
Their events and installation formats differ, but a later adapter could translate them into a shared command.
That feasibility does not establish that hooks are useful.
The first release should gather experience without them.

An MCP server could expose the same explicit list, find, and read operations later.
The CLI comes first under the existing principle of delivering small usable interfaces before larger ones.

## Proposed design

### Package and runtime

The publishable package is `@grrrck/seams`, with a `seams` executable.
It requires Node 22.20 or later to match the supported `skills` library.
The existing documentation-site tooling remains private and separate from the publishable package.

The root `skills/` directory remains the source of truth for seams skills.
The package build includes those files in the npm tarball instead of maintaining a second hand-edited copy.
Package tests inspect the tarball to ensure that the skills, references, templates, and schemas are present.

### Project manifest

Agent-led adoption writes `.agents/seams.json` after the operator chooses the documentation homes.
The initial shape is:

```json
{
  "$schema": "https://pkg.garrickadenbuie.com/seams/schemas/v1/seams.schema.json",
  "schemaVersion": 1,
  "seamsVersion": "0.1.0",
  "paths": {
    "design": "docs/design",
    "overviews": "docs/design/overviews",
    "proposals": ".agents/proposals",
    "plans": ".agents/plans"
  },
  "reconcile": {
    "lastReconciledRevision": null
  }
}
```

Paths are relative to the repository root. `AGENTS.md` points to the manifest as the machine-readable record of documentation homes.
It still states the authority rules that every agent needs.
Commands may use the conventional layout when the manifest is absent, but custom homes need an explicit manifest.

`schemaVersion` controls parsing and migrations. `seamsVersion` records the package version that last intentionally initialized or migrated the configuration.
Ordinary reads do not rewrite either field.

`reconcile.lastReconciledRevision` is optional state for later use.
The initial `reconcile` command requires `--since` and does not update the field.
If a default starting point is added later, only an explicit completion action may advance it.
The tracked file would make that state available to fresh agents and worktrees.

The npm package bundles the versioned JSON Schema, and the documentation site publishes the same schema at the URL above. `seams schema` prints the current schema, while `seams schema --path` prints its bundled local path.
The CLI validates the manifest before writes and through `doctor`.

### Command surface

The proposed first public command surface is:

```text
seams init [--agent]
seams install
seams doctor

seams list [--type canon|overviews|proposals|plans]
seams find <query>
seams read <document> [--section <heading> | --lines <range>]
seams read outline <document>
seams new <proposal|plan|overview> <slug>
seams impact --git-diff
seams impact <path> [paths...]
seams reconcile --since <revision>
seams check
seams schema [--path]

seams skills list
seams skills get <name>
seams skills install
seams skills check
seams skills update
```

#### `init` and `install`

`init` installs the skills and hands adoption to the agent.
In agent mode, it emits the `seams-adopt` instructions or direct instructions for obtaining them through `skills get`.
The current agent can continue without waiting for a new session to discover installed skills.

Outside an agent, `init` provides an interactive setup and clear next steps.
Automatic detection selects agent mode when the command runs inside a known harness.
Explicit `--agent` always selects noninteractive agent mode.

`install` manages seams integrations and initially installs the selected skills.
It has room to cover other integrations later without changing the narrower meaning of `skills install`.

#### `skills`

`skills list` shows bundled skills and their installation state. `skills get <name>` emits a skill and its bundled references, or returns their contents and paths in JSON, without installing them.
An agent can use this path when it wants instructions without a persistent skill installation.

`skills install` uses the supported `skills` library for agent detection and installation.
Project and global scopes, explicit agent selection, copy or symlink behavior, and noninteractive operation follow the library's supported features.

`skills check` reports modified, missing, untracked, and divergent copies. `skills update --dry-run` previews updates from the running package.
Update preserves modified or unknown copies for manual reconciliation instead of overwriting them.

#### `list`, `find`, and `read`

`list` discovers documents in the configured documentation homes and reads metadata from their YAML frontmatter.
It returns a compact catalog with paths, titles, descriptions, byte sizes, document types, and statuses and creation dates for proposals and plans.
It does not depend on hand-maintained index entries.
Filters select canon, overviews, proposals, or plans.

`find` searches explicit document types and statuses.
Results include short excerpts, paths, headings, line numbers, and authority labels.
Draft, rejected, deferred, and historical material is excluded by default unless the caller requests it.
Search starts with exact text and simple ranking rather than a vector database or model call.

`read` returns a whole small document, a named section, or an inclusive line range. `read outline` returns headings, inclusive line ranges, and byte sizes.
The parser ignores headings inside frontmatter and fenced code blocks.
Output includes enough source information for a later targeted read.

#### `new`

`new proposal` finds the next unused proposal number, checks for similar open proposals, applies the proposal template, and writes `status: draft` and the current `created` date in frontmatter. `new plan` applies the project's plan naming and template conventions, including `status` and `created` frontmatter.
Every new document includes `title` and `description`. `new overview` otherwise creates only the minimal starting document and updates the index when asked.
None of these commands creates or edits canon.

#### `impact`

`impact <path> [paths...]` finds canon, overviews, proposals, and plans that link to or name the supplied files. `impact --git-diff` obtains the paths from the current Git diff and performs the same lookup.

Results retain document authority and proposal or plan status.
The command reports candidates for review, not stale documents.
An agent must compare the relevant prose with the changed code and tests.

#### `reconcile`

`reconcile --since <revision>` collects the evidence an agent would otherwise need to gather through several commands:

1. Record the current revision and requested starting revision.
1. List changed files since the starting revision.
1. Run the same reference lookup used by `impact` for those files.
1. Collect broken links, index coverage problems, and proposal or plan candidates for review.
1. Return a bounded summary and a JSON manifest with exact paths for deeper inspection.

The command does not decide whether a document contradicts reality, whether memory is acting like canon, or which correction the operator should accept. `seams-reconcile` retains those duties.

#### `check`, `doctor`, and `schema`

`check` covers mechanical project checks, including local links and anchors, design index coverage, required document frontmatter, skill references, proposal numbering, status fields, and manifest validity.
It can delegate formatting and project-specific checks to the project's existing tools.

`doctor` reports manifest problems, missing configured paths, missing `AGENTS.md` discovery, runtime requirements, and skill installation state.
It does not claim that a harness loaded a skill or that documentation agrees with code.

`schema` exposes the bundled JSON Schema without a network request.
The published schema URL supports editors, and the bundled file supports agents and offline tools.

### Output and safety

Text output is concise enough for an agent to use as a navigation result.
JSON output has a stable, versioned shape and includes source locations and authority labels.
Search and evidence commands support explicit result or byte limits and report when results were omitted.

Read commands do not require network access, modify files, or write session state.
Write commands preserve uncommitted work and existing content.
Noninteractive calls never open prompts.
A failed preflight stops an installation or update before any selected destination changes.

The CLI never accepts a proposal, marks canon as accepted, or automatically updates a design overview.
Mechanical warnings are not semantic findings about intent or reality.

## Set aside

- **Workflow-specific context packets.** The CLI does not infer roles or gather accepted scope and work records for an implementer, reviewer, or operator.
- **Work and review support.** The CLI does not claim work, prepare routing packets, launch agents, or close tracker items.
- **`status`, `context`, and `why`.** Explicit document commands cover the selected need with less workflow coupling.
- **Harness hooks for the first release.** They require evidence about actual failure modes and useful intervention points.
- **An MCP server for the first release.** It can reuse the read layer later.
- **A separate document catalog or a large metadata schema.** The CLI reads the selected fields from frontmatter, and existing indexes remain reading guides.
- **Model-based or vector search.** Simple search establishes the need before adding dependencies and indexing state.
- **Automatic documentation or canon writing.** Agents and the operator retain those duties.
- **Automatic reconciliation state.** The first command requires `--since` and only collects evidence.

## Proposed canon changes

The exact text below would move the durable decisions into canon on acceptance.

### `docs/design/vision.md`

Replace the first sentence with:

> seams is a set of conventions, agent skills, and a command line tool for people who build software with coding agents.

Add this outcome:

> - Agents can find relevant canon, memory, proposals, and plans through selective reads that preserve each statement's authority.

### `docs/design/principles.md`

Add this principle:

> ## Keep tools focused on information
>
> Tools help people and agents find, read, and maintain project information without taking over the project's way of working.
> A tool may report the source and authority of a statement, but it may not raise the statement's authority or treat retrieval as verification.
>
> Prefer small commands with explicit inputs and bounded output.
> An agent chooses what to look up and which documents to read.
> Tools handle deterministic checks and leave judgments about intent, meaning, and current behavior to the operator and agents.

### `docs/design/invariants.md`

Replace the final paragraph of invariant 1 with:

> A project may use other file names, including `memory/` or `architecture/` instead of `overviews/`, if its agent entry point, e.g., `AGENTS.md`, says where each type lives or points to `.agents/seams.json` as the record of those homes.
> When repo-level `docs/` is unavailable, the default design root is `.agents/design/`, with the same canon files and `overviews/` folder.
> An existing home for the same kind of documentation wins over the default.
>
> Canon and design overviews start with YAML frontmatter that provides a `title` and a short `description` of when to read the document.
> Proposals and plans also include `status` and `created`, and proposals may include `source`.
> Documents do not repeat these fields in their body text.
> The metadata supports document listings and does not change the document's authority.

## Work selected by acceptance

Acceptance selects these outcomes:

- Add a publishable `@grrrck/seams` npm package with the reviewed command surface, bundled skills, templates, and versioned JSON Schema.
- Add the tracked project manifest and update adoption so the agent writes it after the operator chooses documentation homes.
- Add `title` and `description` frontmatter to canon, design overviews, proposals, plans, and document templates, including adoption guidance for existing documents.
- Add `status` and `created` to proposal and plan frontmatter, allow `source` for proposals, and remove duplicate metadata from document bodies.
- Use the supported `skills` library for installation and agent detection, with stable installation metadata, safe updates, and no telemetry from seams' calls.
- Add selective document navigation, explicit authority labels, document creation, impact reports, bounded reconciliation evidence, and mechanical checks.
- Update the README, guide, design overview guidance, and relevant skills so the CLI remains an optional way to perform the documented steps.
- Add the missing proposal template referenced by `seams-propose`.
- Add package, fixture, schema, output, and reading-path tests for the behavior above.

Acceptance does not select hooks, MCP, workflow orchestration, tracker integration, automatic canon or overview writing, or a document metadata schema beyond the fields selected for each document type.

## Documentation and skills affected

The implementation would update:

- `README.md` and `docs/index.md` with the `npx @grrrck/seams init` starting path.
- `docs/guide.md` with the CLI's purpose, optional nature, manifest, and basic reading commands.
- `AGENTS.md` so the CLI and its tests become part of the seams product and verification procedure.
- `skills/seams-adopt/` so adoption writes the manifest, records it in `AGENTS.md`, adds frontmatter to existing documents, and removes metadata duplicated in their bodies.
- `skills/seams-work/references/documentation.md` so agents can use the CLI for discovery and targeted reading when it is available and can maintain the document frontmatter.
- `skills/seams-propose/` and `skills/seams-plan/` so document creation can use `seams new` without requiring it.
- `skills/seams-reconcile/` so the evidence command replaces mechanical steps without replacing agent judgment.
- `docs/design/overviews/index.md` so the navigation guidance includes the CLI, uses frontmatter as the source of document descriptions, and keeps indexes as reading guides.
- A maintained design overview for the CLI once its implementation is stable enough to explain.

## Verification

The implementation needs tests for default and custom documentation homes, absent and malformed manifests, missing and invalid document frontmatter, schema validation, proposal and plan statuses, Markdown outlines with fenced code, bounded output, stable JSON, and path handling outside the repository.
Listing tests must show that the CLI uses frontmatter rather than duplicate descriptions or status fields in an index or document body.
Package tests need to install the built tarball and exercise both human and agent setup modes.

Skill installation tests need temporary project and global homes, several harness targets, modified copies, interrupted writes, dry runs, and updates from one package version to another.
Tests must not write to the operator's actual agent settings or send telemetry.

Documentation verification includes `make check`, validation of the proposal and schema examples, and these reading paths:

1. A person asks an agent to run `npx @grrrck/seams init`, and the agent reaches `seams-adopt`.
1. An agent starts from `AGENTS.md`, reads `.agents/seams.json`, lists documents, inspects an outline, and reads only a selected section.
1. An agent passes source paths to `impact` and receives documents grouped by authority.
1. An agent runs `reconcile --since` and receives a bounded evidence set without advancing state.
1. An agent creates a numbered draft proposal without editing canon.
1. An agent uses the conventions with ordinary file reads when the CLI is unavailable.

The project has not validated these workflows by experiment.
Acceptance selects an implementation that the operator can try, not a claim that the CLI improves every project.

## Open questions

None remain for acceptance.
Internal package layout, test libraries, and command parsing are local implementation choices.
Any change to the public commands, manifest meaning, or safety boundaries needs to return to the operator before implementation.
