/**
 * Tests for `seams doctor`: the five report areas, each report line's status
 * and fix hint, the exit codes, the JSON shape, and that nothing is ever
 * written.
 *
 * Every CLI run uses a temporary HOME and a temporary project directory, with
 * CLAUDE_CONFIG_DIR, CODEX_HOME, and XDG_STATE_HOME pointed into the
 * temporary home before the child process starts, so no test touches the
 * operator's real agent settings or home directory, and no test sends
 * telemetry. The runtime report's failure cases are exercised by calling the
 * injected checks directly (an old Node version, an empty PATH for git);
 * the skills area's per-scope summaries by calling `scopeLine` with
 * synthetic entries, plus one CLI run against the fixture bundle.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import {
  gitLine,
  MINIMUM_NODE,
  nodeLine,
  nodeMeetsMinimum,
  NOTE,
  scopeLine,
} from "../src/commands/doctor.ts";
import { installSkills } from "../src/skills/install.ts";
import { fixtureDir } from "./helpers.ts";

const CLI = path.resolve(import.meta.dirname, "..", "src", "cli.ts");
const FIXTURE_V1 = path.join(import.meta.dirname, "fixtures", "skills-v1");

/** One isolated environment: a temporary home and a temporary project. */
interface TestEnv {
  home: string;
  /** Container directory; fixture projects are copied inside it. */
  project: string;
}

const envs: TestEnv[] = [];

function makeEnv(): TestEnv {
  const env: TestEnv = {
    home: mkdtempSync(path.join(tmpdir(), "seams-home-")),
    project: realpathSync(mkdtempSync(path.join(tmpdir(), "seams-doc-"))),
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

/** Copy a fixture project inside `env`'s container and return its path. */
function fixtureProject(env: TestEnv, name: string): string {
  const target = path.join(env.project, "project");
  cpSync(fixtureDir(name), target, { recursive: true });
  return target;
}

function run(cwd: string, env: TestEnv, args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    env: childEnv(env),
    encoding: "utf8",
  });
}

interface DoctorJsonLine {
  status: string;
  message: string;
  hint?: string;
  counts?: Record<string, number>;
}

interface DoctorJsonArea {
  area: string;
  status: string;
  lines: DoctorJsonLine[];
}

interface DoctorJson {
  schemaVersion: number;
  command: string;
  root: string;
  areas: DoctorJsonArea[];
  errors: number;
  warnings: number;
  note: string;
}

function runDoctor(cwd: string, env: TestEnv, args: string[] = ["doctor", "--json"]) {
  const result = run(cwd, env, args);
  assert.equal(result.stderr, "", `doctor failed: ${result.stderr}`);
  return { status: result.status, json: JSON.parse(result.stdout) as DoctorJson, stdout: result.stdout };
}

function lines(stdout: string): string[] {
  return stdout.split("\n").filter((line) => line.length > 0);
}

/** A valid manifest for the conventional homes of the check fixtures. */
function writeManifest(cwd: string): void {
  mkdirSync(path.join(cwd, ".agents"), { recursive: true });
  writeFileSync(
    path.join(cwd, ".agents", "seams.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        seamsVersion: "0.1.0",
        paths: {
          design: "docs/design",
          overviews: "docs/design/overviews",
          proposals: ".agents/proposals",
          plans: ".agents/plans",
        },
      },
      null,
      2,
    ) + "\n",
  );
}

/** Install the version 1 fixture skills for pi, in copy mode. */
async function installFixtureV1(cwd: string): Promise<void> {
  const report = await installSkills({
    cwd,
    scope: "project",
    mode: "copy",
    agents: ["pi"],
    sourceDir: FIXTURE_V1,
  });
  assert.equal(report.targets.length, 2);
  for (const target of report.targets) assert.equal(target.action, "install");
}

