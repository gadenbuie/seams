/**
 * Tests for `seams install`: the seam for future integrations, which today
 * does exactly the skills install and says so.
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
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";

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

describe("seams install", () => {
  it("installs every bundled skill for a chosen agent and records seams metadata", () => {
    const env = makeEnv();
    const report = runJson(env, ["--json", "install", "--agent", "pi"]);

    assert.equal(report.command, "install");
    assert.equal(report.scope, "project");
    assert.equal(report.mode, "copy");
    assert.deepEqual(report.agents, ["pi"]);
    assert.equal(report.detected, false);
    assert.equal(report.targets.length, 9);
    assert.ok(report.targets.every((target: { action: string }) => target.action === "install"));

    const meta = JSON.parse(
      readFileSync(path.join(env.project, ".agents", "seams-skills.json"), "utf8"),
    );
    assert.equal(Object.keys(meta.skills).length, 9);
    assert.ok(
      existsSync(path.join(env.project, ".agents", "skills", "seams-adopt", "SKILL.md")),
      "the skill copy exists",
    );
  });

  it("says in its text output that it does exactly the skills install", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    const result = run(env, ["install"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /seams install currently does exactly `seams skills install`/);
    assert.match(result.stdout, /Installed 9, unchanged 0, skipped 0, failed 0\./);
  });

  it("detects agents when none is given and targets only the detected set", () => {
    const env = makeEnv();
    markers(env, { claude: true, codex: true, pi: true });
    const report = runJson(env, ["--json", "install"]);

    assert.equal(report.detected, true);
    assert.deepEqual(report.agents, ["claude-code", "codex", "pi"]);
    assert.equal(report.targets.length, 27);
    assert.ok(
      existsSync(path.join(env.project, ".claude", "skills", "seams-adopt", "SKILL.md")),
    );
    // Exactly the expected agent directories exist; the hazard in seams#sn2t
    // (no agents option targets every supported agent, about 78) does not.
    assert.deepEqual(
      readdirSync(env.project).sort(),
      [".agents", ".claude", "skills-lock.json"],
    );
  });

  it("installs into the global scope without touching the operator's real home", () => {
    const before = {
      agents: realHomeListing(".agents"),
      claude: realHomeListing(".claude"),
    };
    const env = makeEnv();
    markers(env, { pi: true });
    const report = runJson(env, ["--json", "install", "--scope", "global", "--agent", "pi"]);

    assert.equal(report.scope, "global");
    assert.ok(
      existsSync(path.join(env.home, ".agents", "skills", "seams-adopt", "SKILL.md")),
      "the global copy exists in the temporary home",
    );
    const meta = JSON.parse(
      readFileSync(path.join(env.home, ".agents", "seams-skills.json"), "utf8"),
    );
    assert.equal(meta.scope, "global");
    // Nothing changed in the operator's real home.
    assert.deepEqual({ agents: realHomeListing(".agents"), claude: realHomeListing(".claude") }, before);
  });

  it("dry run prints what would be written and writes nothing", () => {
    const env = makeEnv();
    const report = runJson(env, ["--json", "install", "--agent", "pi", "--dry-run"]);

    assert.equal(report.dryRun, true);
    assert.equal(report.targets.length, 9);
    assert.ok(report.targets.every((target: { action: string }) => target.action === "install"));
    assert.deepEqual(readdirSync(env.project).sort(), []);
  });

  it("exits 1 with a clear message when nothing is detected and no agent is given", () => {
    if (existsSync("/etc/codex")) return; // codex would still be detected
    const env = makeEnv();
    const result = run(env, ["install"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /No supported agents detected/);
    assert.deepEqual(readdirSync(env.project).sort(), []);
  });

  it("exits 2 for an agent outside the supported allowlist and writes nothing", () => {
    const env = makeEnv();
    const result = run(env, ["install", "--agent", "cursor"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Unsupported agent: cursor/);
    assert.match(result.stderr, /Usage: seams install/);
    assert.deepEqual(readdirSync(env.project).sort(), []);
  });

  it("exits 2 for usage errors", () => {
    const env = makeEnv();
    assert.equal(run(env, ["install", "--scope", "bogus"]).status, 2);
    assert.equal(run(env, ["install", "--wat"]).status, 2);
    assert.equal(run(env, ["install", "extra"]).status, 2);
  });
});
