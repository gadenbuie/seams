/**
 * `seams read`: print a whole document, one section, or one inclusive line
 * range. `seams read outline <document>` prints the document's headings with
 * their line ranges and byte sizes.
 *
 * A document is a repo-relative path, or a path inside any configured home.
 * A resolution that leaves the repository root, directly or through a symlink,
 * is rejected. Every output carries the document's path, its authority label,
 * and the exact line range returned, so a later read can target the same
 * passage. Reads never write files and never touch the network.
 */
import { readFileSync, realpathSync, statSync } from "node:fs";
import { parseArgs } from "node:util";
import path from "node:path";
import { findRoot, loadProject, PATH_KEYS, type Project } from "../config.ts";
import { authorityOf, type DocType } from "../docs/discover.ts";
import { parseFrontmatter } from "../docs/frontmatter.ts";
import { outline, type DocLine, type Heading } from "../docs/outline.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command, CommandContext } from "./index.ts";

const USAGE = [
  "Usage: seams read <document> [--section <heading> | --lines <a-b>]",
  "       seams read outline <document>",
].join("\n");

const HOME_TYPES: Record<(typeof PATH_KEYS)[number], DocType> = {
  design: "canon",
  overviews: "overview",
  proposals: "proposal",
  plans: "plan",
};

function usageError(message: string): number {
  process.stderr.write(`${message}\n${USAGE}\n`);
  return 2;
}

function runtimeError(message: string): number {
  process.stderr.write(`${message}\n`);
  return 1;
}

/**
 * Resolve a document argument: a repo-relative path, or a path inside any
 * configured home, in that order. Resolutions that leave the repository root,
 * including through a symlink, throw.
 */
export function resolveDocument(project: Project, input: string): string {
  const root = realpathSync(project.root);
  const outside = (candidate: string): boolean => {
    const rel = path.relative(root, candidate);
    return rel.startsWith("..") || path.isAbsolute(rel);
  };

  const direct = path.resolve(project.root, input);
  const directRel = path.relative(project.root, direct);
  if (directRel.startsWith("..") || path.isAbsolute(directRel)) {
    throw new Error(`'${input}' resolves outside the repository root.`);
  }

  const candidates = [
    direct,
    ...PATH_KEYS.map((key) => path.resolve(project.paths[key], input)),
  ];
  for (const candidate of candidates) {
    let real: string;
    try {
      real = realpathSync(candidate);
    } catch {
      continue; // this candidate does not exist; the next may
    }
    if (outside(real)) {
      throw new Error(`'${input}' resolves outside the repository root.`);
    }
    if (statSync(real).isFile()) return real;
  }
  throw new Error(`Document not found: ${input}`);
}

/** The document's type from the home that contains it, or null outside every home. */
function typeOf(project: Project, file: string): DocType | null {
  const root = realpathSync(project.root);
  let best: { type: DocType; length: number } | null = null;
  for (const key of PATH_KEYS) {
    let home: string;
    try {
      home = realpathSync(project.paths[key]);
    } catch {
      continue;
    }
    const rel = path.relative(home, file);
    if (rel.startsWith("..") || path.isAbsolute(rel)) continue;
    // The overviews home nests inside the design home, so the longest
    // containing prefix wins.
    if (best === null || home.length > best.length) {
      best = { type: HOME_TYPES[key], length: home.length };
    }
  }
  return best?.type ?? null;
}

/** The authority label a document gets from its home and frontmatter status. */
function authorityOfDoc(project: Project, file: string, text: string): string | null {
  const type = typeOf(project, file);
  if (type === null) return null;
  const { data } = parseFrontmatter(text);
  const status =
    typeof data.status === "string" && data.status.trim().length > 0
      ? data.status.trim()
      : null;
  return authorityOf({ type, status });
}

function sliceLines(text: string, lines: DocLine[], a: number, b: number): string {
  return text.slice(lines[a - 1].start, lines[b - 1].end);
}

function printSelection(
  ctx: CommandContext,
  docPath: string,
  authority: string | null,
  range: [number, number],
  content: string,
): number {
  if (ctx.json) {
    printJson(
      jsonEnvelope("read", { path: docPath, authority, range, text: content }),
    );
    return 0;
  }
  printText(`${docPath} · ${authority ?? "untyped"} · lines ${range[0]}-${range[1]}`);
  process.stdout.write(content);
  if (!content.endsWith("\n")) process.stdout.write("\n");
  return 0;
}

