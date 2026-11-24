/**
 * Tests for the bundled skills: the bundle script, the bundled skills module,
 * and the `seams skills list` and `seams skills get` commands.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { contentHash, listBundledSkills, readBundledSkill } from "../src/skills/bundled.ts";
import { bundledSkillsDir } from "../src/skills/bundled.ts";
import { packageRoot } from "../src/config.ts";

const CLI = path.resolve(import.meta.dirname, "..", "src", "cli.ts");
const SCRIPT = path.resolve(import.meta.dirname, "..", "scripts", "bundle-skills.mjs");

/** All nine seams skills, in name order. */
const SKILL_NAMES = [
  "seams-adopt",
  "seams-orient",
  "seams-plan",
  "seams-propose",
  "seams-reconcile",
  "seams-route",
  "seams-shape",
  "seams-track",
  "seams-work",
];

function run(args: string[], options: { cwd?: string } = {}) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", ...options });
}

describe("bundled skills directory", () => {
  it("resolves to an existing skills directory holding every skill", () => {
    const dir = bundledSkillsDir();
    assert.ok(existsSync(dir), `expected ${dir} to exist`);
    for (const name of SKILL_NAMES) {
      assert.ok(existsSync(path.join(dir, name, "SKILL.md")), `${name}/SKILL.md`);
    }
  });

  it("reads the repository skills when running from source, even after a build", () => {
    // A source checkout runs from src/ (src/config.ts, src/cli.ts). There the
    // repository's skills directory is the source of truth; the gitignored
    // cli/skills copy left by an earlier build would be stale.
    assert.equal(
      bundledSkillsDir(),
      path.resolve(packageRoot(), "..", "skills"),
    );
  });
});

describe("listBundledSkills", () => {
  it("lists all nine seams skills with descriptions", () => {
    const skills = listBundledSkills();
    assert.deepEqual(
      skills.map((skill) => skill.name),
      SKILL_NAMES,
    );
    for (const skill of skills) {
      assert.ok(skill.description.length > 0, `${skill.name} has a description`);
      assert.ok(skill.files.some((file) => file.path === "SKILL.md"));
    }
  });

  it("returns a stable hash across calls", () => {
    const first = listBundledSkills();
    const second = listBundledSkills();
    assert.deepEqual(first, second);
  });

  it("describes files with sizes relative to the skill folder", () => {
    const route = listBundledSkills().find((s) => s.name === "seams-route");
    assert.ok(route);
    const implement = route.files.find((f) => f.path === "assets/roles/implement.md");
    assert.ok(implement);
    const absolute = path.join(bundledSkillsDir(), "seams-route", "assets/roles/implement.md");
    assert.equal(implement.bytes, readFileSync(absolute).length);
  });
});

describe("contentHash", () => {
  const files = [
    { path: "a.txt", content: "alpha" },
    { path: "b.txt", content: "beta" },
  ];

  it("is stable for unchanged input", () => {
    assert.equal(contentHash(files), contentHash([...files]));
  });

  it("changes when content changes", () => {
    const changed = [{ path: "a.txt", content: "ALPHA" }, files[1]];
    assert.notEqual(contentHash(files), contentHash(changed));
  });

  it("changes when the file list changes", () => {
    assert.notEqual(contentHash(files), contentHash(files.slice(0, 1)));
  });
});

describe("readBundledSkill", () => {
  it("returns SKILL.md first, then the references and assets", () => {
    const skill = readBundledSkill("seams-route");
    assert.ok(skill);
    assert.equal(skill.files[0].path, "SKILL.md");
    const relative = skill.files.map((file) => file.path);
    assert.ok(relative.includes("assets/prompt-subagent.md"));
    assert.ok(relative.includes("assets/roles/implement.md"));
    for (const file of skill.files) {
      assert.ok(path.isAbsolute(file.absolutePath), file.absolutePath);
      assert.equal(file.content, readFileSync(file.absolutePath, "utf8"));
    }
  });

  it("returns undefined for an unknown or unsafe name", () => {
    assert.equal(readBundledSkill("no-such-skill"), undefined);
    assert.equal(readBundledSkill("../package.json"), undefined);
  });
});

