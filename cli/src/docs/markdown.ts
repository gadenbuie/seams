/**
 * Markdown body scanning for the checks: inline links and heading anchors.
 *
 * Scanning works on the document body, after frontmatter, and skips fenced
 * code blocks: a reader follows links and headings where they are written,
 * and a checker must not report a link that Markdown renders as code.
 */
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

/** True when `line` opens or closes a fenced code block. */
function fenceToggle(state: { fenced: boolean }, line: string): boolean {
  if (/^\s{0,3}(~~~|```)/.test(line)) {
    state.fenced = !state.fenced;
    return true;
  }
  return false;
}

/** Walk every body line outside fenced code blocks, with its file line number. */
export function unfencedLines(
  body: DocumentBody,
  visit: (line: string, lineNo: number) => void,
): void {
  const state = { fenced: false };
  for (let i = 0; i < body.lines.length; i++) {
    const line = body.lines[i];
    if (fenceToggle(state, line)) continue;
    if (state.fenced) continue;
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

/**
 * Every inline link in the body, outside fenced code blocks. A link inside
 * a fence renders as code and is not a link, so it is not reported.
 */
export function extractInlineLinks(body: DocumentBody): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  unfencedLines(body, (line, lineNo) => {
    for (const match of line.matchAll(INLINE_LINK)) {
      const target = (match[1] ?? match[2] ?? "").trim();
      if (target.length === 0) continue;
      links.push({ target, line: lineNo });
    }
  });
  return links;
}

/** The anchor slugs a target string splits into, ignoring external links. */
export function splitLinkTarget(target: string): LinkTarget | null {
  if (/^(https?:|mailto:)/i.test(target)) return null;
  const hashIndex = target.indexOf("#");
  if (hashIndex === -1) return { path: target, anchor: "" };
  return { path: target.slice(0, hashIndex), anchor: target.slice(hashIndex + 1) };
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
