---
title: The seams CLI
description: Read when maintaining the seams commands, or when deciding what a command may read, write, or refuse.
---

# The seams CLI

## Scope

The audience is the maintainer of `cli/` and any agent deciding what a `seams` command may do.
This overview covers the design that is hard to recover from code: the information boundary, the authority labels, where each command gets its data, the project manifest, skill installation, and the refusals that keep the tool out of the work.
It leaves everyday usage to `README.md` and `docs/guide.md`, command syntax and implementation to `cli/src/`, the accepted direction to the canon in `docs/design/`, and the history of these choices to `.agents/proposals/0003-npm-cli.md`.
The claims here are memory, not canon: each one names the code or test that supports it, and a reader verifies against them.

## What the CLI is

`@grrrck/seams` is an optional npm package with one executable, `seams`, for projects that use seams conventions.
It runs on Node 22.20 or later.
Its TypeScript sources live in `cli/src/`, compiled with `tsc` to `cli/dist/`, and its tests live in `cli/test/` and run with `node --test`.
The executable is `cli/src/cli.ts`: it parses the global flags with `parseArgs`, dispatches to one command in the registry in `cli/src/commands/index.ts`, and returns the exit code.
The exit codes are 0 for success, 1 for findings or a runtime error, and 2 for a usage error.
Every `--json` output is one envelope from `jsonEnvelope` in `cli/src/output.ts`: `schemaVersion` 1, the command name, then the payload.
The CLI only navigates, creates, checks, and installs.
It never decides how work gets done.

## The information boundary

Read commands never write files and never use the network. `list`, `find`, `read`, `impact`, `schema`, `doctor`, `skills list`, `skills get`, and `skills check` are reads. `doctor` reports and never repairs.
The write surface is deliberate and small. `new` creates one new file, and with `--update-index` it also appends one line to the overviews index, the only existing file it may touch. `skills install` and `skills update` replace skill copies that seams itself recorded. `init` installs the bundled skills and prints instructions. `reconcile` writes only the file `--manifest-out` names.
No command accepts a proposal, edits canon, or edits the body of an existing document.
Noninteractive calls never open a prompt: `init` runs its interactive setup only at a terminal without a known harness, and agent mode never prompts.

## Authority labels, and why retrieval is not verification

Every result from `list`, `find`, and `read` carries an authority label computed by `authorityOf` in `cli/src/docs/discover.ts`.
The labels are `canon`, `memory (verify against code)`, `<status> proposal (not authorization)`, `<status> plan`, and `note (not authorization)`.
The label reports what a document is, never whether it is true.
Only the operator accepts a proposal, and the CLI does not know that: it reports the `status` the document's frontmatter records.
Retrieval is not verification.
A command finds and prints text, and a reader who needs to know whether that text describes the current system follows it to code and tests.
The overview label says that requirement on the face of every result.

## Data comes from frontmatter, not indexes

Catalogs never read hand-maintained index entries. `discoverDocuments` in `cli/src/docs/discover.ts` walks the five documentation homes and reads each document's YAML frontmatter with `parseFrontmatter` in `cli/src/docs/frontmatter.ts`: the title, the description, and for proposals and plans the status and creation date.
A missing or empty title falls back to the first H1 and then to the file name, and the gap is reported as a problem so it stays visible.
Notes are the exception: they need no metadata, a note's title falls back to the first H1 and then the file name without reporting a problem, and the notes home itself is optional, contributing no documents and no warning when it is absent.
The navigation `index.md` files are excluded from the catalog, so a stale index cannot put wrong titles or descriptions in front of an agent.
Indexes remain reading guides for people and agents, and commands do not consult them. `cli/test/discover.test.ts` covers discovery and its fallbacks.

## The project manifest and the conventional fallback

`findRoot` in `cli/src/config.ts` walks up from the working directory to the nearest directory holding `.agents/seams.json`, then to the nearest `.git` directory, then gives up and uses the current directory. `loadProject` then resolves the documentation homes.
Without a manifest, the conventional layout applies: `docs/design`, `docs/design/overviews`, `.agents/proposals`, and `.agents/plans`, with `.agents/design` when `docs/design` is absent, and `_dev/notes` as the notes candidate.
The notes home is the one optional home: a manifest `paths.notes` overrides the candidate with the same validation as the other keys, and when the manifest omits `notes`, the CLI uses `_dev/notes` only when that directory already exists.
No command creates the directory, and a missing notes home produces no warning or finding, whether the home comes from the manifest or from existing-folder detection.
A manifest is validated against the schema bundled at `cli/schemas/v1/seams.schema.json` with `Ajv2020`, plus the path rules in `pathProblem`: paths are relative, use forward slashes, contain no `..` segment, and resolve inside the project root.
A bad manifest throws `ManifestError`, which lists every problem instead of a partial guess.
Manifest paths override the conventional defaults per key, so a project can move one home at a time.
The manifest also holds `reconcile.lastReconciledRevision`, state the CLI never advances. `cli/test/config.test.ts` covers the validation and the fallback.

