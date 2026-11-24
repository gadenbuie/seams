import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { copyFixture } from "./helpers.ts";

const CLI = path.resolve(import.meta.dirname, "..", "src", "cli.ts");

interface ChangedFile {
  status: string;
  path: string;
  origPath?: string;
  command: string;
}

interface Section<T> {
  items: T[];
  omitted: number;
}

interface ReferenceLine {
  line: number;
  text: string;
  kind: string;
}

interface ReferenceEntry {
  path: string;
  authority: string;
  status: string | null;
  lines: ReferenceLine[];
  command: string;
}

interface ManifestFinding {
  id: string;
  severity: string;
  path: string;
  line?: number;
  message: string;
  command: string;
}

interface Candidate {
  path: string;
  authority: string;
  status: string | null;
  reason: string;
  lines: ReferenceLine[];
  command: string;
}

interface ReconcileJson {
  schemaVersion: number;
  command: string;
  since: { requested: string; resolved: string };
  head: string;
  limit: number;
  changedFiles: { committed: Section<ChangedFile>; uncommitted: Section<ChangedFile> };
  references: {
    groups: { label: string; entries: ReferenceEntry[] }[];
    shown: number;
    total: number;
    omitted: number;
  };
  brokenLinks: Section<ManifestFinding>;
  indexCoverage: Section<ManifestFinding>;
  candidates: Section<Candidate>;
  warnings: string[];
  note: string;
}

function run(args: string[], cwd: string) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
}

function reconcileJson(args: string[], cwd: string): { status: number | null; json: ReconcileJson } {
  const result = run(["reconcile", ...args, "--json"], cwd);
  return { status: result.status, json: JSON.parse(result.stdout) as ReconcileJson };
}

/**
 * Turn a copy of the fixture into a git repository with a base commit, a
 * committed change to src/a/b.ts since the base, an uncommitted change to the
 * Makefile, and an untracked file.
 */
function gitRepo(): string {
  const cwd = copyFixture("reconcile-project");
  const git = (args: string[]): void => {
    const result = spawnSync(
      "git",
      ["-c", "user.email=t@example.com", "-c", "user.name=t", ...args],
      { cwd, encoding: "utf8" },
    );
    assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  };
  git(["init"]);
  git(["add", "-A"]);
  git(["commit", "-m", "base"]);
  writeFileSync(path.join(cwd, "src", "a", "b.ts"), 'export const marker = "b2";\n');
  git(["add", "-A"]);
  git(["commit", "-m", "change parser"]);
  writeFileSync(path.join(cwd, "Makefile"), "build:\n\techo rebuilt\n");
  writeFileSync(path.join(cwd, "src", "untracked.ts"), "export const untracked = 1;\n");
  return cwd;
}

/** Commit further changes to the fixture repo, on top of gitRepo(). */
function commitMore(cwd: string, message: string): void {
  const result = spawnSync(
    "git",
    ["-c", "user.email=t@example.com", "-c", "user.name=t", "add", "-A"],
    { cwd, encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  const commit = spawnSync(
    "git",
    ["-c", "user.email=t@example.com", "-c", "user.name=t", "commit", "-qm", message],
    { cwd, encoding: "utf8" },
  );
  assert.equal(commit.status, 0, commit.stderr);
}

/** A digest of every file below `cwd` (except .git) plus HEAD's commit id. */
function snapshot(cwd: string): string {
  const hash = createHash("sha256");
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const full = path.join(dir, entry.name);
      hash.update(path.relative(cwd, full));
      hash.update("\0");
      if (entry.isDirectory()) walk(full);
      else hash.update(readFileSync(full));
      hash.update("\0");
    }
  };
  walk(cwd);
  const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" });
  hash.update(head.stdout);
  return hash.digest("hex");
}

