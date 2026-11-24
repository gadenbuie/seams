/**
 * The check framework: a check inspects one mechanical project concern and
 * reports findings, and never modifies anything.
 *
 * `seams check` runs every check in `./index.ts`, so a new check is one entry
 * in that list and one file beside this one.
 */
import type { Project } from "../config.ts";

export type Severity = "error" | "warning";

export interface Finding {
  /** The id of the check that produced this finding, e.g. `frontmatter`. */
  id: string;
  severity: Severity;
  /** Repo-relative path with forward slashes. */
  path: string;
  /** 1-based line number, when the finding points at one. */
  line?: number;
  message: string;
}

export interface Check {
  /** The check's id, used as the `id` of every finding it reports. */
  id: string;
  /** Run the check against a project and return its findings. */
  run(project: Project): Finding[];
}
