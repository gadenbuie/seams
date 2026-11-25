# AGENTS.md

seams is a set of conventions and agent skills for building software with coding agents.
In this repository, the documents, the skills, and the CLI package are the product.

## Where things live

seams uses its own process on itself, so some files do double duty.
For example, [`docs/design/overviews/index.md`](docs/design/overviews/index.md) explains what design overviews look like, and [`docs/design/overviews/npm-cli.md`](docs/design/overviews/npm-cli.md) is the design overview of the CLI.

- **Canon:**\*\* [`docs/design/`](docs/design/index.md) holds seams' vision, principles, and invariants.
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
- **Command line tool:** [`cli/`](cli/) is the optional `@grrrck/seams` npm package, which provides the `seams` command, for projects that use seams.
  Its TypeScript sources are in `cli/src/` and its tests are in `cli/test/`.
- **Memory:** `.agents/proposals/` holds proposals.
  A proposal authorizes nothing until its status is accepted.
- **Work:** tracked in kata when a plan moves to implementation.
  Planning, proposing, and discussing do not need kata.
  Run `kata quickstart --format contract` before changing the repository, and follow [`skills/seams-track/references/kata.md`](skills/seams-track/references/kata.md).
  Never put credentials in `.kata.toml`, in `.kata.local.toml`, or in issues.

## Rules for changing seams

- Keep the canon, the guide, and the skills consistent.
  A change to one usually needs a matching change in the others, in the same commit.
- Write human docs in the operator's plain style: everyday words, complete sentences, no dashes, no jargon, no analogies, no filler, and no overselling.
  Start with the subject, not a description of the document itself, e.g., avoid "This guide explains" or "This document covers".
- Keep examples generic.
  Do not leak paths, secrets, or settings from a host project or this machine.
- Keep work tracking replaceable.
  A tracker is a reference in `seams-track`, not a requirement.
- Skill frontmatter allows only `name`, `description`, `license`, `compatibility`, `metadata`, and `allowed-tools`.
  Mark who runs a skill with `metadata.invocation` (`operator` or `agent`), and say in the description when only the operator should run it.
- The skills refer to each other as siblings, e.g., `<skills>/seams-track/references/kata.md`.
  Keep those paths valid when you rename or move a file.

## Verification

```sh
make check
```

`make check` needs [`uv`](https://docs.astral.sh/uv/) and Node.js 22.20 or later.
It checks Markdown formatting, local links and anchors, the design indexes and overview coverage, and the layout and frontmatter of each skill, and it builds `cli/` and runs its tests.
To build the CLI on its own, run `cd cli && npm install && npm run build`, and run its tests with `cd cli && npm test`. `make format` applies the formatting rules.
These checks don't show that seams works in another project, so also read the diff and walk the reading paths you changed.
