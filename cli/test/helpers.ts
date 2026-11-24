/** Test helpers: copy a fixture project into a fresh temporary directory. */
import { cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export function fixtureDir(name: string): string {
  return path.resolve(import.meta.dirname, "fixtures", name);
}

/** Copy a fixture into a fresh temp directory and return its absolute path. */
export function copyFixture(name: string): string {
  const target = mkdtempSync(path.join(tmpdir(), `seams-test-`));
  cpSync(fixtureDir(name), target, { recursive: true });
  return target;
}
