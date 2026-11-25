import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { copyFixture } from "./helpers.ts";

const CLI = path.resolve(import.meta.dirname, "..", "src", "cli.ts");

function run(args: string[], cwd: string) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
}

function fixtureFile(cwd: string, relative: string): string {
  return readFileSync(path.join(cwd, ...relative.split("/")), "utf8");
}

describe("seams read", () => {
  it("prints a header with path, authority, and range, then the whole file", () => {
    const cwd = copyFixture("read-project");
    const result = run(["read", "docs/design/invariants.md"], cwd);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");

    const header = "docs/design/invariants.md · canon · lines 1-23";
    assert.ok(result.stdout.startsWith(header + "\n"));
    assert.equal(result.stdout.slice(header.length + 1), fixtureFile(cwd, "docs/design/invariants.md"));
  });

  it("resolves a bare name against the configured homes", () => {
    const cwd = copyFixture("read-project");
    const design = run(["read", "invariants.md"], cwd);
    assert.equal(design.status, 0);
    assert.ok(design.stdout.startsWith("docs/design/invariants.md · canon ·"));

    const overview = run(["read", "system.md"], cwd);
    assert.equal(overview.status, 0);
    assert.ok(overview.stdout.startsWith("docs/design/overviews/system.md · memory (verify against code) ·"));
  });

  it("returns a section by exact heading, case-insensitively", () => {
    const cwd = copyFixture("read-project");
    const result = run(["read", "docs/design/invariants.md", "--section", "first"], cwd);
    assert.equal(result.status, 0);
    const header = "docs/design/invariants.md · canon · lines 9-12";
    assert.ok(result.stdout.startsWith(header + "\n"));
    assert.equal(
      result.stdout.slice(header.length + 1),
      "## First\n\nFirst content.\n\n",
    );
  });

  it("includes a nested section inside its parent, and finds it by name", () => {
    const cwd = copyFixture("read-project");
    const result = run(["read", "docs/design/invariants.md", "--section", "Nested"], cwd);
    assert.equal(result.status, 0);
    const header = "docs/design/invariants.md · canon · lines 17-20";
    assert.ok(result.stdout.startsWith(header + "\n"));
    assert.equal(
      result.stdout.slice(header.length + 1),
      "### Nested\n\nNested content.\n\n",
    );
  });

  it("exits 1 and lists headings with line numbers when several match", () => {
    const cwd = copyFixture("read-project");
    const result = run(["read", ".agents/proposals/0002-duplicate.md", "--section", "setup"], cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /matches 2 headings/);
    assert.match(result.stderr, /line 8: ## Setup/);
    assert.match(result.stderr, /line 12: ## setup/);
  });

  it("exits 1 when no heading matches", () => {
    const cwd = copyFixture("read-project");
    const result = run(["read", "docs/design/invariants.md", "--section", "Nope"], cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /No heading matches 'Nope'/);
  });

  it("returns an inclusive line range", () => {
    const cwd = copyFixture("read-project");
    const result = run(["read", "docs/design/invariants.md", "--lines", "9-11"], cwd);
    assert.equal(result.status, 0);
    const header = "docs/design/invariants.md · canon · lines 9-11";
    assert.ok(result.stdout.startsWith(header + "\n"));
    assert.equal(result.stdout.slice(header.length + 1), "## First\n\nFirst content.\n");
  });

  it("exits 2 on a malformed or out-of-range --lines", () => {
    const cwd = copyFixture("read-project");
    for (const spec of ["9", "x-y", "1-3-5", "3-1", "0-2", "1-999"]) {
      const result = run(["read", "docs/design/invariants.md", "--lines", spec], cwd);
      assert.equal(result.status, 2, `expected exit 2 for --lines ${spec}`);
      assert.match(result.stderr, /Usage: seams read/);
    }
    const outOfRange = run(["read", "docs/design/invariants.md", "--lines", "1-999"], cwd);
    assert.match(outOfRange.stderr, /out of range: the document has 23 lines/);
  });

  it("exits 2 when both selectors are given, or an argument is missing or extra", () => {
    const cwd = copyFixture("read-project");
    const both = run(["read", "docs/design/invariants.md", "--section", "First", "--lines", "1-2"], cwd);
    assert.equal(both.status, 2);
    assert.match(both.stderr, /mutually exclusive/);

    assert.equal(run(["read"], cwd).status, 2);
    const missingValue = run(["read", "docs/design/invariants.md", "--section"], cwd);
    assert.equal(missingValue.status, 2);
    const unknownFlag = run(["read", "--bogus", "docs/design/invariants.md"], cwd);
    assert.equal(unknownFlag.status, 2);
    const extra = run(["read", "docs/design/invariants.md", "extra.md"], cwd);
    assert.equal(extra.status, 2);
  });

  it("prints a stable JSON envelope for a selection", () => {
    const cwd = copyFixture("read-project");
    const result = run(["read", "--json", "docs/design/invariants.md", "--section", "First"], cwd);
    assert.equal(result.status, 0);
    const json = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(json).sort(), [
      "authority",
      "command",
      "path",
      "range",
      "schemaVersion",
      "text",
    ]);
    assert.equal(json.schemaVersion, 1);
    assert.equal(json.command, "read");
    assert.equal(json.path, "docs/design/invariants.md");
    assert.equal(json.authority, "canon");
    assert.deepEqual(json.range, [9, 12]);
    assert.equal(json.text, "## First\n\nFirst content.\n\n");
  });

  it("reports null authority in JSON and untyped in text outside every home", () => {
    const cwd = copyFixture("read-project");
    const json = JSON.parse(run(["read", "--json", "README.md"], cwd).stdout);
    assert.equal(json.authority, null);
    assert.deepEqual(json.range, [1, 3]);

    const text = run(["read", "README.md"], cwd);
    assert.ok(text.stdout.startsWith("README.md · untyped · lines 1-3\n"));
  });

  it("exits 1 for a document that is not found", () => {
    const cwd = copyFixture("read-project");
    const result = run(["read", "nope.md"], cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Document not found: nope\.md/);
  });

  it("rejects paths that resolve outside the repository root", () => {
    const cwd = copyFixture("read-project");

    const up = run(["read", "../escape.md"], cwd);
    assert.equal(up.status, 1);
    assert.match(up.stderr, /outside the repository root/);

    const absolute = run(["read", "/etc/hosts"], cwd);
    assert.equal(absolute.status, 1);
    assert.match(absolute.stderr, /outside the repository root/);
  });

  it("rejects a symlink that escapes the repository root", () => {
    const cwd = copyFixture("read-project");
    const outside = mkdtempSync(path.join(tmpdir(), "seams-outside-"));
    const secret = path.join(outside, "secret.md");
    writeFileSync(secret, "# Secret\n");
    symlinkSync(secret, path.join(cwd, "docs", "design", "escape.md"));

    const result = run(["read", "docs/design/escape.md"], cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /outside the repository root/);
  });

  it("reads CRLF files without shifting line ranges or losing terminators", () => {
    const cwd = copyFixture("read-project");
    writeFileSync(
      path.join(cwd, "docs", "design", "crlf.md"),
      "---\r\ntitle: CRLF\r\n---\r\n# Title\r\nBody.\r\n## Two\r\nTail.\r\n",
    );

    const section = run(["read", "crlf.md", "--section", "Two"], cwd);
    assert.equal(section.status, 0);
    assert.ok(section.stdout.startsWith("docs/design/crlf.md · canon · lines 6-7\n"));
    assert.equal(section.stdout.split("\n").slice(1).join("\n"), "## Two\r\nTail.\r\n");

    const json = JSON.parse(run(["read", "--json", "crlf.md", "--lines", "4-5"], cwd).stdout);
    assert.deepEqual(json.range, [4, 5]);
    assert.equal(json.text, "# Title\r\nBody.\r\n");
  });

  it("exits 1 and lists every match when a bare name exists in several homes", () => {
    const cwd = copyFixture("read-project");
    const result = run(["read", "index.md"], cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /matches 2 documents/);
    assert.match(result.stderr, /  docs\/design\/index\.md/);
    assert.match(result.stderr, /  docs\/design\/overviews\/index\.md/);
  });

  it("labels a navigation index untyped, never as its home's type", () => {
    const cwd = copyFixture("read-project");
    const json = JSON.parse(run(["read", "--json", "docs/design/index.md"], cwd).stdout);
    assert.equal(json.authority, null);
    const text = run(["read", "docs/design/index.md"], cwd);
    assert.ok(text.stdout.startsWith("docs/design/index.md · untyped · lines 1-7\n"));
  });

  it("reads an empty document as one empty line the range stays usable for", () => {
    const cwd = copyFixture("read-project");
    const whole = run(["read", "docs/design/empty.md"], cwd);
    assert.equal(whole.status, 0);
    assert.ok(whole.stdout.startsWith("docs/design/empty.md · canon · lines 1-1\n"));

    const selection = run(["read", "docs/design/empty.md", "--lines", "1-1"], cwd);
    assert.equal(selection.status, 0);
    const json = JSON.parse(run(["read", "--json", "docs/design/empty.md", "--lines", "1-1"], cwd).stdout);
    assert.deepEqual(json.range, [1, 1]);
    assert.equal(json.text, "");

    const beyond = run(["read", "docs/design/empty.md", "--lines", "1-2"], cwd);
    assert.equal(beyond.status, 2);
    assert.match(beyond.stderr, /the document is empty/);
  });

  it("reads a file literally named outline when it is the only positional", () => {
    const cwd = copyFixture("read-project");
    const bare = run(["read", "outline"], cwd);
    assert.equal(bare.status, 0);
    assert.ok(bare.stdout.startsWith("docs/design/outline · canon · lines 1-7\n"));
    assert.ok(bare.stdout.includes("# Outline file"));

    const explicit = run(["read", "./outline"], cwd);
    assert.equal(explicit.status, 0);
    assert.ok(explicit.stdout.includes("This file is literally named `outline`"));
  });
});

describe("seams read outline", () => {
  it("prints each heading with its range and byte size", () => {
    const cwd = copyFixture("read-project");
    const result = run(["read", "outline", "docs/design/invariants.md"], cwd);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");

    const out = result.stdout.split("\n").filter((line) => line.length > 0);
    assert.equal(out[0], "docs/design/invariants.md · canon");
    assert.deepEqual(
      out.slice(1).map((line) => line.replace(/ · \d+ bytes/, "")),
      [
        "  5-23 · # Invariants",
        "  9-12 · ## First",
        "  13-20 · ## Second",
        "  17-20 · ### Nested",
        "  21-23 · ## Third",
      ],
    );
  });

  it("prints a stable JSON envelope with the headings", () => {
    const cwd = copyFixture("read-project");
    const result = run(["read", "--json", "outline", "docs/design/overviews/system.md"], cwd);
    assert.equal(result.status, 0);
    const json = JSON.parse(result.stdout);
    assert.deepEqual(Object.keys(json).sort(), [
      "authority",
      "command",
      "headings",
      "path",
      "schemaVersion",
    ]);
    assert.equal(json.command, "read outline");
    assert.equal(json.path, "docs/design/overviews/system.md");
    assert.equal(json.authority, "memory (verify against code)");
    assert.deepEqual(
      json.headings.map((h: { level: number; title: string; start: number; end: number }) =>
        [h.level, h.title, h.start, h.end],
      ),
      [
        [1, "System", 5, 17],
        [2, "Parts", 15, 17],
      ],
    );
    for (const heading of json.headings) {
      assert.deepEqual(Object.keys(heading).sort(), ["bytes", "end", "level", "start", "title"]);
    }

    // Byte sizes count the section's own bytes, terminators included.
    const text = fixtureFile(cwd, "docs/design/overviews/system.md");
    const chunks = text.split(/(?<=\r?\n)/);
    const bytesOf = (a: number, b: number) =>
      Buffer.byteLength(chunks.slice(a - 1, b).join(""), "utf8");
    assert.deepEqual(
      json.headings.map((h: { start: number; end: number; bytes: number }) => h.bytes),
      [bytesOf(5, 17), bytesOf(15, 17)],
    );
  });

  it("skips headings inside frontmatter and fences, and includes the proposal status in the authority", () => {
    const cwd = copyFixture("read-project");
    const accepted = run(["read", "outline", ".agents/proposals/0001-accepted.md"], cwd);
    assert.equal(accepted.status, 0);
    const out = accepted.stdout.split("\n").filter((line) => line.length > 0);
    assert.equal(out[0], ".agents/proposals/0001-accepted.md · accepted proposal");
    assert.deepEqual(
      out.slice(1).map((line) => line.replace(/ · \d+ bytes/, "")),
      [
        "  6-23 · # Accepted proposal",
        "  13-16 · ## Setup",
        "  17-23 · ## Usage",
        "  21-23 · ### Details",
      ],
    );

    const draft = run(["read", "outline", ".agents/proposals/0002-duplicate.md"], cwd);
    assert.ok(draft.stdout.startsWith(".agents/proposals/0002-duplicate.md · draft proposal (not authorization)\n"));
  });

  it("outlines a file literally named outline when it is the document", () => {
    const cwd = copyFixture("read-project");
    const result = run(["read", "outline", "outline"], cwd);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.startsWith("docs/design/outline · canon\n"));
    assert.ok(result.stdout.includes("  5-7 ·"));
  });

  it("exits 2 when outline combines with a selector or takes extra arguments", () => {
    const cwd = copyFixture("read-project");
    const section = run(["read", "outline", "docs/design/invariants.md", "--section", "First"], cwd);
    assert.equal(section.status, 2);
    assert.match(section.stderr, /do not combine with `read outline`/);

    const lines = run(["read", "outline", "docs/design/invariants.md", "--lines", "1-5"], cwd);
    assert.equal(lines.status, 2);

    const extra = run(["read", "outline", "docs/design/invariants.md", "extra.md"], cwd);
    assert.equal(extra.status, 2);
  });
});

