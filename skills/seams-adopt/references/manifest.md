# Write the manifest

Write the project manifest after the operator chooses the documentation homes.
The manifest is `.agents/seams.json`, tracked in Git, and it is the machine-readable record of where each document type lives. `AGENTS.md` still states the authority rules every agent needs, e.g., that only the operator changes canon; the manifest records the homes themselves.

The CLI is optional.
Every step below also works with ordinary file edits when the CLI is not installed.

## Write the file

Write `.agents/seams.json` exactly in this shape, with the chosen paths:

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

- Set each `paths` entry to the chosen home, relative to the repository root.
  Use the example values when the project uses the default layout.
- Set `seamsVersion` to the installed package version when the CLI is available, e.g. from `seams --version`; otherwise leave `0.1.0`.
- Leave `reconcile.lastReconciledRevision` as `null`.
- Keep the `$schema` URL as written; editors use it.

The manifest must name any home that differs from the default layout.
Commands may fall back to the conventional layout when the manifest is absent, so a project with a custom home always needs this file.

## Validate

When the CLI is available, validate the manifest with `seams doctor`.
When the installed version has no `doctor`, validate the file against the schema that `seams schema` prints, using any JSON Schema validator.
Without the CLI, check the file by hand against the example above: the field names, `schemaVersion`, and paths that are relative, with no leading slash, no drive letter, no backslash, and no `..` segment.

Reading the manifest never rewrites `schemaVersion` or `seamsVersion`.
Only an intentional initialization or migration writes those fields.

## Record it in AGENTS.md

Add one line to the project's `AGENTS.md` naming `.agents/seams.json` as the machine-readable record of the documentation homes.
Keep the authority rules where they are: canon ownership, tracker choice, and safety limits stay in `AGENTS.md`, and the manifest carries only paths.

## Migrate frontmatter in an existing project

After the homes are chosen, recorded, and cut over, give the existing documents the frontmatter the seams tools read.

- Canon files and design overviews, including both index files: add `title` and a short `description` that says when to read the document.
  Set `title` to the file's H1 text when it has one, and leave the H1 in place.
- Proposals and plans: add `status`, `created`, and `source` when the source is known.
  Plans use `draft`, `active`, `done`, `abandoned`.
  Proposals use `draft`, `accepted`, `rejected`, `deferred`, `withdrawn`.
  Set each status from the document's real state, and don't turn old plans into active work.
- Remove metadata that the body now duplicates, e.g. a status line or a created date that frontmatter carries.
  Keep the rest of the body unchanged.

Don't edit canon prose while migrating frontmatter.
Canon content changes go through the operator.
