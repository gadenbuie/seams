/**
 * `seams init`: install the skills bundled with the running package and hand
 * adoption to the agent (the proposal's "`init` and `install`" section).
 *
 * Agent mode is noninteractive: it installs the skills for the detected
 * harnesses (as `seams install` does) and prints instructions to the running
 * agent: the `seams-adopt` skill now guides adoption, and the skill's full
 * text is inlined — the same content as `seams skills get seams-adopt` — so
 * the agent can continue in the same session even when its harness has not
 * loaded the newly installed skills yet. Agent mode never prompts, never
 * scaffolds canon, never writes the project manifest, and never migrates
 * documents; all of that is `seams-adopt`'s work.
 *
 * Human mode asks for a scope and the target harnesses with
 * `node:readline/promises` (no new dependency), then installs and prints the
 * next step: ask your agent to run the `seams-adopt` skill.
 *
 * Mode selection:
 * - `--agent` always selects agent mode.
 * - Without a TTY, the command behaves as agent mode and says so.
 * - Otherwise the environment shows a known harness: the variables and
 *   markers the spike verified against the `skills` library (seams#sn2t,
 *   "Agent detection and mapping"), which are what the library's
 *   `detectAgents` checks — claude-code: `CLAUDE_CONFIG_DIR` names an
 *   existing directory, or `~/.claude` exists; codex: `CODEX_HOME` names an
 *   existing directory, or `~/.codex` or `/etc/codex` exists; pi:
 *   `~/.pi/agent` exists (Pi keeps no config-directory variable).
 * - With a TTY and no known harness, init runs the interactive human mode.
 *
 * `--dry-run` writes nothing in either mode. `--json` reports the actions
 * and the printed instruction text.
 */
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { readBundledSkill } from "../skills/bundled.ts";
import { installSkills, isSupportedAgent, library, SUPPORTED_AGENTS } from "../skills/install.ts";
import type { AgentId, InstallReport, Scope } from "../skills/install.ts";
import { jsonEnvelope, printJson, printText } from "../output.ts";
import type { Command, CommandContext } from "./index.ts";
import { installExitCode, installPayload, installReportLines, parseScopeValue } from "./install.ts";

const USAGE = "Usage: seams init [--agent] [--scope project|global] [--dry-run]";

function usageError(message: string): number {
  process.stderr.write([message, USAGE, ""].join("\n"));
  return 2;
}

/**
 * The supported harnesses visible in this environment, through the signals
 * listed in the module header (the variables and markers the spike verified,
 * which the library's `detectAgents` checks).
 */
export async function detectHarnessAgents(): Promise<AgentId[]> {
  const lib = await library();
  const found = await lib.detectAgents({ cwd: process.cwd() });
  const ids = new Set(found.agents.map((agent) => agent.id));
  return SUPPORTED_AGENTS.filter((id) => ids.has(id));
}

export type InitMode = "agent" | "human";

/** Why a mode was chosen; the JSON report carries it as `modeReason`. */
export type InitModeReason = "--agent" | "no TTY" | "detected" | "interactive";

export interface InitModeDecision {
  mode: InitMode;
  reason: InitModeReason;
  /** The detected harnesses, when detection chose agent mode. */
  detected: AgentId[];
}

/**
 * Choose the mode: `--agent` always selects agent mode; without a TTY the
 * command behaves as agent mode; a detected harness selects agent mode;
 * a TTY with no known harness gets interactive human mode.
 */
export function chooseInitMode(input: {
  agentFlag: boolean;
  isTty: boolean;
  detected: AgentId[];
}): InitModeDecision {
  if (input.agentFlag) return { mode: "agent", reason: "--agent", detected: [] };
  if (!input.isTty) return { mode: "agent", reason: "no TTY", detected: [] };
  if (input.detected.length > 0) return { mode: "agent", reason: "detected", detected: input.detected };
  return { mode: "human", reason: "interactive", detected: [] };
}

/** One skill's full text, formatted exactly as `seams skills get` prints it. */
export function formatBundledSkill(
  skill: NonNullable<ReturnType<typeof readBundledSkill>>,
): string {
  let text = "";
  for (const file of skill.files) {
    if (file.path !== "SKILL.md") text += `\n=== ${file.path} ===\n`;
    text += file.content;
    if (!file.content.endsWith("\n")) text += "\n";
  }
  return text;
}

