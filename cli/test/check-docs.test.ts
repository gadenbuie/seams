import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, it } from "node:test";
import type { Finding } from "../src/check/types.ts";
import {
  documentBody,
  extractInlineLinks,
  headingAnchors,
  resolveLinkPath,
  splitLinkTarget,
} from "../src/docs/markdown.ts";
import { copyFixture } from "./helpers.ts";

const CLI = path.resolve(import.meta.dirname, "..", "src", "cli.ts");

interface CheckJson {
  schemaVersion: number;
  command: string;
  findings: Finding[];
  errors: number;
  warnings: number;
}

function runCheck(cwd: string): { status: number | null; json: CheckJson } {
  const result = spawnSync(process.execPath, [CLI, "check", "--json"], {
    cwd,
    encoding: "utf8",
  });
  return { status: result.status, json: JSON.parse(result.stdout) };
}

describe("seams check links, anchors, and skills", () => {
  it("reports no findings when links, anchors, and indexes are in order", () => {
    const { status, json } = runCheck(copyFixture("check-docs-good"));
    assert.equal(status, 0);
    assert.deepEqual(json.findings, []);
    assert.equal(json.errors, 0);
    assert.equal(json.warnings, 0);
  });

  it("reports broken links, uncovered documents, and broken skill references", () => {
    const { status, json } = runCheck(copyFixture("check-docs-bad"));
    assert.equal(status, 1);
    assert.equal(json.warnings, 0);

    const rows = json.findings.map((finding) => [
      finding.id,
      finding.severity,
      finding.path,
      finding.line,
      finding.message,
    ]);
    assert.deepEqual(rows, [
      [
        "links",
        "error",
        ".agents/proposals/0001-links.md",
        10,
        "link target does not exist: ../../docs/design/missing.md",
      ],
      [
        "links",
        "error",
        ".agents/proposals/0001-links.md",
        11,
        "link target ../../docs/design/vision.md has no heading 'no-such-heading'",
      ],
      [
        "links",
        "error",
        "README.md",
        3,
        "link target does not exist: guide.md",
      ],
      [
        "index-coverage",
        "error",
        "docs/design/index.md",
        undefined,
        "the design index does not link docs/design/principles.md",
      ],
      [
        "index-coverage",
        "error",
        "docs/design/overviews/index.md",
        undefined,
        "the overviews index does not link docs/design/overviews/system.md",
      ],
      [
        "skill-refs",
        "error",
        "skills/seams-helper/SKILL.md",
        2,
        "frontmatter 'name' is 'helper', expected 'seams-helper'",
      ],
      [
        "skill-refs",
        "error",
        "skills/seams-helper/SKILL.md",
        8,
        "sibling-skill path '<skills>/seams-helper/references/absent.md' does not exist",
      ],
      [
        "skill-refs",
        "error",
        "skills/seams-helper/references/helper.md",
        3,
        "sibling-skill path '<skills>/seams-helper/references/nowhere.md' does not exist",
      ],
    ]);
    assert.equal(json.errors, rows.length);
  });

  it("reports unreadable skill frontmatter as a parse problem, not a missing name", () => {
    const cwd = copyFixture("check-docs-bad");
    mkdirSync(path.join(cwd, "skills", "seams-broken"), { recursive: true });
    writeFileSync(
      path.join(cwd, "skills", "seams-broken", "SKILL.md"),
      "---\nname: seams-broken\n",
    );
    const { json } = runCheck(cwd);
    const broken = json.findings.filter(
      (finding) => finding.path === "skills/seams-broken/SKILL.md",
    );
    assert.deepEqual(
      broken.map((finding) => [finding.id, finding.severity, finding.line]),
      [["skill-refs", "error", 1]],
    );
    assert.match(
      broken[0].message,
      /frontmatter cannot be read: unterminated frontmatter/,
    );
  });

  it("reports a missing index file when it has documents to cover", () => {
    const cwd = copyFixture("check-docs-bad");
    rmSync(path.join(cwd, "docs", "design", "overviews", "index.md"));
    const { json } = runCheck(cwd);
    const coverage = json.findings.filter((finding) => finding.id === "index-coverage");
    assert.deepEqual(
      coverage.map((finding) => [finding.path, finding.message]),
      [
        ["docs/design/index.md", "the design index does not link docs/design/principles.md"],
        [
          "docs/design/overviews/index.md",
          "the overviews index is missing, so 1 document cannot be reached from it",
        ],
      ],
    );
  });

  it("stays silent when the project has no skills folder", () => {
    const cwd = copyFixture("check-docs-bad");
    rmSync(path.join(cwd, "skills"), { recursive: true });
    const { json } = runCheck(cwd);
    assert.ok(
      json.findings.every((finding) => finding.id !== "skill-refs"),
      "expected no skill-refs findings",
    );
  });
});

