import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFrontmatter } from "../src/docs/frontmatter.ts";

describe("parseFrontmatter", () => {
  it("parses a leading YAML block and reports where the body starts", () => {
    const text =
      "---\ntitle: Vision\ndescription: What seams is for.\n---\n\n# Vision\n";
    const frontmatter = parseFrontmatter(text);
    assert.deepEqual(frontmatter.problems, []);
    assert.equal(frontmatter.data.title, "Vision");
    assert.equal(frontmatter.data.description, "What seams is for.");
    assert.equal(frontmatter.bodyStartLine, 5);
  });

  it("reports missing frontmatter without throwing", () => {
    const frontmatter = parseFrontmatter("# Just a heading\n");
    assert.deepEqual(frontmatter.data, {});
    assert.equal(frontmatter.bodyStartLine, 1);
    assert.deepEqual(frontmatter.problems, ["missing frontmatter"]);
  });

  it("reports malformed YAML without throwing", () => {
    const frontmatter = parseFrontmatter('---\ntitle: "unterminated\n---\nbody\n');
    assert.deepEqual(frontmatter.data, {});
    assert.match(frontmatter.problems[0] ?? "", /^malformed frontmatter:/);
    assert.equal(frontmatter.bodyStartLine, 4);
  });

  it("reports an unterminated frontmatter block", () => {
    const frontmatter = parseFrontmatter("---\ntitle: Vision\n");
    assert.deepEqual(frontmatter.data, {});
    assert.equal(frontmatter.bodyStartLine, 1);
    assert.deepEqual(frontmatter.problems, [
      "unterminated frontmatter: no closing '---' delimiter",
    ]);
  });

  it("reports frontmatter that is not a mapping", () => {
    const frontmatter = parseFrontmatter("---\n- one\n- two\n---\n");
    assert.deepEqual(frontmatter.data, {});
    assert.deepEqual(frontmatter.problems, [
      "malformed frontmatter: not a YAML mapping of fields",
    ]);
  });

  it("treats an empty frontmatter block as empty data", () => {
    const frontmatter = parseFrontmatter("---\n---\nbody\n");
    assert.deepEqual(frontmatter.data, {});
    assert.deepEqual(frontmatter.problems, []);
    assert.equal(frontmatter.bodyStartLine, 3);
  });

  it("reports missing frontmatter for an empty document", () => {
    const frontmatter = parseFrontmatter("");
    assert.deepEqual(frontmatter.data, {});
    assert.deepEqual(frontmatter.problems, ["missing frontmatter"]);
  });
});
