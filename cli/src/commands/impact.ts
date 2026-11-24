/**
 * `seams impact`: report which project documents name or link to supplied
 * paths, grouped by authority.
 *
 * The paths come either from the arguments or, with `--git-diff`, from the
 * working tree's changes against HEAD plus untracked files, so an agent can
 * ask what documentation its uncommitted work touches. Renamed and deleted
 * files are looked up by both their old and new names.
 *
 * The report is a candidate list, never a verdict: it says which documents
 * reference the paths, and the reader judges whether those documents are
 * stale. Output is bounded by `--limit` references, and both output modes
 * report what was omitted.
 */
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { parseArgs } from "node:util";
import path from "node:path";
import { findRoot, loadProject, type Project } from "../config.ts";
import { findReferences, type DocumentReferences } from "../docs/references.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command, CommandContext } from "./index.ts";

const DEFAULT_LIMIT = 50;

const USAGE = "Usage: seams impact <path> [paths...] | seams impact --git-diff [--limit N]";

const NOTE = "These are candidates for review, not proof that a document is stale.";

/** The authority groups, in report order. */
const GROUP_ORDER = ["Canon", "Overviews", "Accepted proposals", "Other proposals", "Plans"];

/** One referencing document, in the shape both outputs carry. */
interface ImpactEntry {
  path: string;
  authority: string;
  status: string | null;
  lines: DocumentReferences["lines"];
}

interface ImpactGroup {
  label: string;
  entries: ImpactEntry[];
}

function usageError(message: string): number {
  process.stderr.write(`${message}\n${USAGE}\n`);
  return 2;
}

