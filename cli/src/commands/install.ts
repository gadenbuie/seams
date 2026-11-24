/**
 * `seams install`: install the skills bundled with the running package.
 *
 * This command is the seam for future integrations; today it does exactly
 * the skills install (the proposal's "`init` and `install`" section) and
 * says so in its output. Installation, hashing, and the seams metadata all
 * stay in the skills install layer (`../skills/install.ts`); this file only
 * parses arguments, calls `installSkills`, and prints the report, with the
 * same outcome text and exit codes as `seams skills install`.
 *
 * `--scope` selects project or global (default: project). `--agent`
 * selects the target harnesses explicitly; without it the supported
 * harnesses are detected. `--dry-run` runs the preflight alone and writes
 * nothing.
 */
import { parseArgs } from "node:util";
import { installSkills, UnsupportedAgentError } from "../skills/install.ts";
import type { AgentId, InstallReport, Scope } from "../skills/install.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command, CommandContext } from "./index.ts";

const USAGE =
  "Usage: seams install [--scope project|global] [--agent <id>...] [--dry-run]";

function usageError(message: string): number {
  process.stderr.write([message, USAGE, ""].join("\n"));
  return 2;
}

/**
 * Parse a `--scope` value: undefined means the caller did not give one,
 * `"invalid"` marks anything but `project` or `global`.
 */
export function parseScopeValue(
  value: string | undefined,
): Scope | "invalid" | undefined {
  if (value === undefined) return undefined;
  if (value === "project" || value === "global") return value;
  return "invalid";
}

/** Text lines for an install report: detection, one line per target, and the outcome. */
export function installReportLines(report: InstallReport): string[] {
  const lines: string[] = [];
  if (report.detected && report.agents.length > 0) {
    lines.push(`Agents detected: ${report.agents.join(", ")}`);
  }
  for (const target of report.targets) {
    const detail = target.reason === undefined ? "" : ` (${target.reason})`;
    lines.push(`  ${target.skill} → ${target.agent}: ${target.action} ${target.path}${detail}`);
  }
  if (report.dryRun) {
    lines.push("Dry run: nothing written.");
    return lines;
  }
  const counts = { install: 0, unchanged: 0, skipped: 0, failed: 0 };
  for (const target of report.targets) {
    if (target.action === "install") counts.install += 1;
    else if (target.action === "unchanged") counts.unchanged += 1;
    else if (target.action === "failed") counts.failed += 1;
    else counts.skipped += 1;
  }
  lines.push(
    `Installed ${counts.install}, unchanged ${counts.unchanged}, skipped ${counts.skipped}, failed ${counts.failed}.`,
  );
  return lines;
}

/**
 * The exit code for an install report: a dry run is 0, and a complete
 * install is 0; a skipped or failed target is a finding.
 */
export function installExitCode(report: InstallReport): number {
  if (report.dryRun) return 0;
  const incomplete = report.targets.some(
    (target) =>
      target.action === "skipped" ||
      target.action === "skipped (modified)" ||
      target.action === "failed",
  );
  return incomplete ? 1 : 0;
}

/** The JSON payload of an install report, shared with `seams init`. */
export function installPayload(report: InstallReport): Record<string, unknown> {
  return {
    scope: report.scope,
    mode: report.mode,
    agents: report.agents,
    detected: report.detected,
    dryRun: report.dryRun,
    source: report.source,
    metaPath: report.metaPath,
    warnings: report.warnings,
    targets: report.targets,
  };
}

/** The line `seams install` prints about what it is, before the report. */
export const INSTALL_SAYS_SO =
  "seams install currently does exactly `seams skills install`: installing the bundled seams skills.";

const OPTIONS = {
  scope: { type: "string" },
  agent: { type: "string", multiple: true },
  "dry-run": { type: "boolean" },
} as const;

export const installCommand: Command = {
  summary: "install the bundled skills (today: exactly `seams skills install`)",
  async run(ctx: CommandContext): Promise<number> {
    let values;
    try {
      ({ values } = parseArgs({ args: ctx.args, options: OPTIONS, allowPositionals: false }));
    } catch (error) {
      return usageError(error instanceof Error ? error.message : String(error));
    }
    const scope = parseScopeValue(values.scope);
    if (scope === "invalid") {
      return usageError(`Invalid --scope: ${values.scope} (expected project or global)`);
    }

    let report;
    try {
      report = await installSkills({
        scope: scope ?? "project",
        mode: "copy",
        agents: values.agent === undefined ? undefined : (values.agent as AgentId[]),
        dryRun: values["dry-run"] === true,
      });
    } catch (error) {
      if (error instanceof UnsupportedAgentError) return usageError(error.message);
      process.stderr.write(`seams: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }

    if (report.agents.length === 0) {
      process.stderr.write(
        "No supported agents detected; pass --agent to choose one (claude-code, codex, pi).\n",
      );
      return 1;
    }

    if (ctx.json) {
      printJson(jsonEnvelope("install", installPayload(report)));
      return installExitCode(report);
    }

    printText(INSTALL_SAYS_SO);
    for (const line of installReportLines(report)) printText(line);
    return installExitCode(report);
  },
};
