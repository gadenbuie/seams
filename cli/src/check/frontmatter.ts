/**
 * The `frontmatter` check: every document in the shared documentation homes
 * carries YAML frontmatter with the fields its type requires.
 *
 * Canon and overview documents need a non-empty `title` and `description`;
 * proposals and plans also need `status` and a `created` date that is a valid
 * `YYYY-MM-DD` calendar date. The check walks each home's Markdown files
 * itself, including `index.md` navigation files, because they live in the
 * homes and carry the same frontmatter as the documents around them.
 *
 * The notes home is not walked: a note's metadata is optional in full, so no
 * frontmatter rule applies to notes.
 */
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { PathKey, Project } from "../config.ts";
import { parseFrontmatter } from "../docs/frontmatter.ts";
import { topLevelMarkdownFiles, walkMarkdownFiles } from "../docs/discover.ts";
import type { Check, Finding } from "./types.ts";

/** How many body lines count as "near the top" when looking for duplicates. */
const BODY_SCAN_LINES = 10;

/** A body line that repeats a frontmatter field, case-insensitively. */
const BODY_DUPLICATE = /^\s*(status|created)\s*:\s*\S/i;

interface Home {
  key: PathKey;
  /** Proposals and plans carry the extra `status` and `created` fields. */
  requiresStatus: boolean;
  /** Overviews nest in subfolders; the other homes list their top level. */
  recursive: boolean;
}

const HOMES: readonly Home[] = [
  // The notes home is not walked: a note's metadata is optional, so no
  // frontmatter rule applies to notes.
  { key: "design", requiresStatus: false, recursive: false },
  { key: "overviews", requiresStatus: false, recursive: true },
  { key: "proposals", requiresStatus: true, recursive: false },
  { key: "plans", requiresStatus: true, recursive: false },
];

/** The 1-based line of `key:` inside the frontmatter block, or null. */
function fieldLine(lines: string[], key: string): number | null {
  const pattern = new RegExp(`^\\s*${key}\\s*:`);
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return null;
}

/**
 * Read one frontmatter string field and report it as one finding when it is
 * missing, not a string, or empty. Returns null when the field is acceptable.
 */
function fieldFinding(
  data: Record<string, unknown>,
  key: string,
  lines: string[],
  closeLine: number,
  repoPath: string,
): Finding | null {
  const value = data[key];
  let message: string | null = null;
  if (value === undefined) {
    message = `frontmatter is missing '${key}'`;
  } else if (typeof value !== "string") {
    message = `frontmatter field '${key}' is not a string`;
  } else if (value.trim().length === 0) {
    message = `frontmatter field '${key}' is empty`;
  }
  if (message === null) return null;
  return {
    id: "frontmatter",
    severity: "error",
    path: repoPath,
    line: value === undefined ? 1 : fieldLine(lines.slice(0, closeLine), key) ?? 1,
    message,
  };
}

/** True when `value` is a `YYYY-MM-DD` string naming a real calendar date. */
function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return probe.getUTCFullYear() === year && probe.getUTCMonth() === month - 1 && probe.getUTCDate() === day;
}

function checkFile(
  project: Project,
  file: string,
  requiresStatus: boolean,
): Finding[] {
  const repoPath = path.relative(project.root, file).split(path.sep).join("/");
  const text = readFileSync(file, "utf8");
  const lines = text.split(/\r?\n/);
  const { data, bodyStartLine, problems } = parseFrontmatter(text);

  const findings: Finding[] = [];

  if (problems.length > 0) {
    // Parse problems say all the fields are unreadable; field findings on
    // top would only point at the wrong fix.
    for (const problem of problems) {
      findings.push({
        id: "frontmatter",
        severity: "error",
        path: repoPath,
        line: 1,
        message: problem,
      });
    }
    return findings;
  }

  // The frontmatter block sits in lines 1..bodyStartLine - 2 (1-based).
  const closeLine = bodyStartLine - 2;

  const title = fieldFinding(data, "title", lines, closeLine, repoPath);
  if (title !== null) findings.push(title);

  const description = data.description;
  const descriptionFinding = fieldFinding(data, "description", lines, closeLine, repoPath);
  if (descriptionFinding !== null) {
    findings.push(descriptionFinding);
  } else if (typeof description === "string" && description.trim().startsWith("TODO:")) {
    findings.push({
      id: "frontmatter",
      severity: "warning",
      path: repoPath,
      line: fieldLine(lines.slice(0, closeLine), "description") ?? 1,
      message: "description is still the 'TODO:' placeholder from `seams new`",
    });
  }

  if (requiresStatus) {
    const status = fieldFinding(data, "status", lines, closeLine, repoPath);
    if (status !== null) findings.push(status);

    const created = fieldFinding(data, "created", lines, closeLine, repoPath);
    if (created !== null) {
      findings.push(created);
    } else if (typeof data.created === "string" && !isCalendarDate(data.created.trim())) {
      findings.push({
        id: "frontmatter",
        severity: "error",
        path: repoPath,
        line: fieldLine(lines.slice(0, closeLine), "created") ?? 1,
        message: `'created' is not a valid YYYY-MM-DD date, got '${data.created.trim()}'`,
      });
    }
  }

  const body = lines.slice(bodyStartLine - 1, bodyStartLine - 1 + BODY_SCAN_LINES);
  for (let i = 0; i < body.length; i++) {
    const match = BODY_DUPLICATE.exec(body[i]);
    if (match !== null) {
      findings.push({
        id: "frontmatter",
        severity: "warning",
        path: repoPath,
        line: bodyStartLine + i,
        message: `body line repeats the frontmatter field '${match[1].toLowerCase()}'`,
      });
    }
  }

  return findings;
}

function run(project: Project): Finding[] {
  const findings: Finding[] = [];
  for (const home of HOMES) {
    const dir = project.paths[home.key];
    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(dir);
    } catch {
      continue; // The manifest check warns about homes that do not exist.
    }
    if (!stats.isDirectory()) continue;

    const files = home.recursive ? walkMarkdownFiles(dir) : topLevelMarkdownFiles(dir);
    for (const file of files) {
      findings.push(...checkFile(project, file, home.requiresStatus));
    }
  }
  return findings;
}

export const frontmatterCheck: Check = {
  id: "frontmatter",
  run,
};
