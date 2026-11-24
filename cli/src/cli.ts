#!/usr/bin/env node
/**
 * The `seams` executable. Parses the global flags, finds the command in the
 * registry, and hands the remaining arguments to it.
 */
import { parseArgs } from "node:util";
import { commands } from "./commands/index.ts";
import { printText } from "./output.ts";

export const VERSION = "0.1.0";

const GLOBAL_OPTIONS = {
  json: { type: "boolean" },
  help: { type: "boolean" },
  version: { type: "boolean" },
} as const;

export function usage(): string {
  const names = Object.keys(commands).sort();
  const lines = names.map((name) => `  ${name.padEnd(10)} ${commands[name].summary}`);
  return [
    "Usage: seams [global flags] <command> [arguments]",
    "",
    "Commands:",
    ...lines,
    "",
    "Global flags: --json, --help, --version",
  ].join("\n");
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  // Strict mode is off here: the global flags are read from the whole argv,
  // and unknown flags are left for the command's own strict parsing.
  const { values } = parseArgs({
    args: argv,
    options: GLOBAL_OPTIONS,
    allowPositionals: true,
    strict: false,
  });

  if (values.version) {
    printText(VERSION);
    return 0;
  }

  const nameIndex = argv.findIndex((arg) => !arg.startsWith("-"));
  const name = nameIndex === -1 ? undefined : argv[nameIndex];
  const command = name === undefined ? undefined : commands[name];

  if (values.help || command === undefined) {
    if (command === undefined && name !== undefined) {
      process.stderr.write(`Unknown command: ${name}\n\n${usage()}\n`);
      return 2;
    }
    printText(usage());
    return 0;
  }

  const rest = argv
    .slice(nameIndex + 1)
    .filter((arg) => !isGlobalFlag(arg) && arg !== "--");
  const exitCode = await command.run({ json: values.json === true, args: rest });
  return exitCode ?? 0;
}

function isGlobalFlag(arg: string): boolean {
  return /^--(json|help|version)(=.*)?$/.test(arg);
}

// This file is the `seams` bin entry: nothing imports it as a module, so it
// always runs main() when Node executes it. This also works when the entry is
// reached through npm's bin symlink.
main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    process.stderr.write(
      `seams: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