describe("seams reconcile", () => {
  it("exits 2 when --since is missing", () => {
    const cwd = copyFixture("reconcile-project");
    const result = run(["reconcile"], cwd);
    assert.equal(result.status, 2);
    assert.ok(result.stderr.includes("Missing --since"));
    assert.ok(result.stderr.includes("Usage: seams reconcile --since"));
  });

  it("exits 2 on a bad --limit and on stray arguments", () => {
    const cwd = copyFixture("reconcile-project");
    assert.equal(run(["reconcile", "--since", "HEAD", "--limit", "0"], cwd).status, 2);
    assert.equal(run(["reconcile", "--since", "HEAD", "stray"], cwd).status, 2);
  });

  it("exits 1 on an unknown revision", () => {
    const cwd = gitRepo();
    const result = run(["reconcile", "--since", "no-such-rev"], cwd);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes("Unknown revision: no-such-rev"));
  });

  it("exits 1 outside a git repository", () => {
    const cwd = copyFixture("reconcile-project");
    const result = run(["reconcile", "--since", "HEAD"], cwd);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes("Not inside a git repository"));
  });

  it("lists committed and uncommitted changes separately", () => {
    const cwd = gitRepo();
    const { status, json } = reconcileJson(["--since", "HEAD~1"], cwd);
    assert.equal(status, 1); // the fixture's broken link is an error finding
    assert.deepEqual(
      json.changedFiles.committed.items.map((file) => [file.status, file.path]),
      [["M", "src/a/b.ts"]],
    );
    assert.deepEqual(
      json.changedFiles.uncommitted.items.map((file) => [file.status, file.path]),
      [
        ["M", "Makefile"],
        ["?", "src/untracked.ts"],
      ],
    );
    assert.equal(json.changedFiles.committed.omitted, 0);
    assert.equal(json.changedFiles.uncommitted.omitted, 0);
    for (const file of [...json.changedFiles.committed.items, ...json.changedFiles.uncommitted.items]) {
      assert.equal(file.command, `seams impact ${file.path}`);
    }
  });

  it("references are grouped by authority like impact", () => {
    const cwd = gitRepo();
    const { json } = reconcileJson(["--since", "HEAD~1"], cwd);
    const lines = (group: string): [string, number[]][] => {
      const found = json.references.groups.find((entry) => entry.label === group);
      assert.ok(found, `expected a ${group} group`);
      return found.entries.map((entry) => [entry.path, entry.lines.map((line) => line.line)]);
    };
    assert.deepEqual(
      json.references.groups.map((group) => group.label),
      ["Canon", "Overviews", "Accepted proposals", "Other proposals", "Plans"],
    );
    assert.deepEqual(lines("Canon"), [["docs/design/canon.md", [7, 9]]]);
    assert.deepEqual(lines("Overviews"), [["docs/design/overviews/system.md", [7]]]);
    assert.deepEqual(lines("Accepted proposals"), [[".agents/proposals/0001-accepted.md", [9]]]);
    assert.deepEqual(lines("Other proposals"), [[".agents/proposals/0002-draft.md", [9]]]);
    assert.deepEqual(lines("Plans"), [[".agents/plans/0001-active.md", [9]]]);
    assert.equal(json.references.total, 6);
    assert.equal(json.references.shown, 6);
    assert.equal(json.references.omitted, 0);
  });

  it("reports broken links and exits 1, but reports no index coverage problems", () => {
    const cwd = gitRepo();
    const { status, json } = reconcileJson(["--since", "HEAD~1"], cwd);
    assert.equal(status, 1);
    assert.deepEqual(
      json.brokenLinks.items.map((finding) => [
        finding.id,
        finding.severity,
        finding.path,
        finding.line,
        finding.message,
        finding.command,
      ]),
      [
        [
          "links",
          "error",
          "docs/design/overviews/system.md",
          9,
          "link target does not exist: ../gone.md",
          "seams read docs/design/overviews/system.md --lines 9-9",
        ],
      ],
    );
    assert.deepEqual(json.indexCoverage.items, []);
  });

  it("bounds every section with --limit and reports omitted counts", () => {
    const cwd = gitRepo();
    const { json } = reconcileJson(["--since", "HEAD~1", "--limit", "1"], cwd);
    assert.equal(json.limit, 1);
    assert.equal(json.changedFiles.committed.items.length, 1);
    assert.equal(json.changedFiles.committed.omitted, 0);
    assert.equal(json.changedFiles.uncommitted.items.length, 1);
    assert.equal(json.changedFiles.uncommitted.omitted, 1);
    assert.equal(json.references.shown, 1);
    assert.equal(json.references.omitted, 5);
    assert.equal(json.brokenLinks.items.length, 1);
    assert.equal(json.candidates.items.length, 1);
    assert.equal(json.candidates.omitted, 2);

    const text = run(["reconcile", "--since", "HEAD~1", "--limit", "1"], cwd);
    assert.ok(text.stdout.includes("Showing 1 of 6 references."));
    assert.ok(text.stdout.includes("(1 more omitted)"));
    assert.ok(text.stdout.includes("(2 more omitted)"));
  });

  it("lists candidates for review, each with a mechanical reason", () => {
    const cwd = gitRepo();
    const { json } = reconcileJson(["--since", "HEAD~1"], cwd);
    const rows = json.candidates.items.map((candidate) => [
      candidate.path,
      candidate.authority,
      candidate.status,
      candidate.reason,
    ]);
    assert.deepEqual(rows, [
      [
        ".agents/proposals/0001-accepted.md",
        "accepted proposal",
        "accepted",
        "accepted proposal names changed files, but no canon document it names changed",
      ],
      [
        ".agents/proposals/0002-draft.md",
        "draft proposal (not authorization)",
        "draft",
        "proposal status 'draft' is not terminal and it names changed files",
      ],
      [
        ".agents/plans/0001-active.md",
        "active plan",
        "active",
        "plan status 'active' is not terminal and it names changed files",
      ],
    ]);
  });

  it("keeps an accepted proposal that names a changed canon document out of the candidates", () => {
    const cwd = gitRepo();
    // The accepted proposal names the canon document, and both it and the
    // parser change in the same commit: the proposal now has a matching canon
    // change, so only the non-terminal documents stay candidates.
    appendFileSync(
      path.join(cwd, ".agents", "proposals", "0001-accepted.md"),
      "\nThe rules at docs/design/canon.md change too.\n",
    );
    appendFileSync(path.join(cwd, "docs", "design", "canon.md"), "\nA new rule about src/a/b.ts.\n");
    writeFileSync(path.join(cwd, "src", "a", "b.ts"), 'export const marker = "b3";\n');
    commitMore(cwd, "canon change");
    const { json } = reconcileJson(["--since", "HEAD~1"], cwd);
    assert.deepEqual(
      json.candidates.items.map((candidate) => candidate.path),
      [".agents/proposals/0002-draft.md", ".agents/plans/0001-active.md"],
    );
  });

  it("exits 0 when the evidence holds no error findings", () => {
    const cwd = gitRepo();
    // Fix the broken link and commit, then reconcile the fix itself.
    const overview = path.join(cwd, "docs", "design", "overviews", "system.md");
    writeFileSync(
      overview,
      readFileSync(overview, "utf8").replace(
        "A stale [document](../gone.md) links to a file that does not exist.\n",
        "",
      ),
    );
    commitMore(cwd, "fix link");
    const result = run(["reconcile", "--since", "HEAD~1"], cwd);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.includes("Broken links:"));
    assert.ok(result.stdout.includes("  none"));
  });

  it("has the documented manifest shape", () => {
    const cwd = gitRepo();
    const { json } = reconcileJson(["--since", "HEAD~1"], cwd);
    assert.equal(json.schemaVersion, 1);
    assert.equal(json.command, "reconcile");
    assert.deepEqual(json.since, { requested: "HEAD~1", resolved: json.since.resolved });
    assert.match(json.since.resolved, /^[0-9a-f]{40}$/);
    assert.match(json.head, /^[0-9a-f]{40}$/);
    assert.equal(json.limit, 50);
    for (const section of [
      json.changedFiles.committed,
      json.changedFiles.uncommitted,
      json.brokenLinks,
      json.indexCoverage,
      json.candidates,
    ]) {
      assert.ok(Array.isArray(section.items), "a section holds an items array");
      assert.equal(typeof section.omitted, "number", "a section reports its omitted count");
    }
    assert.deepEqual(
      Object.keys(json.references).sort(),
      ["groups", "omitted", "shown", "total"],
    );
    for (const group of json.references.groups) {
      for (const entry of group.entries) {
        assert.ok(entry.lines.length > 0, "a reference entry holds exact lines");
        for (const line of entry.lines) {
          assert.equal(typeof line.line, "number");
          assert.equal(typeof line.text, "string");
        }
        assert.match(entry.command, /^seams read \S+ --lines \d+-\d+$/);
      }
    }
    for (const finding of [...json.brokenLinks.items, ...json.indexCoverage.items]) {
      assert.match(finding.command, /^seams read \S+/);
    }
    for (const candidate of json.candidates.items) {
      assert.equal(typeof candidate.reason, "string");
      assert.match(candidate.command, /^seams read \S+$/);
    }
    assert.ok(Array.isArray(json.warnings));
    assert.equal(
      json.note,
      "No state was changed: reconcile.lastReconciledRevision was not advanced and no document was edited. " +
        "This command reports evidence only. Interpret drift and propose corrections with the seams-reconcile skill.",
    );
  });

  it("writes the manifest to --manifest-out and says so in text mode", () => {
    const cwd = gitRepo();
    const out = path.join(mkdtempSync(path.join(tmpdir(), "seams-manifest-")), "reconcile.json");
    const result = run(["reconcile", "--since", "HEAD~1", "--manifest-out", out], cwd);
    assert.equal(result.status, 1);
    const written = JSON.parse(readFileSync(out, "utf8")) as ReconcileJson;
    assert.equal(written.schemaVersion, 1);
    assert.equal(written.command, "reconcile");
    assert.ok(result.stdout.includes(`Manifest written to ${out}`));
  });

  it("prints the manifest with --json even when --manifest-out also writes it", () => {
    const cwd = gitRepo();
    const out = path.join(mkdtempSync(path.join(tmpdir(), "seams-manifest-")), "reconcile.json");
    const result = run(["reconcile", "--since", "HEAD~1", "--manifest-out", out, "--json"], cwd);
    assert.equal(result.status, 1);
    const printed = JSON.parse(result.stdout) as ReconcileJson;
    const written = JSON.parse(readFileSync(out, "utf8")) as ReconcileJson;
    assert.equal(printed.command, "reconcile");
    assert.deepEqual(printed, written);
  });

  it("changes no state: the repository and the manifest's lastReconciledRevision are byte-identical", () => {
    const cwd = gitRepo();
    const manifestFile = path.join(cwd, ".agents", "seams.json");
    const manifestBefore = readFileSync(manifestFile);
    const treeBefore = snapshot(cwd);
    assert.ok(JSON.parse(manifestBefore.toString()).reconcile.lastReconciledRevision === null);

    // Every mode the command runs in.
    assert.equal(run(["reconcile", "--since", "HEAD~1"], cwd).status, 1);
    assert.equal(run(["reconcile", "--since", "HEAD~1", "--json"], cwd).status, 1);
    const out = path.join(mkdtempSync(path.join(tmpdir(), "seams-manifest-")), "reconcile.json");
    assert.equal(
      run(["reconcile", "--since", "HEAD~1", "--limit", "1", "--manifest-out", out], cwd).status,
      1,
    );

    assert.deepEqual(readFileSync(manifestFile), manifestBefore);
    assert.equal(snapshot(cwd), treeBefore);
    assert.ok(JSON.parse(readFileSync(manifestFile, "utf8")).reconcile.lastReconciledRevision === null);
  });

  it("ends its text output with the state note and the skill pointer", () => {
    const cwd = gitRepo();
    const result = run(["reconcile", "--since", "HEAD~1"], cwd);
    const lines = result.stdout.trimEnd().split("\n");
    assert.equal(
      lines.at(-2),
      "No state was changed: reconcile.lastReconciledRevision was not advanced and no document was edited.",
    );
    assert.equal(
      lines.at(-1),
      "This command reports evidence only. Interpret drift and propose corrections with the seams-reconcile skill.",
    );
    const text = lines.join("\n");
    const order = [
      "Committed changes since HEAD~1:",
      "Uncommitted changes:",
      "References:",
      "Broken links:",
      "Index coverage:",
      "Candidates for review:",
    ];
    let at = -1;
    for (const label of order) {
      const found = text.indexOf(label);
      assert.ok(found > at, `expected ${label} after the previous section`);
      at = found;
    }
  });
});
