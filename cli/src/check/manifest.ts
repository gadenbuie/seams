/**
 * The `manifest` check: a present manifest validates against the bundled
 * schema, and each documentation home exists on disk.
 *
 * A home that does not exist yet is a warning, not an error: a project can
 * adopt seams before it has written any overview or plan. Through the
 * command, an invalid manifest never reaches this check, because loading the
 * project fails first and the command reports those issues itself; the check
 * still re-validates so it stands on its own.
 */
import { statSync } from "node:fs";
import path from "node:path";
import { MANIFEST_RELATIVE_PATH, PATH_KEYS, manifestIssues, type Project } from "../config.ts";
import type { Check, Finding } from "./types.ts";

function run(project: Project): Finding[] {
  const findings: Finding[] = [];

  if (project.source === "manifest" && project.manifest !== undefined) {
    for (const issue of manifestIssues(project.manifest, project.root)) {
      findings.push({
        id: "manifest",
        severity: "error",
        path: MANIFEST_RELATIVE_PATH.split(path.sep).join("/"),
        message: issue,
      });
    }
  }

  for (const key of PATH_KEYS) {
    const dir = project.paths[key];
    try {
      if (statSync(dir).isDirectory()) continue;
    } catch {
      /* Falls through to the warning below. */
    }
    const repoPath = path.relative(project.root, dir).split(path.sep).join("/");
    findings.push({
      id: "manifest",
      severity: "warning",
      path: MANIFEST_RELATIVE_PATH.split(path.sep).join("/"),
      message: `the '${key}' home does not exist yet: ${repoPath}`,
    });
  }

  return findings;
}

export const manifestCheck: Check = {
  id: "manifest",
  run,
};
