/**
 * Seams' own skill installation metadata.
 *
 * The `skills` library records only paths in its lock files, so it cannot
 * carry a stable package identity (seams#sn2t). This module is the
 * authoritative record of which bundled skills seams installed, where, with
 * which hash, and from which package version. Project scope writes
 * `.agents/seams-skills.json` next to the canonical install target; global
 * scope writes `~/.agents/seams-skills.json`. The metadata is written only
 * after a successful install, so an interrupted write surfaces as `modified`
 * or `missing` in `skills check` and `skills update` repairs it.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { packageRoot } from "../config.ts";

/** The scope a skill can be installed to. */
export type Scope = "project" | "global";

/** How a skill copy was written. */
export type InstallMode = "copy" | "symlink";

/** One installed skill's record. */
export interface SkillRecord {
  /** The skill-folder content hash of the installed copy (see hash.ts). */
  hash: string;
  /** The skill's own `metadata.version` from SKILL.md, when present. */
  version?: string;
  /** The library agent ids the skill was installed for. */
  agents: string[];
  mode: InstallMode;
  /** ISO timestamp of the first successful install. */
  installedAt: string;
  /** ISO timestamp of the last metadata change. */
  updatedAt: string;
}

/** The whole metadata file for one scope. */
export interface SkillsMeta {
  schemaVersion: 1;
  package: string;
  packageVersion: string;
  scope: Scope;
  skills: Record<string, SkillRecord>;
}

export const PACKAGE_NAME = "@grrrck/seams";

/** The version of the running seams package, from its package.json. */
export function packageVersion(): string {
  const manifest = JSON.parse(
    readFileSync(path.join(packageRoot(), "package.json"), "utf8"),
  ) as { version?: string };
  return manifest.version ?? "0.0.0";
}

/** Path of the seams skills metadata for `scope`, resolved from `cwd`. */
export function seamsSkillsMetaPath(cwd: string, scope: Scope): string {
  return scope === "project"
    ? path.join(cwd, ".agents", "seams-skills.json")
    : path.join(homedir(), ".agents", "seams-skills.json");
}

/**
 * Read the seams skills metadata for `scope`. Returns undefined when the file
 * does not exist. Throws when the file exists but is not valid metadata.
 */
export function readSkillsMeta(cwd: string, scope: Scope): SkillsMeta | undefined {
  const file = seamsSkillsMetaPath(cwd, scope);
  if (!existsSync(file)) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(
      `seams skills metadata at ${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (
    parsed === null || typeof parsed !== "object" ||
    (parsed as { schemaVersion?: unknown }).schemaVersion !== 1 ||
    typeof (parsed as { package?: unknown }).package !== "string" ||
    (parsed as { skills?: unknown }).skills === null ||
    typeof (parsed as { skills?: unknown }).skills !== "object"
  ) {
    throw new Error(
      `seams skills metadata at ${file} is not a schemaVersion 1 metadata file`,
    );
  }
  return parsed as SkillsMeta;
}

/** Write the metadata file for `scope`, creating its parent directory. */
export function writeSkillsMeta(cwd: string, scope: Scope, meta: SkillsMeta): void {
  const file = seamsSkillsMetaPath(cwd, scope);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(meta, null, 2) + "\n");
}
