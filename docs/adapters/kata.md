# Adapter: kata work ledger

[kata](https://www.katatracker.com/) is a local-first issue tracker for coding agents and the humans
steering them. Its issue body can carry the selected outcome and acceptance; relationships carry
dependencies; comments carry discoveries and handoffs; labels or metadata carry additional workflow
state; close evidence records verification.

This is one replaceable implementation of the
[tracker contract](../framework.md#4-work-records-and-replaceable-trackers), not a requirement of
seams. The accompanying [`seam-track-kata`](../../skills/seam-track-kata/SKILL.md) skill supplies
the operational procedure. Verify commands against the installed kata version.

## Workspace

Install kata using its
[current installation guide](https://www.katatracker.com/docs/get-started/quickstart/). Bind each
repository explicitly from its own root:

```sh
kata init --project <project-name>
```

The committed `.kata.toml` contains only the workspace binding. `.kata.local.toml` is ignored and
may hold machine-local server settings. Do not place credentials in either the repository or issue
records. Do not use `kata init --with-agents` to replace an existing carefully maintained
`AGENTS.md`; add the small kata routing instruction and seams adapter pointer deliberately.

For a separate checkout or invocation from another directory, pass an explicit workspace:

```sh
kata --workspace /path/to/repository <command>
```

Run `kata quickstart --format contract` for the installed tool's operating rules. Use `--agent` for
concise CLI output or `--json` when structured fields are needed.

## Mapping

| seams concept                                     | kata representation                                                 |
| :------------------------------------------------ | :------------------------------------------------------------------ |
| Selected outcome or small task                    | One issue; search before creating                                   |
| Objective, scope, acceptance, governing artifacts | Issue body, with links rather than duplicated contracts             |
| Exploration                                       | Linked exploration issue or note; its findings remain non-normative |
| Parent/grouping                                   | `--parent`; containment does not imply readiness                    |
| Actual blocking dependency                        | `--blocked-by`; avoid ceremonial ordering                           |
| Related context                                   | `--related`                                                         |
| Additional workflow state                         | A project-declared label or metadata key                            |
| Progress, findings, decisions, handoffs           | Comments; update the body when selected scope changes               |
| Completion                                        | Close with substantive message and typed evidence                   |

The `seam.kind` and `seam.adapter` keys used by this repository are local conventions, not reserved
kata fields. A project may omit them when issue status and labels already provide the needed
routing. Prefer kata's native status, priority, and documented `work.*` attention fields over a
custom status field; do not build a parallel state machine when the tracker already has a suitable
state.

## Typical flow

Search and read existing work before creating anything:

```sh
kata search "<distinctive words>" --agent
kata show <ref> --agent
```

Create a selected outcome from a full body, or a small task with a compact objective and acceptance:

```sh
kata create "<title>" --body-stdin \
  --idempotency-key "<stable-task-key>" --agent <<'EOF'
## Outcome and acceptance
<what was selected and what evidence demonstrates it>

## Scope and authority
<exclusions, governing contracts, and relevant exploration>
EOF

kata claim <ref> --if-unowned --agent
```

Use `kata edit <ref> --body-stdin --agent` when the authoritative scope changes, and
`kata comment <ref> -m "<finding or handoff>"` for a durable discovery. Prefer `--body-stdin` for
multiline issue creation. If a create response is lost, inspect the ledger before retrying; do not
blindly bypass duplicate detection.

Record useful learning as it happens. Before an interrupted stop, leave a comment containing the
branch/base/head or equivalent revision, evidence obtained, what remains, and the next action. Use
the installed tool's `needs-review` and attention conventions when human intervention is required.

Close each completed issue promptly:

```sh
kata close <ref> --done \
  --message "<specific changes and their verified result>" \
  --test "<actual command run>" --agent
```

Use commit, pull-request, reviewed-path, or other supported evidence when that better matches the
work. Never close an exploration issue as evidence that a candidate design was selected. Close it
when the investigation is complete and link the resulting decision or selected outcome explicitly.

## Migration to or from kata

Migrate active work, not a museum of stale status. Preserve the current objective, selection,
acceptance, dependencies, discoveries, and handoff. Record the old and new references until links
are updated, choose one cutover point, and then make kata the sole active status source. Keep old
Markdown logs as historical records only. When moving away from kata, export or otherwise preserve
the ledger and apply the same one-source rule in the destination.
