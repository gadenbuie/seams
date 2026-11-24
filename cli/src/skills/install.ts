/**
 * `skills install`: install the skills bundled with the running package,
 * through the `skills` library, into a project or the user's global scope.
 *
 * The library does the writes (remove-then-copy, never atomic) and keeps its
 * own lock file. Everything the library cannot do is seams' job here
 * (seams#sn2t, spike-verified against skills@1.9.0):
 *
 * - Never call the library without an explicit `agents` array: with nothing
 *   detected it targets every supported agent and creates their directories.
 * - Preflight: seams computes each (skill, agent) destination for its
 *   supported allowlist (claude-code, codex, pi), hashes any existing copy,
 *   and passes to the library only the skills whose destinations are missing
 *   or byte-identical to the bundled copy. A modified copy is never passed to
 *   the library (the library would silently overwrite it); it is reported as
 *   `skipped (modified)`. A byte-identical copy is `unchanged`; the library
 *   would silently rewrite it.
 * - Dry run is the preflight alone: it prints what would be written and
 *   changes nothing.
 * - Whole-call library errors (unknown agent id, unknown skill, missing
 *   source) throw before any write; per-target failures do not stop the run.
 *   A selected skill whose record has a different install mode stops the
 *   run the same way: the metadata records one mode per skill, and mixing
 *   modes would corrupt the record and misreport installation state.
 * - Seams metadata is written only after the library resolves, so an
 *   interrupted write never looks like a successful install: `skills check`
 *   reports the copy as `modified` or `missing` and `skills update` repairs
 *   it.
 */
import { lstatSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { bundledSkillsDir } from "./bundled.ts";
import { skillFolderHash } from "./hash.ts";
import {
  PACKAGE_NAME,
  packageVersion,
  readSkillsMeta,
  seamsSkillsMetaPath,
  writeSkillsMeta,
} from "./meta.ts";
import type { InstallMode, Scope, SkillRecord, SkillsMeta } from "./meta.ts";

export type { InstallMode, Scope };

/**
 * The agents whose destinations seams computes itself. The library's
 * AgentInfo is exact for this trio; placement for other agents is not, and
 * an allowlist keeps `agents` explicit (seams#sn2t).
 */
export const SUPPORTED_AGENTS = ["claude-code", "codex", "pi"] as const;

export type AgentId = (typeof SUPPORTED_AGENTS)[number];

export function isSupportedAgent(id: string): id is AgentId {
  return (SUPPORTED_AGENTS as readonly string[]).includes(id);
}

/** An agent id outside the supported allowlist: a usage error. */
export class UnsupportedAgentError extends Error {
  readonly unsupported: string[];
  constructor(unsupported: string[]) {
    super(
      `Unsupported agent: ${unsupported.join(", ")} (supported: ${SUPPORTED_AGENTS.join(", ")})`,
    );
    this.name = "UnsupportedAgentError";
    this.unsupported = unsupported;
  }
}

/** A skill name that is not bundled with the running package. */
export class UnknownSkillError extends Error {
  readonly valid: string[];
  constructor(unknown: string[], valid: string[]) {
    super(`Unknown skill: ${unknown.join(", ")}\nValid names: ${valid.join(", ")}`);
    this.name = "UnknownSkillError";
    this.valid = valid;
  }
}

/**
 * A selected skill is already recorded with a different install mode. The
 * metadata records one mode per skill, so an install that mixes modes would
 * corrupt the record and misreport installation state. Stopped before any
 * write.
 */
export class ModeMismatchError extends Error {
  readonly skills: { name: string; recorded: InstallMode; requested: InstallMode }[];
  constructor(skills: { name: string; recorded: InstallMode; requested: InstallMode }[]) {
    super(
      "A selected skill is recorded with a different install mode:\n" +
        skills
          .map(
            (s) =>
              `  ${s.name}: recorded ${s.recorded}, requested ${s.requested}`,
          )
          .join("\n") +
        "\nRe-run with the recorded mode, or remove the installed skill first.",
    );
    this.name = "ModeMismatchError";
    this.skills = skills;
  }
}

// The library module: imported lazily so the telemetry kill switch is in the
// environment before the library loads (the module captures the user's home
// directory at import time; env changes later have no effect).
type SkillsLibrary = typeof import("skills");
let libraryPromise: Promise<SkillsLibrary> | undefined;

function library(): Promise<SkillsLibrary> {
  process.env.DISABLE_TELEMETRY = "1";
  libraryPromise ??= import("skills");
  return libraryPromise;
}

/** The parts of the library's AgentInfo that seams relies on. */
type AgentInfo = Awaited<ReturnType<SkillsLibrary["getSupportedAgents"]>>[number];

let agentInfoPromise: Promise<Map<string, AgentInfo>> | undefined;

/** AgentInfo for every supported agent, keyed by id. */
async function supportedAgentInfo(): Promise<Map<string, AgentInfo>> {
  agentInfoPromise ??= library().then((lib) => {
    const byId = new Map<string, AgentInfo>(lib.getSupportedAgents().map((agent) => [agent.id, agent]));
    const missing = SUPPORTED_AGENTS.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new Error(
        `The skills library does not report placement for: ${missing.join(", ")}`,
      );
    }
    return byId;
  });
  return agentInfoPromise;
}

