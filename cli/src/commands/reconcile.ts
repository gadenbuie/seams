/**
 * `seams reconcile --since`: collect the evidence an agent needs to start a
 * reconciliation, bounded and without judging anything.
 *
 * The command records the current and requested starting revisions, lists the
 * changed files since the starting revision (committed and uncommitted
 * separately), runs the same reference lookup `impact` uses over those files,
 * reports broken links and index coverage problems from the `seams check`
 * units, and lists proposal and plan candidates for review. It returns a
 * bounded summary plus a JSON manifest with exact paths, line numbers, and
 * commands for deeper inspection.
 *
 * The command never writes or advances `reconcile.lastReconciledRevision`,
 * never edits a document, and writes no file unless `--manifest-out` is
 * given. It does not interpret drift: the closing line points to the
 * `seams-reconcile` skill for those judgments.
 */
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import path from "node:path";
import { indexCoverageCheck } from "../check/indexCoverage.ts";
import { linksCheck } from "../check/links.ts";
import type { Finding } from "../check/types.ts";
import { findRoot, loadProject, type Project } from "../config.ts";
import { discoverDocuments } from "../docs/discover.ts";
import {
  findReferences,
  type DocumentReferences,
  type ReferenceLine,
} from "../docs/references.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command, CommandContext } from "./index.ts";

const DEFAULT_LIMIT = 50;

const USAGE = "Usage: seams reconcile --since <revision> [--limit N] [--manifest-out <path>]";

const NOTE =
  "No state was changed: reconcile.lastReconciledRevision was not advanced and no document was edited.";

const SKILL_NOTE =
  "This command reports evidence only. Interpret drift and propose corrections with the seams-reconcile skill.";

/** The authority groups, in report order, the same grouping as `impact`. */
const GROUP_ORDER = ["Canon", "Overviews", "Accepted proposals", "Other proposals", "Plans"];

/** Terminal statuses per document type, from the status check's vocabularies. */
const TERMINAL_STATUSES: Record<"proposal" | "plan", readonly string[]> = {
  proposal: ["accepted", "rejected", "deferred", "withdrawn"],
  plan: ["done", "abandoned"],
};

interface ChangedFile {
  /** The status git reports: M, A, D, R100, or `?` for an untracked file. */
  status: string;
  /** Repo-relative path with forward slashes. */
  path: string;
  /** The old path of a committed rename or copy. */
  origPath?: string;
  command: string;
}

/** One referencing document, in the same shape `impact` reports. */
interface ReferenceEntry {
  path: string;
  authority: string;
  status: string | null;
  lines: ReferenceLine[];
  command: string;
}

interface ReferenceGroup {
  label: string;
  entries: ReferenceEntry[];
}

/** A finding with the deeper-inspection command the manifest promises. */
interface ManifestFinding extends Finding {
  command: string;
}

interface Candidate {
  path: string;
  authority: string;
  status: string | null;
  /** The mechanical reason this document is a candidate, never a verdict. */
  reason: string;
  /** The first referencing line, so a candidate stays bounded on its own. */
  lines: ReferenceLine[];
  /** Referencing lines past the first, reported instead of printed. */
  linesOmitted: number;
  command: string;
}

interface Section<T> {
  items: T[];
  omitted: number;
}

interface Manifest {
  since: { requested: string; resolved: string };
  head: string;
  limit: number;
  changedFiles: { committed: Section<ChangedFile>; uncommitted: Section<ChangedFile> };
  references: { groups: ReferenceGroup[]; shown: number; total: number; omitted: number };
  brokenLinks: Section<ManifestFinding>;
  indexCoverage: Section<ManifestFinding>;
  candidates: Section<Candidate>;
  warnings: string[];
  note: string;
}

