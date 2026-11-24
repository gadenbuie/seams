/**
 * `seams new`: create a new proposal, plan, or overview in its configured home.
 *
 * The proposal and plan start from the bundled templates and carry `status:
 * draft` and today's local date. The proposal number is the next unused one in
 * the proposals home, and a proposal whose slug shares more than half of its
 * words with an open proposal's slug or title stops the command unless
 * `--force` is given. Nothing here creates or edits canon, and no existing
 * file is ever overwritten. With `--update-index` a new overview also appends
 * one link line to the overviews index; that index line is the only file this
 * command may touch besides the document it creates.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import path from "node:path";
import { findRoot, loadProject, type Project } from "../config.ts";
import { parseFrontmatter } from "../docs/frontmatter.ts";
import { bundledSkillsDir } from "../skills/bundled.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command, CommandContext } from "./index.ts";

const TYPES = ["proposal", "plan", "overview"] as const;

type NewType = (typeof TYPES)[number];

/** The templates each type starts from, inside the bundled skills copy. */
const TEMPLATE_PATHS: Record<Exclude<NewType, "overview">, string[]> = {
  proposal: ["seams-propose", "assets", "proposal.md"],
  plan: ["seams-plan", "assets", "plan.md"],
};

const USAGE =
  "Usage: seams new <proposal|plan|overview> <slug> " +
  "[--title <t>] [--description <d>] [--update-index] [--force]";

/** Words too common to make two documents similar on their own. */
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "of", "for", "to", "in", "on", "with", "at", "by", "is", "are",
]);

/** A stopped creation: the message reports why, and the caller exits 1. */
class CreationError extends Error {}

function usageError(message: string): number {
  process.stderr.write(`${message}\n${USAGE}\n`);
  return 2;
}

/** Lowercase word pieces of a slug or title, with stop words removed. */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word));
}

/** The slug's words, capitalized and joined with spaces: `try-it` → `Try It`. */
function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Today's date in the process's local time zone, as `yyyy-mm-dd`. */
function localDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/**
 * Format a value as a single-line YAML scalar, quoting it only when the plain
 * form would not read back as one string. A JSON string is also a valid YAML
 * double-quoted scalar.
 */
function yamlScalar(value: string): string {
  if (/^[A-Za-z0-9][A-Za-z0-9 _./-]*$/.test(value) && !value.endsWith(" ")) {
    return value;
  }
  return JSON.stringify(value);
}

/** The highest numeric `NNNN-` prefix among a home's files, so the next is 1 + it. */
function nextNumber(dir: string): number {
  let max = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const match = /^(\d+)-/.exec(entry.name);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return max + 1;
}

function paddedNumber(number: number): string {
  return String(number).padStart(4, "0");
}

/** Whether any file in `dir` already follows the `NNNN-` naming convention. */
function usesNumbering(dir: string): boolean {
  return readdirSync(dir, { withFileTypes: true }).some(
    (entry) => entry.isFile() && /^(\d+)-/.test(entry.name),
  );
}

/** Fill a template's title, description, status, and created fields.
 *
 * The frontmatter title line is quoted as YAML needs, while the body's
 * `<title>` placeholders (the H1) get the raw title.
 */
function fillTemplate(
  template: string,
  fields: { title: string; description: string; created: string },
): string {
  return template
    .replace(/^title:.*$/m, () => `title: ${yamlScalar(fields.title)}`)
    .replaceAll("<title>", () => fields.title)
    .replace(/^description:.*$/m, () => `description: ${yamlScalar(fields.description)}`)
    .replace(/^status:.*$/m, () => "status: draft")
    .replace(/^created:.*$/m, () => `created: ${fields.created}`);
}

/** The minimal starting document for an overview. */
function overviewDocument(fields: { title: string; description: string }): string {
  return (
    `---\ntitle: ${yamlScalar(fields.title)}\n` +
    `description: ${yamlScalar(fields.description)}\n---\n\n# ${fields.title}\n`
  );
}

/** One open proposal that a new proposal's slug or title might collide with. */
interface OpenProposal {
  /** Path relative to the project root. */
  path: string;
  title: string;
  /** The proposal's own slug and title words, stop words removed. */
  words: Set<string>;
}

/** The proposals in `dir` whose status is draft or accepted. */
function openProposals(dir: string, project: Project): OpenProposal[] {
  const open: OpenProposal[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const file = path.join(dir, entry.name);
    const { data } = parseFrontmatter(readFileSync(file, "utf8"));
    if (data.status !== "draft" && data.status !== "accepted") continue;
    const slugPart = entry.name.replace(/^\d+-/, "").replace(/\.md$/, "");
    const title = typeof data.title === "string" ? data.title : slugPart;
    open.push({
      path: path.relative(project.root, file).split(path.sep).join("/"),
      title,
      words: new Set([...words(slugPart), ...words(title)]),
    });
  }
  return open;
}

/**
 * The open proposals whose slug or title shares more than half of the new
 * slug's words. A slug made only of stop words has nothing to compare, so it
 * matches nothing.
 */
