import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { copyFixture } from "./helpers.ts";

const CLI = path.resolve(import.meta.dirname, "..", "src", "cli.ts");

interface ImpactLine {
  line: number;
  text: string;
  kind: string;
}

interface ImpactEntry {
  path: string;
  authority: string;
  status: string | null;
  lines: ImpactLine[];
}

interface ImpactGroup {
  label: string;
  entries: ImpactEntry[];
}

interface ImpactJson {
  schemaVersion: number;
  command: string;
  paths: string[];
  groups: ImpactGroup[];
  shown: number;
  omitted: number;
  note: string;
  warnings: string[];
}

function run(args: string[], cwd: string) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
}

function impactJson(args: string[], cwd: string): { status: number | null; json: ImpactJson } {
  const result = run(["impact", ...args, "--json"], cwd);
  return { status: result.status, json: JSON.parse(result.stdout) as ImpactJson };
}

/** The documents referenced in one group, as `[path, [line, ...]]` pairs. */
function groupEntries(json: ImpactJson, label: string): [string, number[]][] {
  const group = json.groups.find((entry) => entry.label === label);
  assert.ok(group, `expected a ${label} group`);
  return group.entries.map((entry) => [entry.path, entry.lines.map((line) => line.line)]);
}

/**
 * Turn a copy of the fixture into a git repository with one commit, then
 * change the working tree: modify, add (staged), leave untracked, rename,
 * and delete files the fixture's documents reference.
 */