describe("seams read, notes", () => {
  it("reads a note explicitly with the note authority", () => {
    const cwd = copyFixture("notes-project");
    const result = run(["read", "_dev/notes/scratch.md"], cwd);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    const header = "_dev/notes/scratch.md · note (not authorization) · lines 1-4";
    assert.ok(result.stdout.startsWith(header + "\n"));
    assert.equal(
      result.stdout.slice(header.length + 1),
      fixtureFile(cwd, "_dev/notes/scratch.md"),
    );
  });

  it("resolves a bare name against the notes home", () => {
    const cwd = copyFixture("notes-project");
    const result = run(["read", "summary.md"], cwd);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.startsWith("_dev/notes/summary.md · note (not authorization) ·"));

    const nested = run(["read", "nested/idea.md"], cwd);
    assert.equal(nested.status, 0);
    assert.ok(nested.stdout.startsWith("_dev/notes/nested/idea.md · note (not authorization) ·"));
  });

  it("returns a note section by heading", () => {
    const cwd = copyFixture("notes-project");
    const result = run(["read", "_dev/notes/summary.md", "--section", "Session summary"], cwd);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.startsWith("_dev/notes/summary.md · note (not authorization) · lines 6-8\n"));
  });

  it("outlines a note with its headings and sizes", () => {
    const cwd = copyFixture("notes-project");
    const result = run(["read", "outline", "_dev/notes/scratch.md"], cwd);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    const out = result.stdout.split("\n").filter((line) => line.length > 0);
    assert.equal(out[0], "_dev/notes/scratch.md · note (not authorization)");
    assert.match(out[1], /  1-4 · \d+ bytes · # Scratch pad/);
  });

  it("prefers the shared home when a note shares its name", () => {
    const cwd = copyFixture("notes-project");
    writeFileSync(
      path.join(cwd, "_dev", "notes", "vision.md"),
      "# Scratch vision\n\nA note, not canon.\n",
    );

    const shared = run(["read", "vision.md"], cwd);
    assert.equal(shared.status, 0);
    assert.ok(shared.stdout.startsWith("docs/design/vision.md · canon ·"));

    // The note itself still reads explicitly.
    const note = run(["read", "_dev/notes/vision.md"], cwd);
    assert.equal(note.status, 0);
    assert.ok(
      note.stdout.startsWith("_dev/notes/vision.md · note (not authorization) ·"),
    );
  });

  it("still rejects a path that leaves the repository root", () => {
    const cwd = copyFixture("notes-project");
    const result = run(["read", "../../outside.md"], cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /outside the repository root/);
  });

  it("reading an absent note never creates the notes directory", () => {
    const cwd = copyFixture("notes-project");
    rmSync(path.join(cwd, "_dev", "notes"), { recursive: true, force: true });
    const result = run(["read", "_dev/notes/scratch.md"], cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Document not found/);
    assert.equal(existsSync(path.join(cwd, "_dev", "notes")), false);
  });
});
