/**
 * The `skill-refs` check: skills keep their sibling references and their own
 * name in order.
 *
 * A `<skills>/seams-x/...` path in a `SKILL.md` or one of the skill's
 * `references/` files must point at a file (or folder) that exists in the
 * project's `skills/` folder, and every `skills/<name>/SKILL.md` must carry a
 * frontmatter `name` equal to its folder name. The check is silent when the
 * project has no `skills/` folder.
 *
 * The skill's `assets/` files are not scanned: they are templates and prompt
 * fragments, and some list alternatives a reader chooses from, such as
 * `<kata.md | github.md>`, which are not single paths.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Project } from "../config.ts";
import { documentBody, unfencedLines } from "../docs/markdown.ts";
import { walkMarkdownFiles } from "../docs/discover.ts";
import { parseFrontmatter } from "../docs/frontmatter.ts";
import type { Check, Finding } from "./types.ts";

const SIBLING_PATH = /<skills>\/([\w./-]+)/g;

/** The 1-based line of `key:` inside the frontmatter block, or null. */
function frontmatterLine(lines: string[], key: string): number | null {
  const pattern = new RegExp(`^\\s*${key}\\s*:`);
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) return i + 1;
  }
  return null;
}

function finding(repoPath: string, message: string, line?: number): Finding {
  return { id: "skill-refs", severity: "error", path: repoPath, message, line };
}

/** Check the frontmatter `name` of one skill against its folder name. */
function checkName(
  project: Project,
  skillName: string,
  skillFile: string,
): Finding[] {
  const text = readFileSync(skillFile, "utf8");
  const { data, problems } = parseFrontmatter(text);
  const repoPath = path.relative(project.root, skillFile).split(path.sep).join("/");

  if (problems.length > 0 || data.name === undefined) {
    return [finding(repoPath, `skill '${skillName}' frontmatter is missing 'name'`, 1)];
  }
  if (data.name !== skillName) {
    return [
      finding(
        repoPath,
        `frontmatter 'name' is '${String(data.name)}', expected '${skillName}'`,
        frontmatterLine(text.split(/\r?\n/), "name") ?? 1,
      ),
    ];
  }
  return [];
}

/** Check `<skills>/...` sibling paths in one file, outside fenced code. */
function checkSiblingPaths(
  project: Project,
  file: string,
  skillsDir: string,
): Finding[] {
  const findings: Finding[] = [];
  const repoPath = path.relative(project.root, file).split(path.sep).join("/");
  const body = documentBody(readFileSync(file, "utf8"));
  unfencedLines(body, (line, lineNo) => {
    for (const match of line.matchAll(SIBLING_PATH)) {
      // A path that ends a sentence keeps its period; markdown does not.
      const relative = match[1].replace(/\.+$/, "");
      if (!existsSync(path.join(skillsDir, relative))) {
        findings.push(
          finding(
            repoPath,
            `sibling-skill path '<skills>/${relative}>' does not exist`,
            lineNo,
          ),
        );
      }
    }
  });
  return findings;
}

function run(project: Project): Finding[] {
  const skillsDir = path.join(project.root, "skills");
  let stats: ReturnType<typeof statSync>;
  try {
    stats = statSync(skillsDir);
  } catch {
    return []; // No skills folder: nothing to check.
  }
  if (!stats.isDirectory()) return [];

  const findings: Finding[] = [];
  const entries = readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const skillFile = path.join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillFile)) {
      findings.push(
        finding(
          path.relative(project.root, path.join(skillsDir, entry.name)).split(path.sep).join("/"),
          `skill folder '${entry.name}' has no SKILL.md`,
        ),
      );
      continue;
    }
    findings.push(...checkName(project, entry.name, skillFile));
    const references = path.join(skillsDir, entry.name, "references");
    const files = [skillFile];
    if (existsSync(references) && statSync(references).isDirectory()) {
      files.push(...walkMarkdownFiles(references));
    }
    for (const file of files) {
      findings.push(...checkSiblingPaths(project, file, skillsDir));
    }
  }
  return findings;
}

export const skillRefsCheck: Check = {
  id: "skill-refs",
  run,
};
