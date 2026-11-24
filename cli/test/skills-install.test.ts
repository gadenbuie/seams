/**
 * Tests for `seams skills install` and the install layer: preflight, scopes,
 * modes, dry run, modified-copy preservation, failure isolation, metadata,
 * and the `skills list` installation state.
 *
 * Every CLI run uses a temporary HOME and a temporary project directory, with
 * CLAUDE_CONFIG_DIR, CODEX_HOME, and XDG_STATE_HOME pointed into the
 * temporary home before the child process (and so before the library, which
 * captures the home directory at import time) starts. No test touches the
 * operator's real agent settings or home directory, and no test sends
 * telemetry.
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
import { bundledSkillsDir } from "../src/skills/bundled.ts";
import { skillFolderHash } from "../src/skills/hash.ts";
import { installSkills } from "../src/skills/install.ts";

const CLI = path.resolve(import.meta.dirname, "..", "src", "cli.ts");

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

describe("seams skills install", () => {
  it("installs into a project with copy mode and records seams metadata", () => {
    const env = makeEnv();
    const report = runJson(env, [
      "--json", "skills", "install", "--agent", "pi", "--skill", "seams-orient",
    ]);

    const installed = path.join(env.project, ".agents", "skills", "seams-orient");
    assert.ok(existsSync(path.join(installed, "SKILL.md")), "the skill copy exists");
    assert.ok(
      !existsSync(path.join(env.project, ".claude")),
      "claude-code is not touched when it is not selected",
    );

    assert.equal(report.command, "skills install");
    assert.equal(report.scope, "project");
    assert.equal(report.mode, "copy");
    assert.deepEqual(report.agents, ["pi"]);
    assert.equal(report.detected, false);
    assert.deepEqual(
      report.targets.map((t: { skill: string; agent: string; action: string }) => [t.skill, t.agent, t.action]),
      [["seams-orient", "pi", "install"]],
    );

    // The library keeps its own lock file.
    assert.ok(existsSync(path.join(env.project, "skills-lock.json")));

    // Seams metadata is written next to the canonical install target.
    const metaPath = path.join(env.project, ".agents", "seams-skills.json");
    const meta = JSON.parse(readFileSync(metaPath, "utf8"));
    assert.equal(meta.schemaVersion, 1);
    assert.equal(meta.package, "@grrrck/seams");
    assert.equal(meta.scope, "project");
    const record = meta.skills["seams-orient"];
    assert.equal(record.hash, skillFolderHash(installed));
    assert.equal(record.version, "2.0");
    assert.deepEqual(record.agents, ["pi"]);
    assert.equal(record.mode, "copy");
    assert.ok(!Number.isNaN(Date.parse(record.installedAt)));
  });

  it("installs into the global scope and changes nothing outside the temporary home", () => {
    const before = { agents: realHomeListing(".agents"), claude: realHomeListing(".claude") };
    const env = makeEnv();
    markers(env, { pi: true });
    const report = runJson(env, [
      "--json", "skills", "install", "--scope", "global", "--agent", "pi", "--skill", "seams-orient",
    ]);

    assert.equal(report.scope, "global");
    assert.ok(existsSync(path.join(env.home, ".agents", "skills", "seams-orient", "SKILL.md")));
    // The library's global lock follows XDG_STATE_HOME into the temporary home.
    assert.ok(
      existsSync(path.join(env.home, ".local", "state", "skills", ".skill-lock.json")),
      "the library lock stays inside the temporary home",
    );
    const meta = JSON.parse(readFileSync(path.join(env.home, ".agents", "seams-skills.json"), "utf8"));
    assert.equal(meta.scope, "global");
    assert.deepEqual(meta.skills["seams-orient"].agents, ["pi"]);
    assert.equal(meta.skills["seams-orient"].hash, report.targets[0].hash);

    // Nothing changed in the operator's real home.
    assert.deepEqual({ agents: realHomeListing(".agents"), claude: realHomeListing(".claude") }, before);
  });

  it("detects agents when none is given and targets only the detected set", () => {
    const env = makeEnv();
    markers(env, { claude: true, codex: true, pi: true });
    const report = runJson(env, ["--json", "skills", "install"]);

    assert.equal(report.detected, true);
    assert.deepEqual(report.agents, ["claude-code", "codex", "pi"]);
    assert.ok(existsSync(path.join(env.project, ".claude", "skills", "seams-orient", "SKILL.md")));
    assert.ok(existsSync(path.join(env.project, ".agents", "skills", "seams-orient", "SKILL.md")));

    // Exactly the expected agent directories exist; the hazard in seams#sn2t
    // (no agents option targets every supported agent, about 78) does not.
    assert.deepEqual(
      readdirSync(env.project).sort(),
      [".agents", ".claude", "skills-lock.json"],
    );

    // Every bundled skill is installed for every detected agent.
    assert.equal(report.targets.length, 27);
    for (const target of report.targets) {
      assert.equal(target.action, "install");
    }
    const meta = JSON.parse(readFileSync(path.join(env.project, ".agents", "seams-skills.json"), "utf8"));
    assert.equal(Object.keys(meta.skills).length, 9);
    assert.deepEqual(meta.skills["seams-work"].agents, ["claude-code", "codex", "pi"]);
  });

  it("dry run prints what would be written and writes nothing", () => {
    const env = makeEnv();
    const report = runJson(env, [
      "--json", "skills", "install", "--agent", "pi", "--skill", "seams-orient", "--dry-run",
    ]);

    assert.equal(report.dryRun, true);
    assert.equal(report.targets[0].action, "install");
    assert.equal(
      report.targets[0].path,
      path.join(env.project, ".agents", "skills", "seams-orient"),
    );
    assert.deepEqual(readdirSync(env.project).sort(), []);
  });

  it("a second install of an identical copy is unchanged and rewrites nothing", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    runJson(env, ["--json", "skills", "install", "--agent", "pi", "--skill", "seams-orient"]);
    const metaPath = path.join(env.project, ".agents", "seams-skills.json");
    const before = readFileSync(metaPath, "utf8");

    const report = runJson(env, ["--json", "skills", "install", "--agent", "pi", "--skill", "seams-orient"]);
    assert.deepEqual(
      report.targets.map((t: { action: string }) => t.action),
      ["unchanged"],
    );
    assert.equal(readFileSync(metaPath, "utf8"), before);
  });

  it("preserves a modified copy and never passes it to the library", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    runJson(env, ["--json", "skills", "install", "--agent", "pi", "--skill", "seams-orient"]);
    const installed = path.join(env.project, ".agents", "skills", "seams-orient", "SKILL.md");
    const original = readFileSync(installed, "utf8");
    writeFileSync(installed, original + "\n<!-- hand edit -->\n");

    const result = run(env, ["--json", "skills", "install", "--agent", "pi", "--skill", "seams-orient"]);
    assert.equal(result.status, 1, "a modified copy is a finding");
    const report = JSON.parse(result.stdout);
    assert.deepEqual(
      report.targets.map((t: { action: string }) => t.action),
      ["skipped (modified)"],
    );
    // The hand edit survives: the library never saw the copy.
    assert.ok(readFileSync(installed, "utf8").includes("hand edit"));
    // The record still describes the copy as seams installed it.
    const meta = JSON.parse(readFileSync(path.join(env.project, ".agents", "seams-skills.json"), "utf8"));
    assert.equal(meta.skills["seams-orient"].hash, skillFolderHash(path.join(bundledSkillsDir(), "seams-orient")));
  });

  it("installs symlinks with the canonical copy in .agents/skills", () => {
    const env = makeEnv();
    const report = runJson(env, [
      "--json", "skills", "install", "--symlink", "--agent", "claude-code", "--skill", "seams-orient",
    ]);

    assert.equal(report.mode, "symlink");
    const canonical = path.join(env.project, ".agents", "skills", "seams-orient");
    const link = path.join(env.project, ".claude", "skills", "seams-orient");
    assert.ok(existsSync(path.join(canonical, "SKILL.md")), "canonical copy exists");
    assert.ok(lstatSync(link).isSymbolicLink(), "claude-code gets a symlink");
    assert.equal(report.targets[0].path, link);

    const meta = JSON.parse(readFileSync(path.join(env.project, ".agents", "seams-skills.json"), "utf8"));
    assert.equal(meta.skills["seams-orient"].mode, "symlink");
    // The canonical copy hashes the same as the bundled source folder.
    assert.equal(meta.skills["seams-orient"].hash, skillFolderHash(path.join(bundledSkillsDir(), "seams-orient")));
  });

  it("a failed target does not stop the run and is never recorded as installed", () => {
    const env = makeEnv();
    markers(env, { claude: true, pi: true });
    // Make claude-code's skills directory exist but read-only, so its write
    // fails while pi's universal target installs normally.
    const claudeSkills = path.join(env.project, ".claude", "skills");
    mkdirSync(claudeSkills, { recursive: true });
    chmodSync(claudeSkills, 0o555);
    try {
      const result = run(env, ["--json", "skills", "install", "--agent", "claude-code", "--agent", "pi", "--skill", "seams-orient"]);
      assert.equal(result.status, 1, "a failed target is a finding");
      const report = JSON.parse(result.stdout);
      const actions = new Map(report.targets.map((t: { agent: string; action: string }) => [t.agent, t.action]));
      assert.equal(actions.get("pi"), "install");
      assert.equal(actions.get("claude-code"), "failed");

      // The other target is installed and recorded; the failed one is not.
      assert.ok(existsSync(path.join(env.project, ".agents", "skills", "seams-orient", "SKILL.md")));
      const meta = JSON.parse(readFileSync(path.join(env.project, ".agents", "seams-skills.json"), "utf8"));
      assert.deepEqual(meta.skills["seams-orient"].agents, ["pi"]);
    } finally {
      chmodSync(claudeSkills, 0o755);
    }
  });

  it("exits 1 with a clear message when nothing is detected and no agent is given", () => {
    if (existsSync("/etc/codex")) return; // codex would still be detected
    const env = makeEnv();
    const result = run(env, ["skills", "install"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /No supported agents detected/);
    assert.deepEqual(readdirSync(env.project).sort(), []);
  });

  it("exits 2 for an agent outside the supported allowlist and writes nothing", () => {
    const env = makeEnv();
    const result = run(env, ["skills", "install", "--agent", "cursor"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Unsupported agent: cursor/);
    assert.deepEqual(readdirSync(env.project).sort(), []);
  });

  it("exits 1 with the valid names for an unknown skill", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    const result = run(env, ["skills", "install", "--agent", "pi", "--skill", "nope"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown skill: nope/);
    assert.match(result.stderr, /seams-work/);
    assert.deepEqual(readdirSync(env.project).sort(), []);
  });

  it("exits 2 for usage errors", () => {
    const env = makeEnv();
    assert.equal(run(env, ["skills", "install", "--scope", "bogus"]).status, 2);
    assert.equal(run(env, ["skills", "install", "--wat"]).status, 2);
    assert.equal(run(env, ["skills", "install", "extra"]).status, 2);
  });
});

describe("seams skills list installation state", () => {
  it("reports installed, missing, modified, untracked, and not installed by scope", () => {
    const env = makeEnv();
    const list = (args: string[]) =>
      runJson(env, ["--json", "skills", "list", ...args]).skills as {
        name: string;
        installation: { state: string; path?: string; hash?: string };
      }[];
    const stateOf = (rows: ReturnType<typeof list>, name: string) =>
      rows.find((row) => row.name === name)?.installation.state;

    // Nothing installed anywhere yet.
    assert.equal(stateOf(list([]), "seams-orient"), "not-installed");
    assert.equal(stateOf(list(["--scope", "global"]), "seams-orient"), "not-installed");

    // Install in project scope for pi.
    runJson(env, ["--json", "skills", "install", "--agent", "pi", "--skill", "seams-orient"]);
    let rows = list([]);
    assert.equal(stateOf(rows, "seams-orient"), "installed");
    assert.equal(stateOf(rows, "seams-work"), "not-installed");
    assert.equal(stateOf(list(["--scope", "global"]), "seams-orient"), "not-installed");
    const installedRow = rows.find((row) => row.name === "seams-orient");
    assert.match(installedRow!.installation.path!, /\.agents[/\\]skills[/\\]seams-orient$/);

    // A copy the metadata does not know about is untracked.
    mkdirSync(path.join(env.project, ".claude", "skills"), { recursive: true });
    cpSync(path.join(bundledSkillsDir(), "seams-work"), path.join(env.project, ".claude", "skills", "seams-work"), { recursive: true });
    rows = list([]);
    assert.equal(stateOf(rows, "seams-work"), "untracked");

    // A modified copy is reported.
    writeFileSync(
      path.join(env.project, ".agents", "skills", "seams-orient", "SKILL.md"),
      "hand edit\n",
    );
    assert.equal(stateOf(list([]), "seams-orient"), "modified");

    // A recorded copy that is gone is missing.
    rmSync(path.join(env.project, ".agents", "skills", "seams-orient"), { recursive: true });
    assert.equal(stateOf(list([]), "seams-orient"), "missing");

    // Text output shows the state too.
    const text = run(env, ["skills", "list"]).stdout;
    assert.match(text, /seams-orient · .* · missing/);
  });
});

describe("install layer internals", () => {
  it("matches the library's computedHash byte for byte (lock cross-check)", async () => {
    const project = mkdtempSync(path.join(tmpdir(), "seams-xcheck-"));
    try {
      const lib = await import("skills");
      const source = await lib.resolveSource(bundledSkillsDir());
      await lib.installSkills(source, {
        cwd: project,
        scope: "project",
        mode: "copy",
        agents: ["pi"],
        skills: ["seams-route"],
        telemetry: false,
      });
      const installed = path.join(project, ".agents", "skills", "seams-route");
      const lock = JSON.parse(readFileSync(path.join(project, "skills-lock.json"), "utf8"));
      assert.equal(lock.skills["seams-route"].computedHash, skillFolderHash(installed));
      assert.equal(
        skillFolderHash(path.join(bundledSkillsDir(), "seams-route")),
        skillFolderHash(installed),
      );
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("makes no network calls and disables telemetry", async () => {
    const project = mkdtempSync(path.join(tmpdir(), "seams-net-"));
    const calls: unknown[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (...args: unknown[]) => {
      calls.push(args);
      throw new Error("network disabled in test");
    }) as typeof fetch;
    try {
      const report = await installSkills({
        cwd: project,
        scope: "project",
        mode: "copy",
        agents: ["pi"],
        skills: ["seams-orient"],
      });
      assert.equal(process.env.DISABLE_TELEMETRY, "1");
      assert.deepEqual(calls, []);
      assert.deepEqual(
        report.targets.map((t) => t.action),
        ["install"],
      );
      assert.ok(existsSync(path.join(project, ".agents", "skills", "seams-orient", "SKILL.md")));
    } finally {
      globalThis.fetch = originalFetch;
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("installs from the bundled directory and reports it", async () => {
    const project = mkdtempSync(path.join(tmpdir(), "seams-src-"));
    try {
      const report = await installSkills({
        cwd: project,
        scope: "project",
        mode: "copy",
        agents: ["pi"],
      });
      assert.equal(report.source, bundledSkillsDir());
      assert.equal(report.targets.length, 9);
      assert.equal(report.detected, false);
      for (const target of report.targets) {
        assert.ok(existsSync(path.join(target.path, "SKILL.md")), target.path);
      }
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  it("rejects an unsupported agent or unknown skill before writing", async () => {
    const project = mkdtempSync(path.join(tmpdir(), "seams-reject-"));
    try {
      await assert.rejects(
        installSkills({ cwd: project, scope: "project", mode: "copy", agents: ["cursor"] }),
        /Unsupported agent: cursor/,
      );
      await assert.rejects(
        installSkills({ cwd: project, scope: "project", mode: "copy", agents: ["pi"], skills: ["nope"] }),
        /Unknown skill: nope/,
      );
      assert.deepEqual(readdirSync(project).sort(), []);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
