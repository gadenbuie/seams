/**
 * The `status` check: a proposal's or plan's `status` comes from its type's
 * vocabulary. The words are recorded on seams#f7j8.
 *
 * A missing status is the frontmatter check's finding, not this one; this
 * check only rejects a status that is present but unknown.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Project } from "../config.ts";
import { discoverDocuments, type DocType } from "../docs/discover.ts";
import { parseFrontmatter } from "../docs/frontmatter.ts";
import type { Check, Finding } from "./types.ts";

/** The accepted status words for each document type that carries a status. */
const VOCABULARIES: Record<DocType, readonly string[]> = {
  canon: [],
  overview: [],
  // Notes carry no status: they are local memory, not tracked work.
  note: [],
  proposal: ["draft", "accepted", "rejected", "deferred", "withdrawn"],
  plan: ["draft", "active", "done", "abandoned"],
};

/** The 1-based line of the `status:` field, when the file can be read. */
function statusLine(file: string): number | undefined {
  try {
    const text = readFileSync(file, "utf8");
    const { data, bodyStartLine } = parseFrontmatter(text);
    if (data.status === undefined) return undefined;
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < bodyStartLine - 1; i++) {
      if (/^\s*status\s*:/.test(lines[i])) return i + 1;
    }
  } catch {
    /* Unreadable files are the frontmatter check's findings. */
  }
  return undefined;
}

function run(project: Project): Finding[] {
  const { documents } = discoverDocuments(project);
  const findings: Finding[] = [];
  for (const doc of documents) {
    if (doc.type !== "proposal" && doc.type !== "plan") continue;
    if (doc.status === null || doc.status === undefined) continue;
    const vocabulary = VOCABULARIES[doc.type];
    if (vocabulary.includes(doc.status)) continue;
    findings.push({
      id: "status",
      severity: "error",
      path: doc.path,
      line: statusLine(path.join(project.root, doc.path)),
      message: `unknown status '${doc.status}' for a ${doc.type}; known statuses: ${vocabulary.join(", ")}`,
    });
  }
  return findings;
}

export const statusCheck: Check = {
  id: "status",
  run,
};
