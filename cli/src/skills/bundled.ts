/**
 * Access to the skills bundled with the running package.
 *
 * The repository's `skills/` directory is the hand-edited source of truth. The
 * package copies it into `skills/` at build and pack time
 * (scripts/bundle-skills.mjs), and the packaged tarball ships that copy. When
 * the bundled copy is present next to the package root it is used; otherwise
 * the CLI falls back to the repository's own `skills/` directory, so the
 * command also works when run straight from a source checkout.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { packageRoot } from "../config.ts";
import { parseFrontmatter } from "../docs/frontmatter.ts";

/** One file in a bundled skill, at a path relative to the skill's folder. */
export interface BundledFile {
  path: string;
  /** Size in bytes. */
  bytes: number;
}

/** One bundled skill, as `skills list` shows it. */
export interface BundledSkill {
  name: string;
  /** The description from the skill's SKILL.md frontmatter, or "" when absent. */
  description: string;
  /** Every file in the skill folder, in sorted path order (`SKILL.md` first). */
  files: BundledFile[];
  /**
   * sha256 over the files' relative paths and contents, each pair separated by
   * a null byte, in sorted path order.
   */
  hash: string;
}

/** The directory holding the skills bundled with the running package. */
export function bundledSkillsDir(): string {
  const bundled = path.join(packageRoot(), "skills");
  if (existsSync(bundled)) return bundled;
  // Run from source without a bundle step: use the repository's own
  // hand-edited skills directory.
  return path.resolve(packageRoot(), "..", "skills");
}

/** Names of the skill folders under `dir` that hold a SKILL.md, in order. */
function skillNames(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() && existsSync(path.join(dir, entry.name, "SKILL.md")),
    )
    .map((entry) => entry.name)
    .sort();
}

/** Relative paths of every file under `skillDir`, in sorted path order. */
function skillFilePaths(skillDir: string): string[] {
  const paths: string[] = [];
  const walk = (relative: string): void => {
    const absolute = path.join(skillDir, relative);
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const child = relative === "" ? entry.name : path.join(relative, entry.name);
      if (entry.isDirectory()) walk(child);
      else paths.push(child);
    }
  };
  walk("");
  return paths.sort();
}

/**
 * sha256 over sorted relative paths and their contents. Stable for unchanged
 * input; changes when any path or content changes.
 */
export function contentHash(files: { path: string; content: string }[]): string {
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(`${file.path}\0${file.content}\0`);
  }
  return hash.digest("hex");
}

/** Every bundled skill, in name order. */
export function listBundledSkills(): BundledSkill[] {
  const dir = bundledSkillsDir();
  return skillNames(dir).map((name) => {
    const skillDir = path.join(dir, name);
    const paths = skillFilePaths(skillDir);
    const files = paths.map((p) => ({
      path: p,
      bytes: statSync(path.join(skillDir, p)).size,
    }));
    const contents = paths.map((p) => ({
      path: p,
      content: readFileSync(path.join(skillDir, p), "utf8"),
    }));
    const { data } = parseFrontmatter(
      readFileSync(path.join(skillDir, "SKILL.md"), "utf8"),
    );
    return {
      name,
      description: typeof data.description === "string" ? data.description : "",
      files,
      hash: contentHash(contents),
    };
  });
}

/** One bundled skill's full contents, for `skills get`. */
export interface BundledSkillContent {
  name: string;
  /** Every file in the skill folder, in sorted path order (`SKILL.md` first). */
  files: {
    /** Path relative to the skill's folder. */
    path: string;
    /** Absolute path inside the bundled skills directory. */
    absolutePath: string;
    content: string;
  }[];
}

/** A skill name is a single folder name under the bundled skills directory. */
function isValidSkillName(name: string): boolean {
  return name.length > 0 && !name.includes("/") && !name.includes("\\") && name !== "." && name !== "..";
}

/**
 * Read one bundled skill by name. Returns undefined when no skill folder of
 * that name holds a SKILL.md.
 */
export function readBundledSkill(name: string): BundledSkillContent | undefined {
  if (!isValidSkillName(name)) return undefined;
  const skillDir = path.join(bundledSkillsDir(), name);
  if (!existsSync(path.join(skillDir, "SKILL.md"))) return undefined;
  const paths = skillFilePaths(skillDir);
  return {
    name,
    files: paths.map((p) => ({
      path: p,
      absolutePath: path.join(skillDir, p),
      content: readFileSync(path.join(skillDir, p), "utf8"),
    })),
  };
}
