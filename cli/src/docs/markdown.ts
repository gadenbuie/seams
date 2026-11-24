/**
 * Markdown body scanning for the checks: inline links and heading anchors.
 *
 * Scanning works on the document body, after frontmatter, and skips fenced
 * code blocks: a reader follows links and headings where they are written,
 * and a checker must not report a link that Markdown renders as code. Link
 * extraction also skips inline code spans; heading and `<skills>/` path
 * scanning reads the raw lines, because their text is real even in code font.
 */
import path from "node:path";
import { parseFrontmatter } from "./frontmatter.ts";

/** One inline Markdown link found in a document body. */
export interface MarkdownLink {
  /** The link target exactly as written, e.g. `guide.md#the-skills`. */
  target: string;
  /** The 1-based line number of the link in the whole file. */
  line: number;
}

/** A document body: its lines and where they start in the file. */
export interface DocumentBody {
  /** The body lines: frontmatter removed, fenced code still included. */
  lines: string[];
  /** The 1-based line number of the first body line. */
  startLine: number;
}

/**
 * A link target split into its path and anchor parts, with external schemes
 * and the angle-bracket form already normalized away.
 */
export interface LinkTarget {
  /** The link's file part, e.g. `guide.md`, or `""` for a same-file anchor. */
  path: string;
  /** The anchor fragment without `#`, or `""` when the link has none. */
  anchor: string;
}

/** A fenced code block in progress: its opening fence, e.g. ` ``` `. */
interface FenceState {
  marker: string | null;
}

const OPEN_FENCE = /^\s{0,3}(`{3,}|~{3,})/;
const CLOSE_FENCE = /^\s{0,3}(`{3,}|~{3,})\s*$/;

/**
 * Track fenced code blocks through one document: a block opens with a run
 * of three or more backticks or tildes and closes only on the same character
 * in a run at least as long, so a shorter run or the other character stays
 * inside the block, the way CommonMark reads it.
 */
class FenceScanner {
  private readonly state: FenceState = { marker: null };

  /** True when `line` belongs to fenced code and is not document text. */
  fencedLine(line: string): boolean {
    if (this.state.marker === null) {
      const open = OPEN_FENCE.exec(line);
      if (open === null) return false;
      this.state.marker = open[1];
      return true; // The opening fence line itself is not document text.
    }
    const close = CLOSE_FENCE.exec(line);
    if (close !== null && close[1].startsWith(this.state.marker)) {
      this.state.marker = null; // The closing fence line ends the block.
    }
    return true;
  }
}

/** Walk every body line outside fenced code blocks, with its file line number. */
export function unfencedLines(
  body: DocumentBody,
  visit: (line: string, lineNo: number) => void,
): void {
  const scanner = new FenceScanner();
  for (let i = 0; i < body.lines.length; i++) {
    const line = body.lines[i];
    if (scanner.fencedLine(line)) continue;
    visit(line, body.startLine + i);
  }
}

/**
 * Split `text` into its body, after any YAML frontmatter. The body starts at
 * line 1 when the file has no frontmatter, so the line numbers of everything
 * scanned still point into the original file.
 */
export function documentBody(text: string): DocumentBody {
  const { bodyStartLine } = parseFrontmatter(text);
  const lines = text.split(/\r?\n/);
  return { lines: lines.slice(bodyStartLine - 1), startLine: bodyStartLine };
}

// Inline links: `[text](target)` and images `![alt](target)`, with the target
// either bare or angle-bracket wrapped. Link text may not contain brackets,
// which no document in these homes needs.
const INLINE_LINK = /\[[^\]]*\]\(\s*(?:<([^>]*)>|([^)\s]+))\s*\)/g;

// An inline code span, backtick wrapped. Its content renders as code, so a
// link written inside one is not a link.
const CODE_SPAN = /`+[^`]*`+/g;

/**
 * Every inline link in the body, outside fenced code blocks and inline code
 * spans. A link that renders as code is not a link, so it is not reported.
 */
export function extractInlineLinks(body: DocumentBody): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  unfencedLines(body, (line, lineNo) => {
    const text = line.replace(CODE_SPAN, "");
    for (const match of text.matchAll(INLINE_LINK)) {
      const target = (match[1] ?? match[2] ?? "").trim();
      if (target.length === 0) continue;
      links.push({ target, line: lineNo });
    }
  });
  return links;
}

/** Any URL scheme (`https:`, `mailto:`, `tel:`, ...) or a protocol-relative `//host`. */
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

/** The anchor slugs a target string splits into, ignoring external links. */
export function splitLinkTarget(target: string): LinkTarget | null {
  if (EXTERNAL.test(target)) return null;
  const hashIndex = target.indexOf("#");
  if (hashIndex === -1) return { path: target, anchor: "" };
  return { path: target.slice(0, hashIndex), anchor: target.slice(hashIndex + 1) };
}

/**
 * Resolve a local link target path: relative to the linking file, or to the
 * project root when it starts with `/`, the way a site renders it.
 */
export function resolveLinkPath(root: string, fromFile: string, targetPath: string): string {
  if (targetPath.startsWith("/")) return path.join(root, targetPath);
  return path.resolve(path.dirname(fromFile), targetPath);
}

/**
 * The GitHub-style anchor slug of one heading: lowercase, punctuation
 * dropped, spaces turned into hyphens.
 */
function headingSlug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]+/gu, "")
    .replace(/\s+/g, "-");
}

const ATX_HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;

/**
 * The anchor slugs of every heading in the body, outside fenced code
 * blocks. Duplicate headings are suffixed the way GitHub does: the second
 * `## Examples` heading gets the slug `examples-1`, the third `examples-2`.
 */
export function headingAnchors(body: DocumentBody): Set<string> {
  const anchors = new Set<string>();
  const seen = new Map<string, number>();
  unfencedLines(body, (line) => {
    const match = ATX_HEADING.exec(line);
    if (match === null) return;
    const slug = headingSlug(match[1]);
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    anchors.add(count === 0 ? slug : `${slug}-${count}`);
  });
  return anchors;
}
