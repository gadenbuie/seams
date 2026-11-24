/**
 * Outline parsing: find a Markdown document's ATX headings, each with the
 * inclusive line range and byte size of the section it starts.
 *
 * A section runs from its heading line to the line before the next heading of
 * the same or higher level, or to the document's last line. Headings inside a
 * leading frontmatter block or inside fenced code blocks are ignored. Fences
 * follow CommonMark for ``` and ~~~: the closing fence uses the same character
 * and is at least as long as the opening one, and a backtick fence's opening
 * line may not contain further backticks. Lines are 1-indexed and counted in
 * the whole file, frontmatter included, so a caller can target a read at the
 * same lines. Setext headings are not supported.
 */
import { parseFrontmatter } from "./frontmatter.ts";

/** One line of a document: its content plus its offsets in the original text. */
export interface DocLine {
  /** The line's text without its terminator. */
  text: string;
  /** The offset of the line's first character in the original text. */
  start: number;
  /** The offset just past the line's terminator, or the end of the text. */
  end: number;
  /** The line's UTF-8 size in bytes, including its terminator. */
  bytes: number;
}

/** One heading and the section it starts. Line numbers are 1-indexed. */
export interface Heading {
  level: number;
  /** The heading's exact text, without the leading `#`s. */
  title: string;
  /** The heading's line. */
  start: number;
  /** The section's last line, inclusive. */
  end: number;
  /** The section's size in bytes. */
  bytes: number;
}

export interface Outline {
  headings: Heading[];
  /** Every line of the document, so a caller can slice exact ranges. */
  lines: DocLine[];
  /** The 1-based line where the document body starts, after frontmatter. */
  bodyStartLine: number;
}

/** The open fence state, or null outside a fenced code block. */
interface Fence {
  char: "`" | "~";
  length: number;
}

/** An ATX heading: up to three leading spaces, one to six `#`s, then a space. */
const HEADING = /^ {0,3}(#{1,6})\s+(.*)$/;

/**
 * The fence a line opens, or null. A backtick fence's info string may not
 * contain a backtick; a tilde fence's may contain anything.
 */
function openingFence(line: string): Fence | null {
  const match = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
  if (match === null) return null;
  const chars = match[1];
  if (chars[0] === "`" && match[2].includes("`")) return null;
  return { char: chars[0] as "`" | "~", length: chars.length };
}

/** Whether a line closes the open fence: same character, at least as long. */
function closesFence(line: string, fence: Fence): boolean {
  const match = /^ {0,3}(`+|~+)\s*$/.exec(line);
  return (
    match !== null &&
    match[1][0] === fence.char &&
    match[1].length >= fence.length
  );
}

/**
 * Split a document into lines, keeping each line's character offsets in the
 * original text, so a caller can slice a range without normalizing its line
 * terminators. An empty document has no lines.
 */
export function docLines(text: string): DocLine[] {
  if (text.length === 0) return [];
  const lines: DocLine[] = [];
  let offset = 0;
  // Each chunk is one line plus its terminator, when it has one.
  for (const chunk of text.split(/(?<=\r?\n)/)) {
    lines.push({
      text: chunk.replace(/\r?\n$/, ""),
      start: offset,
      end: offset + chunk.length,
      bytes: Buffer.byteLength(chunk, "utf8"),
    });
    offset += chunk.length;
  }
  return lines;
}

/**
 * Collect a document's headings with their inclusive section ranges and byte
 * sizes. Section ranges count every line of the file, so a section's numbers
 * can be used directly as a `--lines` selection on the same file.
 */
export function outline(text: string): Outline {
  const lines = docLines(text);
  const bodyStartLine = parseFrontmatter(text).bodyStartLine;

  const found: { level: number; title: string; line: number }[] = [];
  let fence: Fence | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].text;
    if (i + 1 < bodyStartLine) continue; // still inside the frontmatter block
    if (fence !== null) {
      if (closesFence(line, fence)) fence = null;
      continue;
    }
    const opened = openingFence(line);
    if (opened !== null) {
      fence = opened;
      continue;
    }
    const match = HEADING.exec(line);
    if (match !== null) {
      found.push({ level: match[1].length, title: match[2].trim(), line: i + 1 });
    }
  }

  // Cumulative byte offsets: the bytes of lines 1..i live at cumulativeBytes[i].
  const cumulativeBytes = [0];
  for (const line of lines) {
    cumulativeBytes.push(cumulativeBytes[cumulativeBytes.length - 1] + line.bytes);
  }

  const headings: Heading[] = found.map((heading, index) => {
    let end = lines.length;
    for (let j = index + 1; j < found.length; j++) {
      if (found[j].level <= heading.level) {
        end = found[j].line - 1;
        break;
      }
    }
    return {
      level: heading.level,
      title: heading.title,
      start: heading.line,
      end,
      bytes: cumulativeBytes[end] - cumulativeBytes[heading.line - 1],
    };
  });

  return { headings, lines, bodyStartLine };
}
