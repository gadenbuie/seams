/**
 * `seams skills`: inspect the skills bundled with the running package.
 *
 * `skills list` names each bundled skill with its description; installation
 * state is added by the skills install unit. `skills get <name>` prints one
 * skill and its bundled references and assets, or returns their contents and
 * paths in JSON, without installing anything. Later units add the install,
 * check, and update subcommands as new entries in the subcommand map below.
 */
import { parseArgs } from "node:util";
import { listBundledSkills, readBundledSkill } from "../skills/bundled.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command, CommandContext } from "./index.ts";

/** One `skills` subcommand. Later units add entries to the map. */
interface Subcommand {
  summary: string;
  run(ctx: CommandContext, args: string[]): number | void;
}

const USAGE = "Usage: seams skills <list | get <name>>";

function usageError(message: string): number {
  const map = subcommandMap();
  const lines = Object.keys(map).sort().map((name) => `  ${name.padEnd(10)} ${map[name].summary}`);
  process.stderr.write(
    [message, USAGE, "", "Subcommands:", ...lines, ""].join("\n"),
  );
  return 2;
}

function runList(ctx: CommandContext, args: string[]): number {
  try {
    parseArgs({ args, options: {}, allowPositionals: false });
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }

  const skills = listBundledSkills();
  if (ctx.json) {
    // `installed` is null until the skills install unit adds installation
    // state; text output omits the column until then.
    printJson(
      jsonEnvelope("skills list", {
        skills: skills.map((skill) => ({
          name: skill.name,
          description: skill.description,
          installed: null,
        })),
      }),
    );
    return 0;
  }
  for (const skill of skills) {
    printText(`  ${skill.name} · ${skill.description}`);
  }
  return 0;
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

function subcommandMap(): Record<string, Subcommand> {
  return {
    list: { summary: "list the bundled skills", run: runList },
    get: { summary: "print a bundled skill and its references and assets", run: runGet },
  };
}

export const skillsCommand: Command = {
  summary: "inspect the bundled skills",
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