describe("seams doctor", () => {
  it("is listed in the registry", () => {
    const env = makeEnv();
    const result = run(env.project, env, ["--help"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /doctor/);
  });

  it("reports every area ok for a good project", () => {
    const env = makeEnv();
    const cwd = fixtureProject(env, "check-good");
    writeManifest(cwd);
    writeFileSync(
      path.join(cwd, "AGENTS.md"),
      "The seams documentation homes are recorded in .agents/seams.json.\n",
    );

    const { status, json } = runDoctor(cwd, env);
    assert.equal(status, 0);
    assert.equal(json.schemaVersion, 1);
    assert.equal(json.command, "doctor");
    assert.equal(json.root, cwd);
    assert.equal(json.note, NOTE);
    assert.deepEqual(
      json.areas.map((area) => [area.area, area.status]),
      [
        ["manifest", "ok"],
        ["paths", "ok"],
        ["agents-md", "ok"],
        ["runtime", "ok"],
        ["skills", "ok"],
      ],
    );
    assert.deepEqual(json.areas[0].lines, [
      { status: "ok", message: "the manifest at .agents/seams.json is valid" },
    ]);
    assert.deepEqual(json.areas[1].lines, [
      { status: "ok", message: "every documentation home exists" },
    ]);
    assert.deepEqual(json.areas[2].lines, [
      { status: "ok", message: "AGENTS.md points at the manifest (.agents/seams.json)" },
    ]);
    assert.equal(json.areas[3].lines.length, 2);
    assert.deepEqual(
      json.areas[3].lines.map((line) => line.status),
      ["ok", "ok"],
    );
    assert.match(json.areas[3].lines[0].message, /^node v\d+\.\d+\.\d+ meets the required 22\.20 or newer$/);
    assert.match(json.areas[3].lines[1].message, /^git is available \(git version/);
    assert.deepEqual(
      json.areas[4].lines.map((line) => line.status),
      ["ok", "ok"],
    );
    assert.deepEqual(json.areas[4].lines[0], {
      status: "ok",
      message: "no seams skills are recorded or present in the project scope",
    });
    assert.deepEqual(json.areas[4].lines[1], {
      status: "ok",
      message: "no seams skills are recorded or present in the global scope",
    });
    assert.equal(json.errors, 0);
    assert.equal(json.warnings, 0);
  });

  it("prints the areas and the closing note in text mode", () => {
    const env = makeEnv();
    const cwd = fixtureProject(env, "check-good");
    writeManifest(cwd);
    writeFileSync(
      path.join(cwd, "AGENTS.md"),
      "The seams documentation homes are recorded in .agents/seams.json.\n",
    );

    const result = run(cwd, env, ["doctor"]);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    const out = lines(result.stdout);
    assert.equal(out[out.length - 1], NOTE);
    assert.deepEqual(out.slice(0, 8), [
      "Manifest: ok",
      "  [ok] the manifest at .agents/seams.json is valid",
      "Paths: ok",
      "  [ok] every documentation home exists",
      "AGENTS.md: ok",
      "  [ok] AGENTS.md points at the manifest (.agents/seams.json)",
      "Runtime: ok",
      `  [ok] node ${process.version} meets the required ${MINIMUM_NODE} or newer`,
    ]);
    assert.match(out[8], /^\s+\[ok\] git is available \(git version/);
    assert.deepEqual(out.slice(9), [
      "Skills: ok",
      "  [ok] no seams skills are recorded or present in the project scope",
      "  [ok] no seams skills are recorded or present in the global scope",
      NOTE,
    ]);
  });

  it("reports an invalid manifest as errors and the homes as unknown, exiting 1", () => {
    const env = makeEnv();
    const cwd = fixtureProject(env, "check-invalid-manifest");

    const { status, json } = runDoctor(cwd, env);
    assert.equal(status, 1);

    const manifest = json.areas[0];
    assert.equal(manifest.area, "manifest");
    assert.equal(manifest.status, "error");
    assert.ok(manifest.lines.length >= 1, "expected at least one manifest issue");
    for (const line of manifest.lines) {
      assert.equal(line.status, "error");
      assert.ok(line.hint !== undefined, "every error line carries a fix hint");
      assert.match(line.hint, /seams schema/);
    }
    assert.ok(
      manifest.lines.some((line) => line.message.includes("schemaVersion")),
      "expected an issue naming schemaVersion",
    );

    const paths = json.areas[1];
    assert.equal(paths.status, "error");
    assert.deepEqual(paths.lines, [
      {
        status: "error",
        message: "the documentation homes are unknown: the manifest is invalid",
        hint: "fix the .agents/seams.json issues in the manifest area first",
      },
    ]);

    assert.equal(json.areas[2].status, "warning");
    assert.deepEqual(json.areas[2].lines, [
      {
        status: "warning",
        message: "AGENTS.md is missing at the repository root",
        hint: "create an AGENTS.md that points at the documentation homes (the seams-adopt skill writes one)",
      },
    ]);
    assert.equal(json.areas[3].status, "ok");
    assert.equal(json.areas[4].status, "ok");
    assert.equal(json.errors, manifest.lines.length + 1);
    assert.equal(json.warnings, 1);

    const text = run(cwd, env, ["doctor"]);
    assert.equal(text.status, 1);
    const out = lines(text.stdout);
    assert.equal(out[0], "Manifest: error");
    assert.match(out[1], /^\s+\[error\]/);
    assert.match(out[2], /^\s+fix: /);
    assert.equal(out[out.length - 1], NOTE);
  });

  it("warns, but exits 0, when AGENTS.md is missing", () => {
    const env = makeEnv();
    const cwd = fixtureProject(env, "check-good");
    writeManifest(cwd);

    const { status, json } = runDoctor(cwd, env);
    assert.equal(status, 0);
    assert.deepEqual(json.areas.map((area) => area.status), [
      "ok",
      "ok",
      "warning",
      "ok",
      "ok",
    ]);
    assert.equal(json.warnings, 1);
  });

  it("warns when AGENTS.md mentions neither the manifest nor a documentation home", () => {
    const env = makeEnv();
    const cwd = fixtureProject(env, "check-good");
    writeManifest(cwd);
    writeFileSync(path.join(cwd, "AGENTS.md"), "# Project\n\nWelcome.\n");

    const { status, json } = runDoctor(cwd, env);
    assert.equal(status, 0);
    assert.deepEqual(json.areas[2].lines, [
      {
        status: "warning",
        message: "AGENTS.md mentions neither the manifest nor a documentation home",
        hint: "add a line pointing at .agents/seams.json as the machine-readable record of the documentation homes",
      },
    ]);
  });

  it("accepts AGENTS.md pointing at a documentation home without a manifest", () => {
    const env = makeEnv();
    const cwd = fixtureProject(env, "check-good");
    writeFileSync(path.join(cwd, "AGENTS.md"), "The canon lives in docs/design.\n");

    const { status, json } = runDoctor(cwd, env);
    assert.equal(status, 0);
    assert.deepEqual(json.areas[0].lines, [
      {
        status: "ok",
        message: "no manifest at .agents/seams.json; using the conventional layout",
      },
    ]);
    assert.deepEqual(json.areas[2].lines, [
      {
        status: "ok",
        message: "AGENTS.md points at the documentation home docs/design",
      },
    ]);
  });

  it("warns, but exits 0, when a configured home is missing", () => {
    const env = makeEnv();
    const cwd = fixtureProject(env, "check-missing-path");

    const { status, json } = runDoctor(cwd, env);
    assert.equal(status, 0);
    const paths = json.areas[1];
    assert.equal(paths.status, "warning");
    assert.deepEqual(
      paths.lines.map((line) => line.message),
      [
        "the 'overviews' home does not exist yet: docs/design/overviews",
        "the 'proposals' home does not exist yet: .agents/proposals",
        "the 'plans' home does not exist yet: .agents/plans",
      ],
    );
    for (const line of paths.lines) {
      assert.equal(line.status, "warning");
      assert.ok(line.hint !== undefined);
    }
    assert.equal(json.errors, 0);
  });

  it("includes the skills state, with counts and repair hints", async () => {
    const env = makeEnv();
    const cwd = fixtureProject(env, "check-good");
    writeManifest(cwd);
    writeFileSync(
      path.join(cwd, "AGENTS.md"),
      "The seams documentation homes are recorded in .agents/seams.json.\n",
    );
    await installFixtureV1(cwd);

    // The running package bundles newer copies than the version 1 fixture,
    // so both recorded copies classify as outdated against it.
    const { status, json } = runDoctor(cwd, env);
    assert.equal(status, 0);
    const skills = json.areas[4];
    assert.equal(skills.status, "warning");
    const project = skills.lines.find((line) => line.message.startsWith("project:"));
    assert.equal(project?.status, "warning");
    assert.deepEqual(project?.counts, { outdated: 2 });
    assert.match(project?.hint ?? "", /seams skills update --scope project/);
    const global = skills.lines.find((line) =>
      line.message === "no seams skills are recorded or present in the global scope");
    assert.equal(global?.status, "ok");
    assert.equal(json.warnings, 1);
    assert.equal(json.errors, 0);
  });

  it("writes nothing, in the project or in the home it checks", async () => {
    const env = makeEnv();
    const cwd = fixtureProject(env, "check-good");
    writeManifest(cwd);
    writeFileSync(path.join(cwd, "AGENTS.md"), "Homes in .agents/seams.json.\n");
    await installFixtureV1(cwd);

    const beforeProject = snapshot(cwd);
    const beforeHome = snapshot(env.home);
    const plain = run(cwd, env, ["doctor"]);
    const asJson = run(cwd, env, ["doctor", "--json"]);
    // Only warnings: the fixture skills are outdated against the running
    // package, and warnings do not fail the doctor.
    assert.equal(plain.status, 0);
    assert.equal(asJson.status, 0);
    assert.deepEqual(snapshot(cwd), beforeProject);
    assert.deepEqual(snapshot(env.home), beforeHome);
  });

  it("reports a scope that cannot be checked as an error, exiting 1", () => {
    const env = makeEnv();
    const cwd = fixtureProject(env, "check-good");
    // Project metadata that cannot be parsed stops the project scope's
    // check; the global scope is unaffected.
    mkdirSync(path.join(cwd, ".agents"), { recursive: true });
    writeFileSync(path.join(cwd, ".agents", "seams-skills.json"), "{ not json");

    const { status, json } = runDoctor(cwd, env);
    assert.equal(status, 1);
    const skills = json.areas[4];
    assert.equal(skills.status, "error");
    const project = skills.lines.find((line) =>
      line.message.startsWith("the project scope could not be checked:"),
    );
    assert.equal(project?.status, "error");
    assert.match(project?.message ?? "", /seams-skills\.json/);
    assert.match(
      project?.hint ?? "",
      /seams skills install --scope project/,
    );
    assert.equal(skills.lines[1].status, "ok");
    assert.equal(json.errors, 1);
  });

  it("rejects arguments the command does not take", () => {
    const env = makeEnv();
    const cwd = fixtureProject(env, "check-good");
    const result = run(cwd, env, ["doctor", "extra"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Usage: seams doctor/);
  });
});

describe("seams doctor runtime lines", () => {
  it("reports an old Node as an error", () => {
    assert.deepEqual(nodeLine("v22.19.5"), {
      status: "error",
      message: "node v22.19.5 is older than the required 22.20",
      hint: "upgrade Node to 22.20 or newer",
    });
    assert.equal(nodeLine("v22.19").status, "error");
    assert.equal(nodeLine("v22.20").status, "ok");
    assert.equal(nodeLine("v22.20.0").status, "ok");
    assert.equal(nodeLine("v22.20.0-nightly.20261125").status, "ok");
    assert.equal(nodeLine("v23.0.0").status, "ok");
    assert.equal(nodeMeetsMinimum("v22.20.0"), true);
    assert.equal(nodeMeetsMinimum("22.19.9"), false);
  });

  it("reports missing git as an error", () => {
    const emptyPath = mkdtempSync(path.join(tmpdir(), "seams-path-"));
    try {
      assert.deepEqual(gitLine({ PATH: emptyPath }), {
        status: "error",
        message: "git is not available",
        hint: "install git and make sure the git binary is on PATH",
      });
    } finally {
      rmSync(emptyPath, { recursive: true, force: true });
    }
  });

  it("reports available git as ok", () => {
    const line = gitLine();
    assert.equal(line.status, "ok");
    assert.match(line.message, /^git is available \(git version/);
  });
});

describe("seams doctor scope lines", () => {
  type State = "ok" | "modified" | "missing" | "untracked" | "outdated" | "divergent";

  /** A minimal entry, for summary-only assertions. */
  function entry(state: State): { state: State } {
    return { state };
  }

  it("summarizes all-ok copies and empty scopes", () => {
    assert.deepEqual(scopeLine("project", []), {
      status: "ok",
      message: "no seams skills are recorded or present in the project scope",
    });
    assert.deepEqual(scopeLine("global", [entry("ok"), entry("ok")]), {
      status: "ok",
      message: "global: 2 ok",
      counts: { ok: 2 },
    });
  });

  it("hints at update for outdated and missing copies", () => {
    const line = scopeLine("project", [entry("ok"), entry("outdated"), entry("missing")]);
    assert.equal(line.status, "warning");
    assert.deepEqual(line.counts, { missing: 1, ok: 1, outdated: 1 });
    assert.equal(
      line.hint,
      "run `seams skills update --scope project` to refresh the outdated and missing copies",
    );
  });

  it("hints at manual reconciliation for modified, untracked, and divergent copies", () => {
    const line = scopeLine("global", [entry("modified"), entry("untracked"), entry("divergent")]);
    assert.equal(line.status, "warning");
    assert.deepEqual(line.counts, { divergent: 1, modified: 1, untracked: 1 });
    assert.match(line.hint ?? "", /manual reconciliation/);
    assert.match(line.hint ?? "", /seams skills check --scope global/);
  });
});

/** Every file path under `root` with a hash of its contents. */
function snapshot(root: string): Map<string, string> {
  const files = new Map<string, string>();
  const walk = (relative: string): void => {
    const absolute = path.join(root, relative);
    const stats = statSync(absolute);
    if (stats.isDirectory()) {
      for (const name of readdirSync(absolute).sort()) {
        walk(relative === "" ? name : path.join(relative, name));
      }
      return;
    }
    const content = readFileSync(absolute);
    files.set(relative.split(path.sep).join("/"), createHash("sha256").update(content).digest("hex"));
  };
  walk("");
  return files;
}
