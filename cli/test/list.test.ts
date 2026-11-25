import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { copyFixture } from "./helpers.ts";

const CLI = path.resolve(import.meta.dirname, "..", "src", "cli.ts");

function run(args: string[], cwd: string) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
}

function lines(stdout: string): string[] {
  return stdout.split("\n").filter((line) => line.length > 0);
}

describe("seams list", () => {
  it("lists documents grouped by type, one line each", () => {
    const cwd = copyFixture("list-project");
    const result = run(["list"], cwd);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");

    const out = lines(result.stdout);
    const headers = out.filter((line) => line.endsWith(":"));
    assert.deepEqual(headers, ["canon:", "overviews:", "proposals:", "plans:"]);

    const canonStart = out.indexOf("canon:");
    const overviewsStart = out.indexOf("overviews:");
    assert.ok(canonStart < overviewsStart);

    const vision = out.find((line) => line.includes("docs/design/vision.md"));
    assert.ok(vision, "expected a line for docs/design/vision.md");
    assert.match(vision ?? "", /Vision · \d+ bytes · canon · What seams is for\./);

    const accepted = out.find((line) => line.includes(".agents/proposals/0001-first.md"));
    assert.match(
      accepted ?? "",
      /0001-first\.md · First proposal · \d+ bytes · accepted proposal · An accepted proposal\./,
    );

    const unlabeled = out.find((line) => line.includes(".agents/proposals/0004-unlabeled.md"));
    assert.match(unlabeled ?? "", /proposal \(not authorization\)/);

    const overview = out.find((line) => line.includes("docs/design/overviews/system.md"));
    assert.match(overview ?? "", /memory \(verify against code\)/);

    // One line per document, plus one header per non-empty group.
    const json = JSON.parse(run(["list", "--json"], cwd).stdout);
    const groups = new Set(
      (json.documents as { type: string }[]).map((doc) => doc.type),
    ).size;
    assert.equal(out.length, json.documents.length + groups);
  });

  it("keeps one text line per document even for multi-line descriptions", () => {
    const cwd = copyFixture("list-project");
    const result = run(["list"], cwd);
    assert.equal(result.status, 0);
    const multiline = lines(result.stdout).find((line) =>
      line.includes(".agents/proposals/0005-multiline.md"),
    );
    assert.match(
      multiline ?? "",
      /0005-multiline\.md · Multiline proposal · \d+ bytes · draft proposal \(not authorization\) · First line of the description\. Second line of the description\./,
    );
  });

  it("shows title fallbacks and problems on the document line", () => {
    const cwd = copyFixture("list-project");
    const result = run(["list"], cwd);
    assert.equal(result.status, 0);

    const notes = lines(result.stdout).find((line) =>
      line.includes("docs/design/no-frontmatter.md"),
    );
    assert.match(notes ?? "", /Loose notes/);
    assert.match(notes ?? "", /\[problems: missing frontmatter\]$/);
  });

  it("prints a stable JSON envelope with documents and warnings", () => {
    const cwd = copyFixture("list-project");
    const result = run(["list", "--json"], cwd);
    assert.equal(result.status, 0);

    const output = JSON.parse(result.stdout);
    assert.equal(output.schemaVersion, 1);
    assert.equal(output.command, "list");
    assert.deepEqual(output.warnings, []);
    assert.ok(Array.isArray(output.documents));
    assert.ok(output.documents.length > 0);

    const vision = output.documents.find((doc: { path: string }) => doc.path === "docs/design/vision.md");
    assert.deepEqual(Object.keys(vision).sort(), [
      "authority",
      "bytes",
      "description",
      "path",
      "problems",
      "title",
      "type",
    ]);

    const accepted = output.documents.find(
      (doc: { path: string }) => doc.path === ".agents/proposals/0001-first.md",
    );
    assert.deepEqual(Object.keys(accepted).sort(), [
      "authority",
      "bytes",
      "created",
      "description",
      "path",
      "problems",
      "status",
      "title",
      "type",
    ]);
    assert.equal(accepted.authority, "accepted proposal");
  });

  it("reports missing home folders as JSON warnings and text stderr", () => {
    const cwd = copyFixture("list-custom");
    const json = run(["list", "--json"], cwd);
    assert.equal(json.status, 0);
    assert.deepEqual(JSON.parse(json.stdout).warnings, [
      "overviews home not found: docs/design/overviews",
    ]);

    const text = run(["list"], cwd);
    assert.equal(text.status, 0);
    assert.match(text.stderr, /warning: overviews home not found/);
  });

  it("filters by document type", () => {
    const cwd = copyFixture("list-project");

    const proposals = run(["list", "--type", "proposals"], cwd);
    assert.equal(proposals.status, 0);
    const out = lines(proposals.stdout);
    assert.deepEqual(
      out.filter((line) => line.endsWith(":")),
      ["proposals:"],
    );
    assert.ok(out.every((line) => line.includes(".agents/proposals/") || line === "proposals:"));

    const canon = run(["list", "--type", "canon", "--json"], cwd);
    assert.equal(canon.status, 0);
    const documents = JSON.parse(canon.stdout).documents as { type: string }[];
    assert.ok(documents.length > 0);
    assert.ok(documents.every((doc) => doc.type === "canon"));
  });

  it("exits 2 on an unknown type", () => {
    const cwd = copyFixture("list-project");
    const result = run(["list", "--type", "bogus"], cwd);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Unknown type 'bogus'/);
    assert.match(result.stderr, /Usage: seams list/);
  });

  it("exits 2 on a missing type value or an unexpected positional", () => {
    const cwd = copyFixture("list-project");
    const missing = run(["list", "--type"], cwd);
    assert.equal(missing.status, 2);

    const positional = run(["list", "extra"], cwd);
    assert.equal(positional.status, 2);
  });
});

describe("seams list, notes", () => {
  it("omits notes from a general listing", () => {
    const cwd = copyFixture("notes-project");
    const result = run(["list"], cwd);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.equal(result.stdout.includes("_dev/notes"), false);
    const headers = lines(result.stdout).filter((line) => line.endsWith(":"));
    assert.deepEqual(headers, ["canon:", "overviews:", "proposals:", "plans:"]);

    const json = JSON.parse(run(["list", "--json"], cwd).stdout);
    assert.equal(json.documents.some((doc) => doc.type === "note"), false);
    assert.deepEqual(json.warnings, []);
  });

  it("lists notes with --type notes and the note authority", () => {
    const cwd = copyFixture("notes-project");
    const result = run(["list", "--type", "notes"], cwd);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");

    const out = lines(result.stdout);
    assert.deepEqual(
      out.filter((line) => line.endsWith(":")),
      ["notes:"],
    );
    const scratch = out.find((line) => line.includes("_dev/notes/scratch.md"));
    assert.match(
      scratch ?? "",
      /_dev\/notes\/scratch\.md · Scratch pad · \d+ bytes · note \(not authorization\)/,
    );
    // A plain note's title falls back to the first H1 or the file name.
    const idea = out.find((line) => line.includes("_dev/notes/nested/idea.md"));
    assert.match(
      idea ?? "",
      /_dev\/notes\/nested\/idea\.md · idea · \d+ bytes · note \(not authorization\)/,
    );
  });

  it("lists no notes and no warning when the notes home is absent", () => {
    const cwd = copyFixture("notes-project");
    rmSync(path.join(cwd, "_dev", "notes"), { recursive: true, force: true });
    const result = run(["list", "--type", "notes"], cwd);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.deepEqual(lines(result.stdout), []);
    assert.equal(existsSync(path.join(cwd, "_dev", "notes")), false);
  });
});
