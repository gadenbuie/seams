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
 * Mode selection (the operator's decision recorded on seams#vd4k): a human
 * at a terminal always gets interactive mode, even when an installed harness
 * is detected; agents keep agent mode.
 * - `--agent` always selects agent mode.
 * - Without a TTY, the command behaves as agent mode and says so.
 * - On a TTY, agent mode is chosen from the running-inside environment
 *   signals only: the variables the vendored `skills` library's
 *   `isRunningInAgent` checks (see `insideAgentSignals` for the list).
 *   Installed-harness markers (`~/.claude`, `CLAUDE_CONFIG_DIR`, `~/.codex`,
 *   `~/.pi/agent`, ...) no longer force agent mode on a TTY.
 * - With a TTY and no inside signal, init runs the interactive human mode.
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
 * The running-inside environment signals that mean this process is running
 * inside an agent session, derived from the vendored `skills` library's
 * `isRunningInAgent` checks (its `detectAgent`) minus the variables a
 * human's own shell can set, so a human at a terminal keeps interactive
 * mode:
 *
 * - Dropped: `CURSOR_TRACE_ID` (Cursor's integrated terminal sets it for
 *   every command, including ones a person types), `REPL_ID` (set across
 *   Replit workspaces, human sessions included), and `COPILOT_MODEL`,
 *   `COPILOT_ALLOW_ALL`, `COPILOT_GITHUB_TOKEN` (user-exported Copilot CLI
 *   settings, the last a credential). The library's one non-variable probe,
 *   the `/opt/.devin` marker, is left out too: it is an installed-harness
 *   marker, not a signal about this process.
 * - Kept: the variables agent runtimes set about the running session —
 *   `AI_AGENT`, `CURSOR_AGENT`, `CURSOR_EXTENSION_HOST_ROLE=agent-exec`,
 *   `GEMINI_CLI`, `CODEX_SANDBOX`, `CODEX_CI`, `CODEX_THREAD_ID`,
 *   `ANTIGRAVITY_AGENT`, `AUGMENT_AGENT`, `OPENCODE=1`, `OPENCODE_CLIENT`,
 *   `CLAUDECODE`, `CLAUDE_CODE`.
 *
 * The matched variable names are returned, so the mode report can name what
 * decided.
 *
 * Pi sets none of these variables (the seams#vd4k review finding), so a Pi
 * run reaches agent mode through the no-TTY fallback, which matches how real
 * Pi runs behave (agents run without a TTY).
 */
export function insideAgentSignals(env: NodeJS.ProcessEnv = process.env): string[] {
  const found: string[] = [];
  if (env.AI_AGENT?.trim()) found.push("AI_AGENT");
  if (env.CURSOR_AGENT) found.push("CURSOR_AGENT");
  if (env.CURSOR_EXTENSION_HOST_ROLE === "agent-exec") found.push("CURSOR_EXTENSION_HOST_ROLE");
  if (env.GEMINI_CLI) found.push("GEMINI_CLI");
  if (env.CODEX_SANDBOX) found.push("CODEX_SANDBOX");
  if (env.CODEX_CI) found.push("CODEX_CI");
  if (env.CODEX_THREAD_ID) found.push("CODEX_THREAD_ID");
  if (env.ANTIGRAVITY_AGENT) found.push("ANTIGRAVITY_AGENT");
  if (env.AUGMENT_AGENT) found.push("AUGMENT_AGENT");
  if (env.OPENCODE === "1") found.push("OPENCODE");
  if (env.OPENCODE_CLIENT) found.push("OPENCODE_CLIENT");
  if (env.CLAUDECODE) found.push("CLAUDECODE");
  if (env.CLAUDE_CODE) found.push("CLAUDE_CODE");
  return found;
}

/**
 * The supported harnesses visible in this environment, through the variables
 * and markers the spike verified (seams#sn2t, "Agent detection and
 * mapping"), which the library's `detectAgents` checks — claude-code:
 * `CLAUDE_CONFIG_DIR` names an existing directory, or `~/.claude` exists;
 * codex: `CODEX_HOME` names an existing directory, or `~/.codex` or
 * `/etc/codex` exists; pi: `~/.pi/agent` exists (Pi keeps no
 * config-directory variable). Used in human mode to pick the default
 * targets; never to choose the mode.
 */
export async function detectHarnessAgents(): Promise<AgentId[]> {
  const lib = await library();
  const found = await lib.detectAgents({ cwd: process.cwd() });
  const ids = new Set(found.agents.map((agent) => agent.id));
  return SUPPORTED_AGENTS.filter((id) => ids.has(id));
}

export type InitMode = "agent" | "human";
/** Why a mode was chosen; the JSON report carries it as `modeReason`. */
export type InitModeReason = "--agent" | "no TTY" | "inside agent" | "interactive";

export interface InitModeDecision {
  mode: InitMode;
  reason: InitModeReason;
  /** The inside signals that matched, when they chose agent mode. */
  inside: string[];
}

/**
 * Choose the mode: `--agent` always selects agent mode; without a TTY the
 * command behaves as agent mode; on a TTY only a running-inside environment
 * signal selects agent mode; a TTY with no inside signal gets interactive
 * human mode, whatever harnesses are installed.
 */
export function chooseInitMode(input: {
  agentFlag: boolean;
  isTty: boolean;
  inside: string[];
}): InitModeDecision {
  if (input.agentFlag) return { mode: "agent", reason: "--agent", inside: [] };
  if (!input.isTty) return { mode: "agent", reason: "no TTY", inside: [] };
  if (input.inside.length > 0) return { mode: "agent", reason: "inside agent", inside: input.inside };
  return { mode: "human", reason: "interactive", inside: [] };
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
 * answer defaults to project; an empty agents answer defaults to the
 * detected harnesses, or to every supported harness when none is detected
 * (human mode runs on a TTY with no inside signal, so harnesses may be
 * installed and the person still picks the targets).
 * Invalid answers re-ask. When the input ends before the answers are
 * complete, a `PromptAbortedError` is thrown and nothing has been written.
 */
export async function promptForChoices(
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
  given: { scope?: Scope; detected?: AgentId[] } = {},
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
    const defaultAgents =
      given.detected && given.detected.length > 0 ? given.detected : [...SUPPORTED_AGENTS];
    const defaultLabel =
      defaultAgents.length === SUPPORTED_AGENTS.length ? "all" : defaultAgents.join(", ");
    let agents: AgentId[];
    for (;;) {
      const answer = await ask(
        `Install the skills for which agent harnesses? [${valid}] (comma-separated, default: ${defaultLabel}) `,
      );
      if (answer.trim() === "") {
        if (closed) throw new PromptAbortedError("agents");
        agents = [...defaultAgents];
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

    // The inside signals are only read to choose the mode when a TTY is
    // present: --agent and the no-TTY fallback decide it without them, and
    // in agent mode the install layer runs its own detection for the targets.
    const inside = !agentFlag && isTty ? insideAgentSignals() : [];
    const decision = chooseInitMode({ agentFlag, isTty, inside });

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
        // Human mode runs on a TTY with no inside signal, so harnesses may
        // be installed: the empty agents answer defaults to them, not to
        // every supported harness.
        const detected = await detectHarnessAgents();
        // With --json the prompts go to stderr so stdout stays valid JSON.
        choices = await promptForChoices(process.stdin, ctx.json ? process.stderr : process.stdout, {
          scope,
          detected,
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
          insideSignals: decision.inside,
          dryRun: report.dryRun,
          install: installPayload(report),
          instructions,
        }),
      );
    } else {
      if (decision.reason === "no TTY") {
        printText("No interactive terminal was detected; continuing in noninteractive agent mode.");
      } else if (decision.reason === "inside agent") {
        printText(
          `Running inside an agent (${decision.inside.join(", ")} set); continuing in noninteractive agent mode.`,
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
