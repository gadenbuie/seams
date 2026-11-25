/**
 * Reference lookup: find the lines in the project's documents that name or
 * link to supplied paths.
 *
 * A reference is one of two things:
 *
 * - A Markdown link target (inline destination, reference definition, or
 *   reference usage) that resolves, relative to the linking document, to one
 *   of the supplied files or to a file inside a supplied directory.
 * - The repo-relative path of a supplied file appearing as text on a line,
 *   optionally followed by a `:line` or `#anchor` suffix, including inside
 *   code spans and fenced blocks.
 *
 * Matching is by whole path segments: `src/a/b.ts` never matches inside
 * `xsrc/a/b.ts`, `src/a/b.tsx`, or `src/a/b.ts.old`. Text mentions are
 * case-sensitive and must spell the repo-relative path exactly, so `./src/a.ts`
 * and `/src/a.ts` do not match `src/a.ts`.
 *
 * `findReferences` takes repo-relative paths with forward slashes, files or
 * directories, and returns one record per document that references any of
 * them. It stays free of command-layer concerns (parsing, output, exit codes)
 * so the reconcile command can reuse it as the same lookup `impact` uses.
 */
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Project } from "../config.ts";
import { discoverDocuments, type DocumentMeta } from "./discover.ts";

/** One referencing line in a document. */
export interface ReferenceLine {
  /** The 1-indexed line number. */
  line: number;
  /** The line's text, trailing whitespace and carriage returns removed. */
  text: string;
  /** How the line references a supplied path. */
  kind: "link" | "text";
}

/** The references one document holds. */
export interface DocumentReferences {
  /** Repo-relative path with forward slashes, as discovery reports it. */
  path: string;
  type: DocumentMeta["type"];
  /** Frontmatter status, or null for canon and overviews. */
  status: string | null;
  authority: string;
  /**
   * True for a home's own index.md, which discovery scans as a navigation
   * page rather than a document of its home's type.
   */
  index?: boolean;
  /** The referencing lines, in line order. */
  lines: ReferenceLine[];
}

export interface ReferencesResult {
  /** Only the documents that reference at least one supplied path. */
  documents: DocumentReferences[];
  warnings: string[];
}

/** The supplied paths a document can name or link to. */
interface Targets {
  /** Repo-relative paths of supplied files, and of every file inside a supplied directory. */
  files: Set<string>;
  /** Repo-relative paths of supplied directories. */
  dirs: string[];
}

/** Characters that would extend the first segment of a path mention. */
const SEGMENT_CHAR = /[A-Za-z0-9_.\-/]/;
/** Characters after a mention that continue the path instead of ending it. */
const CONTINUES_PATH = /[A-Za-z0-9_/\-]/;
/** A `:line` or `:start-end` suffix. */
const LINE_SUFFIX = /^:\d+(?:-\d+)?/;
/** An `#anchor` suffix, up to the next whitespace. */
const ANCHOR_SUFFIX = /^#[^\s]*/;
/** A URL-like scheme (`https:`, `mailto:`) that can never be a repo path. */
const SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*:/;

/** Deduplicate and tidy repo-relative inputs: `./a//b/` becomes `a/b`. */
function normalizeInputs(paths: string[]): string[] {
  const seen = new Set<string>();
  for (const given of paths) {
    let normalized = path.posix.normalize(given);
    while (normalized.endsWith("/")) normalized = normalized.slice(0, -1);
    if (normalized.length === 0 || normalized === "." || normalized === "/") continue;
    seen.add(normalized);
  }
  return [...seen];
}

/**
 * Collect the supplied paths a document can name or link to. Directories are
 * kept as prefixes rather than expanded file by file: the prefix checks match
 * links and text mentions of anything inside them, including files that do
 * not exist yet, and no walk has to descend into `node_modules`-scale trees.
 * A path that does not exist stays a literal file target, because references
 * to a planned or deleted file are exactly what an impact report looks for.
 */
