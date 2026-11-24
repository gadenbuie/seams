/**
 * `seams check`: run every mechanical project check and report the findings,
 * grouped by file.
 *
 * Exit 1 when any finding has error severity, 0 when there are only warnings
 * or no findings at all. The command does not run formatting or the
 * project's own checks; those stay in the project's tooling.
 */
import { parseArgs } from "node:util";
import { checks } from "../check/index.ts";
import type { Finding } from "../check/types.ts";
import { findRoot, loadProject, ManifestError, MANIFEST_REPO_PATH } from "../config.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command, CommandContext } from "./index.ts";

const USAGE = "Usage: seams check [--json]";

function usageError(message: string): number {
  process.stderr.write(`${message}\n${USAGE}\n`);
  return 2;
}

/** Findings order: by file, then line, then check id. */
function compareFindings(a: Finding, b: Finding): number {
  if (a.path !== b.path) return a.path < b.path ? -1 : 1;
  const lineA = a.line ?? Number.MAX_SAFE_INTEGER;
  const lineB = b.line ?? Number.MAX_SAFE_INTEGER;
  if (lineA !== lineB) return lineA - lineB;
  if (a.id !== b.id) return a.id < b.id ? -1 : 1;
  return a.message < b.message ? -1 : a.message > b.message ? 1 : 0;
}

function printTextFindings(findings: Finding[]): void {
  let currentPath = "";
  for (const finding of findings) {
    if (finding.path !== currentPath) {
      currentPath = finding.path;
      printText(`${currentPath}:`);
    }
    const at = finding.line === undefined ? "" : `${finding.line}: `;
    printText(`  ${at}[${finding.severity}] ${finding.id}: ${finding.message}`);
  }
}

function run(ctx: CommandContext): number {
  try {
    parseArgs({ args: ctx.args, allowPositionals: false });
  } catch (error) {
    return usageError(error instanceof Error ? error.message : String(error));
  }

  const root = findRoot(process.cwd());
  let findings: Finding[];
  try {
    const project = loadProject(root);
    findings = checks.flatMap((check) => check.run(project));
  } catch (error) {
    // An invalid manifest leaves the documentation homes unknown, so no other
    // check can run; the issues themselves are this command's findings.
    if (!(error instanceof ManifestError)) throw error;
    findings = error.issues.map((issue) => ({
      id: "manifest",
      severity: "error" as const,
      path: MANIFEST_REPO_PATH,
      message: issue,
    }));
  }

  findings.sort(compareFindings);
  const errors = findings.filter((finding) => finding.severity === "error").length;
  const warnings = findings.length - errors;

  if (ctx.json) {
    printJson(jsonEnvelope("check", { findings, errors, warnings }));
  } else {
    printTextFindings(findings);
    if (findings.length === 0) {
      printText("No findings.");
    } else {
      printText(`${errors} error${errors === 1 ? "" : "s"}, ${warnings} warning${warnings === 1 ? "" : "s"}.`);
    }
  }
  return errors > 0 ? 1 : 0;
}

export const checkCommand: Command = {
  summary: "run the project's mechanical checks",
  run,
};
