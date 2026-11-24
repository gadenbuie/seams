import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";
import {
  MANIFEST_RELATIVE_PATH,
  ManifestError,
  findRoot,
  loadProject,
  schemaFilePath,
} from "../src/config.ts";
import { copyFixture } from "./helpers.ts";

const cleanups: Array<() => void> = [];
after(() => {
  for (const fn of cleanups) fn();
});

function tempProject(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "seams-config-"));
  cleanups.push(() => rmRf(dir));
  return dir;
}

function rmRf(dir: string): void {
  try {
    // node:fs rmSync is fine here; keep the import surface small.
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* best effort cleanup */
  }
}

describe("findRoot", () => {
  it("returns the nearest directory with a manifest", () => {
    const project = copyFixture("custom");
    const nested = path.join(project, "docs", "design", "overviews");
    mkdirSync(nested, { recursive: true });
    assert.equal(findRoot(nested), project);
  });

  it("prefers a nearer manifest over a farther one", () => {
    const outer = tempProject();
    mkdirSync(path.join(outer, "outer", ".agents"), { recursive: true });
    writeFileSync(
      path.join(outer, "outer", ".agents", "seams.json"),
      JSON.stringify({ schemaVersion: 1, seamsVersion: "0.1.0" }),
    );
    mkdirSync(path.join(outer, "outer", "inner", ".agents"), { recursive: true });
    writeFileSync(
      path.join(outer, "outer", "inner", ".agents", "seams.json"),
      JSON.stringify({ schemaVersion: 1, seamsVersion: "0.2.0" }),
    );
    assert.equal(findRoot(path.join(outer, "outer", "inner")), path.join(outer, "outer", "inner"));
  });

  it("falls back to the nearest .git directory", () => {
    const project = tempProject();
    mkdirSync(path.join(project, ".git"), { recursive: true });
    const nested = path.join(project, "src", "cli");
    mkdirSync(nested, { recursive: true });
    assert.equal(findRoot(nested), project);
  });

  it("returns the cwd when neither a manifest nor .git exists", () => {
    const dir = tempProject();
    assert.equal(findRoot(dir), dir);
  });
});

describe("loadProject, conventional layout", () => {
  it("uses the default homes when docs/design exists", () => {
    const project = copyFixture("default");
    const project2 = loadProject(project);
    assert.equal(project2.source, "conventional");
    assert.equal(project2.manifest, undefined);
    assert.deepEqual(relative(project2), {
      design: "docs/design",
      overviews: "docs/design/overviews",
      proposals: ".agents/proposals",
      plans: ".agents/plans",
    });
  });

  it("falls back to .agents/design when docs/design is absent", () => {
    const project = copyFixture("agents-design");
    const loaded = loadProject(project);
    assert.equal(loaded.source, "conventional");
    assert.deepEqual(relative(loaded), {
      design: ".agents/design",
      overviews: ".agents/design/overviews",
      proposals: ".agents/proposals",
      plans: ".agents/plans",
    });
  });
});

describe("loadProject, manifest", () => {
  it("accepts the proposal's example manifest", () => {
    const project = copyFixture("example");
    const loaded = loadProject(project);
    assert.equal(loaded.source, "manifest");
    assert.deepEqual(relative(loaded), {
      design: "docs/design",
      overviews: "docs/design/overviews",
      proposals: ".agents/proposals",
      plans: ".agents/plans",
    });
    assert.equal(loaded.manifest?.reconcile?.lastReconciledRevision, null);
  });

  it("lets manifest paths override the defaults per key", () => {
    const project = copyFixture("custom");
    const loaded = loadProject(project);
    assert.equal(loaded.source, "manifest");
    assert.deepEqual(relative(loaded), {
      design: "handbook/design",
      overviews: "handbook/design/overviews",
      proposals: ".agents/proposals",
      plans: ".agents/plans",
    });
  });

  it("resolves paths to absolute locations inside the root", () => {
    const project = copyFixture("custom");
    const loaded = loadProject(project);
    assert.equal(loaded.paths.design, path.join(project, "handbook", "design"));
  });

  it("rejects malformed JSON with a ManifestError", () => {
    const project = copyFixture("malformed");
    assert.throws(() => loadProject(project), (error: unknown) => {
      assert.ok(error instanceof ManifestError);
      assert.match(error.message, /not valid JSON/);
      return true;
    });
  });

  it("rejects a schema-invalid manifest and lists each problem", () => {
    const project = tempProject();
    mkdirSync(path.join(project, ".agents"), { recursive: true });
    writeFileSync(
      path.join(project, MANIFEST_RELATIVE_PATH),
      JSON.stringify({
        schemaVersion: 2,
        seamsVersion: 1,
        surprise: true,
        paths: { design: 7 },
      }),
    );
    assert.throws(() => loadProject(project), (error: unknown) => {
      assert.ok(error instanceof ManifestError);
      assert.match(error.message, /schemaVersion/);
      assert.match(error.message, /seamsVersion/);
      assert.match(error.message, /surprise/);
      assert.match(error.message, /paths\/design/);
      return true;
    });
  });

  it("rejects a path with a .. segment", () => {
    const project = copyFixture("escaping");
    assert.throws(() => loadProject(project), (error: unknown) => {
      assert.ok(error instanceof ManifestError);
      assert.match(error.message, /\.\./);
      assert.match(error.message, /paths\.design/);
      return true;
    });
  });

  it("rejects an absolute path", () => {
    const project = copyFixture("escaping");
    assert.throws(() => loadProject(project), (error: unknown) => {
      assert.ok(error instanceof ManifestError);
      assert.match(error.message, /paths\.plans/);
      return true;
    });
  });
});

describe("schemaFilePath", () => {
  it("names an existing bundled schema file", () => {
    assert.ok(existsSync(schemaFilePath()));
    assert.match(schemaFilePath(), /schemas[\\/]v1[\\/]seams\.schema\.json$/);
  });
});

function relative(project: ReturnType<typeof loadProject>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(project.paths)) {
    out[key] = path.relative(project.root, value);
  }
  return out;
}
