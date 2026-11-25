/**
 * `seams skills`: inspect, install, and update the skills bundled with the
 * running package.
 *
 * `skills list` names each bundled skill with its installation state in a
 * scope (installed, missing, modified, untracked, or not installed).
 * `skills get <name>` prints one skill and its bundled references and assets,
 * or returns their contents and paths in JSON, without installing anything.
 * `skills install` installs the bundled skills through the `skills` library,
 * preserving modified copies and never writing without an explicit agent
 * selection. `skills check` classifies every installed copy (ok, modified,
 * missing, untracked, outdated, or divergent) and exits 1 when anything is
 * not ok. `skills update` refreshes the outdated and missing copies, leaving
 * modified, untracked, and divergent copies for manual reconciliation.
 *
 * The install report lines, JSON payload, and exit codes are shared with
 * `seams install` and `seams init` (./install.ts exports them), and the
 * text `skills get` prints is the same formatter `seams init` inlines
 * (./init.ts exports it), so the commands cannot drift apart.
 */
import { parseArgs } from "node:util";
import { listBundledSkills, readBundledSkill } from "../skills/bundled.ts";
import { checkSkills, updateSkills } from "../skills/check.ts";
import type { CheckEntry, UpdateTarget } from "../skills/check.ts";
import { UnsupportedAgentError, installSkills, installationStatuses } from "../skills/install.ts";
import type { AgentId, InstallMode, Scope } from "../skills/install.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command, CommandContext } from "./index.ts";
import { formatBundledSkill } from "./init.ts";
import { installExitCode, installPayload, installReportLines } from "./install.ts";

/** One `skills` subcommand. Later units add entries to the map. */
interface Subcommand {
  summary: string;
  run(ctx: CommandContext, args: string[]): number | void | Promise<number | void>;
}

const USAGE = "Usage: seams skills <list | get | install | check | update> [options]";

function usageError(message: string): number {
  const map = subcommandMap();
  const lines = Object.keys(map).sort().map((name) => `  ${name.padEnd(10)} ${map[name].summary}`);
  process.stderr.write(
    [message, USAGE, "", "Subcommands:", ...lines, ""].join("\n"),
  );
  return 2;
}

/** Parse a `--scope` value; undefined means the caller wants the default. */
function parseScope(value: string | undefined): Scope | number {
  if (value === undefined) return "project";
  if (value === "project" || value === "global") return value;
  return usageError(`Invalid --scope: ${value} (expected project or global)`);
}

