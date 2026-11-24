/**
 * Tests for the seams skills metadata module.
 */
import assert from "node:assert/strict";
import { homedir } from "node:os";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { after, describe, it } from "node:test";
import {
  PACKAGE_NAME,
  packageVersion,
  readSkillsMeta,
  seamsSkillsMetaPath,
  writeSkillsMeta,
} from "../src/skills/meta.ts";

describe("meta paths", () => {
  it("puts project metadata next to the canonical install target", () => {
    const cwd = "/tmp/some-project";
    assert.equal(seamsSkillsMetaPath(cwd, "project"), path.join(cwd, ".agents", "seams-skills.json"));
  });

  it("puts global metadata in the user's .agents directory", () => {
    assert.equal(
      seamsSkillsMetaPath("/anywhere", "global"),
      path.join(homedir(), ".agents", "seams-skills.json"),
    );
  });

  it("reads the package version from package.json", () => {
    assert.match(packageVersion(), /^\d+\.\d+\.\d+$/);
  });
});

describe("read and write", () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "seams-meta-"));
  after(() => rmSync(cwd, { recursive: true, force: true }));

  it("returns undefined when no metadata exists", () => {
    assert.equal(readSkillsMeta(cwd, "project"), undefined);
  });

  it("round-trips the metadata shape", () => {
    const meta = {
      schemaVersion: 1,
      package: PACKAGE_NAME,
      packageVersion: packageVersion(),
      scope: "project" as const,
      skills: {
        "seams-work": {
          hash: "abc",
          version: "2.0",
          agents: ["pi"],
          mode: "copy" as const,
          installedAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    };
    writeSkillsMeta(cwd, "project", meta);
    const file = seamsSkillsMetaPath(cwd, "project");
    assert.ok(existsSync(file));
    assert.equal(readFileSync(file, "utf8").at(-1), "\n");
    assert.deepEqual(readSkillsMeta(cwd, "project"), meta);
  });

  it("throws on invalid JSON", () => {
    writeFileSync(seamsSkillsMetaPath(cwd, "project"), "{not json");
    assert.throws(() => readSkillsMeta(cwd, "project"), /not valid JSON/);
  });

  it("throws on a shape that is not schemaVersion 1 metadata", () => {
    writeFileSync(seamsSkillsMetaPath(cwd, "project"), JSON.stringify({ schemaVersion: 2 }));
    assert.throws(() => readSkillsMeta(cwd, "project"), /not a schemaVersion 1 metadata file/);
  });
});
