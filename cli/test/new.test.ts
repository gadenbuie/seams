import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { parseFrontmatter } from "../src/docs/frontmatter.ts";
import { copyFixture } from "./helpers.ts";

const CLI = path.resolve(import.meta.dirname, "..", "src", "cli.ts");

interface NewJson {
  schemaVersion: number;
  command: string;
  path: string;
  number?: number;
}

function run(args: string[], cwd: string) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
}

/** Today's date in the local time zone, as the command writes it. */
function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Every file under `dir`, with repo-relative paths and byte sizes, skipping `skip` subfolder names. */
function snapshot(dir: string, skip: string[] = []): Map<string, number> {
  const files = new Map<string, number>();
  const walk = (relative: string): void => {
    const absolute = path.join(dir, relative);
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      if (entry.isDirectory() && skip.includes(entry.name)) continue;
      const child = relative === "" ? entry.name : path.join(relative, entry.name);
      if (entry.isDirectory()) walk(child);
      else files.set(child.split(path.sep).join("/"), statSync(absolute).size);
    }
  };
  walk("");
  return files;
}

describe("seams new proposal", () => {
  it("numbers past gaps and fills the template fields", () => {
    const cwd = copyFixture("new-project");
    const result = run(["new", "proposal", "try-it", "--json"], cwd);
    assert.equal(result.status, 0);
    const json = JSON.parse(result.stdout) as NewJson;
    assert.equal(json.schemaVersion, 1);
    assert.equal(json.command, "new");
    assert.equal(json.path, ".agents/proposals/0004-try-it.md");
    assert.equal(json.number, 4);

    const file = path.join(cwd, ".agents/proposals/0004-try-it.md");
    const { data } = parseFrontmatter(readFileSync(file, "utf8"));
    assert.equal(data.title, "Try It");
    assert.equal(data.description, "TODO: say when to read this document");
    assert.equal(data.status, "draft");
    assert.equal(data.created, todayLocal());
    assert.match(readFileSync(file, "utf8"), /^# Proposal: Try It$/m);
  });

  it("accepts a custom title and description", () => {
    const cwd = copyFixture("new-project");
    const result = run(
      [
        "new", "proposal", "try-it",
        "--title", "A strange title: with a colon",
        "--description", 'Says "when" to read it',
      ],
      cwd,
    );
    assert.equal(result.status, 0);
    const { data } = parseFrontmatter(
      readFileSync(path.join(cwd, ".agents/proposals/0004-try-it.md"), "utf8"),
    );
    assert.equal(data.title, "A strange title: with a colon");
    assert.equal(data.description, 'Says "when" to read it');
  });

  it("stops when an open proposal shares more than half of the slug's words", () => {
    const cwd = copyFixture("new-project");
    // "framework" is one content word of 0001's title and slug.
    const result = run(["new", "proposal", "framework"], cwd);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Similar open proposals already exist/);
    assert.match(result.stderr, /0001-unified-framework\.md/);
    assert.ok(!existsSync(path.join(cwd, ".agents/proposals/0004-framework.md")));

    // "npm-cli" shares both of its content words with 0003's slug and title.
    const npm = run(["new", "proposal", "npm-cli"], cwd);
    assert.equal(npm.status, 1);
    assert.match(npm.stderr, /0003-npm-cli\.md/);
  });

  it("ignores withdrawn and rejected proposals in the similarity check", () => {
    const cwd = copyFixture("new-project");
    // 0002-old-thing is withdrawn, so its words do not block the new slug.
    const result = run(["new", "proposal", "thing"], cwd);
    assert.equal(result.status, 0);
    assert.equal(existsSync(path.join(cwd, ".agents/proposals/0004-thing.md")), true);
  });

  it("creates the proposal with --force despite a similar open one", () => {
    const cwd = copyFixture("new-project");
    const result = run(["new", "proposal", "framework", "--force"], cwd);
    assert.equal(result.status, 0);
    assert.equal(
      existsSync(path.join(cwd, ".agents/proposals/0004-framework.md")),
      true,
    );
  });

  it("writes the next number instead of overwriting an existing file", () => {
    const cwd = copyFixture("new-project");
    const existing = path.join(cwd, ".agents/proposals/0004-try-it.md");
    const before = "# kept\n";
    writeFileSync(existing, before);
    const result = run(["new", "proposal", "try-it"], cwd);
    assert.equal(result.status, 0);
    assert.equal(readFileSync(existing, "utf8"), before);
    assert.equal(existsSync(path.join(cwd, ".agents/proposals/0005-try-it.md")), true);
  });

  it("refuses to overwrite an existing plan or overview", () => {
    const cwd = copyFixture("new-project");
    for (const name of readdirSync(path.join(cwd, ".agents/plans"))) {
      rmSync(path.join(cwd, ".agents/plans", name));
    }
    const plan = path.join(cwd, ".agents/plans/my-plan.md");
    writeFileSync(plan, "# kept\n");
    const planResult = run(["new", "plan", "my-plan"], cwd);
    assert.equal(planResult.status, 1);
    assert.match(planResult.stderr, /Refusing to overwrite/);
    assert.equal(readFileSync(plan, "utf8"), "# kept\n");

    const overview = path.join(cwd, "docs/design/overviews/system.md");
    writeFileSync(overview, "# kept\n");
    const overviewResult = run(["new", "overview", "system"], cwd);
    assert.equal(overviewResult.status, 1);
    assert.match(overviewResult.stderr, /Refusing to overwrite/);
    assert.equal(readFileSync(overview, "utf8"), "# kept\n");
  });

  it("starts at 0001 when the proposals home has no files", () => {
    const cwd = copyFixture("new-custom");
    const result = run(["new", "proposal", "first-one", "--json"], cwd);
    assert.equal(result.status, 0);
    const json = JSON.parse(result.stdout) as NewJson;
    assert.equal(json.path, "docs/notes/proposals/0001-first-one.md");
    assert.equal(json.number, 1);
    assert.equal(existsSync(path.join(cwd, "docs/notes/proposals")), true);
  });
});