/**
 * The first line of the agent-mode instructions: what actually happened.
 * A dry run wrote nothing, so it must not claim the skills are installed,
 * and a run with skipped or failed targets must not hide them.
 */
function installStatusLine(report: InstallReport): string {
  if (report.dryRun) {
    return report.agents.length > 0
      ? `Dry run: nothing was written; the seams skills would be installed for: ${report.agents.join(", ")}.`
      : "Dry run: nothing was written; no supported agent harness was detected.";
  }
  if (report.agents.length === 0) {
    return (
      "No supported agent harness was detected, so no skills were installed. " +
      "Install them with `seams install --agent <claude-code | codex | pi>` when a harness is available."
    );
  }
  const problems = report.targets.filter(
    (target) =>
      target.action === "skipped" ||
      target.action === "skipped (modified)" ||
      target.action === "failed",
  );
  const status = `The seams skills are installed for: ${report.agents.join(", ")}.`;
  return problems.length > 0
    ? `${status}\n${problems.length} target(s) were skipped or failed; run \`seams skills check\` to inspect them.`
    : status;
}

/**
 * The instruction text printed to the running agent in agent mode: the
 * seams-adopt handoff with the skill's full text inlined, the same content
 * as `seams skills get seams-adopt`.
 */
export function agentInstructions(report: InstallReport): string {
  const skill = readBundledSkill("seams-adopt");
  if (skill === undefined) {
    throw new Error("The seams-adopt skill is not bundled with this package.");
  }
  return (
    [
      installStatusLine(report),
      "",
      "The `seams-adopt` skill now guides adoption of seams.",
      "If your harness has not loaded the newly installed skills yet, the skill's full text follows inline,",
      "the same content as `seams skills get seams-adopt`; continue with it in this session.",
      "",
    ].join("\n") + formatBundledSkill(skill)
  );
}

/** The next-steps text printed in human mode. */
export function humanNextSteps(report: InstallReport): string {
  return [
    report.dryRun
      ? "Dry run: nothing was written, so nothing is installed yet."
      : "The seams skills are installed.",
    "",
    "Next steps: ask your agent to run the `seams-adopt` skill.",
    "It guides adopting seams in this project. Your agent can read the skill without an installation,",
    "with `seams skills get seams-adopt`.",
  ].join("\n");
}

/** Interactive input ended before the answers were complete. */
export class PromptAbortedError extends Error {
  constructor(question: string) {
    super(`Interactive input ended before the ${question} answer was complete.`);
    this.name = "PromptAbortedError";
  }
}

export interface HumanChoices {
  scope: Scope;
  agents: AgentId[];
}

/**
 * Ask a person for the scope and the target harnesses. An empty scope
 * answer defaults to project; an empty agents answer defaults to every
 * supported harness (human mode only runs when nothing was detected).
 * Invalid answers re-ask. When the input ends before the answers are
 * complete, a `PromptAbortedError` is thrown and nothing has been written.
 */
