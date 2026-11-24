/**
 * The command registry. Each command lives in its own file in this directory
 * and adds one entry here.
 */
import { schemaCommand } from "./schema.ts";
import { listCommand } from "./list.ts";
import { readCommand } from "./read.ts";
import { findCommand } from "./find.ts";
import { newCommand } from "./new.ts";
import { impactCommand } from "./impact.ts";
import { skillsCommand } from "./skills.ts";

export interface CommandContext {
  /** The caller passed the global `--json` flag. */
  json: boolean;
  /** The arguments after the command name, for command-specific parsing. */
  args: string[];
}

export interface Command {
  summary: string;
  /** Return the exit code, or undefined for 0. */
  run(ctx: CommandContext): number | void | Promise<number | void>;
}

export const commands: Record<string, Command> = {
  schema: schemaCommand,
  list: listCommand,
  read: readCommand,
  find: findCommand,
  new: newCommand,
  impact: impactCommand,
  skills: skillsCommand,
};
