/**
 * Document discovery: walk the configured documentation homes and read each
 * document's metadata from its frontmatter.
 *
 * Discovery reads frontmatter fields only. It never reads body text beyond the
 * first H1 used as a title fallback, and it never consults hand-maintained
 * index entries, so the catalog cannot inherit descriptions or titles from a
 * stale index.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { PathKey, Project } from "../config.ts";
import { parseFrontmatter } from "./frontmatter.ts";

/** A document's type, named by the home it lives in. */
export type DocType = "canon" | "overview" | "proposal" | "plan";

/** The display order of document types in catalogs. */
export const TYPE_ORDER: readonly DocType[] = ["canon", "overview", "proposal", "plan"];

/** The metadata of one discovered document. */
export interface DocumentMeta {
  /** Repo-relative path with forward slashes. */
  path: string;
  type: DocType;
  title: string;
  /** Frontmatter description, or null when the document has none. */
  description: string | null;
  bytes: number;
  /** Present for proposals and plans only. */
  status?: string | null;
  /** Present for proposals and plans only. */
  created?: string | null;
  authority: string;
  problems: string[];
}

export interface DiscoveryResult {
  documents: DocumentMeta[];
  warnings: string[];
}

/** A home to walk: its config key, the document type it holds, and its mode. */
interface Home {
  /** The label used in warnings and text output, matching `--type` values. */
  label: string;
  /** The manifest or conventional path key this home reads. */
  pathKey: PathKey;
  type: DocType;
  /** Overviews nest in subfolders; the other homes list their top level only. */
  recursive: boolean;
  /** Navigation indexes are never documents of their home's type. */
  skipIndex: boolean;
}

const HOMES: readonly Home[] = [
  { label: "canon", pathKey: "design", type: "canon", recursive: false, skipIndex: true },
  { label: "overviews", pathKey: "overviews", type: "overview", recursive: true, skipIndex: true },
  { label: "proposals", pathKey: "proposals", type: "proposal", recursive: false, skipIndex: false },
  { label: "plans", pathKey: "plans", type: "plan", recursive: false, skipIndex: false },
];

/**
 * The authority label a document's type and status give it. Every retrieval
 * command carries this label, so a draft proposal never reads as accepted and
 * an overview never reads as canon.
 */
export function authorityOf(doc: {
  type: DocType;
  status?: string | null;
}): string {
  switch (doc.type) {
    case "canon":
      return "canon";
    case "overview":
      return "memory (verify against code)";
    case "proposal": {
      if (doc.status === "accepted") return "accepted proposal";
      const prefix = doc.status === null || doc.status === undefined ? "" : `${doc.status} `;
      return `${prefix}proposal (not authorization)`;
    }
    case "plan": {
      const prefix = doc.status === null || doc.status === undefined ? "" : `${doc.status} `;
      return `${prefix}plan`;
    }
  }
}

function isMarkdown(name: string): boolean {
  return name.endsWith(".md");
}

/** Markdown files directly inside `dir`, in stable name order. */
export function topLevelMarkdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isMarkdown(entry.name))
    .map((entry) => path.join(dir, entry.name))
    .sort();
}

/** Markdown files inside `dir` and its subfolders, depth first. */
export function walkMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  );
  for (const entry of entries) {
    if (entry.isDirectory()) {
      files.push(...walkMarkdownFiles(path.join(dir, entry.name)));
    } else if (entry.isFile() && isMarkdown(entry.name)) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

/** The document body's first ATX H1 outside a fenced code block, or null. */
function firstHeading(lines: string[], bodyStartLine: number): string | null {
  let fenced = false;
  for (let i = bodyStartLine - 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (fenced) continue;
    const match = /^#\s+(.*\S)\s*$/.exec(line);
    if (match) return match[1].trim();
  }
  return null;
}

/**
 * Read one frontmatter string field. Returns null when absent or empty, and
 * reports a problem when the field is present but not a string.
 */
function stringField(
  data: Record<string, unknown>,
  key: string,
  problems: string[],
): string | null {
  const value = data[key];
  if (value === undefined) return null;
  if (typeof value !== "string") {
    problems.push(`'${key}' is not a string`);
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readDocument(project: Project, file: string, type: DocType): DocumentMeta {
  const text = readFileSync(file, "utf8");
  const { data, bodyStartLine, problems } = parseFrontmatter(text);

  let title = stringField(data, "title", problems);
  if (title === null) {
    // When frontmatter parsing already reported a problem, that problem says
    // it; a separate "missing title" would only point at the wrong fix.
    // Title is the first field read, so `problems` here is parse-only.
    if (data.title === undefined && problems.length === 0) {
      problems.push("missing title");
    } else if (typeof data.title === "string") {
      problems.push("missing title: 'title' is empty");
    }
    // The title falls back to the first H1 and then to the file name; both
    // cases keep the problem so the gap stays visible.
    const lines = text.split(/\r?\n/);
    title = firstHeading(lines, bodyStartLine) ?? path.basename(file, ".md");
  }

  const doc: DocumentMeta = {
    path: path.relative(project.root, file).split(path.sep).join("/"),
    type,
    title,
    description: stringField(data, "description", problems),
    bytes: statSync(file).size,
    authority: "",
    problems,
  };

  if (type === "proposal" || type === "plan") {
    doc.status = stringField(data, "status", problems);
    doc.created = stringField(data, "created", problems);
  }

  doc.authority = authorityOf(doc);
  return doc;
}

function repoRelative(project: Project, dir: string): string {
  return path.relative(project.root, dir).split(path.sep).join("/");
}

/**
 * Walk a project's documentation homes and collect each document's metadata.
 *
 * A home folder that does not exist contributes no documents and one warning.
 * Canon, proposals, and plans list the top level of their home; overviews nest.
 */
export function discoverDocuments(project: Project): DiscoveryResult {
  const documents: DocumentMeta[] = [];
  const warnings: string[] = [];

  for (const home of HOMES) {
    const dir = project.paths[home.pathKey];
    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(dir);
    } catch {
      warnings.push(`${home.label} home not found: ${repoRelative(project, dir)}`);
      continue;
    }
    if (!stats.isDirectory()) {
      warnings.push(`${home.label} home is not a directory: ${repoRelative(project, dir)}`);
      continue;
    }

    const files = home.recursive ? walkMarkdownFiles(dir) : topLevelMarkdownFiles(dir);
    for (const file of files) {
      if (home.skipIndex && path.basename(file) === "index.md") continue;
      documents.push(readDocument(project, file, home.type));
    }
  }

  documents.sort((a, b) => {
    const byType =
      TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type);
    return byType !== 0 ? byType : a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
  });

  return { documents, warnings };
}