export async function promptForChoices(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  given: { scope?: Scope } = {},
): Promise<HumanChoices> {
  const rl = createInterface({ input, output });
  let closed = false;
  rl.on("close", () => {
    closed = true;
  });
  // A pending question can hang or reject when the input ends (Ctrl-D, a
  // closed pipe), so each ask races the question against the close event,
  // and an already-closed interface answers with the empty string.
  const ask = (prompt: string): Promise<string> => {
    if (closed) return Promise.resolve("");
    return new Promise((resolve) => {
      let settled = false;
      const onClose = (): void => {
        if (!settled) {
          settled = true;
          rl.removeListener("close", onClose);
          resolve("");
        }
      };
      const done = (answer: string): void => {
        if (settled) return;
        settled = true;
        rl.removeListener("close", onClose);
        resolve(answer);
      };
      rl.once("close", onClose);
      rl.question(prompt).then(done, () => done(""));
    });
  };
  const say = (text: string): void => {
    output.write(text);
  };
  try {
    let scope = given.scope;
    if (scope === undefined) {
      for (;;) {
        const answer = (await ask("Install the seams skills for this project or globally? [project/global] (default: project) ")).trim().toLowerCase();
        if (answer === "") {
          if (closed) throw new PromptAbortedError("scope");
          scope = "project";
          break;
        }
        if (answer === "project" || answer === "global") {
          scope = answer;
          break;
        }
        say("Choose project or global.\n");
      }
    }

    const valid = SUPPORTED_AGENTS.join(", ");
    let agents: AgentId[];
    for (;;) {
      const answer = await ask(`Install the skills for which agent harnesses? [${valid}] (comma-separated, default: all) `);
      if (answer.trim() === "") {
        if (closed) throw new PromptAbortedError("agents");
        agents = [...SUPPORTED_AGENTS];
        break;
      }
      const unique = [...new Set(answer.split(/[\s,]+/).filter(Boolean))];
      const supported = unique.filter(isSupportedAgent);
      if (supported.length !== unique.length) {
        const invalid = unique.filter((name) => !isSupportedAgent(name));
        say(`Unknown agent: ${invalid.join(", ")} (supported: ${valid})\n`);
        continue;
      }
      agents = supported;
      break;
    }
    return { scope, agents };
  } finally {
    rl.close();
  }
}

const OPTIONS = {
  agent: { type: "boolean" },
  scope: { type: "string" },
  "dry-run": { type: "boolean" },
} as const;

export const initCommand: Command = {
  summary: "install the seams skills and hand adoption to the agent",
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
    const dryRun = values["dry-run"] === true;
    const agentFlag = values.agent === true;
    const isTty = process.stdin.isTTY === true;

    // Detection is only needed to choose the mode when a TTY is present:
    // --agent and the no-TTY fallback decide it without the library, and in
    // agent mode the install layer runs its own detection for the targets.
    const detected = !agentFlag && isTty ? await detectHarnessAgents() : [];
    const decision = chooseInitMode({ agentFlag, isTty, detected });

    let report: InstallReport;
    if (decision.mode === "agent") {
      try {
        report = await installSkills({
          scope: scope ?? "project",
          mode: "copy",
          dryRun,
        });
      } catch (error) {
        process.stderr.write(`seams: ${error instanceof Error ? error.message : String(error)}\n`);
        return 1;
      }
    } else {
      let choices: HumanChoices;
      try {
        // With --json the prompts go to stderr so stdout stays valid JSON.
        choices = await promptForChoices(process.stdin, ctx.json ? process.stderr : process.stdout, {
          scope,
        });
      } catch (error) {
        if (error instanceof PromptAbortedError) {
          process.stderr.write(`seams: ${error.message} Nothing was written.\n`);
          return 1;
        }
        throw error;
      }
      try {
        report = await installSkills({
          scope: choices.scope,
          mode: "copy",
          agents: choices.agents,
          dryRun,
        });
      } catch (error) {
        process.stderr.write(`seams: ${error instanceof Error ? error.message : String(error)}\n`);
        return 1;
      }
    }

    const instructions = decision.mode === "agent" ? agentInstructions(report) : humanNextSteps(report);

    if (ctx.json) {
      printJson(
        jsonEnvelope("init", {
          mode: decision.mode,
          modeReason: decision.reason,
          detectedAgents: decision.detected,
          dryRun: report.dryRun,
          install: installPayload(report),
          instructions,
        }),
      );
    } else {
      if (decision.reason === "no TTY") {
        printText("No interactive terminal was detected; continuing in noninteractive agent mode.");
      } else if (decision.reason === "detected") {
        printText(
          `Agent harness detected: ${decision.detected.join(", ")}; continuing in noninteractive agent mode.`,
        );
      }
      for (const line of installReportLines(report)) printText(line);
      printText("");
      process.stdout.write(instructions + (instructions.endsWith("\n") ? "" : "\n"));
    }

    // In agent mode with no detected harness nothing was requested: the
    // handoff is still complete, so it is not a failure.
    if (decision.mode === "agent" && report.agents.length === 0) return 0;
    return installExitCode(report);
  },
};
