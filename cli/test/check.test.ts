import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { MANIFEST_REPO_PATH } from "../src/config.ts";
import type { Finding } from "../src/check/types.ts";
import { copyFixture } from "./helpers.ts";

const CLI = path.resolve(import.meta.dirname, "..", "src", "cli.ts");

interface CheckJson {
  schemaVersion: number;
  command: string;
  findings: Finding[];
  errors: number;
  warnings: number;
}

function run(args: string[], cwd: string) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
}

function runJson(cwd: string): { status: number | null; json: CheckJson } {
  const result = run(["check", "--json"], cwd);
  return { status: result.status, json: JSON.parse(result.stdout) };
}

function lines(stdout: string): string[] {
  return stdout.split("\n").filter((line) => line.length > 0);
}

describe("seams check", () => {
  it("reports no findings on a project that conforms", () => {
    const cwd = copyFixture("check-good");
    const result = run(["check"], cwd);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.deepEqual(lines(result.stdout), ["No findings."]);

    const { status, json } = runJson(cwd);
    assert.equal(status, 0);
    assert.equal(json.schemaVersion, 1);
    assert.equal(json.command, "check");
    assert.deepEqual(json.findings, []);
    assert.equal(json.errors, 0);
    assert.equal(json.warnings, 0);
  });

  it("exits 1 with the right findings on a project that does not conform", () => {
    const cwd = copyFixture("check-bad");
    const { status, json } = runJson(cwd);
    assert.equal(status, 1);
    assert.equal(json.errors, 6);
    assert.equal(json.warnings, 2);
    assert.equal(json.findings.length, 8);

    const byPath = (pathKey: string) =>
      json.findings.filter((finding) => finding.path === pathKey);

    const missingTitle = byPath("docs/design/no-title.md");
    assert.deepEqual(missingTitle.map((finding) => [finding.id, finding.severity, finding.line, finding.message]), [
      ["frontmatter", "error", 1, "frontmatter is missing 'title'"],
    ]);

    const emptyDescription = byPath("docs/design/no-description.md");
    assert.deepEqual(
      emptyDescription.map((finding) => finding.severity),
      ["error"],
    );
    assert.match(emptyDescription[0].message, /'description'/);

    const placeholder = byPath("docs/design/overviews/system.md");
    assert.deepEqual(
      placeholder.map((finding) => [finding.severity, finding.line, finding.message]),
      [["warning", 3, "description is still the 'TODO:' placeholder from `seams new`"]],
    );

    const bodyDuplicate = byPath(".agents/proposals/0001-first.md");
    assert.deepEqual(
      bodyDuplicate.map((finding) => [finding.severity, finding.line, finding.message]),
      [["warning", 10, "body line repeats the frontmatter field 'status'"]],
    );

    const badDate = byPath(".agents/proposals/0002-second.md").filter(
      (finding) => finding.id === "frontmatter",
    );
    assert.deepEqual(
      badDate.map((finding) => [finding.severity, finding.line]),
      [["error", 5]],
    );
    assert.match(badDate[0].message, /not a valid YYYY-MM-DD date/);

    // Both files carry number 0002; name order makes the duplicate the
    // owner and reports on the second file in that order.
    const duplicateNumber = byPath(".agents/proposals/0002-second.md").filter(
      (finding) => finding.id === "numbering",
    );
    assert.deepEqual(
      duplicateNumber.map((finding) => [finding.id, finding.severity, finding.message]),
      [
        [
          "numbering",
          "error",
          "proposal number 0002 is already used by .agents/proposals/0002-dupe.md",
        ],
      ],
    );

    const badName = byPath(".agents/proposals/notes.md");
    assert.deepEqual(
      badName.map((finding) => [finding.id, finding.severity, finding.message]),
      [["numbering", "error", "proposal file name is not NNNN-slug.md, got 'notes.md'"]],
    );

    const unknownStatus = byPath(".agents/plans/0001-plan.md");
    assert.deepEqual(
      unknownStatus.map((finding) => [finding.id, finding.severity, finding.line]),
      [["status", "error", 4]],
    );
    assert.match(unknownStatus[0].message, /unknown status 'paused' for a plan/);
    assert.match(unknownStatus[0].message, /draft, active, done, abandoned/);
  });

  it("groups the text output by file and summarizes the counts", () => {
    const cwd = copyFixture("check-bad");
    const result = run(["check"], cwd);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");

    const out = lines(result.stdout);
    assert.equal(out[out.length - 1], "6 errors, 2 warnings.");

    const headers = out.filter((line) => line.endsWith(":"));
    assert.deepEqual(headers, [
      ".agents/plans/0001-plan.md:",
      ".agents/proposals/0001-first.md:",
      ".agents/proposals/0002-second.md:",
      ".agents/proposals/notes.md:",
      "docs/design/no-description.md:",
      "docs/design/no-title.md:",
      "docs/design/overviews/system.md:",
    ]);

    const plan = out.findIndex((line) => line.endsWith(".agents/plans/0001-plan.md:"));
    assert.match(out[plan + 1], /4: \[error\] status: unknown status 'paused'/);
  });

  it("warns, but exits 0, when a configured home does not exist yet", () => {
    const cwd = copyFixture("check-missing-path");
    const { status, json } = runJson(cwd);
    assert.equal(status, 0);
    assert.equal(json.errors, 0);
    // Each warning points at the missing home itself, not at the manifest.
    assert.deepEqual(
      json.findings.map((finding) => [finding.path, finding.message]),
      [
        [".agents/plans", "the 'plans' home does not exist yet: .agents/plans"],
        [
          ".agents/proposals",
          "the 'proposals' home does not exist yet: .agents/proposals",
        ],
        [
          "docs/design/overviews",
          "the 'overviews' home does not exist yet: docs/design/overviews",
        ],
      ],
    );
    assert.ok(
      json.findings.every(
        (finding) => finding.id === "manifest" && finding.severity === "warning",
      ),
    );
  });

  it("points a missing conventional home at the home, not at a manifest that is absent", () => {
    const cwd = copyFixture("check-good");
    rmSync(path.join(cwd, ".agents", "plans"), { recursive: true });
    const { status, json } = runJson(cwd);
    assert.equal(status, 0);
    assert.deepEqual(
      json.findings.map((finding) => [finding.path, finding.message]),
      [[".agents/plans", "the 'plans' home does not exist yet: .agents/plans"]],
    );
  });

  it("reports an invalid manifest as errors and runs no other check", () => {
    const cwd = copyFixture("check-invalid-manifest");
    const { status, json } = runJson(cwd);
    assert.equal(status, 1);
    assert.ok(json.errors >= 1);
    assert.ok(
      json.findings.every(
        (finding) =>
          finding.id === "manifest" &&
          finding.severity === "error" &&
          finding.path === ".agents/seams.json",
      ),
    );
    assert.ok(
      json.findings.some((finding) => finding.message.includes("schemaVersion")),
      "expected an issue naming schemaVersion",
    );
  });

  it("rejects arguments the command does not take", () => {
    const cwd = copyFixture("check-good");
    const result = run(["check", "extra"], cwd);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage: seams check/);
  });

  it("exposes the manifest path with forward slashes for finding paths", () => {
    assert.equal(MANIFEST_REPO_PATH, ".agents/seams.json");
  });
});
