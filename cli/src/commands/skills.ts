/**
 * `seams skills`: inspect and install the skills bundled with the running
 * package.
 *
 * `skills list` names each bundled skill with its installation state in a
 * scope (installed, missing, modified, untracked, or not installed).
 * `skills get <name>` prints one skill and its bundled references and assets,
 * or returns their contents and paths in JSON, without installing anything.
 * `skills install` installs the bundled skills through the `skills` library,
 * preserving modified copies and never writing without an explicit agent
 * selection. Later units add the check and update subcommands as new entries
 * in the subcommand map below.
 */
import { parseArgs } from "node:util";
import { listBundledSkills, readBundledSkill } from "../skills/bundled.ts";
import {
  UnsupportedAgentError,
  installSkills,
  installationStatuses,
} from "../skills/install.ts";
import type { AgentId, InstallMode, Scope } from "../skills/install.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command, CommandContext } from "./index.ts";

/** One `skills` subcommand. Later units add entries to the map. */
interface Subcommand {
  summary: string;
  run(ctx: CommandContext, args: string[]): number | void | Promise<number | void>;
}

const USAGE = "Usage: seams skills <list | get | install> [options]";

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

  // Text mode prints SKILL.md first, then each reference and asset under a
  // header naming its path relative to the skill's folder.
  for (const file of skill.files) {
    if (file.path !== "SKILL.md") {
      process.stdout.write(`\n=== ${file.path} ===\n`);
    }
    process.stdout.write(file.content);
    if (!file.content.endsWith("\n")) process.stdout.write("\n");
  }
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
    printJson(
      jsonEnvelope("skills install", {
        scope: report.scope,
        mode: report.mode,
        agents: report.agents,
        detected: report.detected,
        dryRun: report.dryRun,
        source: report.source,
        metaPath: report.metaPath,
        warnings: report.warnings,
        targets: report.targets,
      }),
    );
    // A skipped or failed target means the requested install did not fully
    // happen; report it as a finding.
    const incomplete = report.targets.some(
      (target) =>
        target.action === "skipped" ||
        target.action === "skipped (modified)" ||
        target.action === "failed",
    );
    return report.dryRun || !incomplete ? 0 : 1;
  }

  if (report.detected) {
    printText(`Agents detected: ${report.agents.join(", ")}`);
  }
  for (const target of report.targets) {
    const detail = target.reason === undefined ? "" : ` (${target.reason})`;
    printText(`  ${target.skill} → ${target.agent}: ${target.action} ${target.path}${detail}`);
  }
  if (report.dryRun) {
    printText("Dry run: nothing written.");
    return 0;
  }
  const counts = { install: 0, unchanged: 0, skipped: 0, failed: 0 };
  for (const target of report.targets) {
    if (target.action === "install") counts.install += 1;
    else if (target.action === "unchanged") counts.unchanged += 1;
    else if (target.action === "failed") counts.failed += 1;
    else counts.skipped += 1;
  }
  printText(
    `Installed ${counts.install}, unchanged ${counts.unchanged}, skipped ${counts.skipped}, failed ${counts.failed}.`,
  );
  return counts.skipped > 0 || counts.failed > 0 ? 1 : 0;
}

function subcommandMap(): Record<string, Subcommand> {
  return {
    list: { summary: "list the bundled skills and their installation state", run: runList },
    get: { summary: "print a bundled skill and its references and assets", run: runGet },
    install: { summary: "install the bundled skills for agent(s)", run: runInstall },
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
