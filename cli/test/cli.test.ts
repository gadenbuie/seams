import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const CLI = path.resolve(import.meta.dirname, "..", "src", "cli.ts");

function run(args: string[], cwd?: string) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: "utf8",
  });
}

describe("the seams executable", () => {
  it("prints its version", () => {
    const result = run(["--version"]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), "0.1.0");
  });

  it("prints usage with no command", () => {
    const result = run([]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Usage: seams/);
  });

  it("exits 2 on an unknown command and prints usage on stderr", () => {
    const result = run(["bogus"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Unknown command: bogus/);
    assert.match(result.stderr, /Usage: seams/);
  });

  it("prints the bundled schema", () => {
    const result = run(["schema"]);
    assert.equal(result.status, 0);
    const schema = JSON.parse(result.stdout);
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(schema.properties.schemaVersion.const, 1);
  });

  it("prints the bundled schema's absolute path with --path", () => {
    const result = run(["schema", "--path"]);
    assert.equal(result.status, 0);
    const printed = result.stdout.trim();
    assert.ok(path.isAbsolute(printed), `expected an absolute path, got ${printed}`);
    assert.ok(readFileSync(printed, "utf8").includes("schemaVersion"));
  });

  it("reports the version that package.json declares", () => {
    const pkg = JSON.parse(
      readFileSync(path.resolve(import.meta.dirname, "..", "package.json"), "utf8"),
    );
    const result = run(["--version"]);
    assert.equal(result.stdout.trim(), pkg.version);
  });
});
