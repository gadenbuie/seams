/**
 * The `links` check: local links in the documentation resolve, and their
 * anchors match a heading in the target file.
 *
 * Scanned files are the Markdown files of the four documentation homes, the
 * root `README.md` and `AGENTS.md`, and the root `skills/` folder when it
 * exists. External `http(s)` and `mailto` links are other sites' concern, and
 * links inside fenced code blocks are code samples, not links. Anchors use
 * GitHub-style slugs, including the `-1` suffix a duplicate heading gets.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Project } from "../config.ts";
import {
  documentBody,
  extractInlineLinks,
  headingAnchors,
  splitLinkTarget,
} from "../docs/markdown.ts";
import { walkMarkdownFiles } from "../docs/discover.ts";
import type { Check, Finding } from "./types.ts";

/** The heading anchors of one or more target files, each read at most once. */
class AnchorIndex {
  private readonly cache = new Map<string, Set<string>>();

  anchorsOf(file: string): Set<string> {
    let anchors = this.cache.get(file);
    if (anchors === undefined) {
      anchors = headingAnchors(documentBody(readFileSync(file, "utf8")));
      this.cache.set(file, anchors);
    }
    return anchors;
  }
}

/** The Markdown files the links check scans, as absolute paths, sorted. */
function scannedFiles(project: Project): string[] {
  const files = new Set<string>();
  for (const dir of Object.values(project.paths)) {
    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(dir);
    } catch {
      continue; // The manifest check warns about homes that do not exist.
    }
    if (!stats.isDirectory()) continue;
    for (const file of walkMarkdownFiles(dir)) files.add(file);
  }
  for (const name of ["README.md", "AGENTS.md"]) {
    const file = path.join(project.root, name);
    if (existsSync(file)) files.add(file);
  }
  const skills = path.join(project.root, "skills");
  if (existsSync(skills) && statSync(skills).isDirectory()) {
    for (const file of walkMarkdownFiles(skills)) files.add(file);
  }
  return [...files].sort();
}

/** Check one file's local links. Returns the findings, in line order. */
function checkFile(project: Project, file: string, anchors: AnchorIndex): Finding[] {
  const findings: Finding[] = [];
  const repoPath = path.relative(project.root, file).split(path.sep).join("/");
  const body = documentBody(readFileSync(file, "utf8"));
  for (const link of extractInlineLinks(body)) {
    const target = splitLinkTarget(link.target);
    if (target === null) continue; // External links are not this check's concern.

    let resolved: string;
    if (target.path.length === 0) {
      resolved = file; // A same-file anchor link.
    } else {
      resolved = path.resolve(path.dirname(file), target.path);
      if (!existsSync(resolved)) {
        findings.push({
          id: "links",
          severity: "error",
          path: repoPath,
          line: link.line,
          message: `link target does not exist: ${target.path}`,
        });
        continue;
      }
    }

    if (target.anchor.length === 0) continue;
    if (target.path.length > 0 && !statSync(resolved).isFile()) {
      findings.push({
        id: "links",
        severity: "error",
        path: repoPath,
        line: link.line,
        message: `link target ${target.path} is a folder, not a file, so it has no heading '${target.anchor}'`,
      });
      continue;
    }
    if (!anchors.anchorsOf(resolved).has(target.anchor)) {
      findings.push({
        id: "links",
        severity: "error",
        path: repoPath,
        line: link.line,
        message: `link target ${target.path === "" ? "this file" : target.path} has no heading '${target.anchor}'`,
      });
    }
  }
  return findings;
}

function run(project: Project): Finding[] {
  const findings: Finding[] = [];
  const anchors = new AnchorIndex();
  for (const file of scannedFiles(project)) {
    findings.push(...checkFile(project, file, anchors));
  }
  return findings;
}

export const linksCheck: Check = {
  id: "links",
  run,
};
