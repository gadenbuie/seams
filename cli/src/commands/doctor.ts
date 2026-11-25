/**
 * `seams doctor`: report the seams setup state of the project at the current
 * directory, in five areas, each report line ok, warning, or error with a fix
 * hint.
 *
 * Doctor reports; it does not reimplement. It reuses project discovery for
 * the root and the homes, the manifest check for manifest problems and
 * missing homes, and the skills check for installation state in both scopes,
 * and adds the runtime report (Node >= 22.20, git available) and AGENTS.md
 * discovery (the agent entry point exists and points at the manifest or the
 * documentation homes).
 *
 * It never writes, and it never claims that a harness loaded a skill or that
 * documentation agrees with code. Exit 1 when any report line is an error,
 * 0 otherwise.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { manifestCheck } from "../check/manifest.ts";
import type { Finding } from "../check/types.ts";
import {
  findRoot,
  loadProject,
  manifestPath,
  ManifestError,
  MANIFEST_REPO_PATH,
  PATH_KEYS,
  type Project,
} from "../config.ts";
import { checkSkills } from "../skills/check.ts";
import type { CheckState } from "../skills/check.ts";
import type { Scope } from "../skills/install.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command, CommandContext } from "./index.ts";

const USAGE = "Usage: seams doctor [--json]";

/** The note every doctor output ends with: what this report does not show. */
export const NOTE =
  "Doctor reports setup state; it does not show that a harness loaded a skill or that documentation agrees with code.";

/** The oldest Node runtime the package supports, per `engines` in package.json. */
export const MINIMUM_NODE = "22.20";

export type DoctorStatus = "ok" | "warning" | "error";

export type DoctorAreaName = "manifest" | "paths" | "agents-md" | "runtime" | "skills";

/** One report line: a status, what it found, and how to fix it. */
export interface DoctorLine {
  status: DoctorStatus;
  message: string;
  /** Present when the status is not ok, or when a next step still helps. */
  hint?: string;
  /** Present on the skills area's lines: per-classification counts for the scope. */
  counts?: Record<string, number>;
}

/** One of the five areas, with the worst of its lines' statuses. */
export interface DoctorArea {
  area: DoctorAreaName;
  status: DoctorStatus;
  lines: DoctorLine[];
}

const STATUS_RANK: Record<DoctorStatus, number> = { ok: 0, warning: 1, error: 2 };

const AREA_LABELS: Record<DoctorAreaName, string> = {
  "manifest": "Manifest",
  "paths": "Paths",
  "agents-md": "AGENTS.md",
  "runtime": "Runtime",
  "skills": "Skills",
};

/** Collect lines into an area, carrying the worst line's status. */
function makeArea(area: DoctorAreaName, lines: DoctorLine[]): DoctorArea {
  const status = lines.reduce<DoctorStatus>(
    (worst, line) => (STATUS_RANK[line.status] > STATUS_RANK[worst] ? line.status : worst),
    "ok",
  );
  return { area, status, lines };
}

function usageError(message: string): number {
  process.stderr.write(`${message}\n${USAGE}\n`);
  return 2;
}

/** The repo-relative form of a resolved path, with forward slashes. */
function repoPath(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join("/");
}

/** Whether `version` (e.g. `v22.20.0`) is at least `minimum` (e.g. `22.20`). */
export function nodeMeetsMinimum(version: string, minimum: string = MINIMUM_NODE): boolean {
  const parse = (value: string): number[] =>
    value
      .replace(/^v/, "")
      .split("+")[0]
      .split("-")[0]
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0);
  const have = parse(version);
  const want = parse(minimum);
  for (let i = 0; i < Math.max(have.length, want.length); i++) {
    const a = have[i] ?? 0;
    const b = want[i] ?? 0;
    if (a !== b) return a > b;
  }
  return true;
}

/** The runtime's Node report for one version string. */
export function nodeLine(version: string): DoctorLine {
  return nodeMeetsMinimum(version)
    ? { status: "ok", message: `node ${version} meets the required ${MINIMUM_NODE} or newer` }
    : {
        status: "error",
        message: `node ${version} is older than the required ${MINIMUM_NODE}`,
        hint: `upgrade Node to ${MINIMUM_NODE} or newer`,
      };
}