describe("seams skills list", () => {
  // List reports installation state relative to the process's working
  // directory, so these tests run in a fresh temporary directory to stay
  // independent of where the suite is run (a checkout's own .agents/skills
  // would make every skill read as untracked).
  const dir = mkdtempSync(path.join(tmpdir(), "seams-list-"));
  after(() => rmSync(dir, { recursive: true, force: true }));

  it("returns all nine skills with descriptions and installation state in JSON", () => {
    const result = run(["--json", "skills", "list"], { cwd: dir });
    assert.equal(result.status, 0);
    const envelope = JSON.parse(result.stdout);
    assert.equal(envelope.schemaVersion, 1);
    assert.equal(envelope.command, "skills list");
    assert.equal(envelope.scope, "project");
    assert.deepEqual(
      envelope.skills.map((skill: { name: string }) => skill.name),
      SKILL_NAMES,
    );
    for (const skill of envelope.skills) {
      assert.ok(skill.description.length > 0);
      assert.equal(typeof skill.installation.state, "string");
    }
  });

  it("prints each skill name, description, and installation state in text", () => {
    const result = run(["skills", "list"], { cwd: dir });
    assert.equal(result.status, 0);
    for (const name of SKILL_NAMES) {
      assert.match(result.stdout, new RegExp(`\\b${name} \\u00b7 `));
    }
    assert.match(result.stdout, /· not installed\n/);
  });
});

describe("seams skills get", () => {
  it("prints SKILL.md and the assets and roles files in text", () => {
    const result = run(["skills", "get", "seams-route"]);
    assert.equal(result.status, 0);
    const skill = readBundledSkill("seams-route");
    assert.ok(skill);
    assert.match(result.stdout, /# Role: implementer/);
    assert.ok(result.stdout.includes("=== assets/prompt-subagent.md ==="));
    for (const file of skill.files) {
      if (file.path === "SKILL.md") continue;
      assert.ok(result.stdout.includes(`=== ${file.path} ===`), file.path);
      assert.ok(result.stdout.includes(file.content.trimEnd()), file.path);
    }
  });

  it("returns the skill's files with paths and contents in JSON", () => {
    const result = run(["--json", "skills", "get", "seams-route"]);
    assert.equal(result.status, 0);
    const envelope = JSON.parse(result.stdout);
    assert.equal(envelope.schemaVersion, 1);
    assert.equal(envelope.command, "skills get");
    assert.equal(envelope.name, "seams-route");
    assert.equal(envelope.files[0].path, "SKILL.md");
    for (const file of envelope.files) {
      assert.ok(path.isAbsolute(file.absolutePath));
      assert.ok(typeof file.content === "string");
    }
  });

  it("exits 1 with the valid names for an unknown skill", () => {
    const result = run(["skills", "get", "no-such-skill"]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown skill: no-such-skill/);
    for (const name of SKILL_NAMES) {
      assert.match(result.stderr, new RegExp(`\\b${name}\\b`));
    }
  });

  it("exits 2 when the skill name is missing", () => {
    const result = run(["skills", "get"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Missing skill name/);
  });
});

describe("seams skills dispatcher", () => {
  it("exits 2 with the subcommand list when no subcommand is given", () => {
    const result = run(["skills"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Missing subcommand/);
    assert.match(result.stderr, /list/);
    assert.match(result.stderr, /get/);
    assert.match(result.stderr, /install/);
  });

  it("exits 2 for an unknown subcommand", () => {
    const result = run(["skills", "explode"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Unknown subcommand: explode/);
  });
});

describe("bundle-skills script", () => {
  const target = mkdtempSync(path.join(tmpdir(), "seams-bundle-"));

  after(() => {
    rmSync(target, { recursive: true, force: true });
  });

  it("copies the repository skills into the target", () => {
    const result = spawnSync(process.execPath, [SCRIPT, target], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    for (const name of SKILL_NAMES) {
      assert.ok(existsSync(path.join(target, name, "SKILL.md")), name);
    }
  });

  it("replaces the target so stale files do not survive", () => {
    const stale = path.join(target, "stale-skill", "SKILL.md");
    mkdirSync(path.dirname(stale), { recursive: true });
    writeFileSync(stale, "stale");
    const result = spawnSync(process.execPath, [SCRIPT, target], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!existsSync(stale));
    assert.ok(existsSync(path.join(target, "seams-orient", "SKILL.md")));
  });

  it("fails when the repository skills directory is missing", () => {
    const empty = mkdtempSync(path.join(tmpdir(), "seams-nosource-"));
    try {
      // Run a copy of the script from a directory with no ../skills sibling.
      const fakePackage = path.join(empty, "cli", "scripts");
      mkdirSync(fakePackage, { recursive: true });
      copyFileSync(SCRIPT, path.join(fakePackage, "bundle-skills.mjs"));
      const result = spawnSync(
        process.execPath,
        [path.join(fakePackage, "bundle-skills.mjs")],
        { encoding: "utf8" },
      );
      assert.equal(result.status, 1);
      assert.match(result.stderr, /no skills directory/);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