## Skill installation: a stable identity and preserved edits

The npm `skills` library does the writes.
Everything it cannot do safely is seams' own preflight in `cli/src/skills/install.ts`:

- The bundled skills come from the repository's `skills/` directory, copied at build and pack time by `scripts/bundle-skills.mjs` (see `cli/src/skills/bundled.ts`).
  A CLI running from a source checkout reads the repository copy, so hand edits show up without a rebuild.
- Seams keeps its own record in `.agents/seams-skills.json` for a project or `~/.agents/seams-skills.json` for the global scope (`cli/src/skills/meta.ts`): for each skill the content hash from `skillFolderHash` in `cli/src/skills/hash.ts`, the skill's own version, the target agents, and the install mode.
  The library's lock files record only paths, so this record is what gives a copy a stable package identity.
- Before the library is called, seams hashes each existing destination copy.
  A modified copy is never passed to the library, because the library would silently overwrite it.
  Install reports it as `skipped (modified)`, and update leaves it for manual reconciliation.
  A byte-identical copy is `unchanged`.
- The library is only called with an explicit `agents` array from the supported allowlist in `SUPPORTED_AGENTS`, because with none detected it targets every supported agent and creates their directories.
  Telemetry is disabled with `DISABLE_TELEMETRY` before the lazy library import in `library()`.
- Dry run is the preflight alone: it prints what would be written and changes nothing.
- The metadata is written only after the library resolves, so an interrupted write never looks like a successful install: `skills check` reports the destination as `missing` when the copy is absent, or as `modified` when a partial copy differs from the record. `skills update` repairs the `missing` copies.
  A `modified` copy needs manual reconciliation, because update cannot tell a partial copy from a user's edit.

`skills check` classifies every recorded destination through an explicit table in `cli/src/skills/check.ts`: `ok`, `modified`, `missing`, `untracked`, `outdated`, or `divergent`. `skills update` replaces only `outdated` and `missing` copies, exactly the ones that are absent or still byte-identical to what seams last wrote, so no user edit can be lost.
It never deletes a file. `cli/test/skills-install.test.ts` and `cli/test/skills-check.test.ts` cover modified copies, dry runs, interrupted writes, and updates between package versions.

## What each command refuses to do

- `read` refuses a document that resolves outside the repository root, including through a symlink (`resolveDocuments` in `cli/src/commands/read.ts`).
- General `list` and `find` omit notes, so an ordinary documentation read never surfaces them; only `--type notes` selects notes, and notes never appear in `impact` or `reconcile` reference reports.
- `find` bounds its output with `--limit` and `--max-bytes`, says when results were left out, and hides draft, rejected, deferred, and withdrawn proposals and draft and abandoned plans unless asked.
- `new` never overwrites an existing file, never creates or edits canon, stops at a slug that resembles an open proposal unless `--force` is given, and touches the overviews index only with `--update-index`.
- `impact` reports candidate documents, never a verdict; the reader judges whether a document is stale.
- `reconcile` never edits a document and never advances `lastReconciledRevision`; it writes only the file `--manifest-out` names.
- `check` runs only the mechanical checks in `cli/src/check/index.ts` (frontmatter, numbering, status, manifest, links, index coverage, skill references); the frontmatter, manifest, and links checks leave the optional notes home alone, requiring no note metadata, warning about no missing notes directory, and not scanning notes' links, because a dangling link in uncommitted scratch is not a finding; formatting and project-specific checks stay with the project's own tooling.
- `doctor` reports and never writes, and never claims that a harness loaded a skill or that documentation agrees with code.
- `init` in agent mode never prompts, never scaffolds canon, and never writes the manifest; adoption is the `seams-adopt` skill's work.
- `skills install` and `skills update` always pass an explicit agent selection, from `--agent` or from detection, and never overwrite a modified, untracked, or divergent copy.

## Maintenance cautions

The safety rules above rest on the accepted proposal and on the spike that verified the `skills` library at version 1.9 (`skills` is pinned to `^1.9.0`).
The library's placement knowledge is trusted only for the allowlisted agents, so extending the allowlist needs the placement re-verified first.
The JSON envelope is stable for consumers, so payload fields change deliberately.
The package tests in `cli/test/package.test.ts` pack the tarball, install it into a temporary project, and exercise both setup modes, so the tarball's contents are part of the checks.
