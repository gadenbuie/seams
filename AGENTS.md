# AGENTS.md

seams is a set of conventions and agent skills for building software with coding agents.
In this repository, the documents and skills are the product.

## Where things live

- **Canon:** [`docs/design/`](docs/design/index.md) holds seams' vision, principles, and invariants.
  These files also define the framework for every project that uses seams.
  Only the operator accepts changes to canon.
  Propose changes in a proposal or on a work item.
- **Design overviews:** [`docs/design/overviews/`](docs/design/overviews/index.md) holds maintained explanations of the current system.
  They are memory, not canon.
  Verify their claims against code and tests, and update affected overviews with the work.
- **Human docs:** [`README.md`](README.md) owns the homepage text, and [`docs/index.md`](docs/index.md) repeats it with adjusted relative links. [`docs/guide.md`](docs/guide.md) explains seams to operators. [`docs/supporting-evidence.md`](docs/supporting-evidence.md) cites the source of each idea.
- **Agent procedures:** [`skills/seams-*/`](skills/) hold everything agents follow.
  Human docs explain, and skills instruct.
  Do not put agent procedures in the docs, or explanations for humans in the skills.
- **Memory:** `.agents/proposals/` holds proposals.
  A proposal authorizes nothing until its status is accepted. `.agents/skills/` and `.claude/` hold writing tools for this repository, not part of seams.
- **Work:** tracked in kata.
  Run `kata quickstart --format contract` before changing the repository, search for an existing item, and follow [`skills/seams-track/references/kata.md`](skills/seams-track/references/kata.md).
  If kata reports that the project is not registered, tell the operator.
  Never put credentials in `.kata.toml`, in `.kata.local.toml`, or in issues.

## Rules for changing seams

- Keep the canon, the guide, and the skills consistent.
  A change to one usually needs a matching change in the others, in the same commit.
- Write human docs in the operator's plain style (`.claude/skills/plain-writing`): everyday words, complete sentences, no dashes, no slogans, and no overselling.
  Start with the subject, not a description of the document itself, e.g., avoid "This guide explains" or "This document covers".
- Keep examples generic.
  Do not leak paths, secrets, or settings from a host project or this machine.
- Keep work tracking replaceable.
  A tracker is a reference in `seams-track`, not a requirement.
- Skill frontmatter allows only `name`, `description`, `license`, `compatibility`, `metadata`, and `allowed-tools`.
  Mark who runs a skill with `metadata.invocation` (`operator` or `agent`), and say in the description when only the operator should run it.
- The skills refer to each other as siblings, e.g., `<skills>/seams-track/references/kata.md`.
  Keep those paths valid when you rename or move a file.
- Do not claim that seams has been validated by experiment.
  Keep the transfer cautions in the supporting evidence.

## Verification

```sh
make check
```

`make check` needs [`uv`](https://docs.astral.sh/uv/).
It checks Markdown formatting, local links and anchors, the design indexes and overview coverage, and the layout and frontmatter of each skill. `make format` applies the formatting rules.
These checks don't show that seams works in another project, so also read the diff and walk the reading paths you changed.