function usageError(message: string): number {
  process.stderr.write(`${message}\n${USAGE}\n`);
  return 2;
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

function git(project: Project, args: string[]): SpawnSyncReturns<string> {
  return spawnSync("git", args, { cwd: project.root, encoding: "utf8" });
}

/** Resolve a revision spec to a full commit id, or an error message when git cannot. */
function resolveRevision(
  project: Project,
  spec: string,
): { resolved?: string; error?: string } {
  const result = git(project, ["rev-parse", "--verify", spec]);
  const stderr = (result.stderr ?? "").trim();
  if (result.error || result.status !== 0) {
    if (/not a git repository|no such (file or )?directory|cannot change to/i.test(stderr)) {
      return { error: `Not inside a git repository: ${project.root}` };
    }
    return { error: `Unknown revision: ${spec}` };
  }
  return { resolved: (result.stdout ?? "").trim() };
}

/** Split NUL-separated git output into non-empty tokens. */
function splitNul(output: string): string[] {
  return output.split("\0").filter((entry) => entry.length > 0);
}

/**
 * Parse `-z` `--name-status` output. Each record holds a status token, one
 * path, and, for renames and copies (R*, C*), a second path first: git emits
 * `status, old path, new path` in that order.
 */
function parseNameStatus(output: string): { status: string; path: string; origPath?: string }[] {
  const tokens = splitNul(output);
  const files: { status: string; path: string; origPath?: string }[] = [];
  let at = 0;
  while (at < tokens.length) {
    const status = tokens[at];
    at++;
    if (/^[RC]/.test(status)) {
      const origPath = tokens[at];
      const path = tokens[at + 1];
      at += 2;
      files.push({ status, path, origPath });
    } else {
      const path = tokens[at];
      at++;
      files.push({ status, path });
    }
  }
  return files;
}

/**
 * The changed files since `since`, split into committed and uncommitted
 * changes. Committed changes come from `git diff --name-status <since>..HEAD`,
 * keeping git's rename and copy statuses. Uncommitted changes are the working
 * tree's changes against HEAD with `--no-renames` (a rename appears by its
 * old and new names) plus untracked files, all labelled separately.
 * `--relative` keeps paths relative to the project root when it sits below
 * the git root, and leaves out changes elsewhere in the repository.
 */
function changedFiles(
  project: Project,
  since: string,
): { committed: ChangedFile[]; uncommitted: ChangedFile[]; error?: string } {
  const command = (file: { status: string; path: string; origPath?: string }): ChangedFile => ({
    ...file,
    command: `seams impact ${file.path}`,
  });

  const committed = git(project, ["diff", "--name-status", "-z", "--relative", `${since}..HEAD`]);
  const committedStderr = (committed.stderr ?? "").trim();
  if (committed.error || committed.status !== 0) {
    return { error: `git diff failed${committedStderr.length > 0 ? `: ${committedStderr}` : ""}`, committed: [], uncommitted: [] };
  }

  const uncommittedDiff = git(project, [
    "diff",
    "--name-status",
    "-z",
    "--relative",
    "--no-renames",
    "HEAD",
  ]);
  if (uncommittedDiff.error || uncommittedDiff.status !== 0) {
    const diffStderr = (uncommittedDiff.stderr ?? "").trim();
    return {
      error: `git diff failed${diffStderr.length > 0 ? `: ${diffStderr}` : ""}`,
      committed: [],
      uncommitted: [],
    };
  }
  const untracked = git(project, ["ls-files", "--others", "--exclude-standard", "-z"]);
  if (untracked.error || untracked.status !== 0) {
    const lsStderr = (untracked.stderr ?? "").trim();
    return {
      error: `git ls-files failed${lsStderr.length > 0 ? `: ${lsStderr}` : ""}`,
      committed: [],
      uncommitted: [],
    };
  }

  return {
    committed: parseNameStatus(committed.stdout ?? "").map(command),
    uncommitted: [
      ...parseNameStatus(uncommittedDiff.stdout ?? "").map(command),
      ...splitNul(untracked.stdout ?? "").map(
        (file): ChangedFile => ({ status: "?", path: file, command: `seams impact ${file}` }),
      ),
    ],
  };
}

/** The authority group a document belongs to, the same grouping as `impact`. */
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

/** Bucket the documents into authority groups, keeping discovery order. */
function groupDocuments(documents: DocumentReferences[]): Map<string, ReferenceEntry[]> {
  const buckets = new Map<string, ReferenceEntry[]>();
  for (const doc of documents) {
    const label = groupOf(doc);
    const entries = buckets.get(label) ?? [];
    entries.push({
      path: doc.path,
      authority: doc.authority,
      status: doc.status,
      lines: doc.lines,
      command: `seams read ${doc.path} --lines ${doc.lines[0].line}-${doc.lines[0].line}`,
    });
    buckets.set(label, entries);
  }
  return buckets;
}

/**
 * Apply the reference limit to the grouped entries, walking the groups in
 * report order and the lines in line order, the same bounding as `impact`:
 * an entry stays visible with the references that fit, and everything past
 * the limit is counted as omitted.
 */
function applyLimit(
  buckets: Map<string, ReferenceEntry[]>,
  limit: number,
): { groups: ReferenceGroup[]; shown: number; total: number } {
  let total = 0;
  for (const entries of buckets.values()) {
    for (const entry of entries) total += entry.lines.length;
  }

  let shown = 0;
  const groups: ReferenceGroup[] = [];
  for (const label of GROUP_ORDER) {
    const entries = buckets.get(label);
    if (entries === undefined) continue;
    const kept: ReferenceEntry[] = [];
    for (const entry of entries) {
      const lines: ReferenceLine[] = [];
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

/** Keep the first `limit` items and count the rest, for a bounded section. */
function bound<T>(items: T[], limit: number): Section<T> {
  return { items: items.slice(0, limit), omitted: Math.max(0, items.length - limit) };
}

/** Findings order for the two check sections: by file, then line, then message. */
function compareFindings(a: Finding, b: Finding): number {
  if (a.path !== b.path) return a.path < b.path ? -1 : 1;
  const lineA = a.line ?? Number.MAX_SAFE_INTEGER;
  const lineB = b.line ?? Number.MAX_SAFE_INTEGER;
  if (lineA !== lineB) return lineA - lineB;
  return a.message < b.message ? -1 : a.message > b.message ? 1 : 0;
}

/** Attach the deeper-inspection command a manifest finding carries. */
function manifestFinding(finding: Finding): ManifestFinding {
  const command =
    finding.line === undefined
      ? `seams read ${finding.path}`
      : `seams read ${finding.path} --lines ${finding.line}-${finding.line}`;
  return { ...finding, command };
}

/**
 * The proposal and plan candidates for review, among the documents that name
 * changed files:
 *
 * - Proposals and plans whose status is not terminal: work happened that
 *   touches what they name, and their status may lag behind it.
 * - Accepted proposals with no matching canon change: the proposal names
 *   changed files, but no canon document it also names changed, so the
 *   durable parts may not have reached canon.
 *
 * Both are candidate lists only; the command never says a document is stale.
 */
function candidatesFor(
  project: Project,
  documents: DocumentReferences[],
  changedPaths: string[],
): Candidate[] {
  const canonDocs = new Set(
    discoverDocuments(project).documents.filter((doc) => doc.type === "canon").map((doc) => doc.path),
  );
  const changedCanon = changedPaths.filter((changed) => canonDocs.has(changed));

  // Accepted proposals matched by a canon change: those that name one of the
  // changed canon files. Only the unmatched ones stay candidates.
  let matchedByCanonChange = new Set<string>();
  if (changedCanon.length > 0) {
    matchedByCanonChange = new Set(findReferences(project, changedCanon).documents.map((doc) => doc.path));
  }

  const candidates: Candidate[] = [];
  for (const doc of documents) {
    if (doc.type !== "proposal" && doc.type !== "plan") continue;
    const status = doc.status ?? "";
    let reason: string;
    if (doc.type === "plan") {
      // A plan with a terminal status (done, abandoned) is not a candidate.
      if (TERMINAL_STATUSES.plan.includes(status)) continue;
      reason = `plan status '${status || "missing"}' is not terminal and it names changed files`;
    } else if (status === "accepted") {
      // An accepted proposal with a matching canon change is not a candidate.
      if (matchedByCanonChange.has(doc.path)) continue;
      reason = "accepted proposal names changed files, but no canon document it names changed";
    } else {
      // Rejected, deferred, and withdrawn proposals are terminal.
      if (TERMINAL_STATUSES.proposal.includes(status)) continue;
      reason = `proposal status '${status || "missing"}' is not terminal and it names changed files`;
    }
    candidates.push({
      path: doc.path,
      authority: doc.authority,
      status: doc.status,
      reason,
      // One line keeps each candidate bounded; the omitted count and the
      // read command point at the rest, and the References section holds the
      // bounded detail.
      lines: doc.lines.slice(0, 1),
      linesOmitted: doc.lines.length - 1,
      command: `seams read ${doc.path}`,
    });
  }
  return candidates;
}

function run(ctx: CommandContext): number {
  let values: { since?: string; limit?: string; "manifest-out"?: string };
  try {
    ({ values } = parseArgs({
      args: ctx.args,
      options: {
        since: { type: "string" },
        limit: { type: "string" },
        "manifest-out": { type: "string" },
      },
      allowPositionals: false,
    }));
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }

  if (values.since === undefined) {
    return usageError("Missing --since. Give the revision to collect evidence from.");
  }
  const limit = positiveInt(values.limit, DEFAULT_LIMIT);
  if (limit === null) {
    return usageError(`--limit must be a whole number of at least 1, got '${values.limit}'.`);
  }

  const project = loadProject(findRoot(process.cwd()));

  const head = resolveRevision(project, "HEAD");
  if (head.error !== undefined) {
    process.stderr.write(`${head.error}\n`);
    return 1;
  }
  const since = resolveRevision(project, values.since);
  if (since.error !== undefined) {
    process.stderr.write(`${since.error}\n`);
    return 1;
  }

  const changes = changedFiles(project, values.since);
  if (changes.error !== undefined) {
    process.stderr.write(`${changes.error}\n`);
    return 1;
  }

  // The reference lookup runs over every changed path, old and new names
  // alike (the old name of a rename is where stale references hide), the
  // same lookup `impact` performs.
  const targetPaths = [
    ...new Set(
      [...changes.committed, ...changes.uncommitted].flatMap((file) =>
        file.origPath === undefined ? [file.path] : [file.path, file.origPath],
      ),
    ),
  ];
  const references = findReferences(project, targetPaths);
  const warnings = [...new Set(references.warnings)];
  for (const warning of warnings) {
    process.stderr.write(`warning: ${warning}\n`);
  }

  const grouped = applyLimit(groupDocuments(references.documents), limit);

  const brokenLinksAll = linksCheck.run(project).sort(compareFindings);
  const indexCoverageAll = indexCoverageCheck.run(project).sort(compareFindings);
  const brokenLinks = bound(brokenLinksAll.map((finding) => manifestFinding(finding)), limit);
  const indexCoverage = bound(indexCoverageAll.map((finding) => manifestFinding(finding)), limit);

  const candidates = bound(
    candidatesFor(project, references.documents, targetPaths),
    limit,
  );

  const manifest: Manifest = {
    since: { requested: values.since, resolved: since.resolved! },
    head: head.resolved!,
    limit,
    changedFiles: {
      committed: bound(changes.committed, limit),
      uncommitted: bound(changes.uncommitted, limit),
    },
    references: {
      groups: grouped.groups,
      shown: grouped.shown,
      total: grouped.total,
      omitted: grouped.total - grouped.shown,
    },
    brokenLinks,
    indexCoverage,
    candidates,
    warnings,
    note: `${NOTE} ${SKILL_NOTE}`,
  };

  // Exit 1 when the links or index-coverage evidence holds an error finding,
  // the same convention `seams check` follows. References and candidates are
  // evidence, not findings, and never change the exit code.
  const errors = [...brokenLinksAll, ...indexCoverageAll].some(
    (finding) => finding.severity === "error",
  );

  if (values["manifest-out"] !== undefined) {
    const out = path.resolve(process.cwd(), values["manifest-out"]);
    try {
      writeFileSync(out, JSON.stringify(jsonEnvelope("reconcile", { ...manifest }), null, 2) + "\n");
    } catch (error) {
      process.stderr.write(
        `Could not write the manifest to ${out}: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      return 1;
    }
  }

  if (ctx.json) {
    printJson(jsonEnvelope("reconcile", { ...manifest }));
    return errors ? 1 : 0;
  }

  printText(`Reconcile evidence from ${manifest.since.requested} (${manifest.since.resolved}) to HEAD (${manifest.head}).`);

  printText(`Committed changes since ${manifest.since.requested}:`);
  for (const file of manifest.changedFiles.committed.items) {
    printText(`  ${file.status} ${file.origPath !== undefined ? `${file.origPath} -> ${file.path}` : file.path}`);
  }
  if (manifest.changedFiles.committed.items.length === 0) printText("  none");
  if (manifest.changedFiles.committed.omitted > 0) {
    printText(`  (${manifest.changedFiles.committed.omitted} more omitted)`);
  }

  printText("Uncommitted changes:");
  for (const file of manifest.changedFiles.uncommitted.items) {
    printText(`  ${file.status} ${file.origPath !== undefined ? `${file.origPath} -> ${file.path}` : file.path}`);
  }
  if (manifest.changedFiles.uncommitted.items.length === 0) printText("  none");
  if (manifest.changedFiles.uncommitted.omitted > 0) {
    printText(`  (${manifest.changedFiles.uncommitted.omitted} more omitted)`);
  }

  printText("References:");
  if (grouped.groups.length === 0) printText("  none");
  for (const group of grouped.groups) {
    printText(`${group.label}:`);
    for (const entry of group.entries) {
      printText(`  ${entry.path} · ${entry.authority}${entry.status ? ` · ${entry.status}` : ""}`);
      for (const line of entry.lines) {
        printText(`    ${line.line}: ${line.text}`);
      }
    }
  }
  if (grouped.total - grouped.shown > 0) {
    printText(`Showing ${grouped.shown} of ${grouped.total} references.`);
  }

  printText("Broken links:");
  printFindings(brokenLinks);
  printText("Index coverage:");
  printFindings(indexCoverage);

  printText("Candidates for review:");
  if (manifest.candidates.items.length === 0) printText("  none");
  for (const candidate of manifest.candidates.items) {
    printText(`  ${candidate.path} · ${candidate.authority}`);
    printText(`    ${candidate.reason}`);
    for (const line of candidate.lines) {
      printText(`    ${line.line}: ${line.text}`);
    }
    if (candidate.linesOmitted > 0) {
      printText(`    (${candidate.linesOmitted} more reference line${candidate.linesOmitted === 1 ? "" : "s"})`);
    }
  }
  if (manifest.candidates.omitted > 0) {
    printText(`  (${manifest.candidates.omitted} more omitted)`);
  }

  if (values["manifest-out"] !== undefined) {
    printText(`Manifest written to ${path.resolve(process.cwd(), values["manifest-out"])}.`);
  }
  printText(NOTE);
  printText(SKILL_NOTE);
  return errors ? 1 : 0;
}

/** Print one bounded findings section, grouped by file like `seams check`. */
function printFindings(section: Section<ManifestFinding>): void {
  if (section.items.length === 0) {
    printText("  none");
  } else {
    let currentPath = "";
    for (const finding of section.items) {
      if (finding.path !== currentPath) {
        currentPath = finding.path;
        printText(`  ${currentPath}:`);
      }
      const at = finding.line === undefined ? "" : `${finding.line}: `;
      printText(`    ${at}[${finding.severity}] ${finding.message}`);
    }
  }
  if (section.omitted > 0) printText(`  (${section.omitted} more omitted)`);
}

export const reconcileCommand: Command = {
  summary: "collect bounded reconciliation evidence since a revision, without state changes",
  run,
};
