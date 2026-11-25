import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { schemaFilePath } from "../config.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command } from "./index.ts";

export const schemaCommand: Command = {
  summary: "print the bundled manifest JSON Schema",
  run(ctx) {
    let values: { path?: boolean };
    try {
      ({ values } = parseArgs({
        args: ctx.args,
        options: { path: { type: "boolean" } },
        allowPositionals: true,
      }));
    } catch {
      process.stderr.write("Usage: seams schema [--path]\n");
      return 2;
    }
    if (ctx.json) {
      printJson(jsonEnvelope("schema", { path: schemaFilePath() }));
      return 0;
    }
    if (values.path) {
      printText(schemaFilePath());
      return 0;
    }
    printJson(JSON.parse(readFileSync(schemaFilePath(), "utf8")));
    return 0;
  },
};
