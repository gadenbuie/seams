/**
 * Tests for the skill-folder content hash.
 */
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import { skillFolderHash } from "../src/skills/hash.ts";

/** Make a one-skill source dir and return its skill folder path. */
function skillDir(files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(tmpdir(), "seams-hash-"));
  for (const [rel, content] of Object.entries(files)) {
    const file = path.join(dir, rel);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  return dir;
}

describe("skillFolderHash", () => {
  const dirs: string[] = [];
  after(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });
  const track = (dir: string): string => {
    dirs.push(dir);
    return dir;
  };

  it("hashes the path, length, and content of each file", () => {
    const a = track(skillDir({ "SKILL.md": "one\n", "refs/x.md": "two\n" }));
    const b = track(skillDir({ "SKILL.md": "one\n", "refs/x.md": "two\n" }));
    assert.equal(skillFolderHash(a), skillFolderHash(b));
  });

  it("changes when content changes", () => {
    const a = track(skillDir({ "SKILL.md": "one\n" }));
    const b = track(skillDir({ "SKILL.md": "ONE\n" }));
    assert.notEqual(skillFolderHash(a), skillFolderHash(b));
  });

  it("changes when the file list changes", () => {
    const a = track(skillDir({ "SKILL.md": "one\n", "refs/x.md": "two\n" }));
    const b = track(skillDir({ "SKILL.md": "one\n", "refs/y.md": "two\n" }));
    assert.notEqual(skillFolderHash(a), skillFolderHash(b));
  });

  it("treats CRLF and LF copies as identical (normalization is hash-only)", () => {
    const a = track(skillDir({ "SKILL.md": "---\nname: x\n---\n\n# X\r\nbody\r\n" }));
    const b = track(skillDir({ "SKILL.md": "---\nname: x\n---\n\n# X\nbody\n" }));
    assert.equal(skillFolderHash(a), skillFolderHash(b));
    // The bytes on disk really do differ; only the hash normalizes them.
    assert.notEqual(readFileSync(path.join(a, "SKILL.md"), "utf8"), readFileSync(path.join(b, "SKILL.md"), "utf8"));
  });

  it("excludes metadata.json files (the library drops them on copy)", () => {
    const a = track(skillDir({ "SKILL.md": "one\n", "metadata.json": '{"x":1}' }));
    const b = track(skillDir({ "SKILL.md": "one\n" }));
    assert.equal(skillFolderHash(a), skillFolderHash(b));
  });

  it("excludes .git, __pycache__, and __pypackages__ directories", () => {
    const a = track(skillDir({
      "SKILL.md": "one\n",
      ".git/config": "git",
      "__pycache__/x.pyc": "pyc",
      "__pypackages__/x.py": "py",
    }));
    const b = track(skillDir({ "SKILL.md": "one\n" }));
    assert.equal(skillFolderHash(a), skillFolderHash(b));
  });

  it("includes files in subdirectories by their `/`-separated path", () => {
    const a = track(skillDir({ "SKILL.md": "one\n", "references/notes.md": "n\n", "references/deep/d.md": "d\n" }));
    const b = track(skillDir({ "SKILL.md": "one\n", "references/notes.md": "n\n" }));
    assert.notEqual(skillFolderHash(a), skillFolderHash(b));
  });

  it("resolves symlinks that stay inside the skill root", () => {
    const dir = track(skillDir({ "SKILL.md": "one\n", "real.md": "real\n" }));
    symlinkSync("real.md", path.join(dir, "alias.md"));
    const same = track(skillDir({ "SKILL.md": "one\n", "real.md": "real\n", "alias.md": "real\n" }));
    assert.equal(skillFolderHash(dir), skillFolderHash(same));
  });

  it("excludes symlinks that resolve outside the skill root", () => {
    const dir = track(skillDir({ "SKILL.md": "one\n" }));
    const outside = track(skillDir({ "secret.md": "outside\n" }));
    symlinkSync(path.join(outside, "secret.md"), path.join(dir, "leak.md"));
    const plain = track(skillDir({ "SKILL.md": "one\n" }));
    assert.equal(skillFolderHash(dir), skillFolderHash(plain));
  });
});
