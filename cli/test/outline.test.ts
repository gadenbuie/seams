import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { docLines, outline } from "../src/docs/outline.ts";

/** The headings as compact rows: level, title, start, end. */
function rows(text: string): (readonly [number, string, number, number])[] {
  return outline(text).headings.map((h) => [h.level, h.title, h.start, h.end] as const);
}

function lines(...contents: string[]): string {
  return contents.join("\n") + "\n";
}

describe("docLines", () => {
  it("keeps offsets and terminators of every line", () => {
    const text = "one\ntwo\r\nthree";
    const split = docLines(text);
    assert.deepEqual(
      split.map((line) => line.text),
      ["one", "two", "three"],
    );
    assert.deepEqual(
      split.map((line) => text.slice(line.start, line.end)),
      ["one\n", "two\r\n", "three"],
    );
  });

  it("counts an empty document as zero lines", () => {
    assert.deepEqual(docLines(""), []);
    assert.deepEqual(docLines("\n").map((line) => line.text), [""]);
  });
});

describe("outline", () => {
  it("returns nested and sibling sections with their ranges and byte sizes", () => {
    const text = lines(
      "# Top",
      "",
      "Intro.",
      "",
      "## First",
      "",
      "First body.",
      "",
      "### Nested",
      "",
      "Nested body.",
      "",
      "## Second",
      "Second body.",
    );
    assert.deepEqual(rows(text), [
      [1, "Top", 1, 14],
      [2, "First", 5, 12],
      [3, "Nested", 9, 12],
      [2, "Second", 13, 14],
    ]);

    // Byte sizes cover the whole section, terminators included: the top H1
    // runs to the end of the document.
    const { headings } = outline(text);
    assert.equal(headings[0].bytes, Buffer.byteLength(text, "utf8"));
    assert.equal(headings[3].bytes, Buffer.byteLength("## Second\nSecond body.\n", "utf8"));
  });

  it("ends the last section at the document's last line", () => {
    const text = lines("# Only", "", "Body line.");
    const { headings } = outline(text);
    assert.deepEqual(rows(text), [[1, "Only", 1, 3]]);
    assert.equal(headings[0].bytes, Buffer.byteLength(text, "utf8"));
  });

  it("ignores headings inside frontmatter and fenced code blocks", () => {
    const text = lines(
      "---",
      "title: Doc",
      "# not a heading in frontmatter",
      "---",
      "# Real",
      "",
      "```js",
      "// # not inside a fence",
      "## not inside a fence",
      "```",
      "",
      "~~~",
      "# no",
      "~~~",
      "",
      "````outer",
      "# nope",
      "```",
      "still fenced: three backticks cannot close four",
      "````",
      "",
      "    # indented code is not a heading",
      "",
      "## After",
      "Body.",
    );
    assert.deepEqual(rows(text), [
      [1, "Real", 5, 25],
      [2, "After", 24, 25],
    ]);
  });

  it("opens a tilde fence with an info string and closes it with tildes", () => {
    const text = lines("~~~ruby", "# not a heading", "~~~", "# Real");
    assert.deepEqual(rows(text), [[1, "Real", 4, 4]]);
  });

  it("does not open a backtick fence whose info string contains a backtick", () => {
    // CommonMark leaves such a line as text, so the headings after it count
    // until a valid fence opens on a later line.
    const text = lines("# Real", "", "``` info with `tick", "## Counts", "", "```", "## Fenced");
    assert.deepEqual(rows(text), [
      [1, "Real", 1, 7],
      [2, "Counts", 4, 7],
    ]);
  });

  it("reads exact heading text without leading `#`s or padding", () => {
    const text = lines("##   Spaced   title  ", "#", "#NoSpace", "####### seven", "## Trim ##");
    assert.deepEqual(outline(text).headings.map((h) => h.title), [
      "Spaced   title",
      "Trim ##",
    ]);
  });

  it("handles CRLF files, counting each terminator as two bytes", () => {
    const text = "---\r\ntitle: C\r\n---\r\n# Title\r\n\r\nBody.\r\n\r\n## Next\r\nTail.\r\n";
    const { headings, lines: split } = outline(text);
    assert.equal(split.length, 9);
    assert.deepEqual(
      headings.map((h) => [h.level, h.title, h.start, h.end]),
      [
        [1, "Title", 4, 9],
        [2, "Next", 8, 9],
      ],
    );
    // The H1 runs to the last line; the H2 ends where the H1 does.
    assert.equal(headings[0].bytes, Buffer.byteLength("# Title\r\n\r\nBody.\r\n\r\n## Next\r\nTail.\r\n", "utf8"));
    assert.equal(headings[1].bytes, Buffer.byteLength("## Next\r\nTail.\r\n", "utf8"));
  });

  it("returns no headings for an empty document", () => {
    const parsed = outline("");
    assert.deepEqual(parsed.headings, []);
    assert.deepEqual(parsed.lines, []);
    assert.equal(parsed.bodyStartLine, 1);
  });

  it("counts line numbers across the whole file, frontmatter included", () => {
    const parsed = outline(lines("---", "title: T", "---", "# Real"));
    assert.equal(parsed.bodyStartLine, 4);
    assert.equal(parsed.headings[0].start, 4);
  });
});
