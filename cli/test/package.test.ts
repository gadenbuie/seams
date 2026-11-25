/**
 * Package tests for the `@grrrck/seams` tarball: `npm pack` the real package,
 * install the tarball into a temporary project, and drive the installed CLI
 * through the setup paths a person or an agent actually takes.
 *
 * One shared workspace holds every temporary path (the npm cache, the home
 * directory, the install targets, the tarballs), so the suite's cleanup is a
 * single removal. The suite adds roughly 20 seconds to `npm test`: the pack
 * builds `cli/dist` and bundles the skills (about 6 seconds), each tarball
 * install takes a few seconds, and every seams run is a fresh process.
 *
 * `npm install` fetches the package's dependencies from the registry; that is
 * npm's own network use, pointed at a temporary cache and home. Seams' own
 * code may make no network call: every seams process this suite spawns
 * directly runs with a preload that makes `fetch` and `http(s).request` throw,
 * so a call fails the test loudly instead of silently succeeding. (The one
 * `npx` run omits the preload: it would also block npx's own node process,
 * and the same seams entry point runs guarded everywhere else.)
 *
 * The operator's real agent settings are snapshotted before and after the
 * suite, read-only: `~/.agents` in full, the top level of each agent root
 * (`~/.claude`, `~/.codex`, `~/.pi/agent`), and each root's `skills` subtree.
 * Log, session, and cache subtrees inside those roots belong to other
 * processes on this machine and are excluded on purpose; no seams command can
 * address them anyway, because every run's `HOME` and detection variables
 * point at the temporary home. npm's own home writes are redirected through
 * `npm_config_cache` and `npm_config_userconfig` into the temporary home.
 *
 * Human-mode `init` needs a terminal to choose its mode, so that test runs
 * the installed CLI under a pseudo-terminal from `/usr/bin/script` and
 * answers each prompt as it appears. The test skips itself when no pty
 * helper is available, or when this machine has `/etc/codex` (then codex is
 * detected even in an empty home and `init` chooses agent mode instead of
 * asking).
 */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { after, before, describe, it } from "node:test";
import { fixtureDir } from "./helpers.ts";
import { skillFolderHash } from "../src/skills/hash.ts";

const CLI_DIR = path.resolve(import.meta.dirname, "..");
const REPO_SKILLS = path.resolve(CLI_DIR, "..", "skills");
const PACKAGE_VERSION = (JSON.parse(readFileSync(path.join(CLI_DIR, "package.json"), "utf8")) as {
  version: string;
}).version;

/** The bundled skill folder names in the repository's `skills/` directory. */
const SKILL_FOLDERS = readdirSync(REPO_SKILLS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const SKILL_COUNT = SKILL_FOLDERS.length;

/** Relative file paths (forward slashes) of every file under `root`, sorted. */
function relativeFiles(root: string): string[] {
  const files: string[] = [];
  const walk = (relative: string): void => {
    for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const child = relative === "" ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile()) files.push(child);
    }
  };
  walk("");
  return files.sort();
}

/** The workspace: every temporary path the suite writes lives under `dir`. */
interface Workspace {
  dir: string;
  home: string;
  cache: string;
  tarballs: string;
  /** The preload that blocks network calls in every seams process. */
  preload: string;
  preloadUrl: string;
  tgz: string;
}

let ws: Workspace;
let homeBefore: Record<string, unknown>;

before(() => {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), "seams-pkg-")));
  const home = path.join(dir, "home");
  const cache = path.join(dir, "npm-cache");
  const tarballs = path.join(dir, "tarballs");
  mkdirSync(home);
  mkdirSync(cache);
  mkdirSync(tarballs);

  const preload = path.join(dir, "no-network.mjs");
  writeFileSync(
    preload,
    [
      "// Test preload: seams' own code must make no network call.",
      "// Any fetch or http(s) request throws, so a call fails the test loudly.",
      "const blocked = (where) => () => {",
      "  throw new Error(`network disabled in seams package test (${where})`);",
      "};",
      "globalThis.fetch = blocked(\"fetch\");",
      "const http = (await import(\"node:http\")).default;",
      "const https = (await import(\"node:https\")).default;",
      "for (const [name, mod] of [[\"http\", http], [\"https\", https]]) {",
      "  mod.request = mod.get = blocked(`${name}.request`);",
      "}",
      "",
    ].join("\n"),
  );

  homeBefore = snapshotAgentSettings();
  ws = { dir, home, cache, tarballs, preload, preloadUrl: pathToFileURL(preload).href, tgz: "" };
  ws.tgz = npmPack(CLI_DIR, tarballs);
});

