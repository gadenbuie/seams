import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import { copyFixture } from "./helpers.ts";

const CLI = path.resolve(import.meta.dirname, "..", "src", "cli.ts");

interface FoundResult {
  path: string;
  heading: string | null;
  line: number;
  excerpt: string;
  authority: string;
}

interface FoundJson {
  schemaVersion: number;
  command: string;
  query: string;
  results: FoundResult[];
  excluded: number;
  truncated: boolean;
  omitted: number;
  warnings: string[];
}

function run(args: string[], cwd: string) {
  return spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8" });
}

function findJson(args: string[], cwd: string): { status: number | null; json: FoundJson } {
  const result = run(["find", ...args, "--json"], cwd);
  return { status: result.status, json: JSON.parse(result.stdout) as FoundJson };
}

/** The expected ranking of `find authority` on the find-project fixture. */
const AUTHORITY_ORDER = [
  { path: "docs/design/authority.md", heading: "Authority", line: 5 },
  { path: "docs/design/overviews/system.md", heading: "System overview", line: 7 },
  { path: "docs/design/canon.md", heading: "Canon rules", line: 7 },
  { path: ".agents/plans/plan-done.md", heading: null, line: 7 },
  { path: ".agents/plans/plan-done.md", heading: "Steps", line: 11 },
  { path: ".agents/proposals/0001-accepted.md", heading: "Accepted proposal", line: 9 },
];

