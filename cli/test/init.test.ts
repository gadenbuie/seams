/**
 * Tests for `seams init`: agent mode (noninteractive, hands adoption to the
 * agent with the seams-adopt skill inlined), the human-mode prompts, mode
 * detection, the non-TTY fallback, and dry runs.
 *
 * Every CLI run uses a temporary HOME and a temporary project directory, with
 * the detection variables pointed into the temporary home before the child
 * process (and so before the library, which captures the home directory at
 * import time) starts. The human-mode prompts are tested directly over
 * PassThrough streams (the CLI-level child runs have no TTY, which selects
 * agent mode). No test touches the operator's real agent settings or home
 * directory, and no test sends telemetry.
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
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { after, describe, it } from "node:test";
import { readBundledSkill } from "../src/skills/bundled.ts";
import {
  agentInstructions,
  chooseInitMode,
  formatBundledSkill,
  humanNextSteps,
  promptForChoices,
  PromptAbortedError,
} from "../src/commands/init.ts";

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

/**
 * Child-process environment isolating every home path into `env.home`;
 * `unset` removes detection variables (so only the tested signal remains).
 */
function childEnv(env: TestEnv, unset: string[] = []): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {
    ...process.env,
    HOME: env.home,
    CLAUDE_CONFIG_DIR: path.join(env.home, ".claude"),
    CODEX_HOME: path.join(env.home, ".codex"),
    XDG_STATE_HOME: path.join(env.home, ".local", "state"),
    DISABLE_TELEMETRY: "1",
  };
  for (const key of unset) delete result[key];
  return result;
}

function run(env: TestEnv, args: string[], options: { env?: NodeJS.ProcessEnv } = {}) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: env.project,
    env: options.env ?? childEnv(env),
    encoding: "utf8",
  });
}

function runJson(env: TestEnv, args: string[], options: { env?: NodeJS.ProcessEnv } = {}) {
  const result = run(env, args, options);
  assert.equal(result.status, 0, `${args.join(" ")} failed:\n${result.stderr}`);
  return JSON.parse(result.stdout);
}

/** Sorted file names of a directory in the operator's real home, or null. */
function realHomeListing(dir: string): string[] | null {
  const target = path.join(homedir(), dir);
  return existsSync(target) ? readdirSync(target).sort() : null;
}

/**
 * Drive `promptForChoices` through a scripted conversation: each time a
 * prompt appears on the output stream, the next answer is written; when the
 * answers run out, the input ends (as Ctrl-D would).
 */
function scriptedDialog(answers: string[], given?: { scope?: "project" | "global" }) {
  const input = new PassThrough();
  const output = new PassThrough();
  let index = 0;
  const chunks: string[] = [];
  output.on("data", (chunk: Buffer) => {
    const text = chunk.toString();
    chunks.push(text);
    if (text.includes("?")) {
      if (index < answers.length) input.write(answers[index++] + "\n");
      else input.end();
    }
  });
  const promise = promptForChoices(input, output, given);
  return {
    promise,
    output: () => chunks.join(""),
  };
}

describe("init mode selection", () => {
  it("--agent always selects agent mode", () => {
    assert.deepEqual(chooseInitMode({ agentFlag: true, isTty: true, detected: ["pi"] }), {
      mode: "agent",
      reason: "--agent",
      detected: [],
    });
  });

  it("without a TTY the command behaves as agent mode", () => {
    assert.deepEqual(chooseInitMode({ agentFlag: false, isTty: false, detected: ["pi"] }), {
      mode: "agent",
      reason: "no TTY",
      detected: [],
    });
  });

  it("a detected harness selects agent mode on a TTY", () => {
    assert.deepEqual(chooseInitMode({ agentFlag: false, isTty: true, detected: ["pi", "codex"] }), {
      mode: "agent",
      reason: "detected",
      detected: ["pi", "codex"],
    });
  });

  it("a TTY with no known harness gets human mode", () => {
    assert.deepEqual(chooseInitMode({ agentFlag: false, isTty: true, detected: [] }), {
      mode: "human",
      reason: "interactive",
      detected: [],
    });
  });
});