describe("seams new plan", () => {
  it("follows the numbering a plans home already uses", () => {
    const cwd = copyFixture("new-project");
    const result = run(["new", "plan", "my-plan", "--json"], cwd);
    assert.equal(result.status, 0);
    const json = JSON.parse(result.stdout) as NewJson;
    assert.equal(json.path, ".agents/plans/0002-my-plan.md");
    assert.equal(json.number, 2);
    const { data } = parseFrontmatter(
      readFileSync(path.join(cwd, ".agents/plans/0002-my-plan.md"), "utf8"),
    );
    assert.equal(data.title, "My Plan");
    assert.equal(data.status, "draft");
    assert.equal(data.created, todayLocal());
    assert.match(readFileSync(path.join(cwd, ".agents/plans/0002-my-plan.md"), "utf8"), /^# Plan: My Plan$/m);
  });

  it("uses a plain slug name when the plans home has no files", () => {
    const cwd = copyFixture("new-project");
    for (const name of readdirSync(path.join(cwd, ".agents/plans"))) {
      rmSync(path.join(cwd, ".agents/plans", name));
    }
    const result = run(["new", "plan", "my-plan"], cwd);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /\.agents\/plans\/my-plan\.md/);
  });
});

describe("seams new overview", () => {
  it("creates the minimal document and reminds about the index", () => {
    const cwd = copyFixture("new-project");
    const indexBefore = readFileSync(path.join(cwd, "docs/design/overviews/index.md"), "utf8");
    const result = run(["new", "overview", "alpha", "--json"], cwd);
    assert.equal(result.status, 0);
    const json = JSON.parse(result.stdout) as NewJson;
    assert.equal(json.path, "docs/design/overviews/alpha.md");
    assert.equal(json.number, undefined);
    const file = readFileSync(path.join(cwd, "docs/design/overviews/alpha.md"), "utf8");
    const { data } = parseFrontmatter(file);
    assert.equal(data.title, "Alpha");
    assert.equal(data.description, "TODO: say when to read this document");
    assert.match(file, /^# Alpha$/m);
    assert.match(result.stderr, /index needs an entry/);
    assert.equal(readFileSync(path.join(cwd, "docs/design/overviews/index.md"), "utf8"), indexBefore);
  });

  it("appends exactly one index line with --update-index", () => {
    const cwd = copyFixture("new-project");
    const result = run(["new", "overview", "beta", "--update-index"], cwd);
    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    const index = readFileSync(path.join(cwd, "docs/design/overviews/index.md"), "utf8");
    assert.ok(index.endsWith("- [beta.md](beta.md)\n"));
    const lineCount = index.split("\n").length;
    const fixtureIndex = readFileSync(
      path.resolve(import.meta.dirname, "fixtures", "new-project", "docs/design/overviews/index.md"),
      "utf8",
    );
    assert.equal(index.slice(0, index.length - "- [beta.md](beta.md)\n".length), fixtureIndex);
    assert.equal(lineCount, fixtureIndex.split("\n").length + 1);
  });
});

describe("seams new safety", () => {
  it("exits 2 on an invalid slug, a missing slug, or an unknown type", () => {
    const cwd = copyFixture("new-project");
    for (const args of [
      ["new", "proposal", "Bad Slug"],
      ["new", "proposal", "x_y"],
      ["new", "proposal", "-x"],
      ["new", "proposal", "x-"],
      ["new", "proposal"],
      ["new", "widget", "x"],
    ]) {
      const result = run(args, cwd);
      assert.equal(result.status, 2, `expected exit 2 for ${args.join(" ")}`);
      assert.match(result.stderr, /Usage: seams new/);
    }
  });

  it("leaves every canon file byte-identical", () => {
    const cwd = copyFixture("new-project");
    const before = snapshot(path.join(cwd, "docs/design"), ["overviews"]);
    for (const args of [
      ["new", "proposal", "try-it"],
      ["new", "plan", "try-it"],
      ["new", "overview", "try-it", "--update-index"],
    ]) {
      assert.equal(run(args, cwd).status, 0);
    }
    assert.deepEqual(snapshot(path.join(cwd, "docs/design"), ["overviews"]), before);
  });

  it("creates documents in the homes a custom manifest names", () => {
    const cwd = copyFixture("new-custom");
    assert.equal(run(["new", "plan", "first-plan"], cwd).status, 0);
    assert.equal(existsSync(path.join(cwd, "docs/notes/plans/first-plan.md")), true);
    assert.equal(run(["new", "overview", "first-overview", "--update-index"], cwd).status, 0);
    assert.equal(existsSync(path.join(cwd, "docs/notes/overviews/first-overview.md")), true);
    assert.equal(
      existsSync(path.join(cwd, "docs/notes/overviews/index.md")),
      true,
    );
    const index = readFileSync(path.join(cwd, "docs/notes/overviews/index.md"), "utf8");
    assert.equal(index, "- [first-overview.md](first-overview.md)\n");
  });
});