after(() => {
  assert.deepEqual(
    snapshotAgentSettings(),
    homeBefore,
    "the operator's real agent settings changed during the package tests",
  );
  rmSync(ws.dir, { recursive: true, force: true });
});

/** npm's environment: temporary home, cache, and user config, quiet. */
function npmEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    HOME: ws.home,
    npm_config_cache: ws.cache,
    npm_config_userconfig: path.join(ws.home, ".npmrc"),
    npm_config_update_notifier: "false",
    npm_config_audit: "false",
    npm_config_fund: "false",
    npm_config_progress: "false",
    npm_config_loglevel: "error",
    DISABLE_TELEMETRY: "1",
  };
}

/** Pack the package at `cwd` and return the produced tarball's path. */
function npmPack(cwd: string, destination: string, extraArgs: string[] = []): string {
  const result = spawnSync("npm", ["pack", ...extraArgs, "--pack-destination", destination], {
    cwd,
    env: npmEnv(),
    encoding: "utf8",
    timeout: 240_000,
  });
  assert.equal(result.status, 0, `npm pack failed in ${cwd}:\n${result.stderr}`);
  const names = readdirSync(destination).filter((name) => name.endsWith(".tgz"));
  assert.equal(names.length, 1, `expected one tarball in ${destination}`);
  return path.join(destination, names[0]);
}

/** A fresh npm project inside the workspace, with a minimal package.json. */
function newProject(prefix: string): string {
  const project = realpathSync(mkdtempSync(path.join(ws.dir, `${prefix}-`)));
  writeFileSync(
    path.join(project, "package.json"),
    JSON.stringify({ name: "seams-package-test", private: true }, null, 2) + "\n",
  );
  return project;
}

/** Install a tarball into `project` with the suite's temporary npm state. */
function npmInstall(project: string, tgz: string): void {
  const result = spawnSync("npm", ["install", tgz], {
    cwd: project,
    env: npmEnv(),
    encoding: "utf8",
    timeout: 240_000,
  });
  assert.equal(result.status, 0, `npm install of ${tgz} failed:\n${result.stderr}`);
}

/** The installed package's CLI entry inside `project`. */
function installedCli(project: string): string {
  return path.join(project, "node_modules", "@grrrck", "seams", "dist", "cli.js");
}

/** Agent detection markers inside the temporary home. */
function markers(agents: { claude?: boolean; codex?: boolean; pi?: boolean }): void {
  if (agents.claude) mkdirSync(path.join(ws.home, ".claude"), { recursive: true });
  if (agents.codex) mkdirSync(path.join(ws.home, ".codex"), { recursive: true });
  if (agents.pi) mkdirSync(path.join(ws.home, ".pi", "agent"), { recursive: true });
}

/** The seams child-process environment: temporary home and the network block. */
function seamsEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    HOME: ws.home,
    CLAUDE_CONFIG_DIR: path.join(ws.home, ".claude"),
    CODEX_HOME: path.join(ws.home, ".codex"),
    XDG_STATE_HOME: path.join(ws.home, ".local", "state"),
    DISABLE_TELEMETRY: "1",
    NODE_OPTIONS: `--import ${ws.preloadUrl}`,
  };
}

/**
 * Run the installed seams CLI in `cwd`. `cli` defaults to the install
 * project's entry; tests with their own project pass its entry, so the
 * running package is always the one under test.
 */
function runSeams(cwd: string, args: string[], options: { cli?: string } = {}) {
  return spawnSync(process.execPath, ["--import", ws.preloadUrl, options.cli ?? installedCli(cwd), ...args], {
    cwd,
    env: seamsEnv(),
    encoding: "utf8",
    timeout: 120_000,
  });
}

