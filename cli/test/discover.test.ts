import assert from "node:assert/strict";
import { mkdtempSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { loadProject } from "../src/config.ts";
import {
  authorityOf,
  discoverDocuments,
  type DocumentMeta,
} from "../src/docs/discover.ts";
import { copyFixture, fixtureDir } from "./helpers.ts";

function discoverFixture(name: string): { documents: DocumentMeta[]; warnings: string[] } {
  return discoverDocuments(loadProject(copyFixture(name)));
}

function byPath(documents: DocumentMeta[], docPath: string): DocumentMeta {
  const found = documents.find((doc) => doc.path === docPath);
  assert.ok(found, `expected a document at ${docPath}`);
  return found;
}

describe("authorityOf", () => {
  it("labels each document type and status", () => {
    assert.equal(authorityOf({ type: "canon" }), "canon");
    assert.equal(authorityOf({ type: "overview" }), "memory (verify against code)");
    assert.equal(authorityOf({ type: "proposal", status: "accepted" }), "accepted proposal");
    assert.equal(authorityOf({ type: "proposal", status: "draft" }), "draft proposal (not authorization)");
    assert.equal(authorityOf({ type: "proposal", status: "rejected" }), "rejected proposal (not authorization)");
    assert.equal(authorityOf({ type: "proposal", status: null }), "proposal (not authorization)");
    assert.equal(authorityOf({ type: "plan", status: "draft" }), "draft plan");
    assert.equal(authorityOf({ type: "plan", status: null }), "plan");
  });
});

describe("discoverDocuments", () => {
  it("walks the default homes in type order, then path order", () => {
    const { documents, warnings } = discoverFixture("list-project");
    assert.deepEqual(warnings, []);
    assert.deepEqual(
      documents.map((doc) => doc.path),
      [
        "docs/design/broken.md",
        "docs/design/invariants.md",
        "docs/design/no-frontmatter.md",
        "docs/design/principles.md",
        "docs/design/vision.md",
        "docs/design/overviews/deep/storage.md",
        "docs/design/overviews/parts.md",
        "docs/design/overviews/system.md",
        ".agents/proposals/0001-first.md",
        ".agents/proposals/0002-second.md",
        ".agents/proposals/0003-broken.md",
        ".agents/proposals/0004-unlabeled.md",
        ".agents/proposals/0005-multiline.md",
        ".agents/plans/no-status.md",
        ".agents/plans/notes.md",
        ".agents/plans/plan-alpha.md",
      ],
    );
  });

  it("reads each document's metadata from its frontmatter", () => {
    const { documents } = discoverFixture("list-project");
    const vision = byPath(documents, "docs/design/vision.md");
    assert.equal(vision.type, "canon");
    assert.equal(vision.title, "Vision");
    assert.equal(vision.description, "What seams is for.");
    assert.equal(vision.authority, "canon");
    assert.deepEqual(vision.problems, []);
    assert.equal(vision.bytes, statSync(path.join(fixtureDir("list-project"), "docs/design/vision.md")).size);
    // Canon documents carry no status or created fields.
    assert.equal("status" in vision, false);
    assert.equal("created" in vision, false);
  });

  it("carries status and created for proposals and plans only", () => {
    const { documents } = discoverFixture("list-project");
    const accepted = byPath(documents, ".agents/proposals/0001-first.md");
    assert.equal(accepted.type, "proposal");
    assert.equal(accepted.status, "accepted");
    assert.equal(accepted.created, "2025-01-02");
    assert.equal(accepted.authority, "accepted proposal");

    const draft = byPath(documents, ".agents/proposals/0002-second.md");
    assert.equal(draft.status, "draft");
    assert.equal(draft.authority, "draft proposal (not authorization)");

    const unlabeled = byPath(documents, ".agents/proposals/0004-unlabeled.md");
    assert.equal(unlabeled.status, null);
    assert.equal(unlabeled.authority, "proposal (not authorization)");

    const plan = byPath(documents, ".agents/plans/plan-alpha.md");
    assert.equal(plan.type, "plan");
    assert.equal(plan.status, "draft");
    assert.equal(plan.created, "2025-03-04");
    assert.equal(plan.authority, "draft plan");

    const noStatus = byPath(documents, ".agents/plans/no-status.md");
    assert.equal(noStatus.status, null);
    assert.equal(noStatus.authority, "plan");

    const overview = byPath(documents, "docs/design/overviews/system.md");
    assert.equal(overview.authority, "memory (verify against code)");
    assert.equal("status" in overview, false);
    assert.equal("created" in overview, false);
  });

  it("falls back from a missing title to the first H1, then the file name", () => {
    const { documents } = discoverFixture("list-project");
    const fromHeading = byPath(documents, "docs/design/overviews/parts.md");
    assert.equal(fromHeading.title, "Parts of the system");
    assert.deepEqual(fromHeading.problems, ["missing title"]);
    assert.equal(fromHeading.description, "The parts of the system.");

    const fromName = byPath(documents, ".agents/plans/notes.md");
    assert.equal(fromName.title, "notes");
    assert.deepEqual(fromName.problems, ["missing frontmatter"]);
    assert.equal(fromName.description, null);
  });

  it("reads the title from an H1 after missing frontmatter, past fenced blocks", () => {
    const { documents } = discoverFixture("list-project");
    const notes = byPath(documents, "docs/design/no-frontmatter.md");
    assert.equal(notes.title, "Loose notes");
    assert.deepEqual(notes.problems, ["missing frontmatter"]);

    const storage = byPath(documents, "docs/design/overviews/deep/storage.md");
    assert.equal(storage.title, "Storage layout");
    assert.deepEqual(storage.problems, ["missing frontmatter"]);
  });

  it("reports malformed frontmatter without dropping the document", () => {
    const { documents } = discoverFixture("list-project");
    const broken = byPath(documents, "docs/design/broken.md");
    // Only the parse problem: no misleading "missing title" on top of it.
    assert.equal(broken.problems.length, 1);
    assert.match(broken.problems[0] ?? "", /^malformed frontmatter:/);
    assert.equal(broken.title, "Broken");
    assert.equal(broken.description, null);
  });

  it("takes descriptions from frontmatter only, never from the body or an index", () => {
    const { documents } = discoverFixture("list-project");
    for (const doc of documents) {
      assert.notEqual(doc.description, "a decoy description in a body paragraph");
      assert.notEqual(doc.description, "a decoy description inside the index body");
      assert.notEqual(doc.description, "Navigation for the overviews.");
    }
  });

  it("skips index files, non-Markdown files, and subfolders of the canon home", () => {
    const { documents } = discoverFixture("list-project");
    const paths = documents.map((doc) => doc.path);
    assert.equal(paths.includes("docs/design/index.md"), false);
    assert.equal(paths.includes("docs/design/overviews/index.md"), false);
    assert.equal(paths.some((p) => p.endsWith("notes.txt")), false);
  });

  it("includes the skipped homes' index files only when asked to", () => {
    const project = loadProject(copyFixture("list-project"));
    const withIndexes = discoverDocuments(project, { includeIndexes: true });
    const designIndex = byPath(withIndexes.documents, "docs/design/index.md");
    // The canon home's index keeps its home's type but is navigation, not
    // canon, so its authority says navigation.
    assert.equal(designIndex.type, "canon");
    assert.equal(designIndex.index, true);
    assert.equal(designIndex.authority, "navigation");
    const overviewsIndex = byPath(withIndexes.documents, "docs/design/overviews/index.md");
    assert.equal(overviewsIndex.type, "overview");
    assert.equal(overviewsIndex.index, true);
    assert.equal(overviewsIndex.authority, "memory (verify against code)");

    const withoutIndexes = discoverDocuments(project);
    assert.equal(withoutIndexes.documents.some((doc) => doc.index === true), false);
  });

  it("warns once for each missing home folder", () => {
    const empty = mkdtempSync(path.join(tmpdir(), "seams-empty-"));
    const { documents, warnings } = discoverDocuments(loadProject(empty));
    assert.deepEqual(documents, []);
    assert.deepEqual(warnings, [
      "canon home not found: docs/design",
      "overviews home not found: docs/design/overviews",
      "proposals home not found: .agents/proposals",
      "plans home not found: .agents/plans",
    ]);
  });

  it("follows custom homes from the manifest", () => {
    const { documents, warnings } = discoverFixture("list-custom");
    assert.deepEqual(
      documents.map((doc) => doc.path),
      ["handbook/design/vision.md", "ideas/0001-idea.md", "roadmaps/r1.md"],
    );
    assert.deepEqual(warnings, ["overviews home not found: docs/design/overviews"]);
    const proposal = byPath(documents, "ideas/0001-idea.md");
    assert.equal(proposal.authority, "accepted proposal");
  });

  it("keeps a multi-line description as written for JSON consumers", () => {
    const { documents } = discoverFixture("list-project");
    const multiline = byPath(documents, ".agents/proposals/0005-multiline.md");
    assert.equal(
      multiline.description,
      "First line of the description.\nSecond line of the description.",
    );
  });

  it("uses the .agents/design fallback home", () => {
    const { documents, warnings } = discoverFixture("list-agents-design");
    // The fallback project has no proposals or plans homes.
    assert.deepEqual(warnings, [
      "proposals home not found: .agents/proposals",
      "plans home not found: .agents/plans",
    ]);
    assert.deepEqual(
      documents.map((doc) => doc.path),
      [".agents/design/vision.md", ".agents/design/overviews/system.md"],
    );
  });
});
