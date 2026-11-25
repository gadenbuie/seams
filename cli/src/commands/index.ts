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
import { checkCommand } from "./check.ts";
import { reconcileCommand } from "./reconcile.ts";
import { doctorCommand } from "./doctor.ts";
import { initCommand } from "./init.ts";
import { installCommand } from "./install.ts";
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
  check: checkCommand,
  reconcile: reconcileCommand,
  doctor: doctorCommand,
  init: initCommand,
  install: installCommand,
  skills: skillsCommand,
};