function gitFixture(): string {
  const cwd = copyFixture("impact-project");
  const git = (args: string[]): void => {
    const result = spawnSync("git", ["-c", "user.email=t@example.com", "-c", "user.name=t", ...args], {
      cwd,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
  };
  git(["init"]);
  // The fixture repo must not inherit the machine's commit signing: tests
  // would hang on the operator's keychain instead of failing fast.
  git(["config", "commit.gpgsign", "false"]);
  git(["add", "-A"]);
  git(["commit", "-m", "base"]);
  // Modified (tracked), staged addition, untracked file.
  spawnSync("sh", ["-c", 'printf "export const marker = \\"b2\\";\\n" > src/a/b.ts'], { cwd });
  spawnSync("sh", ["-c", 'printf "export const added = 1;\\n" > src/added.ts && git add src/added.ts'], { cwd });
  spawnSync("sh", ["-c", 'printf "export const untracked = 1;\\n" > src/untracked.ts'], { cwd });
  // Rename and delete, both reported by old and new names.
  git(["mv", "Makefile", "makefile.mk"]);
  git(["rm", "-q", "--cached", "src/xa/b.ts"]);
  spawnSync("sh", ["-c", "rm src/xa/b.ts"], { cwd });
  return cwd;
}

describe("seams impact", () => {
  it("groups referencing documents by authority", () => {
    const cwd = copyFixture("impact-project");
    const { status, json } = impactJson(["src/a/b.ts"], cwd);
    assert.equal(status, 0);
    assert.equal(json.schemaVersion, 1);
    assert.equal(json.command, "impact");
    assert.deepEqual(json.paths, ["src/a/b.ts"]);
    assert.deepEqual(
      json.groups.map((group) => group.label),
      ["Canon", "Overviews", "Accepted proposals", "Other proposals", "Plans", "Navigation"],
    );
    assert.deepEqual(groupEntries(json, "Canon"), [["docs/design/canon.md", [9]]]);
    assert.deepEqual(groupEntries(json, "Overviews"), [["docs/design/overviews/system.md", [7, 9]]]);
    assert.deepEqual(groupEntries(json, "Accepted proposals"), [
      [".agents/proposals/0001-accepted.md", [9, 11]],
    ]);
    assert.deepEqual(groupEntries(json, "Other proposals"), [[".agents/proposals/0002-draft.md", [9]]]);
    assert.deepEqual(groupEntries(json, "Plans"), [[".agents/plans/plan-done.md", [9]]]);
    // The canon home's index is navigation, not canon, so it takes the
    // navigation group instead of joining canon.md.
    assert.deepEqual(groupEntries(json, "Navigation"), [["docs/design/index.md", [9]]]);

    const entry = json.groups[0].entries[0];
    assert.equal(entry.authority, "canon");
    assert.equal(entry.status, null);
    assert.equal(entry.lines[0].kind, "text");
    assert.ok(entry.lines[0].text.includes("src/a/b.ts"));
    const draft = json.groups[3].entries[0];
    assert.equal(draft.authority, "draft proposal (not authorization)");
    assert.equal(draft.status, "draft");

    assert.equal(json.shown, 8);
    assert.equal(json.omitted, 0);
    assert.equal(json.note, "These are candidates for review, not proof that a document is stale.");
    assert.deepEqual(json.warnings, []);
  });

  it("folds a home index into the group its authority fits", () => {
    const cwd = copyFixture("impact-project");
    // The canon home's index links canon.md and is navigation, not canon.
    const designIndex = impactJson(["docs/design/canon.md"], cwd);
    assert.deepEqual(designIndex.json.groups.map((group) => group.label), ["Navigation"]);
    assert.deepEqual(groupEntries(designIndex.json, "Navigation"), [["docs/design/index.md", [7]]]);
    const entry = designIndex.json.groups[0].entries[0];
    assert.equal(entry.authority, "navigation");
    assert.equal(entry.status, null);
    assert.equal(entry.lines[0].kind, "link");

    // The overviews home's index folds into the existing Overviews group.
    const overviewsIndex = impactJson(["docs/design/overviews/system.md"], cwd);
    assert.deepEqual(overviewsIndex.json.groups.map((group) => group.label), ["Overviews"]);
    assert.deepEqual(groupEntries(overviewsIndex.json, "Overviews"), [
      ["docs/design/overviews/index.md", [7]],
    ]);
    assert.equal(overviewsIndex.json.groups[0].entries[0].authority, "memory (verify against code)");
  });

  it("looks up several paths at once", () => {
    const cwd = copyFixture("impact-project");
    const { json } = impactJson(["Makefile", "src/a/b.ts"], cwd);
    assert.deepEqual(json.paths, ["Makefile", "src/a/b.ts"]);
    // Canon references the Makefile by link on line 7 and src/a/b.ts as text
    // on line 9.
    assert.deepEqual(groupEntries(json, "Canon"), [["docs/design/canon.md", [7, 9]]]);
  });

  it("ends its text output with the candidates note", () => {
    const cwd = copyFixture("impact-project");
    const result = run(["impact", "src/a/b.ts"], cwd);
    assert.equal(result.status, 0);
    const lines = result.stdout.trimEnd().split("\n");
    assert.equal(lines.at(-1), "These are candidates for review, not proof that a document is stale.");
    const text = lines.join("\n");
    for (const label of ["Canon:", "Overviews:", "Accepted proposals:", "Other proposals:", "Plans:"]) {
      assert.ok(text.includes(label), `expected ${label} in text output`);
    }
    assert.ok(text.includes("docs/design/canon.md · canon"));
    assert.ok(text.includes("    9: The parser lives at src/a/b.ts"));
  });

  it("limits references and reports the omitted count", () => {
    const cwd = copyFixture("impact-project");
    const { json } = impactJson(["src/a/b.ts", "--limit", "3"], cwd);
    assert.equal(json.shown, 3);
    assert.equal(json.omitted, 5);
    // The limit cuts the walk after the overview group: later groups drop out
    // whole, and the note still reports the candidates.
    assert.deepEqual(
      json.groups.map((group) => group.label),
      ["Canon", "Overviews"],
    );
    assert.deepEqual(groupEntries(json, "Overviews"), [["docs/design/overviews/system.md", [7, 9]]]);

    const text = run(["impact", "src/a/b.ts", "--limit", "3"], cwd);
    assert.ok(text.stdout.includes("Showing 3 of 8 references."));
    assert.ok(text.stdout.trimEnd().endsWith("These are candidates for review, not proof that a document is stale."));
  });

  it("rejects paths outside the project root", () => {
    const cwd = copyFixture("impact-project");
    const result = run(["impact", "../outside/x.ts"], cwd);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes("Path outside the project root"));

    const absolute = run(["impact", path.resolve(cwd, "..", "elsewhere.ts")], cwd);
    assert.equal(absolute.status, 1);
    assert.ok(absolute.stderr.includes("Path outside the project root"));
  });

  it("exits 2 on usage errors", () => {
    const cwd = copyFixture("impact-project");
    assert.equal(run(["impact"], cwd).status, 2);
    assert.equal(run(["impact", "src/a/b.ts", "--git-diff"], cwd).status, 2);
    assert.equal(run(["impact", "src/a/b.ts", "--limit", "0"], cwd).status, 2);
  });

  it("reports changed, added, untracked, renamed, and deleted paths with --git-diff", () => {
    const cwd = gitFixture();
    const { status, json } = impactJson(["--git-diff"], cwd);
    assert.equal(status, 0);
    assert.deepEqual(json.paths.sort(), [
      "Makefile",
      "makefile.mk",
      "src/a/b.ts",
      "src/added.ts",
      "src/untracked.ts",
      "src/xa/b.ts",
    ]);
    assert.ok(json.groups.length > 0);
    assert.equal(json.note, "These are candidates for review, not proof that a document is stale.");
  });

  it("reports no references when the diff is empty", () => {
    const cwd = gitFixture();
    const commit = spawnSync(
      "sh",
      ["-c", "git add -A && git -c user.email=t@example.com -c user.name=t commit -qm work"],
      { cwd, encoding: "utf8" },
    );
    assert.equal(commit.status, 0, commit.stderr);
    const { status, json } = impactJson(["--git-diff"], cwd);
    assert.equal(status, 0);
    assert.deepEqual(json.paths, []);
    assert.deepEqual(json.groups, []);
    assert.equal(json.omitted, 0);
  });

  it("treats a repository with no commits as all-new files", () => {
    const cwd = copyFixture("impact-project");
    const git = (args: string[]): void => {
      const result = spawnSync(
        "git",
        ["-c", "user.email=t@example.com", "-c", "user.name=t", ...args],
        { cwd, encoding: "utf8" },
      );
      assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
    };
    git(["init"]);
    git(["config", "commit.gpgsign", "false"]);
    git(["add", "Makefile"]);
    const { status, json } = impactJson(["--git-diff"], cwd);
    assert.equal(status, 0);
    // The staged Makefile and the untracked canon document both count as new.
    assert.ok(json.paths.includes("Makefile"));
    assert.ok(json.paths.includes("docs/design/canon.md"));
  });

  it("reports diff paths relative to a project root below the git root", () => {
    const parent = mkdtempSync(path.join(tmpdir(), "seams-git-"));
    const project = path.join(parent, "proj");
    cpSync(path.resolve(import.meta.dirname, "fixtures", "impact-project"), project, {
      recursive: true,
    });
    // A manifest pins the project root to proj/ even though the git root is
    // the parent directory.
    writeFileSync(
      path.join(project, ".agents", "seams.json"),
      JSON.stringify({ schemaVersion: 1, seamsVersion: "0.1.0" }) + "\n",
    );
    const git = (args: string[], cwd: string): void => {
      const result = spawnSync(
        "git",
        ["-c", "user.email=t@example.com", "-c", "user.name=t", ...args],
        { cwd, encoding: "utf8" },
      );
      assert.equal(result.status, 0, `git ${args.join(" ")} failed: ${result.stderr}`);
    };
    git(["init"], parent);
    git(["config", "commit.gpgsign", "false"], parent);
    git(["add", "-A"], parent);
    git(["commit", "-qm", "base"], parent);
    spawnSync("sh", ["-c", 'printf "export const marker = \\"b2\\";\\n" > src/a/b.ts'], { cwd: project });

    const { status, json } = impactJson(["--git-diff"], project);
    assert.equal(status, 0);
    assert.deepEqual(json.paths, ["src/a/b.ts"]);
    assert.deepEqual(groupEntries(json, "Canon"), [["docs/design/canon.md", [9]]]);
  });

  it("fails when --git-diff runs outside a git repository", () => {
    const cwd = copyFixture("impact-project");
    const result = run(["impact", "--git-diff"], cwd);
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes("Not inside a git repository"));
  });
});

