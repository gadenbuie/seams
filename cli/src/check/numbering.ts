/**
 * The `numbering` check: proposal files are named `NNNN-slug.md` and no two
 * proposals share a number. Gaps in the numbering are allowed: a missing
 * number only says a proposal was deleted or never written, so it is not a
 * finding.
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import type { Project } from "../config.ts";
import type { Check, Finding } from "./types.ts";

/** The proposal file shape: four digits, a dash, and a non-empty slug. */
const NUMBERED = /^(\d{4})-.+\.md$/;

function run(project: Project): Finding[] {
  const dir = project.paths.proposals;
  let files: string[];
  try {
    files = readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name)
      .sort();
  } catch {
    return []; // The manifest check warns about homes that do not exist.
  }

  const findings: Finding[] = [];

  const numberOwners = new Map<string, string>();
  for (const name of files) {
    const repoPath = path.join(path.relative(project.root, dir), name).split(path.sep).join("/");
    const match = NUMBERED.exec(name);
    if (match === null) {
      findings.push({
        id: "numbering",
        severity: "error",
        path: repoPath,
        message: `proposal file name is not NNNN-slug.md, got '${name}'`,
      });
      continue;
    }
    const number = match[1];
    const owner = numberOwners.get(number);
    if (owner !== undefined) {
      findings.push({
        id: "numbering",
        severity: "error",
        path: repoPath,
        message: `proposal number ${number} is already used by ${owner}`,
      });
    } else {
      numberOwners.set(number, repoPath);
    }
  }
  return findings;
}

export const numberingCheck: Check = {
  id: "numbering",
  run,
};