function similarOpenProposals(slug: string, dir: string, project: Project): OpenProposal[] {
  const wanted = new Set(words(slug));
  if (wanted.size === 0) return [];
  return openProposals(dir, project).filter((proposal) => {
    let shared = 0;
    for (const word of wanted) {
      if (proposal.words.has(word)) shared++;
    }
    return shared * 2 > wanted.size;
  });
}

/** Append one link line to the overviews index, creating the index if needed. */
function appendIndexLine(indexPath: string, slug: string): void {
  let content = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
  if (content.length > 0 && !content.endsWith("\n")) content += "\n";
  writeFileSync(indexPath, `${content}- [${slug}.md](${slug}.md)\n`);
}

/** Repo-relative path with forward slashes, as discovery reports paths. */
function relativePath(project: Project, file: string): string {
  return path.relative(project.root, file).split(path.sep).join("/");
}

function refuseExisting(project: Project, file: string): void {
  if (!existsSync(file)) return;
  throw new CreationError(`Refusing to overwrite an existing file: ${relativePath(project, file)}`);
}

function readTemplate(type: Exclude<NewType, "overview">): string {
  return readFileSync(path.join(bundledSkillsDir(), ...TEMPLATE_PATHS[type]), "utf8");
}

/** What one run created: the written file's repo-relative path and, when the home numbers its files, the number. */
interface Created {
  path: string;
  number?: number;
}

function create(
  type: NewType,
  slug: string,
  fields: { title: string; description: string },
  project: Project,
  options: { updateIndex: boolean; force: boolean },
): Created {
  const templateFields = { ...fields, created: localDate() };

  if (type === "proposal") {
    const dir = project.paths.proposals;
    mkdirSync(dir, { recursive: true });
    const number = nextNumber(dir);
    const file = path.join(dir, `${paddedNumber(number)}-${slug}.md`);
    refuseExisting(project, file);
    const similar = similarOpenProposals(slug, dir, project);
    if (similar.length > 0 && !options.force) {
      let message = "Similar open proposals already exist:";
      for (const proposal of similar) {
        message += `\n  ${proposal.path} — ${proposal.title}`;
      }
      message += "\nUse --force to create the proposal anyway.";
      throw new CreationError(message);
    }
    writeFileSync(file, fillTemplate(readTemplate("proposal"), templateFields));
    return { path: relativePath(project, file), number };
  }

  if (type === "plan") {
    const dir = project.paths.plans;
    mkdirSync(dir, { recursive: true });
    const numbered = usesNumbering(dir);
    const number = numbered ? nextNumber(dir) : undefined;
    const fileName = number !== undefined ? `${paddedNumber(number)}-${slug}.md` : `${slug}.md`;
    const file = path.join(dir, fileName);
    refuseExisting(project, file);
    writeFileSync(file, fillTemplate(readTemplate("plan"), templateFields));
    return { path: relativePath(project, file), number };
  }

  const dir = project.paths.overviews;
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slug}.md`);
  refuseExisting(project, file);
  writeFileSync(file, overviewDocument(fields));
  const indexPath = path.join(dir, "index.md");
  if (options.updateIndex) {
    appendIndexLine(indexPath, slug);
  } else {
    process.stderr.write(
      `The overviews index needs an entry for this document: ${relativePath(project, indexPath)}\n`,
    );
  }
  return { path: relativePath(project, file) };
}

function run(ctx: CommandContext): number {
  let values: {
    title?: string;
    description?: string;
    "update-index"?: boolean;
    force?: boolean;
  };
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      args: ctx.args,
      options: {
        title: { type: "string" },
        description: { type: "string" },
        "update-index": { type: "boolean" },
        force: { type: "boolean" },
      },
      allowPositionals: true,
    }));
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }

  if (positionals.length === 0) return usageError("Missing document type.");
  const type = positionals[0] as NewType;
  if (!TYPES.includes(type)) {
    return usageError(`Unknown type '${positionals[0]}'. Expected one of: ${TYPES.join(", ")}`);
  }
  if (positionals.length === 1) return usageError("Missing slug.");
  if (positionals.length > 2) return usageError(`Unexpected argument: ${positionals[2]}`);
  const slug = positionals[1];
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return usageError(
      `Invalid slug '${slug}'. Use lowercase letters and digits separated by single dashes.`,
    );
  }

  const project = loadProject(findRoot(process.cwd()));
  const fields = {
    title: values.title ?? titleFromSlug(slug),
    description: values.description ?? "TODO: say when to read this document",
  };

  let created: Created;
  try {
    created = create(type, slug, fields, project, {
      updateIndex: values["update-index"] === true,
      force: values.force === true,
    });
  } catch (error) {
    if (error instanceof CreationError) {
      process.stderr.write(`${error.message}\n`);
      return 1;
    }
    throw error;
  }

  if (ctx.json) {
    const payload: Record<string, unknown> = { path: created.path };
    if (created.number !== undefined) payload.number = created.number;
    printJson(jsonEnvelope("new", payload));
  } else {
    printText(created.path);
  }
  return 0;
}

export const newCommand: Command = {
  summary: "create a new proposal, plan, or overview",
  run,
};
