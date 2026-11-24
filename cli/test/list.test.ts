import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
    assert.match(vision ?? "", /Vision · \d+ bytes · What seams is for\./);

    const accepted = out.find((line) => line.includes(".agents/proposals/0001-first.md"));
    assert.match(accepted ?? "", /0001-first\.md · First proposal · \d+ bytes · accepted · An accepted proposal\./);
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
