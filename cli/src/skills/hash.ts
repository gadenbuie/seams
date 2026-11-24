/**
 * The skill-folder content hash.
 *
 * This matches the `skills` library's internal `computedHash` byte for byte
 * (verified against skills@1.9.0; seams#sn2t), so the hashes seams records can
 * cross-check the library's lock file and vice versa. The algorithm: sha256
 * over the folder's files sorted by path bytes, feeding for each file the
 * path's bytes, a null byte, the decimal length of the normalized content, a
 * null byte, and the content.
 *
 * The copy on disk keeps its original line endings; CRLF is normalized to LF
 * only while hashing. Files named `metadata.json` and the directories `.git`,
 * `__pycache__`, and `__pypackages__` are excluded: the library strips
 * `metadata.json` when it copies a skill, so the bundled source folder and its
 * installed copy hash the same. In-skill symlinks are resolved when they stay
 * inside the skill root; entries that resolve outside it are excluded.
 */
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import path from "node:path";

/** Directories the hash skips anywhere in the tree. */
const EXCLUDED_DIRS = new Set([".git", "__pycache__", "__pypackages__"]);

/** Files the hash skips anywhere in the tree (the library drops these on copy). */
const EXCLUDED_FILES = new Set(["metadata.json"]);

/** One file contribution to the hash, with `/`-separated relative path. */
interface HashedFile {
  path: string;
  /** Content with CRLF already normalized to LF. */
  content: Buffer;
}

/** True when `target` is strictly inside `root` (both real, absolute paths). */
function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/** Normalize CRLF (0D 0A) to LF. */
function normalizeContent(raw: Buffer): Buffer {
  return Buffer.from(raw.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
}

/**
 * Every file of a skill folder that contributes to the hash, in sorted path
 * byte order. `dir` may itself be reached through a symlink; symlinks inside
 * the folder count only when they resolve inside the skill root.
 */
function hashedFiles(dir: string): HashedFile[] {
  const root = realpathSync(dir);
  const files: HashedFile[] = [];
  // Symlinked subdirectories could loop back into an already-visited folder;
  // each visited real path is hashed once.
  const visited = new Set<string>([root]);

  const walk = (absolute: string, relative: string): void => {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const childRel = relative === "" ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        walk(path.join(absolute, entry.name), childRel);
      } else if (entry.isFile()) {
        if (EXCLUDED_FILES.has(entry.name)) continue;
        files.push({ path: childRel, content: normalizeContent(readFileSync(path.join(absolute, entry.name))) });
      } else if (entry.isSymbolicLink()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        let resolved: string;
        try {
          resolved = realpathSync(path.join(absolute, entry.name));
        } catch {
          continue; // a broken symlink contributes nothing
        }
        if (!isInside(root, resolved) || visited.has(resolved)) continue;
        visited.add(resolved);
        const stats = statSync(resolved);
        if (stats.isFile()) {
          if (EXCLUDED_FILES.has(entry.name)) continue;
          files.push({ path: childRel, content: normalizeContent(readFileSync(resolved)) });
        } else if (stats.isDirectory()) {
          walk(resolved, childRel);
        }
      }
    }
  };

  walk(root, "");
  return files.sort((a, b) => Buffer.compare(Buffer.from(a.path, "utf8"), Buffer.from(b.path, "utf8")));
}

/**
 * The skill-folder content hash: sha256 over the folder's hashed files, each
 * contributing `pathBytes \0 length \0 content`. Throws when `dir` does not
 * exist or cannot be read.
 */
export function skillFolderHash(dir: string): string {
  const hash = createHash("sha256");
  for (const file of hashedFiles(dir)) {
    hash.update(Buffer.from(file.path, "utf8"));
    hash.update("\0");
    hash.update(String(file.content.length));
    hash.update("\0");
    hash.update(file.content);
  }
  return hash.digest("hex");
}
