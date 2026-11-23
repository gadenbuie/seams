---
name: seam-track-kata
description: 'Use kata as the work ledger for a seams project. Use when binding a workspace, finding or creating selected issues, recording exploration and dependencies, claiming work, leaving handoffs, closing with evidence, or migrating active records to or from kata. Requires kata; not a replacement for seam-shape, seam-work, or project design.'
---

# Track work with kata

Apply the [kata adapter](../../docs/adapters/kata.md) through kata's CLI. This skill is optional:
seams depends on a work record, not this tracker. The host project's instructions and the installed
kata's own `kata quickstart --format contract` govern tool behavior.

Verify commands with the installed version. Read the
[official kata guide](https://www.katatracker.com/guide.md) when setup or newer behavior is unclear.

## Bind a workspace

Install kata from its [quickstart](https://www.katatracker.com/docs/get-started/quickstart/), then
run from the repository root:

```sh
kata init --project <project-name>
kata quickstart --format contract
```

Commit the secret-free `.kata.toml`; keep `.kata.local.toml` ignored. Do not put credentials in the
repository or issue records. When invoking from another directory, use
`kata --workspace /path/to/repository …`. Explicit workspace selection prevents writes to the wrong
project.

Add kata routing to the existing agent entry point deliberately. Do not overwrite a maintained
`AGENTS.md` with generated generic guidance.

## Before creating work

Search for the same outcome and inspect candidates:

```sh
kata search "<distinctive words>" --agent
kata show <ref> --agent
```

Reuse an existing open item for the same outcome. Link related work with `--related`, group with
`--parent`, and use `--blocked-by` only for an actual dependency. Parentage does not imply readiness
or select every child.

For a direct implementation request, selection already exists. For exploratory or planning work,
make clear that the issue does not authorize unselected implementation.

## Create and claim

For a small task, a compact body is enough: objective, expected behavior or acceptance, and relevant
constraints. For a design-sensitive outcome, include scope, non-goals, contracts, exploration links,
decisions, units, and verification. Do not duplicate entire documents into the issue.

```sh
kata create "<title>" --body-stdin \
  --idempotency-key "<stable-task-key>" --agent <<'EOF'
## Outcome and acceptance
<what was selected and what proves it>

## Scope and authority
<exclusions, governing documents, and relevant exploration>
EOF

kata claim <ref> --if-unowned --agent
```

Use a stable idempotency key. If create returns a look-alike conflict, read it; do not use
`--force-new` unless the work genuinely differs. If the result of a mutation is uncertain, inspect
the ledger before retrying.

Do not manufacture metadata when native fields suffice. If the project declares extra workflow
metadata, its current syntax is:

```sh
kata meta set <ref> <key> <json-value> --json-value --agent
```

`seam.kind` and `seam.adapter` are local conventions, not reserved kata fields. Prefer kata's native
status, priority, and documented `work.*` attention keys to a redundant custom status field.

## Record findings and handoffs

Use comments for durable discoveries, actual dependencies, decisions, and checkpoints:

```sh
kata comment <ref> -m "<finding and its evidence>" --agent
```

For exploration, link a non-normative note or record findings in a dedicated exploration issue.
Distinguish verified facts, assumptions, options, and recommendations. Closing exploration does not
select its preferred solution.

Use `kata edit <ref> --body-stdin --agent` when authoritative scope or acceptance changes. Keep
progress out of durable design documents. Use the installed tool's labels and attention conventions
when human intervention is needed.

Before an incomplete stop, comment with revision state, what passed, what remains, commands run,
blockers, and next action. Leave the issue open.

## Close on evidence

```sh
kata close <ref> --done \
  --message "<specific completed change and verified outcome>" \
  --test "<actual command run>" --agent
```

Use `--commit`, `--pr`, `--reviewed`, or other evidence supported by the installed version when
appropriate. Inspect `kata close --help` rather than inventing evidence flags. Close promptly when
accepted; do not close merely because code was written or exploration produced a recommendation.

## Migrate safely

Migrate active work's current scope, selection, acceptance, dependencies, discoveries, evidence, and
handoff—not every old idea. Preserve old references while links are updated, then declare one active
tracker. Keep completed Markdown logs as history; do not mirror their status into kata.

Do not run `kata delete` or `kata purge` unless the operator explicitly asks for that exact action.
Use the tracker's documented export/backup procedures when preserving or moving ledger data.
