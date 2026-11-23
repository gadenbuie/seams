# AGENTS.md

seams is a portable documentation framework for coding agents and the humans steering them. This
repository contains its normative rules, practical guide, research lineage, replaceable work
adapters, and optional skills.

## Authority and reading paths

**Vision expresses direction. Design records commitments. Work authorizes implementation. Code and
tests establish reality.** For this documentation repository, the documents themselves are the
deliverable; checked links, formatting, and structural tests establish artifact integrity.

The [constitution](docs/constitution.md) owns the normative framework. The
[framework guide](docs/framework.md) owns its practical application. The README is an overview, not
a competing contract. Supporting evidence is explanatory; skills are optional workflows.

Work is tracked in **kata**, not Markdown work logs. Run `kata quickstart --format contract` before
changing the repository, search for an existing item, and use
[the kata adapter](docs/adapters/kata.md) for scope, handoffs, and evidence. `.kata.toml` binds this
workspace; `.kata.local.toml` is ignored. Never store credentials in either the repository or
issues.

## Change boundaries

- A user's request to revise the framework selects that documentation change; it does not select
  implementation work in an adopting project.
- Preserve the difference between operator selection, exploration evidence, enforceable design, and
  current reality.
- Work tracking must remain replaceable. kata and Markdown are adapters, not normative requirements.
- Skills must not become a second source of truth, an autonomous router, or a required agent
  pipeline. Load only the focused skill relevant to a task.
- Keep examples generic unless they explain a concrete adapter. Do not leak host-project secrets,
  local paths, or machine-specific settings into portable guidance.
- Do not introduce a mandatory document hierarchy, a detailed backlog template, or design ceremony
  for clear mechanical tasks.
- Preserve evidence distinctions and transfer cautions in the supporting-evidence guide. Do not turn
  cited research into claims that seams has been empirically validated.

## Verification

Run before calling a documentation change complete:

```sh
make check
```

Requires [`uv`](https://docs.astral.sh/uv/), which supplies pinned Python tools through `uvx`. No
Node/npm setup or repository-local validation script is needed. `make format` applies the formatting
rules.

This checks Markdown formatting with GFM tables and frontmatter, offline local links and anchors,
conventional skill layout and frontmatter, and structural invariants. Inspect the actual diff and
the relevant reading paths as well. Do not claim that these checks validate the framework's
effectiveness in another project.

Use the repository's existing kata record for progress and remaining questions. Do not create a
parallel status document.