describe("seams init (agent mode)", () => {
  it("installs the skills for the detected harnesses and hands adoption to the agent", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    const result = run(env, ["init", "--agent"]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Agents detected: pi/);
    assert.match(result.stdout, /Installed 9, unchanged 0, skipped 0, failed 0\./);
    assert.ok(
      existsSync(path.join(env.project, ".agents", "skills", "seams-adopt", "SKILL.md")),
      "the skills are installed",
    );
    // Agent mode never scaffolds canon, writes the project manifest, or
    // migrates documents: only the skill installation and its records exist.
    assert.ok(!existsSync(path.join(env.project, ".agents", "seams.json")), "no manifest");
    assert.ok(!existsSync(path.join(env.project, "docs", "design")), "no canon");
    assert.ok(!existsSync(path.join(env.project, "AGENTS.md")), "no AGENTS.md");
    assert.deepEqual(readdirSync(env.project).sort(), [".agents", "skills-lock.json"]);
  });

  it("prints the full seams-adopt skill inline, the same content as skills get", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    const result = run(env, ["init", "--agent"]);

    assert.match(result.stdout, /The `seams-adopt` skill now guides adoption of seams\./);
    assert.match(result.stdout, /the same content as `seams skills get seams-adopt`/);
    const skill = readBundledSkill("seams-adopt");
    assert.ok(skill !== undefined, "seams-adopt is bundled");
    assert.ok(
      result.stdout.includes(formatBundledSkill(skill)),
      "the instructions carry the skill's full text",
    );
  });

  it("never reads stdin: it completes with a closed stdin pipe", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    // The stdin pipe stays open for the child (spawnSync closes it only when
    // `input` is given), so a command that waited on stdin would be killed at
    // the timeout instead of exiting.
    const result = spawnSync(process.execPath, [CLI, "init", "--agent"], {
      cwd: env.project,
      env: childEnv(env),
      encoding: "utf8",
      timeout: 30_000,
    });
    assert.equal(result.status, 0, `stderr: ${result.stderr}`);
    assert.equal(result.signal, null);
    assert.match(result.stdout, /seams-adopt/);
  });

  it("behaves as agent mode without a TTY and says so", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    const result = run(env, ["init"]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /No interactive terminal was detected; continuing in noninteractive agent mode\./);
    assert.match(result.stdout, /Agents detected: pi/);
    const report = runJson(env, ["--json", "init"]);
    assert.equal(report.mode, "agent");
    assert.equal(report.modeReason, "no TTY");
  });

  it("detects each harness through the spike's variables and markers", () => {
    if (existsSync("/etc/codex")) return; // codex would also be detected
    const env = makeEnv();

    // claude-code: CLAUDE_CONFIG_DIR names an existing directory.
    markers(env, { claude: true });
    const report = runJson(env, ["--json", "init", "--agent", "--dry-run"], {
      env: childEnv(env, ["CODEX_HOME"]),
    });
    assert.deepEqual(report.install.agents, ["claude-code"]);
    rmSync(path.join(env.home, ".claude"), { recursive: true, force: true });

    // codex: CODEX_HOME names an existing directory.
    markers(env, { codex: true });
    const codex = runJson(env, ["--json", "init", "--agent", "--dry-run"], {
      env: childEnv(env, ["CLAUDE_CONFIG_DIR"]),
    });
    assert.deepEqual(codex.install.agents, ["codex"]);
    rmSync(path.join(env.home, ".codex"), { recursive: true, force: true });

    // pi: ~/.pi/agent exists (Pi keeps no config-directory variable).
    markers(env, { pi: true });
    const pi = runJson(env, ["--json", "init", "--agent", "--dry-run"], {
      env: childEnv(env, ["CLAUDE_CONFIG_DIR", "CODEX_HOME"]),
    });
    assert.deepEqual(pi.install.agents, ["pi"]);
  });

  it("installs into the global scope when asked, without touching the real home", () => {
    const before = {
      agents: realHomeListing(".agents"),
      claude: realHomeListing(".claude"),
    };
    const env = makeEnv();
    markers(env, { pi: true });
    const report = runJson(env, ["--json", "init", "--agent", "--scope", "global"]);

    assert.equal(report.install.scope, "global");
    assert.ok(
      existsSync(path.join(env.home, ".agents", "skills", "seams-adopt", "SKILL.md")),
      "the global copy exists in the temporary home",
    );
    const meta = JSON.parse(
      readFileSync(path.join(env.home, ".agents", "seams-skills.json"), "utf8"),
    );
    assert.equal(meta.scope, "global");
    assert.deepEqual(readdirSync(env.project).sort(), []);
    // Nothing changed in the operator's real home.
    assert.deepEqual({ agents: realHomeListing(".agents"), claude: realHomeListing(".claude") }, before);
  });

  it("with no detected harness it installs nothing, hands off anyway, and exits 0", () => {
    const env = makeEnv();
    const result = run(env, ["init", "--agent"]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(
      result.stdout,
      /No supported agent harness was detected, so no skills were installed\./,
    );
    assert.match(result.stdout, /seams-adopt/);
    assert.deepEqual(readdirSync(env.project).sort(), []);
  });

  it("dry run writes nothing but prints the instructions", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    const result = run(env, ["init", "--agent", "--dry-run"]);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Dry run: nothing written\./);
    assert.match(result.stdout, /seams-adopt/);
    assert.deepEqual(readdirSync(env.project).sort(), []);
  });

  it("dry-run instructions say what would be installed, not that it is installed", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    const report = runJson(env, ["--json", "init", "--agent", "--dry-run"]);

    assert.match(report.instructions, /Dry run: nothing was written; the seams skills would be installed for: pi\./);
    assert.ok(!report.instructions.includes("The seams skills are installed for"),
      "a dry run must not claim the skills are installed");
  });

  it("instructions note skipped or failed targets instead of claiming success", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    runJson(env, ["--json", "skills", "install", "--agent", "pi", "--skill", "seams-orient"]);
    const installed = path.join(env.project, ".agents", "skills", "seams-orient", "SKILL.md");
    const original = readFileSync(installed, "utf8");
    writeFileSync(installed, original + "\n<!-- hand edit -->\n");

    const result = run(env, ["init", "--agent"]);
    assert.equal(result.status, 1, "a modified copy is a finding");
    assert.match(result.stdout, /The seams skills are installed for: pi\./);
    assert.match(result.stdout, /target\(s\) were skipped or failed; run `seams skills check` to inspect them\./);
    // The hand edit survives.
    assert.ok(readFileSync(installed, "utf8").includes("hand edit"));
  });

  it("JSON output gives the actions and the printed instruction text", () => {
    const env = makeEnv();
    markers(env, { pi: true });
    const report = runJson(env, ["--json", "init", "--agent"]);

    assert.equal(report.command, "init");
    assert.equal(report.mode, "agent");
    assert.equal(report.modeReason, "--agent");
    assert.equal(report.install.scope, "project");
    assert.equal(report.install.mode, "copy");
    assert.deepEqual(report.install.agents, ["pi"]);
    assert.equal(report.install.targets.length, 9);
    for (const target of report.install.targets) {
      assert.equal(target.action, "install");
    }
    const skill = readBundledSkill("seams-adopt");
    assert.ok(skill !== undefined);
    assert.ok(report.instructions.endsWith(formatBundledSkill(skill)));
    assert.match(report.instructions, /The `seams-adopt` skill now guides adoption of seams\./);
  });

  it("exits 2 for usage errors", () => {
    const env = makeEnv();
    assert.equal(run(env, ["init", "--scope", "bogus"]).status, 2);
    assert.equal(run(env, ["init", "--wat"]).status, 2);
    assert.equal(run(env, ["init", "extra"]).status, 2);
    // --agent is a mode flag without a value; naming an agent is install's job.
    assert.equal(run(env, ["init", "--agent", "pi"]).status, 2);
  });
});