describe("seams impact, notes", () => {
  it("never reports a note, even when only a note references the path", () => {
    const cwd = copyFixture("notes-project");
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    writeFileSync(path.join(cwd, "src", "only-note.ts"), "export const marker = 1;\n");
    appendFileSync(
      path.join(cwd, "_dev", "notes", "scratch.md"),
      "Only the scratch note links to [only-note](../../src/only-note.ts).\n",
    );

    const result = run(["impact", "src/only-note.ts"], cwd);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.deepEqual(result.stdout.split("\n").filter((l) => l.length > 0), [
      "No references found for: src/only-note.ts",
      "These are candidates for review, not proof that a document is stale.",
    ]);

    const { status, json } = impactJson(["src/only-note.ts"], cwd);
    assert.equal(status, 0);
    assert.deepEqual(json.groups, []);
    assert.equal(json.shown, 0);
    assert.equal(json.omitted, 0);
  });

  it("reports the shared documents that reference a path, without the note that links it", () => {
    const cwd = copyFixture("notes-project");
    const { status, json } = impactJson(["docs/design/vision.md"], cwd);
    assert.equal(status, 0);
    const allPaths = json.groups.flatMap((group) => group.entries.map((entry) => entry.path));
    assert.equal(allPaths.some((p) => p.startsWith("_dev/notes")), false);
    assert.ok(allPaths.includes("docs/design/overviews/system.md"), JSON.stringify(allPaths));
  });
});