describe("markdown body scanning", () => {
  it("gives duplicate headings the -1 suffix, GitHub style", () => {
    const anchors = headingAnchors(
      documentBody("# Top\n\n## Section\n\n## Section\n\n## Section\n"),
    );
    assert.deepEqual([...anchors].sort(), ["section", "section-1", "section-2", "top"]);
  });

  it("drops punctuation and case from heading slugs", () => {
    const anchors = headingAnchors(
      documentBody("## 1. Each statement lives **here**\n"),
    );
    assert.ok(anchors.has("1-each-statement-lives-here"));
  });

  it("ignores headings and links inside fenced code", () => {
    const body = documentBody("```\n## Not a heading\n```\n\n[link](nowhere.md)\n");
    assert.equal(headingAnchors(body).size, 0);
    assert.deepEqual(extractInlineLinks(body), [
      { target: "nowhere.md", line: 5 },
    ]);
  });

  it("keeps a fenced block open through a different or shorter fence line", () => {
    const body = documentBody(
      "```\n~~~\n[inside](missing.md)\n```\n[after](target.md)\n",
    );
    assert.equal(headingAnchors(body).size, 0);
    assert.deepEqual(extractInlineLinks(body), [
      { target: "target.md", line: 5 },
    ]);
  });

  it("ignores links inside inline code spans", () => {
    const body = documentBody(
      "`[broken](missing.md)` but [fine](target.md) and [`README.md`](README.md)\n",
    );
    assert.deepEqual(extractInlineLinks(body), [
      { target: "target.md", line: 1 },
      { target: "README.md", line: 1 },
    ]);
  });

  it("keeps line numbers that account for frontmatter", () => {
    const body = documentBody("---\ntitle: Doc\n---\n\n[link](target.md)\n");
    assert.deepEqual(extractInlineLinks(body), [{ target: "target.md", line: 5 }]);
  });

  it("reads angle-bracket targets and ignores external ones", () => {
    const body = documentBody("[a](<my file.md>) [b](https://example.com/) [c](mailto:x@y.z)\n");
    assert.deepEqual(extractInlineLinks(body), [
      { target: "my file.md", line: 1 },
      { target: "https://example.com/", line: 1 },
      { target: "mailto:x@y.z", line: 1 },
    ]);
    assert.equal(splitLinkTarget("https://example.com/"), null);
    assert.equal(splitLinkTarget("mailto:x@y.z"), null);
    assert.equal(splitLinkTarget("tel:+1-555-0100"), null);
    assert.equal(splitLinkTarget("//example.com/doc"), null);
    assert.deepEqual(splitLinkTarget("guide.md#the-skills"), {
      path: "guide.md",
      anchor: "the-skills",
    });
    assert.deepEqual(splitLinkTarget("#top"), { path: "", anchor: "top" });
  });

  it("resolves root-relative links against the project root", () => {
    assert.deepEqual(
      resolveLinkPath("/proj", "/proj/docs/design/index.md", "vision.md"),
      "/proj/docs/design/vision.md",
    );
    assert.deepEqual(
      resolveLinkPath("/proj", "/proj/README.md", "/docs/design/vision.md"),
      "/proj/docs/design/vision.md",
    );
  });
});
