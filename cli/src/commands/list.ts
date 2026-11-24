/**
 * `seams list`: catalog the documents in a project's documentation homes.
 *
 * Text output is one line per document, grouped by type. JSON output is a
 * stable envelope holding the same documents plus warnings about missing homes.
 */
import { parseArgs } from "node:util";
import { findRoot, loadProject } from "../config.ts";
import { discoverDocuments, TYPE_ORDER, type DocType } from "../docs/discover.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command, CommandContext } from "./index.ts";

const TYPE_FLAGS = ["canon", "overviews", "proposals", "plans"] as const;

const FLAG_TO_TYPE: Record<(typeof TYPE_FLAGS)[number], DocType> = {
  canon: "canon",
  overviews: "overview",
  proposals: "proposal",
  plans: "plan",
};

/** The plural `--type` label each document type shows as in grouped text output. */
const TYPE_LABELS: Record<DocType, (typeof TYPE_FLAGS)[number]> = {
  canon: "canon",
  overview: "overviews",
  proposal: "proposals",
  plan: "plans",
};

const USAGE = "Usage: seams list [--type canon|overviews|proposals|plans]";

function usageError(message: string): number {
  process.stderr.write(`${message}\n${USAGE}\n`);
  return 2;
}

/** One text line for one document: path, title, bytes, authority, description. */
function textLine(doc: {
  path: string;
  title: string;
  bytes: number;
  authority: string;
  description: string | null;
  problems: string[];
}): string {
  // The authority label carries the status for proposals and plans, so a
  // draft never reads as accepted and an overview never reads as canon.
  const parts = [doc.path, squashWhitespace(doc.title), `${doc.bytes} bytes`, doc.authority];
  if (doc.description !== null) parts.push(squashWhitespace(doc.description));
  let line = parts.join(" · ");
  if (doc.problems.length > 0) {
    line += `  [problems: ${doc.problems.join("; ")}]`;
  }
  return line;
}

/** Collapse internal whitespace so one document stays on one text line. */
function squashWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function run(ctx: CommandContext): number {
  let values: { type?: string };
  try {
    ({ values } = parseArgs({
      args: ctx.args,
      options: { type: { type: "string" } },
      allowPositionals: false,
    }));
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }

  let filter: DocType | undefined;
  if (values.type !== undefined) {
    const flag = values.type as (typeof TYPE_FLAGS)[number];
    if (!TYPE_FLAGS.includes(flag)) {
      return usageError(
        `Unknown type '${values.type}'. Expected one of: ${TYPE_FLAGS.join(", ")}`,
      );
    }
    filter = FLAG_TO_TYPE[flag];
  }

  const project = loadProject(findRoot(process.cwd()));
  const { documents, warnings } = discoverDocuments(project);
  const selected = filter === undefined ? documents : documents.filter((doc) => doc.type === filter);

  if (ctx.json) {
    printJson(jsonEnvelope("list", { documents: selected, warnings }));
    return 0;
  }

  for (const type of TYPE_ORDER) {
    const group = selected.filter((doc) => doc.type === type);
    if (group.length === 0) continue;
    printText(`${TYPE_LABELS[type]}:`);
    for (const doc of group) {
      printText(`  ${textLine(doc)}`);
    }
  }
  for (const warning of warnings) {
    process.stderr.write(`warning: ${warning}\n`);
  }
  return 0;
}

export const listCommand: Command = {
  summary: "list the documents in the project's documentation homes",
  run,
};
