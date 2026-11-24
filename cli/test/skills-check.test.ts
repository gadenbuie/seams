/**
 * Tests for `seams skills check` and `seams skills update`: the six-way
 * classification, the update selection (outdated and missing only), dry run,
 * failure isolation, metadata rewriting, and the command's exit codes.
 *
 * Every CLI run uses a temporary HOME and a temporary project directory, with
 * CLAUDE_CONFIG_DIR, CODEX_HOME, and XDG_STATE_HOME pointed into the
 * temporary home before the child process (and so before the library, which
 * captures the home directory at import time) starts. The version 1 →
 * version 2 update runs against the fixture bundles in test/fixtures/, in
 * process scope project with a temporary working directory, so no test
 * touches the operator's real agent settings or home directory, and no test
 * sends telemetry.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { checkSkills, updateSkills } from "../src/skills/check.ts";
import { bundledSkillsDir } from "../src/skills/bundled.ts";
import { skillFolderHash } from "../src/skills/hash.ts";
import { installSkills } from "../src/skills/install.ts";

const CLI = path.resolve(import.meta.dirname, "..", "src", "cli.ts");
const FIXTURE_V1 = path.join(import.meta.dirname, "fixtures", "skills-v1");
const FIXTURE_V2 = path.join(import.meta.dirname, "fixtures", "skills-v2");

/** One isolated environment: a temporary home and a temporary project. */
interface TestEnv {
  home: string;
  project: string;
}

const envs: TestEnv[] = [];

function makeEnv(): TestEnv {
  const env: TestEnv = {
    home: mkdtempSync(path.join(tmpdir(), "seams-home-")),
    // The child's process.cwd() returns the real path (macOS: /private/var),
    // so the project must be compared in real-path form too.
    project: realpathSync(mkdtempSync(path.join(tmpdir(), "seams-proj-"))),
  };
  envs.push(env);
  return env;
}

/** A temporary working directory for in-process (project scope) tests. */
function tempProject(): string {
  return realpathSync(mkdtempSync(path.join(tmpdir(), "seams-cu-")));
}

after(() => {
  for (const env of envs) {
    rmSync(env.home, { recursive: true, force: true });
    rmSync(env.project, { recursive: true, force: true });
  }
});

/** Agent detection markers inside the temporary home. */
function markers(env: TestEnv, agents: { claude?: boolean; codex?: boolean; pi?: boolean }): void {
  if (agents.claude) mkdirSync(path.join(env.home, ".claude"), { recursive: true });
  if (agents.codex) mkdirSync(path.join(env.home, ".codex"), { recursive: true });
  if (agents.pi) mkdirSync(path.join(env.home, ".pi", "agent"), { recursive: true });
}

/** Child-process environment isolating every home path into `env.home`. */
function childEnv(env: TestEnv): NodeJS.ProcessEnv {
  return {
    ...process.env,
    HOME: env.home,
    CLAUDE_CONFIG_DIR: path.join(env.home, ".claude"),
    CODEX_HOME: path.join(env.home, ".codex"),
    XDG_STATE_HOME: path.join(env.home, ".local", "state"),
    DISABLE_TELEMETRY: "1",
  };
}

function run(env: TestEnv, args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: env.project,
    env: childEnv(env),
    encoding: "utf8",
  });
}

function runJson(env: TestEnv, args: string[]) {
  const result = run(env, args);
  assert.equal(result.status, 0, `${args.join(" ")} failed:\n${result.stderr}`);
  return JSON.parse(result.stdout);
}

/** Sorted file names of a directory in the operator's real home, or null. */
function realHomeListing(dir: string): string[] | null {
  const target = path.join(homedir(), dir);
  return existsSync(target) ? readdirSync(target).sort() : null;
}

/** The metadata file of a scope, parsed. */
function readMeta(cwd: string, scope: "project" | "global") {
  const file = scope === "project"
    ? path.join(cwd, ".agents", "seams-skills.json")
    : path.join(homedir(), ".agents", "seams-skills.json");
  return JSON.parse(readFileSync(file, "utf8"));
}