function runList(ctx: CommandContext, args: string[]): number | Promise<number> {
  let scopeResult: Scope | number;
  try {
    const { values } = parseArgs({
      args,
      options: { scope: { type: "string" } },
      allowPositionals: false,
    });
    scopeResult = parseScope(values.scope);
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }
  if (typeof scopeResult === "number") return scopeResult;
  const scope = scopeResult;

  const skills = listBundledSkills();
  return installationStatuses(process.cwd(), scope, skills.map((skill) => skill.name))
    .then((statuses) => {
      if (ctx.json) {
        printJson(
          jsonEnvelope("skills list", {
            scope,
            skills: skills.map((skill) => {
              const status = statuses.get(skill.name);
              return {
                name: skill.name,
                description: skill.description,
                installation:
                  status === undefined
                    ? { state: "not-installed" }
                    : { state: status.state, path: status.path, hash: status.hash },
              };
            }),
          }),
        );
        return 0;
      }
      for (const skill of skills) {
        const status = statuses.get(skill.name);
        const state = status === undefined ? "not-installed" : status.state.replace("not-installed", "not installed");
        printText(`  ${skill.name} · ${skill.description} · ${state}`);
      }
      return 0;
    })
    .catch((error: unknown) => {
      process.stderr.write(`seams: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    });
}

function runGet(ctx: CommandContext, args: string[]): number {
  let positionals: string[];
  try {
    ({ positionals } = parseArgs({
      args,
      options: {},
      allowPositionals: true,
    }));
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }
  if (positionals.length === 0) {
    return usageError("Missing skill name.");
  }
  if (positionals.length > 1) {
    return usageError(`Unexpected argument: ${positionals[1]}`);
  }

  const name = positionals[0];
  const skill = readBundledSkill(name);
  if (skill === undefined) {
    const valid = listBundledSkills().map((s) => s.name);
    process.stderr.write(
      `Unknown skill: ${name}\nValid names: ${valid.join(", ")}\n`,
    );
    return 1;
  }

  if (ctx.json) {
    printJson(jsonEnvelope("skills get", { name: skill.name, files: skill.files }));
    return 0;
  }

  // Text mode prints exactly what `seams init` inlines: the shared
  // formatter prints SKILL.md first, then each reference and asset under a
  // header naming its path relative to the skill's folder.
  process.stdout.write(formatBundledSkill(skill));
  return 0;
}

const INSTALL_OPTIONS = {
  scope: { type: "string" },
  agent: { type: "string", multiple: true },
  skill: { type: "string", multiple: true },
  symlink: { type: "boolean" },
  "dry-run": { type: "boolean" },
} as const;

async function runInstall(ctx: CommandContext, args: string[]): Promise<number> {
  let values;
  try {
    ({ values } = parseArgs({
      args,
      options: INSTALL_OPTIONS,
      allowPositionals: false,
    }));
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }

  const scopeResult = parseScope(values.scope);
  if (typeof scopeResult === "number") return scopeResult;
  const mode: InstallMode = values.symlink ? "symlink" : "copy";
  const agents = (values.agent ?? []) as AgentId[];

  let report;
  try {
    report = await installSkills({
      scope: scopeResult,
      mode,
      agents: values.agent === undefined ? undefined : agents,
      skills: values.skill === undefined ? undefined : values.skill,
      dryRun: values["dry-run"] === true,
    });
  } catch (error) {
    if (error instanceof UnsupportedAgentError) {
      return usageError(error.message);
    }
    process.stderr.write(
      `seams: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 1;
  }

  if (report.agents.length === 0) {
    process.stderr.write(
      "No supported agents detected; pass --agent to choose one (claude-code, codex, pi).\n",
    );
    return 1;
  }

  if (ctx.json) {
    printJson(jsonEnvelope("skills install", installPayload(report)));
    return installExitCode(report);
  }

  for (const line of installReportLines(report)) printText(line);
  return installExitCode(report);
}

const CHECK_OPTIONS = {
  scope: { type: "string" },
  agent: { type: "string", multiple: true },
} as const;

/** Text for one classified copy: `skill · agent: state path` plus both versions' paths when attention is needed. */
function entryLine(entry: CheckEntry): string {
  const versions = entry.state === "ok"
    ? ""
    : ` · installed: ${entry.path}${entry.bundledPath === undefined ? "" : ` · bundled: ${entry.bundledPath}`}`;
  const note = entry.note === undefined ? "" : ` · ${entry.note}`;
  return `  ${entry.skill} · ${entry.agent}: ${entry.state}${note}${versions}`;
}

async function runCheck(ctx: CommandContext, args: string[]): Promise<number> {
  let values;
  try {
    ({ values } = parseArgs({ args, options: CHECK_OPTIONS, allowPositionals: false }));
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }
  const scopeResult = parseScope(values.scope);
  if (typeof scopeResult === "number") return scopeResult;
  const scope = scopeResult;

  let report;
  try {
    report = await checkSkills({
      scope,
      agents: values.agent === undefined ? undefined : (values.agent as AgentId[]),
    });
  } catch (error) {
    if (error instanceof UnsupportedAgentError) return usageError(error.message);
    process.stderr.write(`seams: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  if (ctx.json) {
    printJson(
      jsonEnvelope("skills check", {
        scope: report.scope,
        agents: report.agents,
        source: report.source,
        metaPath: report.metaPath,
        entries: report.entries,
      }),
    );
    return report.entries.every((entry) => entry.state === "ok") ? 0 : 1;
  }

  if (report.entries.length === 0) {
    printText(`No seams skills are recorded or present in the ${report.scope} scope.`);
    return 0;
  }
  for (const entry of report.entries) printText(entryLine(entry));
  const counts = new Map<string, number>();
  for (const entry of report.entries) counts.set(entry.state, (counts.get(entry.state) ?? 0) + 1);
  const summary = [...counts.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([state, count]) => `${count} ${state}`)
    .join(", ");
  printText(`Checked ${report.entries.length} copies: ${summary}.`);
  return counts.get("ok") === report.entries.length ? 0 : 1;
}

const UPDATE_OPTIONS = {
  scope: { type: "string" },
  agent: { type: "string", multiple: true },
  "dry-run": { type: "boolean" },
} as const;

async function runUpdate(ctx: CommandContext, args: string[]): Promise<number> {
  let values;
  try {
    ({ values } = parseArgs({ args, options: UPDATE_OPTIONS, allowPositionals: false }));
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }
  const scopeResult = parseScope(values.scope);
  if (typeof scopeResult === "number") return scopeResult;
  const scope = scopeResult;
  const dryRun = values["dry-run"] === true;

  let report;
  try {
    report = await updateSkills({
      scope,
      agents: values.agent === undefined ? undefined : (values.agent as AgentId[]),
      dryRun,
    });
  } catch (error) {
    if (error instanceof UnsupportedAgentError) return usageError(error.message);
    process.stderr.write(`seams: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }

  if (ctx.json) {
    printJson(
      jsonEnvelope("skills update", {
        scope: report.scope,
        agents: report.agents,
        dryRun: report.dryRun,
        source: report.source,
        metaPath: report.metaPath,
        warnings: report.warnings,
        targets: report.targets,
        kept: report.kept,
        entries: report.entries,
        metaUpdated: report.metaUpdated,
      }),
    );
    if (report.dryRun) return 0;
    const incomplete = report.targets.some((target) => target.action === "skipped" || target.action === "failed");
    return incomplete || report.kept.length > 0 ? 1 : 0;
  }

  for (const target of report.targets) {
    const detail = target.detail === undefined ? "" : ` (${target.detail})`;
    const action = report.dryRun
      ? `would update (${target.reason})`
      : target.action === "updated"
        ? `updated (${target.reason})`
        : `${target.action} (${target.reason})${detail}`;
    printText(`  ${target.skill} → ${target.agent}: ${action} ${target.path}`);
  }
  if (report.dryRun) {
    if (report.targets.length === 0) printText("Nothing to update from the running package.");
    printText("Dry run: nothing written.");
    return 0;
  }
  if (report.kept.length > 0) {
    printText("Left for manual reconciliation:");
    for (const entry of report.kept) printText(entryLine(entry));
  }
  const counts = { updated: 0, skipped: 0, failed: 0 };
  for (const target of report.targets) {
    if (target.action === "updated") counts.updated += 1;
    else if (target.action === "skipped") counts.skipped += 1;
    else if (target.action === "failed") counts.failed += 1;
  }
  printText(
    `Updated ${counts.updated}, skipped ${counts.skipped}, failed ${counts.failed}` +
      `${report.kept.length > 0 ? `, kept ${report.kept.length} for manual reconciliation` : ""}.`,
  );
  return counts.skipped > 0 || counts.failed > 0 || report.kept.length > 0 ? 1 : 0;
}

function subcommandMap(): Record<string, Subcommand> {
  return {
    list: { summary: "list the bundled skills and their installation state", run: runList },
    get: { summary: "print a bundled skill and its references and assets", run: runGet },
    install: { summary: "install the bundled skills for agent(s)", run: runInstall },
    check: { summary: "classify every installed skill copy against the running package", run: runCheck },
    update: { summary: "refresh outdated and missing copies from the running package", run: runUpdate },
  };
}

export const skillsCommand: Command = {
  summary: "inspect and install the bundled skills",
  run(ctx) {
    const [name, ...rest] = ctx.args;
    if (name === undefined || name.startsWith("-")) {
      return usageError(name === undefined ? "Missing subcommand." : `Unexpected flag: ${name}`);
    }
    const subcommand = subcommandMap()[name];
    if (subcommand === undefined) {
      return usageError(`Unknown subcommand: ${name}`);
    }
    return subcommand.run(ctx, rest);
  },
};