/** The runtime's git report; `env` defaults to this process's environment. */
export function gitLine(env: NodeJS.ProcessEnv = process.env): DoctorLine {
  const result = spawnSync("git", ["--version"], { encoding: "utf8", env });
  if (result.status === 0 && typeof result.stdout === "string") {
    return { status: "ok", message: `git is available (${result.stdout.trim()})` };
  }
  return {
    status: "error",
    message: "git is not available",
    hint: "install git and make sure the git binary is on PATH",
  };
}

/**
 * The manifest area. With a loaded project it reuses the manifest check's
 * error findings (empty in practice, because an invalid manifest fails
 * `loadProject` first); with a `ManifestError` it reports each issue.
 */
function manifestArea(
  project: Project | undefined,
  manifestIssues: string[] | undefined,
  findings: Finding[],
): DoctorArea {
  const hint = `fix ${MANIFEST_REPO_PATH}; \`seams schema\` prints the JSON Schema it must satisfy`;
  const fromIssues = (issues: string[]): DoctorLine[] =>
    issues.map((issue) => ({ status: "error" as const, message: issue, hint }));

  if (manifestIssues !== undefined) return makeArea("manifest", fromIssues(manifestIssues));

  const problems = findings.filter((finding) => finding.severity === "error");
  if (problems.length > 0) return makeArea("manifest", fromIssues(problems.map((f) => f.message)));

  return makeArea("manifest", [
    project!.source === "manifest"
      ? { status: "ok", message: `the manifest at ${MANIFEST_REPO_PATH} is valid` }
      : { status: "ok", message: `no manifest at ${MANIFEST_REPO_PATH}; using the conventional layout` },
  ]);
}

/**
 * The paths area: the manifest check's missing-home warnings, or one error
 * when an invalid manifest leaves the homes unknown.
 */
function pathsArea(project: Project | undefined, findings: Finding[]): DoctorArea {
  if (project === undefined) {
    return makeArea("paths", [
      {
        status: "error",
        message: "the documentation homes are unknown: the manifest is invalid",
        hint: `fix the ${MANIFEST_REPO_PATH} issues in the manifest area first`,
      },
    ]);
  }
  const missing = findings.filter((finding) => finding.severity === "warning");
  if (missing.length === 0) {
    return makeArea("paths", [{ status: "ok", message: "every documentation home exists" }]);
  }
  return makeArea(
    "paths",
    missing.map((finding) => ({
      status: "warning" as const,
      message: finding.message,
      hint: "create the missing home, or point the manifest's 'paths' at where it lives",
    })),
  );
}

/**
 * The AGENTS.md area: the agent entry point exists at the repository root and
 * points at the manifest (when one exists) or at a documentation home. A
 * missing or unpointing AGENTS.md is a warning: it breaks discovery for
 * agents that start there, but nothing else.
 */
function agentsArea(root: string, project: Project | undefined): DoctorArea {
  const file = path.join(root, "AGENTS.md");
  if (!existsSync(file)) {
    return makeArea("agents-md", [
      {
        status: "warning",
        message: "AGENTS.md is missing at the repository root",
        hint: "create an AGENTS.md that points at the documentation homes (the seams-adopt skill writes one)",
      },
    ]);
  }

  const content = readFileSync(file, "utf8");
  const hasManifest = existsSync(manifestPath(root));
  const homes = project === undefined
    ? []
    : PATH_KEYS.map((key) => repoPath(project.root, project.paths[key]));
  const mentionedHome = homes.find((home) => content.includes(home));

  if (hasManifest && content.includes(MANIFEST_REPO_PATH)) {
    return makeArea("agents-md", [
      { status: "ok", message: `AGENTS.md points at the manifest (${MANIFEST_REPO_PATH})` },
    ]);
  }
  if (mentionedHome !== undefined) {
    return makeArea("agents-md", [
      { status: "ok", message: `AGENTS.md points at the documentation home ${mentionedHome}` },
    ]);
  }
  return makeArea("agents-md", [
    {
      status: "warning",
      message: hasManifest
        ? "AGENTS.md mentions neither the manifest nor a documentation home"
        : "AGENTS.md mentions no documentation home",
      hint: hasManifest
        ? `add a line pointing at ${MANIFEST_REPO_PATH} as the machine-readable record of the documentation homes`
        : "add lines naming where the documentation lives" +
          (homes.length > 0 ? ` (the homes: ${homes.join(", ")})` : ""),
    },
  ]);
}