/** Install both fixture skills from `fixture` for pi, in copy mode. */
async function installFixture(cwd: string, fixture: string): Promise<void> {
  const report = await installSkills({
    cwd,
    scope: "project",
    mode: "copy",
    agents: ["pi"],
    sourceDir: fixture,
  });
  assert.equal(report.targets.length, 2);
  for (const target of report.targets) assert.equal(target.action, "install");
}

describe("skills check classification", () => {
  it("classifies ok against the installing version and outdated against a newer one", async () => {
    const project = tempProject();
    try {
      await installFixture(project, FIXTURE_V1);

      const same = await checkSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V1 });
      assert.deepEqual(
        same.entries.map((e) => [e.skill, e.agent, e.state]),
        [
          ["seams-orient", "pi", "ok"],
          ["seams-work", "pi", "ok"],
        ],
      );

      const newer = await checkSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V2 });
      const orient = newer.entries.find((e) => e.skill === "seams-orient");
      assert.equal(orient?.state, "outdated");
      assert.equal(orient?.bundledHash, skillFolderHash(path.join(FIXTURE_V2, "seams-orient")));
      assert.equal(orient?.recordedHash, skillFolderHash(path.join(FIXTURE_V1, "seams-orient")));
      assert.equal(orient?.bundledPath, path.join(FIXTURE_V2, "seams-orient"));
      assert.equal(newer.entries.find((e) => e.skill === "seams-work")?.state, "ok");
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("classifies a hand-edited copy as modified, or divergent when the bundle also moved on", async () => {
    const project = tempProject();
    try {
      await installFixture(project, FIXTURE_V1);
      const installed = path.join(project, ".agents", "skills", "seams-orient", "SKILL.md");
      writeFileSync(installed, readFileSync(installed, "utf8") + "\n<!-- hand edit -->\n");

      const same = await checkSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V1 });
      assert.equal(same.entries.find((e) => e.skill === "seams-orient")?.state, "modified");

      const newer = await checkSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V2 });
      assert.equal(newer.entries.find((e) => e.skill === "seams-orient")?.state, "divergent");
      assert.equal(newer.entries.find((e) => e.skill === "seams-work")?.state, "ok");
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("classifies a deleted copy as missing, in copy and symlink mode", async () => {
    const project = tempProject();
    try {
      await installFixture(project, FIXTURE_V1);
      rmSync(path.join(project, ".agents", "skills", "seams-orient"), { recursive: true });
      const copyMode = await checkSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V1 });
      assert.equal(copyMode.entries.find((e) => e.skill === "seams-orient")?.state, "missing");
      assert.equal(copyMode.entries.find((e) => e.skill === "seams-work")?.state, "ok");
    } finally {
      rmSync(project, { recursive: true, force: true });
    }

    const linked = tempProject();
    try {
      await installSkills({
        cwd: linked,
        scope: "project",
        mode: "symlink",
        agents: ["claude-code", "pi"],
        sourceDir: FIXTURE_V1,
      });
      // Claude's link is gone but the canonical copy is fine: only claude's
      // destination is missing.
      rmSync(path.join(linked, ".claude", "skills", "seams-orient"));
      const report = await checkSkills({ cwd: linked, scope: "project", sourceDir: FIXTURE_V1 });
      assert.deepEqual(
        report.entries.map((e) => [e.skill, e.agent, e.state]),
        [
          ["seams-orient", "claude-code", "missing"],
          ["seams-orient", "pi", "ok"],
          ["seams-work", "claude-code", "ok"],
          ["seams-work", "pi", "ok"],
        ],
      );
      assert.match(report.entries[0].path, /[\\/].claude[\\/]skills[\\/]seams-orient$/);
    } finally {
      rmSync(linked, { recursive: true, force: true });
    }
  });

  it("classifies seams-named copies the metadata does not track as untracked", async () => {
    const project = tempProject();
    try {
      await installFixture(project, FIXTURE_V1);
      // A stray in claude's dir: an unrecorded name, and a recorded name at a
      // path the record does not cover.
      mkdirSync(path.join(project, ".claude", "skills"), { recursive: true });
      cpSync(
        path.join(FIXTURE_V1, "seams-work"),
        path.join(project, ".claude", "skills", "seams-legacy"),
        { recursive: true },
      );
      cpSync(
        path.join(FIXTURE_V1, "seams-work"),
        path.join(project, ".claude", "skills", "seams-orient"),
        { recursive: true },
      );
      // A directory (and skill) that is not seams-named is none of seams'
      // business, even though it sits in an agent's skills dir.
      mkdirSync(path.join(project, ".claude", "skills", "other-skill"), { recursive: true });
      writeFileSync(
        path.join(project, ".claude", "skills", "other-skill", "SKILL.md"),
        "---\nname: other-skill\ndescription: Not a seams skill.\n---\n\nNot a seams skill.\n",
      );

      const report = await checkSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V1 });
      const untracked = report.entries.filter((e) => e.state === "untracked");
      assert.deepEqual(
        untracked.map((e) => [e.skill, e.agent]),
        [
          ["seams-legacy", "claude-code"],
          ["seams-orient", "claude-code"],
        ],
      );
      // The stray unrecorded name has no bundled counterpart; the stray
      // recorded name does, and it carries the bundled copy's path for
      // reconciliation.
      assert.equal(untracked[0].bundledPath, undefined);
      assert.equal(untracked[1].bundledPath, path.join(FIXTURE_V1, "seams-orient"));

      // An explicit agent selection limits the scan.
      const filtered = await checkSkills({
        cwd: project,
        scope: "project",
        sourceDir: FIXTURE_V1,
        agents: ["pi"],
      });
      assert.equal(filtered.entries.find((e) => e.state === "untracked"), undefined);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("reports nothing on a fresh project and needs no metadata", async () => {
    const project = tempProject();
    try {
      const report = await checkSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V1 });
      assert.deepEqual(report.entries, []);
      assert.ok(!existsSync(path.join(project, ".agents")));
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});