/** Where one (skill, agent) install lives on disk. */
export interface SkillDestination {
  /** The folder holding (or that would hold) the skill's content. */
  content: string;
  /** The symlink location for a non-universal agent in symlink mode. */
  link?: string;
  /** The path to report for the agent's copy: the link when one is used. */
  target: string;
}

/**
 * The destination of one skill for one agent. In copy mode each agent gets its
 * own folder (universal agents share the canonical `.agents/skills`). In
 * symlink mode the content lives in the canonical `.agents/skills` and
 * non-universal agents (claude-code) get a symlink in their own directory.
 */
export async function skillDestination(
  cwd: string,
  scope: Scope,
  mode: InstallMode,
  agent: AgentId,
  skillName: string,
): Promise<SkillDestination> {
  const info = (await supportedAgentInfo()).get(agent);
  if (info === undefined) throw new UnsupportedAgentError([agent]);
  if (info.globalSkillsDir === null) {
    throw new Error(`The skills library reports no global skills directory for ${agent}.`);
  }
  const ownDir = scope === "project"
    ? path.resolve(cwd, info.projectSkillsDir)
    : info.globalSkillsDir;
  if (mode === "copy") {
    return { content: path.join(ownDir, skillName), target: path.join(ownDir, skillName) };
  }
  const canonical = scope === "project"
    ? path.resolve(cwd, ".agents", "skills")
    : path.join(homedir(), ".agents", "skills");
  const content = path.join(canonical, skillName);
  const link = info.universal ? undefined : path.join(ownDir, skillName);
  return { content, link, target: link ?? content };
}