function expandTargets(project: Project, inputs: string[]): Targets {
  const targets: Targets = { files: new Set(), dirs: [] };
  for (const input of inputs) {
    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(path.join(project.root, input));
    } catch {
      targets.files.add(input);
      continue;
    }
    if (stats.isDirectory()) {
      targets.dirs.push(input);
    } else {
      targets.files.add(input);
    }
  }
  return targets;
}

/**
 * Resolve a link target against the linking document's directory and return
 * its repo-relative path, or null when the target points outside the project
 * or cannot be a file (a scheme such as `https:`, a bare `#fragment`).
 * The `#fragment` part of a link never takes part in resolution.
 */
function resolveLink(project: Project, docDir: string, rawTarget: string): string | null {
  let target = rawTarget.trim();
  if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
  const hash = target.indexOf("#");
  if (hash !== -1) target = target.slice(0, hash);
  target = target.trim();
  if (target.length === 0 || SCHEME.test(target)) return null;
  const abs = path.resolve(docDir, target);
  const rel = path.relative(project.root, abs).split(path.sep).join("/");
  if (rel.length === 0 || rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel;
}

/** Whether a resolved repo-relative path hits a supplied file or directory. */
function hitsTarget(targets: Targets, rel: string): boolean {
  if (targets.files.has(rel)) return true;
  return targets.dirs.some((dir) => rel === dir || rel.startsWith(`${dir}/`));
}

/**
 * Whether the line mentions `target` as a whole path: the character before
 * must not extend its first segment, and what follows must end the path (a
 * `:line` or `#anchor` suffix may sit between). A directory mention may be
 * followed by `/` and more segments, since that names a path inside it. A
 * one-segment directory name (`src`) is also an ordinary word, so it counts
 * only when the `/` follows; a longer directory path is unlikely to appear
 * as plain prose and counts as a bare mention too.
 */
function pathMention(line: string, target: string, isDir: boolean): boolean {
  const oneSegmentDir = isDir && !target.includes("/");
  let at = line.indexOf(target);
  while (at !== -1) {
    const before = at > 0 ? line[at - 1] : "";
    if (!SEGMENT_CHAR.test(before)) {
      let end = at + target.length;
      let suffixed = false;
      if (line[end] === ":") {
        const match = LINE_SUFFIX.exec(line.slice(end));
        if (match) {
          end += match[0].length;
          suffixed = true;
        }
      } else if (line[end] === "#") {
        end += ANCHOR_SUFFIX.exec(line.slice(end))![0].length;
        suffixed = true;
      }
      const next = line[end] ?? "";
      if (oneSegmentDir) {
        if (next === "/") return true;
      } else {
        const continues =
          next !== "" &&
          (CONTINUES_PATH.test(next) || (next === "." && /[A-Za-z0-9]/.test(line[end + 1] ?? "")));
        if (!continues || (isDir && next === "/")) return true;
      }
    }
    at = line.indexOf(target, at + 1);
  }
  return false;
}

/** Whether any supplied path is mentioned as text on the line. */
function textMention(line: string, targets: Targets): boolean {
  for (const file of targets.files) {
    if (pathMention(line, file, false)) return true;
  }
  for (const dir of targets.dirs) {
    if (pathMention(line, dir, true)) return true;
  }
  return false;
}

/** The destination of an inline Markdown link or image: `[text](dest "title")`. */
const INLINE_LINK = /\[[^\]]*\]\(([^)]*)\)/g;
/** A reference definition: `[label]: dest` at the start of a line. */
const REFERENCE_DEFINITION = /^\s*\[[^\]]+\]:\s*(.+)$/;
/** A reference usage: `[text][label]` or the shorthand `[label][]`. */
const REFERENCE_USAGE = /\[([^\]]*)\]\[([^\]]*)\]/g;

/** The destination token of a destination string: up to the first whitespace, or a `<...>` group. */
function destinationOf(destinations: string): string | null {
  const trimmed = destinations.trim();
  if (trimmed.startsWith("<")) {
    const end = trimmed.indexOf(">");
    return end === -1 ? null : trimmed.slice(0, end + 1);
  }
  const token = trimmed.split(/\s+/)[0] ?? "";
  return token.length > 0 ? token : null;
}