function printOutline(
  ctx: CommandContext,
  docPath: string,
  authority: string | null,
  headings: Heading[],
): number {
  if (ctx.json) {
    printJson(
      jsonEnvelope("read outline", {
        path: docPath,
        authority,
        headings: headings.map((h) => ({
          level: h.level,
          title: h.title,
          start: h.start,
          end: h.end,
          bytes: h.bytes,
        })),
      }),
    );
    return 0;
  }
  printText(`${docPath} · ${authority ?? "untyped"}`);
  for (const h of headings) {
    printText(`  ${h.start}-${h.end} · ${h.bytes} bytes · ${"#".repeat(h.level)} ${h.title}`);
  }
  return 0;
}

function run(ctx: CommandContext): number {
  let values: { section?: string; lines?: string };
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      args: ctx.args,
      options: {
        section: { type: "string" },
        lines: { type: "string" },
      },
      allowPositionals: true,
    }));
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }

  // `outline` is a subcommand only when a second positional follows, so a
  // file literally named `outline` is read on its own, or as `./outline`.
  const isOutline = positionals[0] === "outline" && positionals.length >= 2;

  let document: string;
  if (isOutline) {
    if (values.section !== undefined || values.lines !== undefined) {
      return usageError("--section and --lines do not combine with `read outline`.");
    }
    if (positionals.length > 2) {
      return usageError(`Unexpected argument: ${positionals[2]}`);
    }
    document = positionals[1];
  } else {
    if (positionals.length === 0) {
      return usageError("Missing document.");
    }
    if (positionals.length > 1) {
      return usageError(`Unexpected argument: ${positionals[1]}`);
    }
    if (values.section !== undefined && values.lines !== undefined) {
      return usageError("--section and --lines are mutually exclusive.");
    }
    document = positionals[0];
  }

  const project = loadProject(findRoot(process.cwd()));
  let file: string;
  try {
    file = resolveDocument(project, document);
  } catch (error) {
    return runtimeError(error instanceof Error ? error.message : String(error));
  }

  const text = readFileSync(file, "utf8");
  const { headings, lines } = outline(text);
  const docPath = path
    .relative(realpathSync(project.root), file)
    .split(path.sep)
    .join("/");
  const authority = authorityOfDoc(project, file, text);

  if (isOutline) {
    return printOutline(ctx, docPath, authority, headings);
  }

  if (values.section !== undefined) {
    const query = values.section;
    const matches = headings.filter(
      (h) => h.title.toLowerCase() === query.toLowerCase(),
    );
    if (matches.length === 0) {
      return runtimeError(`No heading matches '${query}'.`);
    }
    if (matches.length > 1) {
      process.stderr.write(
        [
          `The heading '${query}' matches ${matches.length} headings:`,
          ...matches.map((h) => `  line ${h.start}: ${"#".repeat(h.level)} ${h.title}`),
          "",
        ].join("\n"),
      );
      return 1;
    }
    const heading = matches[0];
    return printSelection(ctx, docPath, authority, [heading.start, heading.end], sliceLines(text, lines, heading.start, heading.end));
  }

  if (values.lines !== undefined) {
    const spec = values.lines;
    const match = /^(\d+)-(\d+)$/.exec(spec);
    if (match === null) {
      return usageError(`Invalid --lines '${spec}': expected <a>-<b> with whole numbers.`);
    }
    const a = Number(match[1]);
    const b = Number(match[2]);
    if (a < 1 || a > b || b > lines.length) {
      return usageError(
        `--lines ${a}-${b} is out of range: the document has ${lines.length} lines.`,
      );
    }
    return printSelection(ctx, docPath, authority, [a, b], sliceLines(text, lines, a, b));
  }

  // The whole file, with a range that stays valid for an empty document.
  return printSelection(
    ctx,
    docPath,
    authority,
    [1, Math.max(lines.length, 1)],
    text,
  );
}

export const readCommand: Command = {
  summary: "read a whole document, one section, or a line range",
  run,
};
