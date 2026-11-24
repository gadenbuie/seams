/**
 * The `index-coverage` check: the two design indexes link every document
 * they navigate.
 *
 * The design `index.md` links each canon file beside it, and the overviews
 * `index.md` links every overview document. An index file that is missing
 * covers nothing, and an existing home whose documents are all covered is the
 * passing case, so the check reports at most what a reader cannot find.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Project } from "../config.ts";
import { documentBody, extractInlineLinks, splitLinkTarget } from "../docs/markdown.ts";
import { topLevelMarkdownFiles, walkMarkdownFiles } from "../docs/discover.ts";
import type { Check, Finding } from "./types.ts";

/** Every local path an index file links, resolved relative to the index. */
function linkedPaths(indexFile: string): Set<string> {
  const linked = new Set<string>();
  const body = documentBody(readFileSync(indexFile, "utf8"));
  for (const link of extractInlineLinks(body)) {
    const target = splitLinkTarget(link.target);
    if (target === null) continue; // External links are not this check's concern.
    if (target.path.length === 0) continue;
    linked.add(path.resolve(path.dirname(indexFile), target.path));
  }
  return linked;
}

/** One index-coverage finding pointing at the index, named for the reader. */
function finding(repoPath: string, message: string): Finding {
  return { id: "index-coverage", severity: "error", path: repoPath, message };
}

function repoRelative(project: Project, file: string): string {
  return path.relative(project.root, file).split(path.sep).join("/");
}

/** The documents an index must cover, other than the index itself. */
function coveredDocuments(dir: string, recursive: boolean): string[] {
  const all = recursive ? walkMarkdownFiles(dir) : topLevelMarkdownFiles(dir);
  return all.filter((file) => path.basename(file) !== "index.md");
}

/** Report documents not covered by one index, or the index itself missing. */
function checkIndex(
  project: Project,
  dir: string,
  recursive: boolean,
  label: string,
): Finding[] {
  const findings: Finding[] = [];
  const indexFile = path.join(dir, "index.md");
  const documents = coveredDocuments(dir, recursive);

  if (!existsSync(indexFile)) {
    if (documents.length > 0) {
      findings.push(
        finding(
          repoRelative(project, indexFile),
          `the ${label} index is missing, so ${documents.length} document${
            documents.length === 1 ? "" : "s"
          } cannot be reached from it`,
        ),
      );
    }
    return findings;
  }

  const linked = linkedPaths(indexFile);
  for (const doc of documents) {
    if (!linked.has(doc)) {
      findings.push(
        finding(
          repoRelative(project, indexFile),
          `the ${label} index does not link ${repoRelative(project, doc)}`,
        ),
      );
    }
  }
  return findings;
}

function run(project: Project): Finding[] {
  const findings: Finding[] = [];
  for (const [key, recursive, label] of [
    ["design", false, "design"],
    ["overviews", true, "overviews"],
  ] as const) {
    const dir = project.paths[key];
    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(dir);
    } catch {
      continue; // The manifest check warns about homes that do not exist.
    }
    if (!stats.isDirectory()) continue;
    findings.push(...checkIndex(project, dir, recursive, label));
  }
  return findings;
}

export const indexCoverageCheck: Check = {
  id: "index-coverage",
  run,
};
