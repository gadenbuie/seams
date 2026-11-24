/**
 * `seams find`: case-insensitive substring search over the project's
 * documents, with bounded output.
 *
 * A document matches when every query word appears in the same section. A
 * section is the text from one heading to the next, found by a simple line
 * scan that ignores fenced code, so a fence never starts a section; the lines
 * inside a fence still count as body text of the section they sit in. Titles
 * and descriptions are searchable too: they rank a document's results first,
 * and a document whose sections do not match but whose title or description
 * does still yields one result, so a title-only query finds the document.
 *
 * Output is bounded: results are capped by --limit and --max-bytes, results
 * hidden by default status exclusions are counted separately, and both text
 * and JSON output say when anything was left out.
 */
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import path from "node:path";
import { findRoot, loadProject, type Project } from "../config.ts";
import { discoverDocuments, type DocType, type DocumentMeta } from "../docs/discover.ts";
import { parseFrontmatter } from "../docs/frontmatter.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command, CommandContext } from "./index.ts";

const TYPE_FLAGS = ["canon", "overviews", "proposals", "plans"] as const;

const FLAG_TO_TYPE: Record<(typeof TYPE_FLAGS)[number], DocType> = {
  canon: "canon",
  overviews: "overview",
  proposals: "proposal",
  plans: "plan",
};

const DEFAULT_LIMIT = 10;
const DEFAULT_MAX_BYTES = 8000;
/** The excerpt holds at most this many characters around the match. */
const EXCERPT_CHARS = 160;
/** How much of the excerpt window sits before the match. */
const EXCERPT_BEFORE = 60;

/** Proposal statuses hidden from the default results. */
const PROPOSAL_HIDDEN_STATUSES = ["draft", "rejected", "deferred", "withdrawn"];
/** Plan statuses hidden from the default results. */
const PLAN_HIDDEN_STATUSES = ["draft", "abandoned"];

const USAGE =
  "Usage: seams find <query> [--type canon|overviews|proposals|plans] " +
  "[--status <status>] [--include-all] [--limit N] [--max-bytes N]";

function usageError(message: string): number {
  process.stderr.write(`${message}\n${USAGE}\n`);
  return 2;
}

/** One search result, in the shape both outputs carry. */
interface FindResult {
  path: string;
  heading: string | null;
  line: number;
  excerpt: string;
  authority: string;
}

/** A result before the output caps are applied, with its ranking data. */
interface Candidate extends FindResult {
  /** Query-word occurrences inside this result's section. */
  occurrences: number;
  excerptBytes: number;
  titleMatch: boolean;
  descriptionMatch: boolean;
  headingMatch: boolean;
}

/** One section of a document, as the line scan found and searched it. */
interface Section {
  /** The heading text without the `#`s, or null before the first heading. */
  heading: string | null;
  /** The query words found anywhere in the section, heading line included. */
  words: Set<string>;
  /** The query words found in the heading text itself. */
  headingWords: Set<string>;
  /** How many times any query word occurs in the section. */
  occurrences: number;
  /** The earliest occurrence: 1-indexed line and character offset in the text. */
  first: { line: number; offset: number } | null;
}

function newSection(heading: string | null): Section {
  return { heading, words: new Set(), headingWords: new Set(), occurrences: 0, first: null };
}

/**
 * The query words that appear in a heading's text. All of them being present
 * is what makes a section a heading match rather than a body match.
 */
function headingWords(heading: string, words: string[]): Set<string> {
  const lower = heading.toLowerCase();
  return new Set(words.filter((word) => lower.includes(word)));
}

/** Record every query-word occurrence on one line into its section. */
function scanLine(
  section: Section,
  text: string,
  line: number,
  lineStart: number,
  words: string[],
): void {
  const lower = text.toLowerCase();
  for (const word of words) {
    let at = lower.indexOf(word);
    while (at !== -1) {
      section.words.add(word);
      section.occurrences++;
      const offset = lineStart + at;
      if (section.first === null || offset < section.first.offset) {
        section.first = { line, offset };
      }
      at = lower.indexOf(word, at + word.length);
    }
  }
}

/**
 * Scan a document's body and return its sections in document order.
 *
 * The scan starts after the frontmatter block and skips headings inside
 * fenced code, following the same simple fence rule discovery uses: a line
 * starting with ``` or ~~~ toggles the fence state. Fenced lines are still
 * scanned as body text of the section they sit in. Line numbers are 1-indexed
 * over the whole file, so they match a later `read --lines` selection.
 */
