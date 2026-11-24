/**
 * The destination-table matrix for `seams skills check` and `update`: every
 * reachable combination of what sits at a recorded destination's content
 * path and link path, and how each hashes against the record, classified
 * through the real code on a real project, with update's repair/skip
 * selection asserted per row.
 *
 * The two open roborev 2577 findings are rows here, with real-update
 * assertions: a shared folder deleted behind an edited real folder at the
 * link path is never an update target, and a regular file at either path
 * classifies without throwing.
 *
 * All runs are in process, in temporary project directories, project scope
 * only (no home path is read for project-scope destinations), against the
 * fixture bundles in test/fixtures/ — no test touches the operator's real
 * agent settings or home directory, and no test sends telemetry.
 */
import assert from "node:assert/strict";
import {
  cpSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { checkSkills, DESTINATION_TABLE, updateSkills } from "../src/skills/check.ts";
import { installSkills } from "../src/skills/install.ts";
import type { AgentId, InstallMode } from "../src/skills/install.ts";
import { skillFolderHash } from "../src/skills/hash.ts";

const FIXTURE_V1 = path.join(import.meta.dirname, "fixtures", "skills-v1");
const FIXTURE_V2 = path.join(import.meta.dirname, "fixtures", "skills-v2");
const ORIENT = "seams-orient";

/** A temporary working directory, in real-path form. */
function tempProject(): string {
  return realpathSync(mkdtempSync(path.join(tmpdir(), "seams-matrix-")));
}

/** What replaces the installed content folder at the canonical path. */
type ContentOp =
  | "keep" // the installed folder, equal to the record
  | "edit" // the installed folder, hand-edited: different from the record
  | "remove" // nothing at the content path
  | "file" // a regular file at the content path
  | "symlink-v1" // a symlink to the version 1 fixture: hashable, equal
  | "symlink-v2"; // a symlink to the version 2 fixture: hashable, different

/** What replaces the agent's symlink at the link path (claude-code only). */
type LinkOp =
  | "none" // the destination has no link path (universal agents, copy mode)
  | "keep" // the installed symlink
  | "remove" // nothing at the link path
  | "file" // a regular file at the link path
  | "dir-v1" // a real folder equal to the record
  | "dir-edit"; // a real folder hand-edited: different from the record

interface MatrixCase {
  /** The table row the setup produces: `<content>|<link>|<content hash>|<link hash>`. */
  key: string;
  mode: InstallMode;
  agent: AgentId;
  content: ContentOp;
  link: LinkOp;
  /** The classification against the installing version (v1 == the record). */
  v1: string;
  /** The classification against version 2 of the bundle. */
  v2: string;
  /** Run a real update against v2 and assert nothing is written ("kept"), or against v1 and assert the lossless conversion ("conversion"). */
  realUpdate?: "kept" | "conversion";
}

const MATRIX: MatrixCase[] = [
  // No link path of the destination's own: copy mode (pi), then symlink
  // mode's universal agent (pi), whose content path is the canonical folder.
  { key: "absent|none|n/a|n/a", mode: "copy", agent: "pi", content: "remove", link: "none", v1: "missing", v2: "missing" },
  // roborev 2577, finding 2 (the content path half): a regular file where
  // the recorded folder belongs classifies, it is kept, and a real update
  // never deletes it.
  { key: "file|none|n/a|n/a", mode: "copy", agent: "pi", content: "file", link: "none", v1: "modified", v2: "divergent", realUpdate: "kept" },
  { key: "symlink|none|n/a|n/a", mode: "copy", agent: "pi", content: "symlink-v1", link: "none", v1: "missing", v2: "missing" },
  { key: "directory|none|equal|n/a", mode: "copy", agent: "pi", content: "keep", link: "none", v1: "ok", v2: "outdated" },
  { key: "directory|none|different|n/a", mode: "copy", agent: "pi", content: "edit", link: "none", v1: "modified", v2: "divergent" },
  { key: "symlink|none|equal|n/a", mode: "symlink", agent: "pi", content: "symlink-v1", link: "none", v1: "ok", v2: "outdated" },
  { key: "symlink|none|different|n/a", mode: "symlink", agent: "pi", content: "symlink-v2", link: "none", v1: "modified", v2: "divergent" },

  // Symlink mode, non-universal agent (claude-code): the content path is the
  // shared canonical folder, the link path is claude's own. Content absent:
  { key: "absent|symlink|n/a|n/a", mode: "symlink", agent: "claude-code", content: "remove", link: "keep", v1: "missing", v2: "missing" },
  { key: "absent|absent|n/a|n/a", mode: "symlink", agent: "claude-code", content: "remove", link: "remove", v1: "missing", v2: "missing" },
  { key: "absent|file|n/a|n/a", mode: "symlink", agent: "claude-code", content: "remove", link: "file", v1: "modified", v2: "divergent" },
  { key: "absent|directory|n/a|equal", mode: "symlink", agent: "claude-code", content: "remove", link: "dir-v1", v1: "missing", v2: "missing", realUpdate: "conversion" },
  // roborev 2577, finding 1: the shared folder is gone and a hand-edited
  // real folder sits where claude's link belongs — never an update target,
  // or the library would recreate the shared folder and replace the edit.
  { key: "absent|directory|n/a|different", mode: "symlink", agent: "claude-code", content: "remove", link: "dir-edit", v1: "modified", v2: "divergent", realUpdate: "kept" },
  // Content is a regular file (roborev 2577, finding 2):
  { key: "file|symlink|n/a|n/a", mode: "symlink", agent: "claude-code", content: "file", link: "keep", v1: "modified", v2: "divergent", realUpdate: "kept" },
  { key: "file|absent|n/a|n/a", mode: "symlink", agent: "claude-code", content: "file", link: "remove", v1: "modified", v2: "divergent" },
  { key: "file|file|n/a|n/a", mode: "symlink", agent: "claude-code", content: "file", link: "file", v1: "modified", v2: "divergent" },
  { key: "file|directory|n/a|equal", mode: "symlink", agent: "claude-code", content: "file", link: "dir-v1", v1: "modified", v2: "divergent" },
  { key: "file|directory|n/a|different", mode: "symlink", agent: "claude-code", content: "file", link: "dir-edit", v1: "modified", v2: "divergent" },
  // Content is a symlink (hashed through when it resolves):
  { key: "symlink|symlink|equal|n/a", mode: "symlink", agent: "claude-code", content: "symlink-v1", link: "keep", v1: "ok", v2: "outdated" },
  { key: "symlink|absent|equal|n/a", mode: "symlink", agent: "claude-code", content: "symlink-v1", link: "remove", v1: "missing", v2: "missing" },
  // roborev 2577, finding 2 (the link path half): a regular file where
  // claude's symlink belongs classifies, it is kept, and a real update
  // never deletes it.
  { key: "symlink|file|equal|n/a", mode: "symlink", agent: "claude-code", content: "symlink-v1", link: "file", v1: "modified", v2: "divergent", realUpdate: "kept" },
  { key: "symlink|directory|equal|equal", mode: "symlink", agent: "claude-code", content: "symlink-v1", link: "dir-v1", v1: "missing", v2: "missing" },
  { key: "symlink|directory|equal|different", mode: "symlink", agent: "claude-code", content: "symlink-v1", link: "dir-edit", v1: "modified", v2: "divergent" },
  { key: "symlink|symlink|different|n/a", mode: "symlink", agent: "claude-code", content: "symlink-v2", link: "keep", v1: "modified", v2: "divergent" },
  { key: "symlink|absent|different|n/a", mode: "symlink", agent: "claude-code", content: "symlink-v2", link: "remove", v1: "modified", v2: "divergent" },
  { key: "symlink|file|different|n/a", mode: "symlink", agent: "claude-code", content: "symlink-v2", link: "file", v1: "modified", v2: "divergent" },
  { key: "symlink|directory|different|equal", mode: "symlink", agent: "claude-code", content: "symlink-v2", link: "dir-v1", v1: "modified", v2: "divergent" },
  { key: "symlink|directory|different|different", mode: "symlink", agent: "claude-code", content: "symlink-v2", link: "dir-edit", v1: "modified", v2: "divergent" },
  // Content is a directory, the recorded shape:
  { key: "directory|symlink|equal|n/a", mode: "symlink", agent: "claude-code", content: "keep", link: "keep", v1: "ok", v2: "outdated" },
  { key: "directory|absent|equal|n/a", mode: "symlink", agent: "claude-code", content: "keep", link: "remove", v1: "missing", v2: "missing" },
  { key: "directory|file|equal|n/a", mode: "symlink", agent: "claude-code", content: "keep", link: "file", v1: "modified", v2: "divergent", realUpdate: "kept" },
  { key: "directory|directory|equal|equal", mode: "symlink", agent: "claude-code", content: "keep", link: "dir-v1", v1: "missing", v2: "missing" },
  // roborev 2576, finding 2, still pinned: a hand-edited real folder at the
  // link path is kept.
  { key: "directory|directory|equal|different", mode: "symlink", agent: "claude-code", content: "keep", link: "dir-edit", v1: "modified", v2: "divergent" },
  { key: "directory|symlink|different|n/a", mode: "symlink", agent: "claude-code", content: "edit", link: "keep", v1: "modified", v2: "divergent" },
  // roborev 2576, finding 1, still pinned: an edited shared folder is kept
  // even when claude's link is gone.
  { key: "directory|absent|different|n/a", mode: "symlink", agent: "claude-code", content: "edit", link: "remove", v1: "modified", v2: "divergent" },
  { key: "directory|file|different|n/a", mode: "symlink", agent: "claude-code", content: "edit", link: "file", v1: "modified", v2: "divergent" },
  { key: "directory|directory|different|equal", mode: "symlink", agent: "claude-code", content: "edit", link: "dir-v1", v1: "modified", v2: "divergent" },
  { key: "directory|directory|different|different", mode: "symlink", agent: "claude-code", content: "edit", link: "dir-edit", v1: "modified", v2: "divergent" },
];

function contentPath(project: string): string {
  return path.join(project, ".agents", "skills", ORIENT);
}

function linkPath(project: string): string {
  return path.join(project, ".claude", "skills", ORIENT);
}

function applyContent(project: string, op: ContentOp): void {
  const content = contentPath(project);
  switch (op) {
    case "keep":
      return;
    case "edit": {
      const file = path.join(content, "SKILL.md");
      writeFileSync(file, readFileSync(file, "utf8") + "\n<!-- matrix edit -->\n");
      return;
    }
    case "remove":
      rmSync(content, { recursive: true, force: true });
      return;
    case "file":
      rmSync(content, { recursive: true, force: true });
      writeFileSync(content, "not a skill folder\n");
      return;
    case "symlink-v1":
    case "symlink-v2": {
      rmSync(content, { recursive: true, force: true });
      const target = path.join(op === "symlink-v1" ? FIXTURE_V1 : FIXTURE_V2, ORIENT);
      symlinkSync(target, content);
      return;
    }
  }
}

function applyLink(project: string, op: LinkOp): void {
  if (op === "none" || op === "keep") return;
  const link = linkPath(project);
  rmSync(link, { recursive: true, force: true });
  switch (op) {
    case "remove":
      return;
    case "file":
      writeFileSync(link, "not a skill folder\n");
      return;
    case "dir-v1":
      cpSync(path.join(FIXTURE_V1, ORIENT), link, { recursive: true });
      return;
    case "dir-edit": {
      cpSync(path.join(FIXTURE_V1, ORIENT), link, { recursive: true });
      const file = path.join(link, "SKILL.md");
      writeFileSync(file, readFileSync(file, "utf8") + "\n<!-- matrix edit -->\n");
      return;
    }
  }
}

/** A stable description of what sits at a destination path. */
function pathState(target: string): string {
  let stats;
  try {
    stats = lstatSync(target);
  } catch {
    return "absent";
  }
  if (stats.isSymbolicLink()) {
    try {
      return `symlink:${realpathSync(target)}`;
    } catch {
      return "symlink:broken";
    }
  }
  if (stats.isFile()) return `file:${readFileSync(target, "utf8")}`;
  return `folder:${skillFolderHash(target)}`;
}

/** Everything a run must not change without saying so. */
function fingerprint(project: string, hasLink: boolean): Record<string, string> {
  const snap: Record<string, string> = {
    content: pathState(contentPath(project)),
    meta: readFileSync(path.join(project, ".agents", "seams-skills.json"), "utf8"),
  };
  if (hasLink) snap.link = pathState(linkPath(project));
  return snap;
}

/** Assert update's dry-run selection for `state` against one bundle. */
async function expectDry(project: string, agent: AgentId, sourceDir: string, state: string): Promise<void> {
  const dry = await updateSkills({ cwd: project, scope: "project", sourceDir, dryRun: true });
  if (state === "ok") {
    assert.deepEqual(dry.targets, [], `${state}: no targets`);
    assert.deepEqual(dry.kept, [], `${state}: nothing kept`);
  } else if (state === "outdated" || state === "missing") {
    assert.deepEqual(
      dry.targets.map((t) => [t.skill, t.agent, t.reason, t.action]),
      [[ORIENT, agent, state, "planned"]],
      `${state}: one planned target`,
    );
    assert.deepEqual(dry.kept, [], `${state}: nothing kept`);
  } else {
    assert.deepEqual(dry.targets, [], `${state}: never an update target`);
    assert.deepEqual(
      dry.kept.map((e) => [e.skill, e.agent, e.state]),
      [[ORIENT, agent, state]],
      `${state}: kept for manual reconciliation`,
    );
  }
}

async function runCase(c: MatrixCase): Promise<void> {
  const project = tempProject();
  try {
    await installSkills({
      cwd: project,
      scope: "project",
      mode: c.mode,
      agents: [c.agent],
      skills: [ORIENT],
      sourceDir: FIXTURE_V1,
    });
    applyContent(project, c.content);
    applyLink(project, c.link);

    // Classification against the installing version and against version 2.
    // The entry set is exactly the one recorded destination: nothing the
    // setup placed may leak into the untracked scan.
    const v1 = await checkSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V1 });
    assert.deepEqual(
      v1.entries.map((e) => [e.skill, e.agent, e.state]),
      [[ORIENT, c.agent, c.v1]],
      `${c.key}: classification against v1`,
    );
    assert.equal(
      v1.entries[0].path,
      c.agent === "claude-code" ? linkPath(project) : contentPath(project),
      `${c.key}: reports the agent's own path`,
    );
    const v2 = await checkSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V2 });
    assert.equal(v2.entries[0].state, c.v2, `${c.key}: classification against v2`);

    // Update's repair/skip selection for both bundle relations, and the dry
    // runs write nothing.
    const before = fingerprint(project, c.link !== "none");
    await expectDry(project, c.agent, FIXTURE_V1, c.v1);
    await expectDry(project, c.agent, FIXTURE_V2, c.v2);
    assert.deepEqual(fingerprint(project, c.link !== "none"), before, `${c.key}: dry runs wrote nothing`);

    if (c.realUpdate === "conversion") {
      // The shared folder is gone; a byte-identical real folder sits at the
      // link path. The repair recreates the shared folder and converts the
      // folder into the link again, losing nothing.
      const real = await updateSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V1 });
      assert.deepEqual(
        real.targets.map((t) => [t.skill, t.agent, t.reason, t.action]),
        [[ORIENT, c.agent, "missing", "updated"]],
        `${c.key}: conversion runs`,
      );
      assert.ok(lstatSync(linkPath(project)).isSymbolicLink(), `${c.key}: the folder became the link`);
      assert.equal(
        skillFolderHash(contentPath(project)),
        skillFolderHash(path.join(FIXTURE_V1, ORIENT)),
        `${c.key}: the recreated folder holds the bytes the link folder had`,
      );
    } else if (c.realUpdate === "kept") {
      // A real update against the newer bundle must leave every placed
      // artifact byte for byte as it is (roborev 2577's loss scenarios).
      const real = await updateSkills({ cwd: project, scope: "project", sourceDir: FIXTURE_V2 });
      assert.deepEqual(real.targets, [], `${c.key}: a real update targets nothing`);
      assert.equal(real.metaUpdated, false, `${c.key}: metadata is not rewritten`);
      assert.deepEqual(
        real.kept.map((e) => [e.skill, e.agent, e.state]),
        [[ORIENT, c.agent, "divergent"]],
        `${c.key}: kept for manual reconciliation`,
      );
      assert.deepEqual(fingerprint(project, c.link !== "none"), before, `${c.key}: nothing was written`);
    }
  } finally {
    rmSync(project, { recursive: true, force: true });
  }
}

describe("destination table matrix", () => {
  const keysHit = new Set<string>();
  for (const c of MATRIX) {
    it(c.key, async () => {
      await runCase(c);
      keysHit.add(c.key);
    });
  }

  it("covers every row of the destination table", () => {
    // Every reachable combination is a case above, and every case's key is
    // a table row: the matrix and the table have the same keys.
    assert.deepEqual([...keysHit].sort(), Object.keys(DESTINATION_TABLE).sort());
  });

  it("no two matrix cases hit the same row", () => {
    assert.equal(new Set(MATRIX.map((c) => c.key)).size, MATRIX.length);
  });
});
