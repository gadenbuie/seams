/**
 * The `manifest` check: a present manifest validates against the bundled
 * schema, and each shared documentation home exists on disk.
 *
 * A home that does not exist yet is a warning, not an error: a project can
 * adopt seams before it has written any overview or plan. The notes home is
 * optional and never warns. Through the command, an invalid manifest never
 * reaches this check, because loading the project fails first and the command
 * reports those issues itself; the check still re-validates so it stands on
 * its own.
 */
import { statSync } from "node:fs";
import path from "node:path";
import {
  MANIFEST_REPO_PATH,
  SHARED_PATH_KEYS,
  manifestIssues,
  type Project,
} from "../config.ts";
import type { Check, Finding } from "./types.ts";

function run(project: Project): Finding[] {
  const findings: Finding[] = [];

  if (project.source === "manifest" && project.manifest !== undefined) {
    for (const issue of manifestIssues(project.manifest, project.root)) {
      findings.push({
        id: "manifest",
        severity: "error",
        path: MANIFEST_REPO_PATH,
        message: issue,
      });
    }
  }

  // Only the shared homes warn when missing. Notes are optional and local:
  // an absent notes home is not a gap to create or a warning to fix.
  for (const key of SHARED_PATH_KEYS) {
    const dir = project.paths[key];
    try {
      if (statSync(dir).isDirectory()) continue;
    } catch {
      /* Falls through to the warning below. */
    }
    // The warning points at the missing home itself: with a conventional
    // layout there is no manifest to point at, and even with one, the home
    // is the thing to create.
    const repoPath = path.relative(project.root, dir).split(path.sep).join("/");
    findings.push({
      id: "manifest",
      severity: "warning",
      path: repoPath,
      message: `the '${key}' home does not exist yet: ${repoPath}`,
    });
  }

  return findings;
}

export const manifestCheck: Check = {
  id: "manifest",
  run,
};
