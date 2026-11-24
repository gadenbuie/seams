import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { copyFixture } from "./helpers.ts";
import { findRoot, loadProject } from "../src/config.ts";
import { findReferences } from "../src/docs/references.ts";

/** The referencing lines of one document, as `[line, kind]` pairs. */
function linesOf(
  result: ReturnType<typeof findReferences>,
  path: string,
): [number, string][] {
  const doc = result.documents.find((entry) => entry.path === path);
  assert.ok(doc, `expected references in ${path}`);
  return doc.lines.map((line) => [line.line, line.kind]);
}

describe("findReferences", () => {
  it("finds link and text references with their line numbers", () => {
    const cwd = copyFixture("impact-project");
    const project = loadProject(findRoot(cwd));
    const result = findReferences(project, ["src/a/b.ts"]);

    assert.deepEqual(result.warnings, []);
    assert.deepEqual(
      result.documents.map((doc) => doc.path),
      [
        "docs/design/canon.md",
        "docs/design/overviews/system.md",
        ".agents/proposals/0001-accepted.md",
        ".agents/proposals/0002-draft.md",
        ".agents/plans/plan-done.md",
      ],
    );
    // Line 9 names the path twice and as text; one entry covers the line.
    assert.deepEqual(linesOf(result, "docs/design/canon.md"), [[9, "text"]]);
    // A relative link and a text mention inside a code span, with an anchor.
    assert.deepEqual(linesOf(result, "docs/design/overviews/system.md"), [
      [7, "link"],
      [9, "text"],
    ]);
    // A reference usage and its definition both count as links.
    assert.deepEqual(linesOf(result, ".agents/proposals/0001-accepted.md"), [
      [9, "link"],
      [11, "link"],
    ]);
    assert.deepEqual(linesOf(result, ".agents/proposals/0002-draft.md"), [[9, "text"]]);
    assert.deepEqual(linesOf(result, ".agents/plans/plan-done.md"), [[9, "text"]]);
  });

  it("reports every referenced document's authority and status", () => {
    const cwd = copyFixture("impact-project");
    const project = loadProject(findRoot(cwd));
    const result = findReferences(project, ["src/a/b.ts"]);

    const byPath = new Map(result.documents.map((doc) => [doc.path, doc]));
    assert.deepEqual(byPath.get("docs/design/canon.md"), {
      path: "docs/design/canon.md",
      type: "canon",
      status: null,
      authority: "canon",
      lines: [{ line: 9, text: "The parser lives at src/a/b.ts and runs through src/a/b.ts:12.", kind: "text" }],
    });
    assert.equal(byPath.get(".agents/proposals/0001-accepted.md")?.status, "accepted");
    assert.equal(byPath.get(".agents/proposals/0002-draft.md")?.authority, "draft proposal (not authorization)");
    assert.equal(byPath.get(".agents/plans/plan-done.md")?.type, "plan");
  });

  it("matches whole path segments only", () => {
    const cwd = copyFixture("impact-project");
    const project = loadProject(findRoot(cwd));
    // src/xa/b.ts is a different file, and src/a/b.ts.old a different name:
    // the canon decoy line must not match the src/a/b.ts target.
    const result = findReferences(project, ["src/a/b.ts"]);
    const canon = result.documents.find((doc) => doc.path === "docs/design/canon.md");
    assert.deepEqual(
      canon?.lines.map((line) => line.line),
      [9],
    );

    const decoy = findReferences(project, ["src/xa/b.ts"]);
    assert.deepEqual(
      decoy.documents.map((doc) => [doc.path, doc.lines.map((line) => line.line)]),
      [["docs/design/canon.md", [11]]],
    );
  });

  it("accepts a directory and matches references to the files inside it", () => {
    const cwd = copyFixture("impact-project");
    const project = loadProject(findRoot(cwd));
    const result = findReferences(project, ["src"]);

    // Every reference to a file under src/, plus the text mention of the
    // decoy file src/xa/b.ts. The link in the overview resolves inside the
    // directory, so it matches too.
    assert.deepEqual(linesOf(result, "docs/design/canon.md"), [
      [9, "text"],
      [11, "text"],
    ]);
    assert.deepEqual(linesOf(result, "docs/design/overviews/system.md"), [
      [7, "link"],
      [9, "text"],
    ]);
  });

  it("matches a link whose target resolves inside a supplied directory", () => {
    const cwd = copyFixture("impact-project");
    const project = loadProject(findRoot(cwd));
    const result = findReferences(project, ["src"]);
    const links = result.documents
      .find((doc) => doc.path === "docs/design/overviews/system.md")
      ?.lines.filter((line) => line.kind === "link");
    assert.deepEqual(
      links?.map((line) => line.line),
      [7],
    );
  });

  it("finds a file by its link and by its plain name", () => {
    const cwd = copyFixture("impact-project");
    const project = loadProject(findRoot(cwd));
    const result = findReferences(project, ["Makefile"]);
    assert.deepEqual(linesOf(result, "docs/design/canon.md"), [[7, "link"]]);
    assert.deepEqual(linesOf(result, ".agents/plans/plan-done.md"), [[9, "text"]]);
    assert.deepEqual(
      result.documents.map((doc) => doc.path),
      ["docs/design/canon.md", ".agents/plans/plan-done.md"],
    );
  });

  it("returns no documents when nothing references the path", () => {
    const cwd = copyFixture("impact-project");
    const project = loadProject(findRoot(cwd));
    const result = findReferences(project, ["src/removed.ts"]);
    assert.deepEqual(result.documents, []);
    assert.deepEqual(result.warnings, []);
  });

  it("does not count a path inside a longer word or a different extension", () => {
    const cwd = copyFixture("impact-project");
    const project = loadProject(findRoot(cwd));
    // The canon decoy line holds src/xa/b.ts and src/a/b.ts.old, neither of
    // which is src/a/b.ts; the plan line holds src/a/b.ts alone.
    const result = findReferences(project, ["src/a/b.ts"]);
    const canon = result.documents.find((doc) => doc.path === "docs/design/canon.md");
    assert.ok(canon);
    for (const line of canon.lines) {
      assert.ok(!line.text.includes("xa/b.ts"), `unexpected decoy match: ${line.text}`);
      assert.ok(!line.text.includes("b.ts.old"), `unexpected suffix match: ${line.text}`);
    }
  });
});