/** lstat that returns undefined instead of throwing ENOENT. */
function lstatSafe(target: string) {
  try {
    return lstatSync(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export type InstallAction =
  | "install"
  | "unchanged"
  | "skipped (modified)"
  | "skipped"
  | "failed";

/** One (skill, agent) outcome of an install. */
export interface InstallTarget {
  skill: string;
  agent: AgentId;
  action: InstallAction;
  /** The destination path the action refers to. */
  path: string;
  /** The skill-folder hash of the existing copy, when one exists. */
  hash?: string;
  /** Why the target was skipped (for library skips). */
  reason?: string;
  /** The library's diagnostic code, for failures. */
  code?: string;
}

export interface InstallOptions {
  /** Working directory; defaults to `process.cwd()`. */
  cwd?: string;
  scope: Scope;
  mode: InstallMode;
  /** Explicit agent selection; when omitted, agents are detected. */
  agents?: AgentId[];
  /** Skill names; when omitted, every bundled skill is selected. */
  skills?: string[];
  dryRun?: boolean;
}

export interface InstallReport {
  scope: Scope;
  mode: InstallMode;
  /** The agents the install targeted. */
  agents: AgentId[];
  /** True when the agents came from detection rather than explicit selection. */
  detected: boolean;
  dryRun: boolean;
  /** The bundled skills directory installed from. */
  source: string;
  /** Where the seams skills metadata lives for this scope. */
  metaPath: string;
  /** Warnings reported by the library during the install. */
  warnings: string[];
  targets: InstallTarget[];
}

function uniqueInOrder<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/** The skill's own version, from SKILL.md frontmatter metadata. */
function versionOf(source: SkillSource, name: string): string | undefined {
  const skill = source.skills.find((entry) => entry.name === name);
  const version = skill?.metadata?.version;
  return typeof version === "string" ? version : undefined;
}

type SkillSource = Awaited<ReturnType<SkillsLibrary["resolveSource"]>>;

/**
 * In symlink mode, classify what sits at the agent's link path. A real
 * folder there (a copy-mode install, or a hand-copied skill) holds content:
 * when it differs from the bundled copy it must never reach the library,
 * which would replace it with a symlink and lose the changes.
 */
function classifyLink(
  destination: SkillDestination,
  bundledHash: string,
): { action: "install" | "skipped (modified)"; hash?: string } {
  if (destination.link === undefined) return { action: "install" };
  const link = lstatSafe(destination.link);
  if (link === undefined || link.isSymbolicLink()) return { action: "install" };
  const hash = skillFolderHash(destination.link);
  if (hash !== bundledHash) return { action: "skipped (modified)", hash };
  // A byte-identical real folder: the library converts it to a symlink.
  return { action: "install" };
}

/** How an existing destination compares with the bundled copy. */
function classifyExisting(
  destination: SkillDestination,
  mode: InstallMode,
  bundledHash: string,
): { action: "install" | "unchanged" | "skipped (modified)"; hash?: string } {
  const existing = lstatSafe(destination.content);
  if (existing === undefined) return classifyLink(destination, bundledHash);
  // A symlinked copy in copy mode is not the copy the caller asked for;
  // install so the library replaces it with a real folder.
  if (mode === "copy" && existing.isSymbolicLink()) return { action: "install" };
  const hash = skillFolderHash(destination.content);
  if (hash !== bundledHash) return { action: "skipped (modified)", hash };
  if (mode === "symlink") {
    // Content matches; a non-universal agent also needs its link, and a real
    // folder at the link path may hold changes even when content matches.
    return classifyLink(destination, bundledHash);
  }
  return { action: "unchanged", hash };
}

/** Add `agent` to a skill's record, creating or updating it. Returns whether anything changed. */
function upsertRecord(
  meta: SkillsMeta,
  name: string,
  facts: { hash: string; version?: string },
  agent: AgentId,
  mode: InstallMode,
  now: string,
): boolean {
  const existing: SkillRecord | undefined = meta.skills[name];
  if (existing === undefined) {
    meta.skills[name] = {
      hash: facts.hash,
      version: facts.version,
      agents: [agent],
      mode,
      installedAt: now,
      updatedAt: now,
    };
    return true;
  }
  const agents = SUPPORTED_AGENTS.filter(
    (id) => existing.agents.includes(id) || id === agent,
  );
  const changed =
    existing.hash !== facts.hash ||
    existing.version !== facts.version ||
    existing.mode !== mode ||
    agents.length !== existing.agents.length;
  if (!changed) return false;
  existing.hash = facts.hash;
  existing.version = facts.version;
  existing.agents = agents;
  existing.mode = mode;
  existing.updatedAt = now;
  return true;
}

/**
 * Install the bundled skills through the `skills` library. See the module
 * header for the safety mechanism; nothing is written when `dryRun` is true.
 */
export async function installSkills(options: InstallOptions): Promise<InstallReport> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const lib = await library();
  const warnings: string[] = [];
  const targets: InstallTarget[] = [];

  let agents: AgentId[];
  let detected = false;
  if (options.agents !== undefined) {
    const unsupported = options.agents.filter((id) => !isSupportedAgent(id));
    if (unsupported.length > 0) throw new UnsupportedAgentError(unsupported);
    agents = uniqueInOrder(options.agents);
  } else {
    const found = await lib.detectAgents({ cwd });
    agents = uniqueInOrder(found.agents.map((a) => a.id).filter(isSupportedAgent));
    detected = true;
  }

  const sourceDir = bundledSkillsDir();
  // Throws before any write when the bundled directory is missing (seams#sn2t).
  const source = await lib.resolveSource(sourceDir);
  const available = source.skills.map((skill) => skill.name);
  let selected: string[];
  if (options.skills !== undefined) {
    selected = uniqueInOrder(options.skills);
    const unknown = selected.filter((name) => !available.includes(name));
    if (unknown.length > 0) throw new UnknownSkillError(unknown, available);
  } else {
    selected = available;
  }

  // The bundled copy's facts, for preflight comparison and the metadata record.
  const bundled = new Map<string, { hash: string; version?: string }>();
  for (const name of selected) {
    bundled.set(name, {
      hash: skillFolderHash(path.join(sourceDir, name)),
      version: versionOf(source, name),
    });
  }

  // The record for this scope, reused for the metadata update. Read before
  // preflight so a mode conflict stops the run before any write.
  const meta =
    readSkillsMeta(cwd, options.scope) ?? {
      schemaVersion: 1 as const,
      package: PACKAGE_NAME,
      packageVersion: packageVersion(),
      scope: options.scope,
      skills: {},
    };
  const mismatched = selected.flatMap((name) => {
    const recorded = meta.skills[name]?.mode;
    return recorded !== undefined && recorded !== options.mode
      ? [{ name, recorded, requested: options.mode }]
      : [];
  });
  if (mismatched.length > 0) throw new ModeMismatchError(mismatched);

  // Preflight: classify every (skill, agent) destination and collect, per
  // agent, the skills the library may write. Planned installs start as
  // provisional `install` targets and are updated with the library's actual
  // outcome (or a failure) after the call.
  const plannedByAgent = new Map<AgentId, string[]>();
  const targetIndex = new Map<string, InstallTarget>();
  for (const name of selected) {
    const facts = bundled.get(name);
    if (facts === undefined) continue;
    for (const agent of agents) {
      const destination = await skillDestination(cwd, options.scope, options.mode, agent, name);
      const { action, hash } = classifyExisting(destination, options.mode, facts.hash);
      const target: InstallTarget =
        hash === undefined
          ? { skill: name, agent, action, path: destination.target }
          : { skill: name, agent, action, path: destination.target, hash };
      targets.push(target);
      targetIndex.set(`${name}\0${agent}`, target);
      if (action === "install") {
        const names = plannedByAgent.get(agent) ?? [];
        names.push(name);
        plannedByAgent.set(agent, names);
      }
    }
  }

  const report: InstallReport = {
    scope: options.scope,
    mode: options.mode,
    agents,
    detected,
    dryRun: options.dryRun === true,
    source: sourceDir,
    metaPath: seamsSkillsMetaPath(cwd, options.scope),
    warnings,
    targets,
  };
  if (report.dryRun || agents.length === 0) return report;

  const now = new Date().toISOString();
  let metaDirty = false;

  // One library call per agent, passing only that agent's planned skills.
  for (const agent of agents) {
    const names = plannedByAgent.get(agent) ?? [];
    if (names.length === 0) continue;
    const mark = (name: string, action: InstallAction, patch: Partial<InstallTarget>): void => {
      const target = targetIndex.get(`${name}\0${agent}`);
      if (target !== undefined) Object.assign(target, { action, ...patch });
    };
    let result;
    try {
      result = await lib.installSkills(source, {
        cwd,
        scope: options.scope,
        mode: options.mode,
        agents: [agent],
        skills: names,
        telemetry: false,
        lockfile: true,
        duplicates: "error",
        symlinks: "reject",
        onWarning: (warning: { message?: string }) => {
          warnings.push(warning.message ?? JSON.stringify(warning));
        },
      });
    } catch (error) {
      // A whole-call error is thrown before any write: this agent's targets
      // stayed as they were. Report them failed and let the others proceed.
      const code = (error as { code?: string }).code;
      const message = error instanceof Error ? error.message : String(error);
      for (const name of names) {
        mark(name, "failed", { code, reason: message });
      }
      continue;
    }
    const reported = new Set<string>();
    for (const entry of result.installed ?? []) {
      if (entry.agent !== agent) continue;
      reported.add(entry.skill);
      const facts = bundled.get(entry.skill);
      mark(entry.skill, "install", { path: entry.path, hash: facts?.hash });
      if (facts === undefined) continue;
      if (upsertRecord(meta, entry.skill, facts, agent, options.mode, now)) metaDirty = true;
    }
    for (const entry of result.skipped ?? []) {
      if (entry.agent !== agent) continue;
      reported.add(entry.skill);
      mark(entry.skill, "skipped", { reason: entry.reason });
    }
    for (const entry of result.failed ?? []) {
      if (entry.agent !== agent) continue;
      reported.add(entry.skill);
      mark(entry.skill, "failed", { code: entry.code, reason: entry.message });
    }
    for (const name of names) {
      if (!reported.has(name)) {
        mark(name, "failed", {
          code: "SKILLS_INSTALL_UNREPORTED",
          reason: "The library reported no outcome for this target.",
        });
      }
    }
  }

  // Byte-identical copies that were never recorded (installed by hand or by
  // an earlier run that could not write metadata) count as installed.
  for (const target of targets) {
    if (target.action !== "unchanged") continue;
    const facts = bundled.get(target.skill);
    if (facts === undefined) continue;
    if (upsertRecord(meta, target.skill, facts, target.agent, options.mode, now)) metaDirty = true;
  }

  if (metaDirty) writeSkillsMeta(cwd, options.scope, meta);
  return report;
}

export type InstallationState =
  | "installed"
  | "missing"
  | "modified"
  | "not-installed"
  | "untracked";

/** A bundled skill's installation state in one scope, for `skills list`. */
export interface InstallationStatus {
  state: InstallationState;
  /** Where the copy was looked for, when one is relevant. */
  path?: string;
  /** The hash of the on-disk copy, when one exists. */
  hash?: string;
}

/**
 * The installation state of each named skill in one scope, from the seams
 * metadata and the hash of each installed copy: `installed`, `missing`
 * (recorded but the copy is gone), `modified` (recorded hash differs),
 * `untracked` (a copy exists that seams never recorded), or `not-installed`.
 */
export async function installationStatuses(
  cwd: string,
  scope: Scope,
  names: string[],
): Promise<Map<string, InstallationStatus>> {
  const meta = readSkillsMeta(path.resolve(cwd), scope);
  const statuses = new Map<string, InstallationStatus>();
  for (const name of names) {
    const record = meta?.skills[name];
    if (record !== undefined) {
      let status: InstallationStatus | undefined;
      let path: string | undefined;
      for (const agent of record.agents) {
        if (!isSupportedAgent(agent)) continue;
        const destination = await skillDestination(cwd, scope, record.mode, agent, name);
        path ??= destination.target;
        const existing = lstatSafe(destination.content);
        if (existing === undefined || (record.mode === "copy" && existing.isSymbolicLink())) {
          status = { state: "missing", path: destination.target };
          break;
        }
        if (destination.link !== undefined && !lstatSafe(destination.link)?.isSymbolicLink()) {
          status = { state: "missing", path: destination.link };
          break;
        }
        const hash = skillFolderHash(destination.content);
        if (hash !== record.hash) {
          status = { state: "modified", path: destination.target, hash };
          break;
        }
      }
      if (status !== undefined) statuses.set(name, status);
      else if (path !== undefined) statuses.set(name, { state: "installed", path });
      else statuses.set(name, { state: "missing" });
      continue;
    }
    // Not recorded: look for a copy seams does not know about.
    let status: InstallationStatus | undefined;
    for (const agent of SUPPORTED_AGENTS) {
      const destination = await skillDestination(cwd, scope, "copy", agent, name);
      if (lstatSafe(destination.content) !== undefined) {
        status = {
          state: "untracked",
          path: destination.target,
          hash: skillFolderHash(destination.content),
        };
        break;
      }
    }
    statuses.set(name, status ?? { state: "not-installed" });
  }
  return statuses;
}