describe("skills update", () => {
  it("updates outdated and missing copies only, preserving modified ones byte for byte", async () => {
    const project = tempProject();
    try {
      await installFixture(project, FIXTURE_V1);
      // seams-orient is deleted (missing), seams-work is hand-edited
      // (modified; its fixture content does not change in v2).
      rmSync(path.join(project, ".agents", "skills", "seams-orient"), { recursive: true });
      const work = path.join(project, ".agents", "skills", "seams-work", "SKILL.md");
      writeFileSync(work, readFileSync(work, "utf8") + "\n<!-- hand edit -->\n");
      const workBefore = readFileSync(work, "utf8");

      const report = await updateSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V2 });
      assert.deepEqual(
        report.targets.map((t) => [t.skill, t.agent, t.reason, t.action]),
        [["seams-orient", "pi", "missing", "updated"]],
      );
      assert.deepEqual(
        report.kept.map((e) => [e.skill, e.agent, e.state]),
        [["seams-work", "pi", "modified"]],
      );
      assert.equal(report.metaUpdated, true);

      // The missing copy came back with the version 2 content.
      const installed = path.join(project, ".agents", "skills", "seams-orient");
      assert.equal(skillFolderHash(installed), skillFolderHash(path.join(FIXTURE_V2, "seams-orient")));
      // The modified copy was never passed to the library.
      assert.equal(readFileSync(work, "utf8"), workBefore);

      // The metadata carries the new hash, version, and package version.
      const meta = readMeta(project, "project");
      const orient = meta.skills["seams-orient"];
      assert.equal(orient.hash, skillFolderHash(path.join(FIXTURE_V2, "seams-orient")));
      assert.equal(orient.version, "2.0");
      assert.deepEqual(orient.agents, ["pi"]);
      assert.equal(meta.packageVersion, meta.packageVersion); // present
      assert.ok(typeof meta.packageVersion === "string" && meta.packageVersion.length > 0);
      const workRecord = meta.skills["seams-work"];
      assert.equal(workRecord.hash, skillFolderHash(path.join(FIXTURE_V1, "seams-work")));

      // A second check against v2: the repair worked, the edit survives.
      const after = await checkSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V2 });
      assert.deepEqual(
        after.entries.map((e) => [e.skill, e.state]),
        [
          ["seams-orient", "ok"],
          ["seams-work", "modified"],
        ],
      );
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("updates an outdated copy and records the new bundled hash and version", async () => {
    const project = tempProject();
    try {
      await installFixture(project, FIXTURE_V1);
      const report = await updateSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V2 });
      assert.deepEqual(
        report.targets.map((t) => [t.skill, t.reason, t.action]),
        [["seams-orient", "outdated", "updated"]],
      );
      assert.deepEqual(report.kept, []);
      assert.equal(report.metaUpdated, true);

      const meta = readMeta(project, "project");
      assert.equal(meta.skills["seams-orient"].hash, skillFolderHash(path.join(FIXTURE_V2, "seams-orient")));
      assert.equal(meta.skills["seams-orient"].version, "2.0");
      // seams-work was already current: its record is untouched.
      assert.equal(meta.skills["seams-work"].version, "1.0");

      // The next update has nothing to do and rewrites no metadata.
      const metaFile = path.join(project, ".agents", "seams-skills.json");
      const before = readFileSync(metaFile, "utf8");
      const again = await updateSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V2 });
      assert.deepEqual(again.targets, []);
      assert.equal(again.metaUpdated, false);
      assert.equal(readFileSync(metaFile, "utf8"), before);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("never passes a divergent copy to the library", async () => {
    const project = tempProject();
    try {
      await installFixture(project, FIXTURE_V1);
      const installed = path.join(project, ".agents", "skills", "seams-orient", "SKILL.md");
      writeFileSync(installed, readFileSync(installed, "utf8") + "\n<!-- hand edit -->\n");
      const before = readFileSync(installed, "utf8");
      const metaFile = path.join(project, ".agents", "seams-skills.json");
      const metaBefore = readFileSync(metaFile, "utf8");

      const report = await updateSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V2 });
      assert.deepEqual(
        report.kept.map((e) => [e.skill, e.state]),
        [["seams-orient", "divergent"]],
      );
      assert.deepEqual(report.targets, []);
      assert.equal(report.metaUpdated, false);
      assert.equal(readFileSync(installed, "utf8"), before);
      assert.equal(readFileSync(metaFile, "utf8"), metaBefore);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("leaves untracked copies alone and reports them", async () => {
    const project = tempProject();
    try {
      await installFixture(project, FIXTURE_V1);
      const stray = path.join(project, ".claude", "skills", "seams-legacy");
      mkdirSync(path.dirname(stray), { recursive: true });
      cpSync(path.join(FIXTURE_V1, "seams-work"), stray, { recursive: true });
      const strayBefore = readFileSync(path.join(stray, "SKILL.md"), "utf8");

      const report = await updateSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V2 });
      assert.deepEqual(
        report.kept.map((e) => [e.skill, e.agent, e.state]),
        [["seams-legacy", "claude-code", "untracked"]],
      );
      assert.equal(readFileSync(path.join(stray, "SKILL.md"), "utf8"), strayBefore);
      assert.ok(existsSync(stray), "the stray copy still exists");
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("never targets a modified shared folder, even when an agent's link is missing", async () => {
    // Review regression (roborev 2576, finding 1): with the shared folder
    // hand-edited and claude's link deleted, the link check must not turn
    // the copy into a repair target — the library would rewrite the shared
    // folder and lose the edits.
    const linked = tempProject();
    try {
      await installSkills({
        cwd: linked,
        scope: "project",
        mode: "symlink",
        agents: ["claude-code", "pi"],
        sourceDir: FIXTURE_V1,
      });
      const canonical = path.join(linked, ".agents", "skills", "seams-orient", "SKILL.md");
      writeFileSync(canonical, readFileSync(canonical, "utf8") + "\n<!-- hand edit -->\n");
      rmSync(path.join(linked, ".claude", "skills", "seams-orient"));
      const before = readFileSync(canonical, "utf8");
      const metaFile = path.join(linked, ".agents", "seams-skills.json");
      const metaBefore = readFileSync(metaFile, "utf8");

      const check = await checkSkills({ cwd: linked, scope: "project", sourceDir: FIXTURE_V2 });
      assert.deepEqual(
        check.entries.map((e) => [e.skill, e.agent, e.state]),
        [
          ["seams-orient", "claude-code", "divergent"],
          ["seams-orient", "pi", "divergent"],
          ["seams-work", "claude-code", "ok"],
          ["seams-work", "pi", "ok"],
        ],
      );
      const update = await updateSkills({ cwd: linked, scope: "project", sourceDir: FIXTURE_V2 });
      assert.deepEqual(update.targets, []);
      assert.equal(update.metaUpdated, false);
      assert.equal(readFileSync(canonical, "utf8"), before, "the hand edit survives");
      assert.equal(readFileSync(metaFile, "utf8"), metaBefore);
      assert.ok(
        !existsSync(path.join(linked, ".claude", "skills", "seams-orient")),
        "the link stays missing",
      );
    } finally {
      rmSync(linked, { recursive: true, force: true });
    }
  });

  it("keeps a modified real folder at a symlink's link path", async () => {
    // Review regression (roborev 2576, finding 2): a hand-copied folder
    // with edits sitting where claude's symlink belongs must not be
    // classified missing, or update would let the library replace it with
    // a symlink and lose the changes.
    const linked = tempProject();
    try {
      await installSkills({
        cwd: linked,
        scope: "project",
        mode: "symlink",
        agents: ["claude-code"],
        sourceDir: FIXTURE_V1,
      });
      const link = path.join(linked, ".claude", "skills", "seams-orient");
      rmSync(link);
      cpSync(path.join(FIXTURE_V1, "seams-orient"), link, { recursive: true });
      writeFileSync(
        path.join(link, "SKILL.md"),
        readFileSync(path.join(link, "SKILL.md"), "utf8") + "\n<!-- hand edit -->\n",
      );
      const before = readFileSync(path.join(link, "SKILL.md"), "utf8");
      const metaFile = path.join(linked, ".agents", "seams-skills.json");
      const metaBefore = readFileSync(metaFile, "utf8");

      const check = await checkSkills({ cwd: linked, scope: "project", sourceDir: FIXTURE_V1 });
      const claude = check.entries.find((e) => e.agent === "claude-code");
      assert.equal(claude?.state, "modified");
      assert.equal(claude?.path, link);
      assert.equal(claude?.installedHash, skillFolderHash(link));

      const update = await updateSkills({ cwd: linked, scope: "project", sourceDir: FIXTURE_V2 });
      assert.deepEqual(update.targets, []);
      assert.equal(update.metaUpdated, false);
      assert.equal(readFileSync(path.join(link, "SKILL.md"), "utf8"), before);
      assert.equal(readFileSync(metaFile, "utf8"), metaBefore);
    } finally {
      rmSync(linked, { recursive: true, force: true });
    }
  });

  it("converts a byte-identical real folder at the link path back into the symlink", async () => {
    const linked = tempProject();
    try {
      await installSkills({
        cwd: linked,
        scope: "project",
        mode: "symlink",
        agents: ["claude-code"],
        sourceDir: FIXTURE_V1,
      });
      const link = path.join(linked, ".claude", "skills", "seams-orient");
      rmSync(link);
      cpSync(path.join(linked, ".agents", "skills", "seams-orient"), link, { recursive: true });

      const check = await checkSkills({ cwd: linked, scope: "project", sourceDir: FIXTURE_V1 });
      assert.equal(check.entries.find((e) => e.skill === "seams-orient")?.state, "missing");
      assert.equal(check.entries.find((e) => e.skill === "seams-orient")?.path, link);

      const update = await updateSkills({ cwd: linked, scope: "project", sourceDir: FIXTURE_V1 });
      assert.deepEqual(
        update.targets.map((t) => [t.skill, t.agent, t.reason, t.action]),
        [["seams-orient", "claude-code", "missing", "updated"]],
      );
      assert.ok(lstatSync(link).isSymbolicLink(), "the folder became the symlink again");
      assert.equal(
        skillFolderHash(path.join(linked, ".agents", "skills", "seams-orient")),
        skillFolderHash(path.join(FIXTURE_V1, "seams-orient")),
      );
    } finally {
      rmSync(linked, { recursive: true, force: true });
    }
  });

  it("never reports a tracked location as untracked, whatever its frontmatter claims", async () => {
    // Review regression (roborev 2576, finding 3): the library's listing
    // names skills by SKILL.md frontmatter, so a tracked copy with an
    // edited frontmatter name must not show up as untracked too.
    const project = tempProject();
    try {
      await installFixture(project, FIXTURE_V1);
      const skill = path.join(project, ".agents", "skills", "seams-work", "SKILL.md");
      writeFileSync(
        skill,
        readFileSync(skill, "utf8").replace("name: seams-work", "name: seams-renamed"),
      );

      const report = await checkSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V1 });
      assert.deepEqual(
        report.entries.filter((e) => e.state === "untracked"),
        [],
      );
      assert.equal(report.entries.find((e) => e.skill === "seams-work")?.state, "modified");
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("repairs a missing symlink without touching the healthy canonical copy", async () => {
    const linked = tempProject();
    try {
      await installSkills({
        cwd: linked,
        scope: "project",
        mode: "symlink",
        agents: ["claude-code", "pi"],
        sourceDir: FIXTURE_V1,
      });
      rmSync(path.join(linked, ".claude", "skills", "seams-orient"));

      const report = await updateSkills({ cwd: linked, scope: "project", sourceDir: FIXTURE_V1 });
      assert.deepEqual(
        report.targets.map((t) => [t.skill, t.agent, t.reason, t.action]),
        [["seams-orient", "claude-code", "missing", "updated"]],
      );
      assert.ok(lstatSync(path.join(linked, ".claude", "skills", "seams-orient")).isSymbolicLink());
      // The canonical copies were never rewritten.
      assert.equal(
        skillFolderHash(path.join(linked, ".agents", "skills", "seams-work")),
        skillFolderHash(path.join(FIXTURE_V1, "seams-work")),
      );
    } finally {
      rmSync(linked, { recursive: true, force: true });
    }
  });

  it("dry run plans the updates and writes nothing", async () => {
    const project = tempProject();
    try {
      await installFixture(project, FIXTURE_V1);
      rmSync(path.join(project, ".agents", "skills", "seams-orient"), { recursive: true });
      const metaFile = path.join(project, ".agents", "seams-skills.json");
      const metaBefore = readFileSync(metaFile, "utf8");
      const work = path.join(project, ".agents", "skills", "seams-work", "SKILL.md");
      const workBefore = readFileSync(work, "utf8");

      const report = await updateSkills({
        cwd: project,
        scope: "project",
        sourceDir: FIXTURE_V2,
        dryRun: true,
      });
      assert.deepEqual(
        report.targets.map((t) => [t.skill, t.reason, t.action]),
        [["seams-orient", "missing", "planned"]],
      );
      assert.equal(report.metaUpdated, false);
      assert.ok(!existsSync(path.join(project, ".agents", "skills", "seams-orient")));
      assert.equal(readFileSync(metaFile, "utf8"), metaBefore);
      assert.equal(readFileSync(work, "utf8"), workBefore);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("a failed update keeps the old copies and leaves the metadata un-updated", async () => {
    const project = tempProject();
    try {
      await installFixture(project, FIXTURE_V1);
      // A missing copy whose parent directory is read-only: the library
      // cannot create the destination, so the target fails while the healthy
      // copy and the metadata stay as they were.
      const skillsDir = path.join(project, ".agents", "skills");
      rmSync(path.join(skillsDir, "seams-orient"), { recursive: true });
      const metaFile = path.join(project, ".agents", "seams-skills.json");
      const metaBefore = readFileSync(metaFile, "utf8");
      chmodSync(skillsDir, 0o555);
      try {
        const report = await updateSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V2 });
        assert.deepEqual(
          report.targets.map((t) => [t.skill, t.reason, t.action]),
          [["seams-orient", "missing", "failed"]],
        );
        assert.equal(typeof report.targets[0].code, "string");
        assert.equal(report.metaUpdated, false);
        assert.ok(!existsSync(path.join(skillsDir, "seams-orient")), "the copy stays missing");
        assert.equal(
          skillFolderHash(path.join(skillsDir, "seams-work")),
          skillFolderHash(path.join(FIXTURE_V1, "seams-work")),
          "the old copy is intact",
        );
        assert.equal(readFileSync(metaFile, "utf8"), metaBefore);
      } finally {
        chmodSync(skillsDir, 0o755);
      }
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("makes no network calls and disables telemetry", async () => {
    const project = tempProject();
    await installFixture(project, FIXTURE_V1);
    const calls: unknown[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (...args: unknown[]) => {
      calls.push(args);
      throw new Error("network disabled in test");
    }) as typeof fetch;
    try {
      await checkSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V2 });
      await updateSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V2 });
      assert.equal(process.env.DISABLE_TELEMETRY, "1");
      assert.deepEqual(calls, []);
      assert.equal(
        skillFolderHash(path.join(project, ".agents", "skills", "seams-orient")),
        skillFolderHash(path.join(FIXTURE_V2, "seams-orient")),
      );
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(project, { recursive: true, force: true });
    }
  });
});

describe("seams skills check and update (commands)", () => {
  it("exits 0 when every copy is ok, 1 on any finding, and repairs with update", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    const check = () => run(env, ["skills", "check"]);

    // Nothing recorded or present yet.
    let result = check();
    assert.equal(result.status, 0);
    assert.match(result.stdout, /No seams skills are recorded or present in the project scope\./);

    runJson(env, ["--json", "skills", "install", "--agent", "pi", "--skill", "seams-orient"]);
    result = check();
    assert.equal(result.status, 0);
    assert.match(result.stdout, /seams-orient · pi: ok/);

    // The JSON envelope mirrors the classification.
    const json = runJson(env, ["--json", "skills", "check"]);
    assert.equal(json.schemaVersion, 1);
    assert.equal(json.command, "skills check");
    assert.equal(json.scope, "project");
    assert.deepEqual(
      json.entries.map((e: { skill: string; agent: string; state: string }) => [e.skill, e.agent, e.state]),
      [["seams-orient", "pi", "ok"]],
    );

    // A hand edit is a finding.
    const installed = path.join(env.project, ".agents", "skills", "seams-orient", "SKILL.md");
    writeFileSync(installed, readFileSync(installed, "utf8") + "\n<!-- hand edit -->\n");
    result = check();
    assert.equal(result.status, 1);
    assert.match(result.stdout, /seams-orient · pi: modified/);
    // Update never touches the modified copy.
    result = run(env, ["skills", "update"]);
    assert.equal(result.status, 1);
    assert.ok(readFileSync(installed, "utf8").includes("hand edit"));
    assert.match(result.stdout, /Left for manual reconciliation:/);

    // A missing copy is repaired by update and reported by check.
    rmSync(path.join(env.project, ".agents", "skills", "seams-orient"), { recursive: true });
    result = check();
    assert.equal(result.status, 1);
    assert.match(result.stdout, /seams-orient · pi: missing/);
    result = run(env, ["skills", "update"]);
    assert.equal(result.status, 0, `update failed:\n${result.stderr}`);
    assert.match(result.stdout, /seams-orient → pi: updated \(missing\)/);
    result = check();
    assert.equal(result.status, 0);
    // A second update has nothing to do.
    result = run(env, ["skills", "update"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Updated 0, skipped 0, failed 0\./);
  });

  it("checks and repairs the global scope inside the temporary home", () => {
    const before = { agents: realHomeListing(".agents"), claude: realHomeListing(".claude") };
    const env = makeEnv();
    markers(env, { pi: true });
    const args = ["--scope", "global"];

    runJson(env, ["--json", "skills", "install", ...args, "--agent", "pi", "--skill", "seams-orient"]);
    assert.equal(run(env, ["skills", "check", ...args]).status, 0);

    // A missing copy is repaired without touching the operator's real home.
    const installed = path.join(env.home, ".agents", "skills", "seams-orient");
    rmSync(installed, { recursive: true });
    assert.equal(run(env, ["skills", "check", ...args]).status, 1);
    const dry = runJson(env, ["--json", "skills", "update", ...args, "--dry-run"]);
    assert.equal(dry.dryRun, true);
    assert.deepEqual(
      dry.targets.map((t: { reason: string; action: string }) => [t.reason, t.action]),
      [["missing", "planned"]],
    );
    assert.ok(!existsSync(installed), "the dry run wrote nothing");

    assert.equal(run(env, ["skills", "update", ...args]).status, 0);
    assert.ok(existsSync(path.join(installed, "SKILL.md")));
    assert.equal(run(env, ["skills", "check", ...args]).status, 0);

    // The project scope stays empty: the global install wrote nothing there.
    assert.deepEqual(readdirSync(env.project).sort(), []);
    assert.deepEqual({ agents: realHomeListing(".agents"), claude: realHomeListing(".claude") }, before);
  });

  it("reports an untracked copy and update leaves it in place", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    runJson(env, ["--json", "skills", "install", "--agent", "pi", "--skill", "seams-orient"]);
    const stray = path.join(env.project, ".claude", "skills", "seams-legacy");
    mkdirSync(path.dirname(stray), { recursive: true });
    cpSync(path.join(bundledSkillsDir(), "seams-work"), stray, { recursive: true });

    const result = run(env, ["--json", "skills", "check"]);
    assert.equal(result.status, 1);
    const report = JSON.parse(result.stdout);
    assert.deepEqual(
      report.entries.map((e: { skill: string; agent: string; state: string }) => [e.skill, e.agent, e.state]),
      [
        ["seams-legacy", "claude-code", "untracked"],
        ["seams-orient", "pi", "ok"],
      ],
    );
    assert.ok(report.entries[0].bundledPath === undefined, "seams-legacy is not bundled");

    const update = run(env, ["skills", "update"]);
    assert.equal(update.status, 1);
    assert.ok(existsSync(path.join(stray, "SKILL.md")), "the stray copy still exists");
    assert.match(update.stdout, /seams-legacy · claude-code: untracked/);
  });

  it("an explicit --agent selection limits check to that agent", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    runJson(env, ["--json", "skills", "install", "--agent", "pi", "--skill", "seams-orient"]);
    const stray = path.join(env.project, ".claude", "skills", "seams-legacy");
    mkdirSync(path.dirname(stray), { recursive: true });
    cpSync(path.join(bundledSkillsDir(), "seams-work"), stray, { recursive: true });

    const result = runJson(env, ["--json", "skills", "check", "--agent", "pi"]);
    assert.deepEqual(
      result.entries.map((e: { skill: string; agent: string; state: string }) => [e.skill, e.agent, e.state]),
      [["seams-orient", "pi", "ok"]],
    );
  });

  it("exits 2 for usage errors", () => {
    const env = makeEnv();
    assert.equal(run(env, ["skills", "check", "--scope", "bogus"]).status, 2);
    assert.equal(run(env, ["skills", "check", "--agent", "cursor"]).status, 2);
    assert.equal(run(env, ["skills", "check", "--wat"]).status, 2);
    assert.equal(run(env, ["skills", "check", "extra"]).status, 2);
    assert.equal(run(env, ["skills", "update", "--scope", "bogus"]).status, 2);
    assert.equal(run(env, ["skills", "update", "--agent", "cursor"]).status, 2);
    assert.equal(run(env, ["skills", "update", "--wat"]).status, 2);
    assert.equal(run(env, ["skills", "update", "extra"]).status, 2);
  });
});