/** Read-only snapshot of the operator's real agent settings (see header). */
function snapshotAgentSettings(): Record<string, unknown> {
  const home = homedir();
  const snapshot: Record<string, unknown> = {};
  const agentsDir = path.join(home, ".agents");
  snapshot.agents = existsSync(agentsDir) ? dirSnapshot(agentsDir) : null;
  for (const [key, relative] of [
    ["claude", ".claude"],
    ["codex", ".codex"],
    ["pi", path.join(".pi", "agent")],
  ] as const) {
    const root = path.join(home, relative);
    snapshot[`${key}Root`] = existsSync(root) ? readdirSync(root).sort() : null;
    const skills = path.join(root, "skills");
    snapshot[`${key}Skills`] = existsSync(skills) ? dirSnapshot(skills) : null;
  }
  return snapshot;
}

/** Every file under `root` as `relative-path size` lines, sorted. */
function dirSnapshot(root: string): string[] {
  return relativeFiles(root)
    .map((file) => `${file} ${statSync(path.join(root, file)).size}`)
    .sort();
}

/** The tarball's entries with the `package/` prefix stripped. */
function tarEntries(tgz: string): string[] {
  const result = spawnSync("tar", ["-tzf", tgz], { encoding: "utf8", timeout: 60_000 });
  assert.equal(result.status, 0, `tar -tzf ${tgz} failed:\n${result.stderr}`);
  return result.stdout
    .split("\n")
    .filter(Boolean)
    .map((entry) => entry.replace(/^package\//, ""));
}

describe("the packed tarball", () => {
  it("ships the built dist, the schema, and every bundled skill, and nothing else", () => {
    const entries = tarEntries(ws.tgz);

    // Only the package's own files: the package.json always ships, and the
    // remaining entries must sit inside a directory the files field names.
    const roots = ["dist/", "schemas/", "skills/", "templates/"];
    const files = ["package.json", "README.md", "LICENSE", "LICENSE.md"];
    for (const entry of entries) {
      const known = roots.some((root) => entry.startsWith(root)) || files.includes(entry);
      assert.ok(known, `unexpected tarball entry: ${entry}`);
    }

    // No dependencies, no tests, no fixtures.
    for (const entry of entries) {
      assert.ok(!/node_modules|(^|\/)test(\/|$)|fixtures|\.test\.js$/.test(entry), `tarball ships test files: ${entry}`);
    }

    // The built dist, including every command unit the package tests build on.
    for (const file of [
      "dist/cli.js",
      "dist/skills/bundled.js",
      "dist/commands/init.js",
      "dist/commands/install.js",
      "dist/commands/skills.js",
      "dist/commands/doctor.js",
    ]) {
      assert.ok(entries.includes(file), `tarball is missing ${file}`);
    }

    // The bundled manifest JSON Schema.
    assert.ok(entries.includes("schemas/v1/seams.schema.json"), "tarball is missing the schema");

    // Every skill folder, references and assets included, exactly as in the
    // repository: the bundled copy is the whole repository tree.
    const bundled = entries.filter((entry) => entry.startsWith("skills/")).sort();
    assert.deepEqual(
      bundled,
      relativeFiles(REPO_SKILLS).map((file) => `skills/${file}`),
      "the tarball's skills are not exactly the repository's skills",
    );
    assert.ok(SKILL_FOLDERS.length >= 9, "expected the nine seams skills or more");
    for (const name of SKILL_FOLDERS) {
      assert.ok(entries.includes(`skills/${name}/SKILL.md`), `tarball is missing ${name}/SKILL.md`);
    }
    assert.ok(bundled.some((entry) => entry.includes("/references/")), "no references are bundled");
    assert.ok(bundled.some((entry) => entry.includes("/assets/")), "no assets are bundled");
  });
});

describe("the installed tarball", () => {
  let project: string;

  before(() => {
    project = newProject("install");
    npmInstall(project, ws.tgz);
    markers({ pi: true });
  });

  it("runs through npx and prints its version", () => {
    assert.ok(existsSync(path.join(project, "node_modules", ".bin", "seams")), "npm did not create the seams bin");
    // npx is npm's own node process: it resolves and spawns the bin, and npm's
    // machinery needs its registry access, so this one run carries the npm
    // redirects (temporary cache and home) but not the network-blocking
    // preload, which would block npm, not seams. The same seams entry point
    // runs guarded in every other test of this suite.
    const env = { ...npmEnv(), ...seamsEnv() };
    delete env.NODE_OPTIONS;
    const result = spawnSync("npx", ["--no-install", "seams", "--version"], {
      cwd: project,
      env,
      encoding: "utf8",
      timeout: 120_000,
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), PACKAGE_VERSION);
  });

  it("prints the bundled schema's path inside the installed package", () => {
    const result = runSeams(project, ["schema", "--path"]);
    assert.equal(result.status, 0, result.stderr);
    const expected = path.join(project, "node_modules", "@grrrck", "seams", "schemas", "v1", "seams.schema.json");
    assert.equal(result.stdout.trim(), expected);
    assert.ok(existsSync(result.stdout.trim()), "the printed schema path does not exist");
  });

  it("lists documents in a fixture project", () => {
    const docs = path.join(ws.dir, "list-fixture");
    cpSync(fixtureDir("list-project"), docs, { recursive: true });
    const result = runSeams(docs, ["list"], { cli: installedCli(project) });
    assert.equal(result.status, 0, result.stderr);
    const headers = result.stdout
      .split("\n")
      .filter((line) => line.endsWith(":"));
    assert.deepEqual(headers, ["canon:", "overviews:", "proposals:", "plans:"]);
    assert.ok(result.stdout.includes("docs/design/vision.md"), "no line for docs/design/vision.md");
  });

  it("init --agent --scope project --dry-run reports the plan and writes nothing", () => {
    const result = runSeams(project, ["init", "--agent", "--scope", "project", "--dry-run"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Dry run: nothing written\./);
    assert.ok(!existsSync(path.join(project, ".agents")), "the dry run wrote .agents");
    assert.ok(!existsSync(path.join(project, "skills-lock.json")), "the dry run wrote a lock file");
  });

  it("init --agent --scope project installs the skills and hands adoption to the agent", () => {
    const result = runSeams(project, ["init", "--agent", "--scope", "project"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Agents detected: pi/);
    assert.match(result.stdout, new RegExp(`Installed ${SKILL_COUNT}, unchanged 0, skipped 0, failed 0\\.`));
    assert.match(result.stdout, /The `seams-adopt` skill now guides adoption of seams\./);
    assert.ok(
      existsSync(path.join(project, ".agents", "skills", "seams-adopt", "SKILL.md")),
      "seams-adopt was not installed",
    );
    assert.deepEqual(
      readdirSync(path.join(project, ".agents", "skills")).sort(),
      SKILL_FOLDERS,
      "not every bundled skill was installed",
    );
    const meta = JSON.parse(readFileSync(path.join(project, ".agents", "seams-skills.json"), "utf8"));
    assert.equal(Object.keys(meta.skills).length, SKILL_COUNT);
    assert.equal(meta.packageVersion, PACKAGE_VERSION);
  });

  it("skills check classifies every installed copy as ok", () => {
    const result = runSeams(project, ["skills", "check"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`Checked ${SKILL_COUNT} copies: ${SKILL_COUNT} ok\\.`));
  });

  it("doctor reports the setup state of the installed skills", () => {
    const result = runSeams(project, ["doctor"]);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Runtime: ok/);
    assert.match(result.stdout, new RegExp(`project: ${SKILL_COUNT} ok`));
    assert.match(result.stdout, /Doctor reports setup state/);
  });

  // Human mode needs a terminal to be chosen at all, so this test runs the
  // installed CLI under the pty /usr/bin/script provides. The answers must
  // follow their prompts, like the unit's scripted dialog: input written to
  // the pty before readline starts is lost when readline switches the pty
  // to raw mode, and closing script's stdin sends ^D, which ends the
  // dialog. It is the suite's last use of the shared install project's
  // environment: the pi marker must not exist, or detection would pick agent
  // mode before the prompts appear. script refuses the socketpair stdio
  // Node's child pipes use on macOS and hides the child's exit status, so
  // the answers are paced through a real pipe, and the assertions rest on
  // the printed dialog and the written files.
  it(
    "init in human mode asks and installs for the chosen agent",
    {
      skip:
        existsSync("/usr/bin/script")
          ? existsSync("/etc/codex")
            ? "this machine has /etc/codex: init detects codex and never asks"
            : false
          : "no /usr/bin/script to provide a pseudo-terminal",
    },
    async () => {
      rmSync(path.join(ws.home, ".pi"), { recursive: true, force: true });
      const humanProject = newProject("human");
      // Node's child pipes are socketpairs on macOS, and script refuses them
      // (tcgetattr), so `cat |` hands script a real pipe created by the shell.
      const command = [
        "cat |",
        "/usr/bin/script -q /dev/null",
        process.execPath,
        "--import",
        ws.preloadUrl,
        installedCli(project),
        "init",
      ].join(" ");
      const child = spawn("/bin/sh", ["-c", command], {
        cwd: humanProject,
        env: seamsEnv(),
        stdio: ["pipe", "pipe", "pipe"],
      });
      let out = "";
      let stderr = "";
      let scopeAnswered = false;
      let agentsAnswered = false;
      child.stdout.setEncoding("utf8");
      child.stdout.on("data", (chunk: string) => {
        out += chunk;
        const text = out.replaceAll("\r", "");
        if (!scopeAnswered && text.includes("project or globally?")) {
          scopeAnswered = true;
          child.stdin.write("project\n");
        } else if (!agentsAnswered && text.includes("agent harnesses?")) {
          agentsAnswered = true;
          // Ending stdin closes cat, the real pipe, and finally the dialog's
          // stdin after both answers are through, so the pipeline can finish.
          child.stdin.end("pi\n");
        }
      });
      child.stderr.setEncoding("utf8");
      child.stderr.on("data", (chunk: string) => {
        stderr += chunk;
      });
      const status = await new Promise<number | null>((resolve) => {
        const timer = setTimeout(() => {
          child.kill("SIGKILL");
          resolve(null);
        }, 120_000);
        child.on("exit", (code: number | null) => {
          clearTimeout(timer);
          resolve(code);
        });
      });
      const text = out.replaceAll("\r", "");
      const diagnostic = `Output:\n${text}\nstderr: ${stderr}`;
      assert.ok(status !== null, `init under the pty never exited. ${diagnostic}`);
      assert.equal(status, 0, `init under the pty failed. ${diagnostic}`);
      assert.match(text, /Install the seams skills for this project or globally\?/);
      assert.match(text, /Install the skills for which agent harnesses\?/);
      assert.match(text, new RegExp(`Installed ${SKILL_COUNT}, unchanged 0, skipped 0, failed 0\\.`));
      assert.match(text, /Next steps: ask your agent to run the `seams-adopt` skill\./);
      assert.ok(
        existsSync(path.join(humanProject, ".agents", "skills", "seams-adopt", "SKILL.md")),
        "the chosen agent's skills were not installed",
      );
      assert.ok(existsSync(path.join(humanProject, ".agents", "seams-skills.json")), "no skills metadata was written");
    },
  );
});

describe("skills update across two package versions", () => {
  let project: string;
  let tgz2: string;

  before(() => {
    project = newProject("update");
    npmInstall(project, ws.tgz);
    markers({ pi: true });
    const init = runSeams(project, ["init", "--agent", "--scope", "project"], { cli: installedCli(project) });
    assert.equal(init.status, 0, init.stderr);
  });

  it("packs a bumped copy of the package with one changed bundled skill", () => {
    // The copy keeps the built package's layout; --ignore-scripts packs it
    // without rebuilding, because prepack would rebuild the unchanged dist.
    const copy = path.join(ws.dir, "cli-0.2.0");
    mkdirSync(copy);
    for (const item of ["dist", "skills", "schemas", "scripts", "package.json"]) {
      const source = path.join(CLI_DIR, item);
      cpSync(source, path.join(copy, item), {
        recursive: existsSync(source) && lstatSync(source).isDirectory(),
      });
    }
    const manifest = JSON.parse(readFileSync(path.join(copy, "package.json"), "utf8")) as { version: string };
    manifest.version = "0.2.0";
    writeFileSync(path.join(copy, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
    const changed = path.join(copy, "skills", "seams-orient", "SKILL.md");
    writeFileSync(changed, readFileSync(changed, "utf8") + "\n<!-- package test: v2 bundle change -->\n");

    const destination = path.join(ws.dir, "tarballs-0.2.0");
    mkdirSync(destination);
    tgz2 = npmPack(copy, destination, ["--ignore-scripts"]);
    assert.equal(path.basename(tgz2), "grrrck-seams-0.2.0.tgz");
    assert.ok(
      tarEntries(tgz2).includes("skills/seams-orient/SKILL.md"),
      "the changed skill is not in the second tarball",
    );
  });

  it("updates only the copies the newer package changed, preserving the modified one", () => {
    // One installed copy is hand-edited before the update; its bundle is the
    // same in both versions, so the update must leave it byte for byte.
    const editedSkill = path.join(project, ".agents", "skills", "seams-work", "SKILL.md");
    const edited = readFileSync(editedSkill, "utf8") + "\n<!-- hand edit: keep me -->\n";
    writeFileSync(editedSkill, edited);

    const before = new Map(
      SKILL_FOLDERS.map((name) => [
        name,
        skillFolderHash(path.join(project, ".agents", "skills", name)),
      ]),
    );

    npmInstall(project, tgz2);
    assert.equal(
      (JSON.parse(readFileSync(path.join(project, "node_modules", "@grrrck", "seams", "package.json"), "utf8")) as {
        version: string;
      }).version,
      "0.2.0",
      "the second install did not replace the package",
    );

    const result = runSeams(project, ["skills", "update"], { cli: installedCli(project) });
    assert.equal(result.status, 1, "the kept modified copy should make update exit 1");
    assert.match(result.stdout, /seams-orient → pi: updated \(outdated\) /);
    assert.match(result.stdout, /Left for manual reconciliation:/);
    assert.match(result.stdout, /seams-work · pi: modified/);
    assert.match(result.stdout, /Updated 1, skipped 0, failed 0, kept 1 for manual reconciliation\./);

    // The modified copy was never touched.
    assert.equal(readFileSync(editedSkill, "utf8"), edited);
    // The changed bundle's copy now carries the version 2 content...
    const orient = readFileSync(path.join(project, ".agents", "skills", "seams-orient", "SKILL.md"), "utf8");
    assert.ok(orient.includes("<!-- package test: v2 bundle change -->"), "seams-orient was not updated");
    assert.equal(
      skillFolderHash(path.join(project, ".agents", "skills", "seams-orient")),
      skillFolderHash(path.join(project, "node_modules", "@grrrck", "seams", "skills", "seams-orient")),
    );
    // ...and nothing else changed: the hand-edited copy keeps its hash, and
    // every other copy still matches its unchanged bundle.
    for (const name of SKILL_FOLDERS) {
      if (name === "seams-orient") continue;
      assert.equal(
        skillFolderHash(path.join(project, ".agents", "skills", name)),
        before.get(name),
        `${name} changed, but neither its copy nor its bundle did`,
      );
    }

    // The metadata carries the new version for the updated skill only.
    const meta = JSON.parse(readFileSync(path.join(project, ".agents", "seams-skills.json"), "utf8"));
    assert.equal(meta.packageVersion, "0.2.0");
    assert.equal(
      meta.skills["seams-orient"].hash,
      skillFolderHash(path.join(project, "node_modules", "@grrrck", "seams", "skills", "seams-orient")),
    );
    assert.equal(meta.skills["seams-work"].hash, skillFolderHash(path.join(CLI_DIR, "skills", "seams-work")));

    // A check from the newer package finds only the modified copy.
    const check = runSeams(project, ["skills", "check"], { cli: installedCli(project) });
    assert.equal(check.status, 1);
    assert.match(check.stdout, /seams-orient · pi: ok/);
    assert.match(check.stdout, /seams-work · pi: modified/);
    assert.match(check.stdout, new RegExp(`Checked ${SKILL_COUNT} copies: 1 modified, ${SKILL_COUNT - 1} ok\\.`));
  });
});
