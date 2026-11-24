/**
 * Copy the repository's skills into the package so npm packs them.
 *
 * The root `skills/` directory is the hand-edited source of truth. This script
 * replaces `cli/skills/` with a fresh copy of it, so the npm tarball always
 * ships the current skills without a second hand-edited copy. The templates
 * used by `seams new` (skills/seams-propose/assets/proposal.md and
 * skills/seams-plan/assets/plan.md) live inside the skills copy, so they come
 * along with it.
 *
 * Wired into `npm run build` and `npm pack` (through `prepack`). An explicit
 * target directory replaces the default for tests:
 *
 *   node scripts/bundle-skills.mjs [target]
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import path from "node:path";

const packageDir = path.resolve(import.meta.dirname, "..");
const sourceDir = path.resolve(packageDir, "..", "skills");
const targetDir =
  process.argv[2] === undefined
    ? path.join(packageDir, "skills")
    : path.resolve(process.argv[2]);

if (!existsSync(sourceDir)) {
  console.error(`bundle-skills: no skills directory at ${sourceDir}`);
  process.exit(1);
}

rmSync(targetDir, { recursive: true, force: true });
cpSync(sourceDir, targetDir, { recursive: true });
console.log(`bundle-skills: copied ${sourceDir} -> ${targetDir}`);