/** The lookup key of a reference label. Markdown labels are case-insensitive. */
function labelKey(label: string): string {
  return label.trim().toLowerCase();
}

/**
 * Scan one document line by line and collect the lines that reference a
 * supplied path. Reference definitions are collected first, so a usage may
 * sit above its definition. On a line that both links and names a path, the
 * line is reported once, as a link.
 */
function scanDocument(
  project: Project,
  docAbs: string,
  lines: string[],
  targets: Targets,
): ReferenceLine[] {
  const definitions = new Map<string, string>();
  for (const line of lines) {
    const match = REFERENCE_DEFINITION.exec(line);
    if (!match) continue;
    const destination = destinationOf(match[1]);
    if (destination === null) continue;
    const label = /^\s*\[([^\]]+)\]/.exec(line)?.[1] ?? "";
    definitions.set(labelKey(label), destination);
  }

  const docDir = path.dirname(docAbs);
  const found: ReferenceLine[] = [];
  const seen = new Set<number>();
  const add = (lineNumber: number, kind: ReferenceLine["kind"]): void => {
    if (seen.has(lineNumber)) return;
    seen.add(lineNumber);
    found.push({ line: lineNumber, text: lines[lineNumber - 1].replace(/\r$/, "").trimEnd(), kind });
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const lineNumber = index + 1;

    let matchedLink = false;
    const linkTarget = (raw: string | null): boolean => {
      if (raw === null) return false;
      const rel = resolveLink(project, docDir, raw);
      return rel !== null && hitsTarget(targets, rel);
    };

    for (const match of line.matchAll(INLINE_LINK)) {
      if (linkTarget(destinationOf(match[1]))) {
        add(lineNumber, "link");
        matchedLink = true;
        break;
      }
    }
    if (!matchedLink) {
      for (const match of line.matchAll(REFERENCE_USAGE)) {
        const label = match[2].length > 0 ? match[2] : match[1];
        if (linkTarget(definitions.get(labelKey(label)) ?? null)) {
          add(lineNumber, "link");
          matchedLink = true;
          break;
        }
      }
    }
    if (!matchedLink) {
      const definition = REFERENCE_DEFINITION.exec(line);
      if (definition && linkTarget(destinationOf(definition[1]))) {
        add(lineNumber, "link");
        matchedLink = true;
      }
    }
    if (!matchedLink && textMention(line, targets)) add(lineNumber, "text");
  }
  return found;
}

/**
 * Find the lines in the project's documents that name or link to `paths`.
 * `paths` holds repo-relative paths with forward slashes, files or
 * directories. Documents are scanned in discovery order; only documents with
 * at least one referencing line are returned.
 */
export function findReferences(project: Project, paths: string[]): ReferencesResult {
  const targets = expandTargets(project, normalizeInputs(paths));
  // Each home's index.md joins the scanned documents, so links from the
  // navigation indexes are reported like links from any other document.
  const { documents, warnings } = discoverDocuments(project, { includeIndexes: true });
  // Notes are excluded: they are local, lowest-weight context, not maintained
  // documents or coordination artifacts, so impact and reconcile never report
  // them.
  const scanned = documents.filter((doc) => doc.type !== "note");

  const found: DocumentReferences[] = [];
  for (const doc of scanned) {
    const abs = path.join(project.root, doc.path);
    let text: string;
    try {
      text = readFileSync(abs, "utf8");
    } catch {
      warnings.push(`could not read document: ${doc.path}`);
      continue;
    }
    const lines = scanDocument(project, abs, text.split("\n"), targets);
    if (lines.length === 0) continue;
    found.push({
      path: doc.path,
      type: doc.type,
      status: doc.status ?? null,
      authority: doc.authority,
      ...(doc.index === true ? { index: true } : {}),
      lines,
    });
  }
  return { documents: found, warnings };
}