describe("seams init (human mode)", () => {
  it("asks for the scope and the agents", async () => {
    const dialog = scriptedDialog(["global", "pi, codex"]);
    const choices = await dialog.promise;
    assert.deepEqual(choices, { scope: "global", agents: ["pi", "codex"] });
    assert.match(dialog.output(), /Install the seams skills for this project or globally\?/);
    assert.match(dialog.output(), /Install the skills for which agent harnesses\?/);
  });

  it("defaults to project and to every supported agent on empty answers", async () => {
    const choices = await scriptedDialog(["", ""]).promise;
    assert.deepEqual(choices, { scope: "project", agents: ["claude-code", "codex", "pi"] });
  });

  it("re-asks after an invalid scope answer", async () => {
    const dialog = scriptedDialog(["nowhere", "global", "pi"]);
    const choices = await dialog.promise;
    assert.deepEqual(choices, { scope: "global", agents: ["pi"] });
    assert.match(dialog.output(), /Choose project or global\./);
  });

  it("re-asks after an unknown agent name", async () => {
    const dialog = scriptedDialog(["global", "cursor", "claude-code"]);
    const choices = await dialog.promise;
    assert.deepEqual(choices, { scope: "global", agents: ["claude-code"] });
    assert.match(dialog.output(), /Unknown agent: cursor \(supported: claude-code, codex, pi\)/);
  });

  it("skips the scope prompt when --scope was given", async () => {
    const dialog = scriptedDialog(["pi"], { scope: "global" });
    const choices = await dialog.promise;
    assert.deepEqual(choices, { scope: "global", agents: ["pi"] });
    assert.ok(!dialog.output().includes("project or globally?"), "the scope prompt never appeared");
  });

  it("aborts with nothing written when the input ends before the answers are complete", async () => {
    await assert.rejects(scriptedDialog(["global"]).promise, PromptAbortedError);
    await assert.rejects(scriptedDialog([]).promise, PromptAbortedError);
  });

  it("human-mode next steps point at the seams-adopt skill", () => {
    const nextSteps = humanNextSteps({
      scope: "project",
      mode: "copy",
      agents: ["pi"],
      detected: false,
      dryRun: false,
      source: "",
      metaPath: "",
      warnings: [],
      targets: [],
    });
    assert.match(nextSteps, /The seams skills are installed\./);
    assert.match(nextSteps, /ask your agent to run the `seams-adopt` skill/);
    assert.match(nextSteps, /seams skills get seams-adopt/);
  });
});