/** The runtime area: the Node and git reports for this process. */
function runtimeArea(): DoctorArea {
  return makeArea("runtime", [nodeLine(process.version), gitLine()]);
}

/** One scope's summary line: counts per classification, with a repair hint. */
export function scopeLine(scope: Scope, entries: readonly { state: CheckState }[]): DoctorLine {
  if (entries.length === 0) {
    return {
      status: "ok",
      message: `no seams skills are recorded or present in the ${scope} scope`,
    };
  }
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.state, (counts.get(entry.state) ?? 0) + 1);
  const countsObject = Object.fromEntries([...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  const summary = Object.entries(countsObject)
    .map(([state, count]) => `${count} ${state}`)
    .join(", ");
  const notOk = entries.filter((entry) => entry.state !== "ok");
  if (notOk.length === 0) {
    return { status: "ok", message: `${scope}: ${summary}`, counts: countsObject };
  }
  const parts: string[] = [];
  if (notOk.some((entry) => entry.state === "missing" || entry.state === "outdated")) {
    parts.push(`run \`seams skills update --scope ${scope}\` to refresh the outdated and missing copies`);
  }
  if (notOk.some((entry) => entry.state === "modified" || entry.state === "untracked" || entry.state === "divergent")) {
    parts.push(
      "the modified, untracked, or divergent copies need manual reconciliation" +
        ` (\`seams skills check --scope ${scope}\` shows both versions)`,
    );
  }
  return {
    status: "warning",
    message: `${scope}: ${summary}`,
    hint: parts.join("; "),
    counts: countsObject,
  };
}

/**
 * The skills area: the skills check's classification for the project and the
 * global scope, summarized as one count line per scope. `cwd` is the
 * discovered project root, so every area reports on the same root;
 * `sourceDir` lets tests point the bundled source at a fixture.
 */
export async function skillsArea(cwd: string, sourceDir?: string): Promise<DoctorArea> {
  const lines: DoctorLine[] = [];
  for (const scope of ["project", "global"] as const) {
    try {
      const report = await checkSkills({ cwd, scope, sourceDir });
      lines.push(scopeLine(scope, report.entries));
    } catch (error) {
      // A metadata file that cannot be read is broken state, not an
      // incomplete installation: it also stops `skills check` and `update`.
      lines.push({
        status: "error",
        message: `the ${scope} scope could not be checked: ${error instanceof Error ? error.message : String(error)}`,
        hint: "fix or remove that metadata file, then run `seams skills install` to reinstall the skills",
      });
    }
  }
  return makeArea("skills", lines);
}

async function run(ctx: CommandContext): Promise<number> {
  try {
    parseArgs({ args: ctx.args, allowPositionals: false });
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }

  const root = findRoot(process.cwd());
  let project: Project | undefined;
  let manifestIssues: string[] | undefined;
  try {
    project = loadProject(root);
  } catch (error) {
    if (!(error instanceof ManifestError)) throw error;
    manifestIssues = error.issues;
  }

  // The manifest check carries both manifest problems and missing homes;
  // the two areas below split its findings by severity.
  const findings = project === undefined ? [] : manifestCheck.run(project);

  const areas: DoctorArea[] = [
    manifestArea(project, manifestIssues, findings),
    pathsArea(project, findings),
    agentsArea(root, project),
    runtimeArea(),
    await skillsArea(root),
  ];

  const errors = areas.reduce((count, a) => count + a.lines.filter((l) => l.status === "error").length, 0);
  const warnings = areas.reduce((count, a) => count + a.lines.filter((l) => l.status === "warning").length, 0);

  if (ctx.json) {
    printJson(jsonEnvelope("doctor", { root, areas, errors, warnings, note: NOTE }));
  } else {
    for (const a of areas) {
      printText(`${AREA_LABELS[a.area]}: ${a.status}`);
      for (const line of a.lines) {
        printText(`  [${line.status}] ${line.message}`);
        if (line.hint !== undefined) printText(`    fix: ${line.hint}`);
      }
    }
    printText(NOTE);
  }
  return errors > 0 ? 1 : 0;
}

export const doctorCommand: Command = {
  summary: "report the seams setup state of the project",
  run,
};