function scanSections(text: string, words: string[]): Section[] {
  const { bodyStartLine } = parseFrontmatter(text);
  const sections: Section[] = [newSection(null)];
  let current = sections[0];
  let fenced = false;
  let line = 0;
  let offset = 0;

  for (const chunk of text.split(/(?<=\r?\n)/)) {
    line++;
    const content = chunk.replace(/\r?\n$/, "");
    const lineStart = offset;
    offset += chunk.length;
    if (line < bodyStartLine) continue; // still inside the frontmatter block
    if (/^\s*(```|~~~)/.test(content)) fenced = !fenced;
    if (!fenced) {
      const heading = /^ {0,3}#{1,6}\s+(.*)$/.exec(content);
      if (heading !== null) {
        const headingText = heading[1].trim();
        current = newSection(headingText);
        current.headingWords = headingWords(headingText, words);
        sections.push(current);
      }
    }
    scanLine(current, content, line, lineStart, words);
  }
  return sections;
}

/** Collapse internal whitespace so one excerpt stays on one text line. */
function squashWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * An excerpt of at most EXCERPT_CHARS characters around `offset`, with
 * context kept before the match and an ellipsis on each clipped side.
 */
function excerptAround(text: string, offset: number): string {
  let start = Math.max(0, offset - EXCERPT_BEFORE);
  let end = Math.min(text.length, start + EXCERPT_CHARS);
  if (end - start < EXCERPT_CHARS) start = Math.max(0, end - EXCERPT_CHARS);
  let excerpt = text.slice(start, end);
  if (start > 0) excerpt = `…${excerpt}`;
  if (end < text.length) excerpt = `${excerpt}…`;
  return squashWhitespace(excerpt);
}

/**
 * Collect one document's matching results: one per matching section, plus a
 * single fallback result anchored at the first body line when no section
 * matches but the title or description does.
 */
function documentCandidates(
  project: Project,
  doc: DocumentMeta,
  words: string[],
): Candidate[] {
  const file = path.join(project.root, doc.path);
  const text = readFileSync(file, "utf8");

  const lowerTitle = doc.title.toLowerCase();
  const titleMatch = words.every((word) => lowerTitle.includes(word));
  const lowerDescription = doc.description === null ? null : doc.description.toLowerCase();
  const descriptionMatch =
    lowerDescription !== null && words.every((word) => lowerDescription.includes(word));

  const candidates: Candidate[] = [];
  for (const section of scanSections(text, words)) {
    if (section.words.size !== words.length || section.first === null) continue;
    const excerpt = excerptAround(text, section.first.offset);
    candidates.push({
      path: doc.path,
      heading: section.heading,
      line: section.first.line,
      excerpt,
      authority: doc.authority,
      occurrences: section.occurrences,
      excerptBytes: Buffer.byteLength(excerpt, "utf8"),
      titleMatch,
      descriptionMatch,
      headingMatch: section.heading !== null && section.headingWords.size === words.length,
    });
  }

  if (candidates.length === 0 && (titleMatch || descriptionMatch)) {
    // The document matches only through its frontmatter. Point at its first
    // body line and quote the matched metadata, so the caller can still read on.
    const excerpt = squashWhitespace(
      descriptionMatch && doc.description !== null
        ? `${doc.title} — ${doc.description}`
        : doc.title,
    );
    candidates.push({
      path: doc.path,
      heading: doc.title,
      line: parseFrontmatter(text).bodyStartLine,
      excerpt,
      authority: doc.authority,
      occurrences: 0,
      excerptBytes: Buffer.byteLength(excerpt, "utf8"),
      titleMatch,
      descriptionMatch,
      headingMatch: false,
    });
  }
  return candidates;
}

/**
 * Whether the default status exclusions hide a document: proposals with
 * status draft, rejected, deferred, or withdrawn, and plans with status
 * draft or abandoned. A document without a status is never hidden.
 */
function hiddenByDefault(doc: DocumentMeta): boolean {
  if (doc.type === "proposal") {
    return doc.status != null && PROPOSAL_HIDDEN_STATUSES.includes(doc.status);
  }
  if (doc.type === "plan") {
    return doc.status != null && PLAN_HIDDEN_STATUSES.includes(doc.status);
  }
  return false;
}

/**
 * Parse a whole number of at least 1, or null when the value is not one.
 * An absent value takes the default.
 */
function positiveInt(value: string | undefined, fallback: number): number | null {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1) return null;
  return Number(value);
}

function run(ctx: CommandContext): number {
  let values: {
    type?: string;
    status?: string;
    "include-all"?: boolean;
    limit?: string;
    "max-bytes"?: string;
  };
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      args: ctx.args,
      options: {
        type: { type: "string" },
        status: { type: "string" },
        "include-all": { type: "boolean" },
        limit: { type: "string" },
        "max-bytes": { type: "string" },
      },
      allowPositionals: true,
    }));
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }

  if (positionals.length === 0) return usageError("Missing query.");
  if (positionals.length > 1) {
    return usageError(`Unexpected argument: ${positionals[1]}`);
  }
  const query = positionals[0];
  const words = [
    ...new Set(
      query
        .split(/\s+/)
        .filter((word) => word.length > 0)
        .map((word) => word.toLowerCase()),
    ),
  ];
  if (words.length === 0) return usageError("The query is empty.");

  let filter: DocType | undefined;
  if (values.type !== undefined) {
    const flag = values.type as (typeof TYPE_FLAGS)[number];
    if (!TYPE_FLAGS.includes(flag)) {
      return usageError(
        `Unknown type '${values.type}'. Expected one of: ${TYPE_FLAGS.join(", ")}`,
      );
    }
    filter = FLAG_TO_TYPE[flag];
  }

  const limit = positiveInt(values.limit, DEFAULT_LIMIT);
  if (limit === null) {
    return usageError(`--limit must be a whole number of at least 1, got '${values.limit}'.`);
  }
  const maxBytes = positiveInt(values["max-bytes"], DEFAULT_MAX_BYTES);
  if (maxBytes === null) {
    return usageError(
      `--max-bytes must be a whole number of at least 1, got '${values["max-bytes"]}'.`,
    );
  }

  const project = loadProject(findRoot(process.cwd()));
  const { documents, warnings } = discoverDocuments(project);
  const typed = filter === undefined ? documents : documents.filter((doc) => doc.type === filter);

  // Status filtering. An explicit --status is a filter like --type: only
  // documents carrying that exact status are searched, so canon and overviews,
  // which have no status, drop out. The default exclusions apply only when
  // neither --status nor --include-all relaxes them.
  let searchable: DocumentMeta[];
  let hidden: DocumentMeta[];
  if (values.status !== undefined) {
    searchable = typed.filter((doc) => doc.status === values.status);
    hidden = [];
  } else if (values["include-all"] === true) {
    searchable = typed;
    hidden = [];
  } else {
    searchable = typed.filter((doc) => !hiddenByDefault(doc));
    hidden = typed.filter(hiddenByDefault);
  }

  const candidates: Candidate[] = [];
  for (const doc of searchable) {
    candidates.push(...documentCandidates(project, doc, words));
  }
  // Excluded documents are scanned too, so the output can say how many of
  // their results the status rules kept out of sight.
  let excluded = 0;
  for (const doc of hidden) {
    excluded += documentCandidates(project, doc, words).length;
  }

  // Ranking: title match first, then description, then heading match, then
  // body, then more matches, then path.
  candidates.sort(
    (a, b) =>
      (a.titleMatch ? 0 : 1) - (b.titleMatch ? 0 : 1) ||
      (a.descriptionMatch ? 0 : 1) - (b.descriptionMatch ? 0 : 1) ||
      (a.headingMatch ? 0 : 1) - (b.headingMatch ? 0 : 1) ||
      b.occurrences - a.occurrences ||
      (a.path < b.path ? -1 : a.path > b.path ? 1 : 0) ||
      a.line - b.line,
  );

  // The caps walk the ranked results once: a result is emitted while the
  // count is under the limit and its excerpt fits in the byte budget.
  const emitted: Candidate[] = [];
  let bytes = 0;
  for (const candidate of candidates) {
    if (emitted.length >= limit) break;
    if (bytes + candidate.excerptBytes > maxBytes) break;
    emitted.push(candidate);
    bytes += candidate.excerptBytes;
  }
  const omitted = candidates.length - emitted.length;
  const truncated = omitted > 0;

  if (ctx.json) {
    printJson(
      jsonEnvelope("find", {
        query,
        results: emitted.map(({ path, heading, line, excerpt, authority }) => ({
          path,
          heading,
          line,
          excerpt,
          authority,
        })),
        excluded,
        truncated,
        omitted,
        warnings,
      }),
    );
    return 0;
  }

  if (emitted.length === 0 && excluded === 0) {
    printText(`No matches for '${query}'.`);
  }
  for (const result of emitted) {
    printText(
      `${result.path}:${result.line} · ${result.authority} · ${result.heading ?? "(no heading)"}`,
    );
    printText(`  ${result.excerpt}`);
  }
  if (excluded > 0) printText(`Excluded by status: ${excluded} results.`);
  if (omitted > 0) printText(`Showing ${emitted.length} of ${candidates.length} results.`);
  for (const warning of warnings) {
    process.stderr.write(`warning: ${warning}\n`);
  }
  return 0;
}

export const findCommand: Command = {
  summary: "search the project's documents for text",
  run,
};