describe("seams find", () => {
  it("finds matches in every type and labels their authority", () => {
    const cwd = copyFixture("find-project");
    const { status, json } = findJson(["authority"], cwd);
    assert.equal(status, 0);
    assert.equal(json.schemaVersion, 1);
    assert.equal(json.command, "find");
    assert.equal(json.query, "authority");
    assert.deepEqual(
      json.results.map((result) => [result.path, result.heading, result.line]),
      AUTHORITY_ORDER.map((expected) => [expected.path, expected.heading, expected.line]),
    );
    const byPath = (p: string) => json.results.filter((result) => result.path === p);
    assert.deepEqual(
      byPath("docs/design/authority.md").map((result) => result.authority),
      ["canon"],
    );
    assert.deepEqual(
      byPath("docs/design/overviews/system.md").map((result) => result.authority),
      ["memory (verify against code)"],
    );
    assert.deepEqual(
      byPath(".agents/plans/plan-done.md").map((result) => result.authority),
      ["accepted plan", "accepted plan"],
    );
    assert.deepEqual(
      byPath(".agents/proposals/0001-accepted.md").map((result) => result.authority),
      ["accepted proposal"],
    );
    // Every result carries a non-empty excerpt around its match.
    for (const result of json.results) {
      assert.ok(result.excerpt.length > 0 && result.excerpt.length <= 200);
    }
    assert.equal(json.excluded, 2);
    assert.equal(json.truncated, false);
    assert.equal(json.omitted, 0);
    assert.deepEqual(json.warnings, []);
  });

  it("hides draft and rejected work by default and shows it with --include-all", () => {
    const cwd = copyFixture("find-project");
    const hidden = [".agents/proposals/0002-draft.md", ".agents/plans/plan-draft.md"];
    const { json } = findJson(["authority"], cwd);
    for (const result of json.results) {
      assert.ok(!hidden.includes(result.path), `${result.path} should be hidden by default`);
    }
    assert.equal(json.excluded, 2);

    const all = findJson(["authority", "--include-all"], cwd).json;
    assert.equal(all.excluded, 0);
    for (const p of hidden) {
      assert.equal(byPathLine(all.results, p).length, 1, `expected one result for ${p}`);
    }
    assert.equal(all.results.length, 8);
  });

  it("selects documents by status with --status", () => {
    const cwd = copyFixture("find-project");
    const draft = findJson(["authority", "--status", "draft"], cwd).json;
    assert.deepEqual(
      draft.results.map((result) => result.path).sort(),
      [".agents/plans/plan-draft.md", ".agents/proposals/0002-draft.md"],
    );
    assert.equal(draft.excluded, 0);

    const accepted = findJson(["authority", "--status", "accepted"], cwd).json;
    assert.deepEqual(
      new Set(accepted.results.map((result) => result.path)),
      new Set([".agents/plans/plan-done.md", ".agents/proposals/0001-accepted.md"]),
    );
    // An explicit --status is a filter on statuses: canon and overviews have
    // none, so they drop out.
    assert.ok(!accepted.results.some((result) => result.path.startsWith("docs/")));
  });

  it("filters the searched homes with --type", () => {
    const cwd = copyFixture("find-project");
    const proposals = findJson(["authority", "--type", "proposals"], cwd).json;
    assert.deepEqual(
      proposals.results.map((result) => result.path),
      [".agents/proposals/0001-accepted.md"],
    );
    // Only the draft proposal is status-hidden within the selected type.
    assert.equal(proposals.excluded, 1);

    const canon = findJson(["authority", "--type", "canon"], cwd).json;
    assert.deepEqual(
      canon.results.map((result) => result.path),
      ["docs/design/authority.md", "docs/design/canon.md"],
    );
  });

  it("ranks title matches over description matches over plain body matches", () => {
    const cwd = copyFixture("find-project");
    const { json } = findJson(["authority"], cwd);
    assert.deepEqual(
      json.results.map((result) => result.path),
      AUTHORITY_ORDER.map((expected) => expected.path),
    );
  });

  it("reports heading and line numbers for matches around fenced code", () => {
    const cwd = copyFixture("find-project");
    // Inside the fence: the pseudo-heading must not start a section.
    const inside = findJson(["stays"], cwd).json;
    assert.deepEqual(
      inside.results.map((result) => [result.path, result.heading, result.line]),
      [["docs/design/canon.md", "Canon rules", 11]],
    );
    const pseudo = findJson(["fencepseudo"], cwd).json;
    assert.deepEqual(
      pseudo.results.map((result) => [result.path, result.heading, result.line]),
      [["docs/design/canon.md", "Canon rules", 10]],
    );
    // After the fence: still the section the fence sits in.
    const after = findJson(["paragraph"], cwd).json;
    assert.deepEqual(
      after.results.map((result) => [result.path, result.heading, result.line]),
      [["docs/design/canon.md", "Canon rules", 14]],
    );
  });

  it("matches words only when they appear in the same section", () => {
    const cwd = copyFixture("find-project");
    const split = findJson(["canon unrelated"], cwd).json;
    assert.deepEqual(split.results, []);
    assert.equal(split.excluded, 0);
    assert.equal(split.truncated, false);

    const together = findJson(["carries paragraph"], cwd).json;
    assert.deepEqual(
      together.results.map((result) => [result.path, result.heading, result.line]),
      [["docs/design/canon.md", "Canon rules", 7]],
    );
  });

  it("finds a document through its description when no section matches", () => {
    const cwd = copyFixture("find-project");
    const { json } = findJson(["decide documents"], cwd);
    assert.equal(json.results.length, 1);
    const result = json.results[0];
    assert.equal(result.path, "docs/design/authority.md");
    assert.equal(result.heading, "Authority");
    assert.equal(result.line, 5);
    assert.match(result.excerpt, /Which documents decide/);
  });

  it("anchors a fallback result at a heading and line read accepts", () => {
    const cwd = copyFixture("find-project");
    // The frontmatter title differs from the document's H1; the fallback
    // reports the H1 a `read --section` can select, not the title.
    const titled = findJson(["fallback anchor"], cwd).json;
    assert.deepEqual(
      titled.results.map((result) => [result.path, result.heading, result.line]),
      [["docs/design/labels.md", "Different heading", 5]],
    );
    // A frontmatter-only document has no headings; the line is clamped to the
    // document's last line, which `read --lines` accepts.
    const bare = findJson(["blurbkey"], cwd).json;
    assert.deepEqual(
      bare.results.map((result) => [result.path, result.heading, result.line]),
      [["docs/design/blurb.md", null, 4]],
    );
    const check = run(
      ["read", "docs/design/blurb.md", "--lines", "4-4"],
      cwd,
    );
    assert.equal(check.status, 0, check.stderr);
  });

  it("keeps a four-backtick fence holding an inner fence whole", () => {
    const cwd = copyFixture("find-project");
    // "# Fake" sits inside a ````markdown fence whose inner ``` block must not
    // end it: the match belongs to the enclosing "Examples" section.
    const { json } = findJson(["fake"], cwd);
    assert.deepEqual(
      json.results.map((result) => [result.path, result.heading, result.line]),
      [["docs/design/examples.md", "Examples", 9]],
    );
    const after = findJson(["sample ends"], cwd).json;
    assert.deepEqual(
      after.results.map((result) => [result.path, result.heading, result.line]),
      [["docs/design/examples.md", "Examples", 12]],
    );
  });

  it("caps results by limit and by bytes and reports what was omitted", () => {
    const cwd = copyFixture("find-project");
    const limited = findJson(["authority", "--limit", "2"], cwd);
    assert.equal(limited.status, 0);
    assert.equal(limited.json.results.length, 2);
    assert.equal(limited.json.truncated, true);
    assert.equal(limited.json.omitted, 4);

    // A byte cap below one excerpt emits nothing and says so. With nothing
    // excluded, the text output must not claim there were no matches.
    const capped = findJson(["authority", "--max-bytes", "1"], cwd);
    assert.equal(capped.status, 0);
    assert.deepEqual(capped.json.results, []);
    assert.equal(capped.json.truncated, true);
    assert.equal(capped.json.omitted, 6);

    const cappedText = run(["find", "authority", "--include-all", "--max-bytes", "1"], cwd);
    assert.equal(cappedText.status, 0);
    assert.ok(!cappedText.stdout.includes("No matches"), cappedText.stdout);
    assert.ok(cappedText.stdout.includes("Showing 0 of 8 results."), cappedText.stdout);

    const roomy = findJson(["authority", "--max-bytes", "100000"], cwd);
    assert.equal(roomy.json.truncated, false);
    assert.equal(roomy.json.omitted, 0);
  });

  it("exits 0 with empty results when nothing matches", () => {
    const cwd = copyFixture("find-project");
    const { status, json } = findJson(["zzzznope"], cwd);
    assert.equal(status, 0);
    assert.deepEqual(json.results, []);
    assert.equal(json.excluded, 0);
    assert.equal(json.truncated, false);
    assert.equal(json.omitted, 0);

    const text = run(["find", "zzzznope"], cwd);
    assert.equal(text.status, 0);
    assert.equal(text.stdout, "No matches for 'zzzznope'.\n");
    assert.equal(text.stderr, "");
  });

  it("matches case-insensitively", () => {
    const cwd = copyFixture("find-project");
    const shouted = findJson(["AUTHORITY"], cwd).json;
    assert.equal(shouted.results.length, 6);
    assert.deepEqual(
      shouted.results.map((result) => result.path),
      AUTHORITY_ORDER.map((expected) => expected.path),
    );
  });

  it("prints one result line and an excerpt line per match in text output", () => {
    const cwd = copyFixture("find-project");
    const result = run(["find", "authority"], cwd);
    assert.equal(result.status, 0);
    const lines = result.stdout.split("\n");
    const first = lines.indexOf("docs/design/authority.md:5 · canon · Authority");
    assert.ok(first !== -1, `missing result line in:\n${result.stdout}`);
    assert.match(lines[first + 1] ?? "", /^  .+authority/i);
    assert.ok(lines.includes("Excluded by status: 2 results."));
  });

  it("says in text output when results were omitted", () => {
    const cwd = copyFixture("find-project");
    const result = run(["find", "authority", "--limit", "1"], cwd);
    assert.equal(result.status, 0);
    assert.ok(result.stdout.includes("Showing 1 of 6 results."), result.stdout);
  });

  it("exits 2 on usage errors", () => {
    const cwd = copyFixture("find-project");
    for (const args of [
      [],
      ["one", "two"],
      ["query", "--type", "bogus"],
      ["query", "--limit", "0"],
      ["query", "--limit", "abc"],
      ["query", "--max-bytes", "0"],
      ["   "],
    ]) {
      const result = run(["find", ...args], cwd);
      assert.equal(result.status, 2, `expected exit 2 for: ${args.join(" ")}`);
      assert.match(result.stderr, /Usage: seams find/);
    }
  });
});

/** The results of one path, in output order. */
function byPathLine(results: FoundResult[], p: string): FoundResult[] {
  return results.filter((result) => result.path === p);
}