/** The authority group a document belongs to. */
function groupOf(doc: DocumentReferences): string {
  switch (doc.type) {
    case "canon":
      return "Canon";
    case "overview":
      return "Overviews";
    case "proposal":
      return doc.status === "accepted" ? "Accepted proposals" : "Other proposals";
    case "plan":
      return "Plans";
  }
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

/** Repo-relative path with forward slashes, or null when it leaves the root. */
function repoRelative(project: Project, given: string): string | null {
  const abs = path.resolve(process.cwd(), given);
  const rel = path.relative(project.root, abs).split(path.sep).join("/");
  if (rel.startsWith("..") || path.isAbsolute(rel)) return null;
  return rel.length === 0 ? "." : rel;
}

/** Split NUL-separated git output into non-empty paths. */
function splitNul(output: string): string[] {
  return output.split("\0").filter((entry) => entry.length > 0);
}

/**
 * The changed paths `--git-diff` reports: the working tree's changes against
 * HEAD, with `--no-renames` so a renamed file appears by its old and new
 * names, plus untracked files. `--relative` keeps the diff's paths relative
 * to the project root when it sits below the git root, and leaves out changes
 * elsewhere in the repository. Paths are repo-relative with forward slashes.
 */
function gitPaths(project: Project): { paths?: string[]; error?: string } {
  const run = (args: string[]): SpawnSyncReturns<string> =>
    spawnSync("git", args, { cwd: project.root, encoding: "utf8" });
  const diff = run(["diff", "--name-only", "--no-renames", "--relative", "-z", "HEAD"]);
  const stderr = (diff.stderr ?? "").trim();
  if (diff.error || diff.status !== 0) {
    if (/not a git repository/i.test(stderr)) {
      return { error: `Not inside a git repository: ${project.root}` };
    }
    const head = run(["rev-parse", "--verify", "-q", "HEAD"]);
    if (!head.error && head.status === 0) {
      return { error: `git diff failed${stderr.length > 0 ? `: ${stderr}` : ""}` };
    }
    // No commit exists yet, so there is no HEAD to diff against: everything
    // in the index plus every untracked file is new.
    const all = run(["ls-files", "--cached", "--others", "--exclude-standard", "-z"]);
    if (all.error || all.status !== 0) {
      return { error: `git diff failed${stderr.length > 0 ? `: ${stderr}` : ""}` };
    }
    return { paths: [...new Set(splitNul(all.stdout ?? ""))] };
  }
  const untracked = run(["ls-files", "--others", "--exclude-standard", "-z"]);
  if (untracked.error || untracked.status !== 0) {
    const untrackedStderr = (untracked.stderr ?? "").trim();
    return {
      error: `git ls-files failed${untrackedStderr.length > 0 ? `: ${untrackedStderr}` : ""}`,
    };
  }
  return { paths: [...new Set([...splitNul(diff.stdout ?? ""), ...splitNul(untracked.stdout ?? "")])] };
}

/** Bucket the documents into authority groups, keeping discovery order. */
function groupDocuments(documents: DocumentReferences[]): Map<string, ImpactEntry[]> {
  const buckets = new Map<string, ImpactEntry[]>();
  for (const doc of documents) {
    const label = groupOf(doc);
    const entries = buckets.get(label) ?? [];
    entries.push({ path: doc.path, authority: doc.authority, status: doc.status, lines: doc.lines });
    buckets.set(label, entries);
  }
  return buckets;
}

/**
 * Apply the reference limit to the grouped entries, walking the groups in
 * report order and the lines in line order. An entry stays visible with the
 * references that fit; everything past the limit is counted as omitted.
 */
function applyLimit(
  buckets: Map<string, ImpactEntry[]>,
  limit: number,
): { groups: ImpactGroup[]; shown: number; total: number } {
  let total = 0;
  for (const entries of buckets.values()) {
    for (const entry of entries) total += entry.lines.length;
  }

  let shown = 0;
  const groups: ImpactGroup[] = [];
  for (const label of GROUP_ORDER) {
    const entries = buckets.get(label);
    if (entries === undefined) continue;
    const kept: ImpactEntry[] = [];
    for (const entry of entries) {
      const lines = [];
      for (const line of entry.lines) {
        if (shown >= limit) break;
        lines.push(line);
        shown++;
      }
      if (lines.length > 0) kept.push({ ...entry, lines });
      if (shown >= limit) break;
    }
    if (kept.length > 0) groups.push({ label, entries: kept });
    if (shown >= limit) break;
  }
  return { groups, shown, total };
}

function run(ctx: CommandContext): number {
  let values: { "git-diff"?: boolean; limit?: string };
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      args: ctx.args,
      options: {
        "git-diff": { type: "boolean" },
        limit: { type: "string" },
      },
      allowPositionals: true,
    }));
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }

  const limit = positiveInt(values.limit, DEFAULT_LIMIT);
  if (limit === null) {
    return usageError(`--limit must be a whole number of at least 1, got '${values.limit}'.`);
  }
  if (values["git-diff"] === true && positionals.length > 0) {
    return usageError("Give either paths or --git-diff, not both.");
  }
  if (values["git-diff"] !== true && positionals.length === 0) {
    return usageError("Missing path. Pass at least one path, or use --git-diff.");
  }

  const project = loadProject(findRoot(process.cwd()));

  let targetPaths: string[];
  if (values["git-diff"] === true) {
    const { paths, error } = gitPaths(project);
    if (error !== undefined) {
      process.stderr.write(`${error}\n`);
      return 1;
    }
    targetPaths = paths ?? [];
  } else {
    targetPaths = [];
    for (const given of positionals) {
      const rel = repoRelative(project, given);
      if (rel === null) {
        process.stderr.write(`Path outside the project root: ${given}\n`);
        return 1;
      }
      targetPaths.push(rel);
    }
  }

  const { documents, warnings } = findReferences(project, targetPaths);
  const { groups, shown, total } = applyLimit(groupDocuments(documents), limit);
  const omitted = total - shown;

  if (ctx.json) {
    printJson(
      jsonEnvelope("impact", {
        paths: targetPaths,
        groups,
        shown,
        omitted,
        note: NOTE,
        warnings,
      }),
    );
    return 0;
  }

  if (total === 0) {
    printText(
      targetPaths.length === 0
        ? "No changed files."
        : `No references found for: ${targetPaths.join(", ")}`,
    );
  }
  for (const group of groups) {
    printText(`${group.label}:`);
    for (const entry of group.entries) {
      printText(`  ${entry.path} · ${entry.authority}${entry.status ? ` · ${entry.status}` : ""}`);
      for (const line of entry.lines) {
        printText(`    ${line.line}: ${line.text}`);
      }
    }
  }
  if (omitted > 0) printText(`Showing ${shown} of ${total} references.`);
  for (const warning of warnings) {
    process.stderr.write(`warning: ${warning}\n`);
  }
  printText(NOTE);
  return 0;
}

export const impactCommand: Command = {
  summary: "report documents that name or link to paths",
  run,
};
