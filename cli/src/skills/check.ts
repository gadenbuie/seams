/**
 * `skills check` and `skills update`: compare the installed skill copies with
 * the skills bundled in the running package, and bring the safe ones up to
 * date.
 *
 * The sources of truth are seams' own metadata (`.agents/seams-skills.json`
 * project, `~/.agents/seams-skills.json` global — the library's lock files
 * record only paths, no stable package identity; seams#sn2t) and the bundled
 * skills directory of the running package. Every hash is seams' own
 * (hash.ts, byte-for-byte the library's `computedHash`).
 *
 * Classification per (skill, agent) destination:
 *
 * - `ok`: installed hash == recorded hash == bundled hash.
 * - `modified`: installed hash differs from the recorded one.
 * - `missing`: recorded, but the destination is absent.
 * - `untracked`: a seams-named directory sits in an agent's skills dir at a
 *   path seams' metadata does not track (a hand copy, or a copy from a lost
 *   metadata file).
 * - `outdated`: installed == recorded, but the running package bundles a
 *   different hash.
 * - `divergent`: modified and outdated.
 *
 * Update replaces only `outdated` and `missing` copies: those destinations
 * are exactly the ones that are absent or still byte-identical to what seams
 * last wrote, so no user edit can be lost. `modified`, `untracked`, and
 * `divergent` copies are never passed to the library (it would silently
 * overwrite them; spike-verified); they are reported for manual
 * reconciliation with the paths of both versions. Update never deletes
 * files. Seams metadata is rewritten only after the library resolves, so a
 * partial write surfaces as `modified` or `missing` on the next check.
 */
import { existsSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { bundledSkillsDir } from "./bundled.ts";
import { skillFolderHash } from "./hash.ts";
import {
  agentSkillsDir,
  isSupportedAgent,
  library,
  lstatSafe,
  skillDestination,
  SUPPORTED_AGENTS,
  UnsupportedAgentError,
  upsertRecord,
  versionOf,
} from "./install.ts";
import type { AgentId, InstallMode, Scope } from "./install.ts";
import { packageVersion, readSkillsMeta, seamsSkillsMetaPath, writeSkillsMeta } from "./meta.ts";
import type { SkillRecord, SkillsMeta } from "./meta.ts";

type SkillsLibrary = Awaited<ReturnType<typeof library>>;
type SkillSource = Awaited<ReturnType<SkillsLibrary["resolveSource"]>>;

/** How one (skill, agent) destination compares with the record and the bundle. */
export type CheckState =
  | "ok"
  | "modified"
  | "missing"
  | "untracked"
  | "outdated"
  | "divergent";

/** One classified (skill, agent) destination. */
export interface CheckEntry {
  skill: string;
  agent: AgentId;
  state: CheckState;
  /** The installed copy's path the classification refers to. */
  path: string;
  /** Hash of the on-disk copy, when one exists and can be read. */
  installedHash?: string;
  /** Hash the seams metadata records for the skill, when it is recorded. */
  recordedHash?: string;
  /** Hash of the bundled copy, when the running package bundles the skill. */
  bundledHash?: string;
  /** The bundled copy's path, when the running package bundles the skill. */
  bundledPath?: string;
  /** An update that cannot repair the entry says why here. */
  note?: string;
}

/** Options shared by `checkSkills` and `updateSkills`. */
export interface CheckOptions {
  /** Working directory; defaults to `process.cwd()`. */
  cwd?: string;
  scope: Scope;
  /**
   * Explicit agent selection. When omitted, every supported agent is
   * considered: recorded copies of unselected agents would otherwise never be
   * checked.
   */
  agents?: AgentId[];
  /**
   * The directory whose skills are the bundled source of truth. Defaults to
   * the skills bundled with the running package; tests point it at a fixture
   * so a v1 → v2 update can be exercised without repacking the package.
   */
  sourceDir?: string;
}

interface Classification {
  cwd: string;
  scope: Scope;
  agents: AgentId[];
  sourceDir: string;
  metaPath: string;
  meta: SkillsMeta | undefined;
  /** The library-resolved source for `sourceDir`, reused by update's calls. */
  source: SkillSource;
  /** Bundled facts per skill name. */
  bundled: Map<string, { hash: string; version?: string }>;
  entries: CheckEntry[];
}

/**
 * The classification of a skill's own record: `missing` when the destination
 * is absent, `modified` when the installed copy differs from the record,
 * `outdated` when it matches the record but not the bundle, `divergent` when
 * both, `ok` otherwise. A skill the running package no longer bundles is
 * classified against the record alone: `missing`, `modified`, or `ok`.
 */
function classifyRecord(
  installedHash: string,
  record: SkillRecord,
  bundled: { hash: string } | undefined,
): CheckState {
  if (installedHash !== record.hash) {
    return bundled !== undefined && bundled.hash !== record.hash
      ? "divergent"
      : "modified";
  }
  if (bundled !== undefined && bundled.hash !== record.hash) return "outdated";
  return "ok";
}

/** A directory entry in an agent's skills dir that could be a seams skill. */
function isSeamsNamedEntry(entry: { name: string; isDirectory(): boolean; isSymbolicLink(): boolean }): boolean {
  // Every seams skill carries the `seams-` prefix; the directory scan is the
  // authority for what exists, so the prefix is the only name test.
  return entry.name.startsWith("seams-") && (entry.isDirectory() || entry.isSymbolicLink());
}

/** realpath that falls back to the input when the path cannot be resolved. */
function realpathSafe(target: string): string {
  try {
    return realpathSync(target);
  } catch {
    return target;
  }
}

/** Hash `dir` when it exists and is readable, undefined otherwise. */
function hashSafe(dir: string): string | undefined {
  try {
    return skillFolderHash(dir);
  } catch {
    return undefined;
  }
}

/**
 * Classify every recorded and stray (skill, agent) destination in one scope.
 * Read-only: nothing is written and the library is never asked to install.
 */
async function classifySkills(options: CheckOptions): Promise<Classification> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  let agents: AgentId[];
  if (options.agents !== undefined) {
    const unsupported = options.agents.filter((id) => !isSupportedAgent(id));
    if (unsupported.length > 0) throw new UnsupportedAgentError(unsupported);
    agents = [...new Set(options.agents)];
  } else {
    agents = [...SUPPORTED_AGENTS];
  }

  const lib = await library();
  const sourceDir = options.sourceDir ?? bundledSkillsDir();
  // Throws before anything else when the source directory is missing.
  const source = await lib.resolveSource(sourceDir);
  const bundled = new Map<string, { hash: string; version?: string }>();
  for (const skill of source.skills) {
    bundled.set(skill.name, {
      hash: skillFolderHash(path.join(sourceDir, skill.name)),
      version: versionOf(source, skill.name),
    });
  }

  const meta = readSkillsMeta(cwd, options.scope);
  const entries: CheckEntry[] = [];

  // Recorded skills: classify each recorded agent's destination.
  for (const name of Object.keys(meta?.skills ?? {}).sort()) {
    const record = meta!.skills[name];
    const bundledFacts = bundled.get(name);
    for (const agent of record.agents) {
      if (!isSupportedAgent(agent) || !agents.includes(agent)) continue;
      const destination = await skillDestination(cwd, options.scope, record.mode, agent, name);
      const entry: CheckEntry = {
        skill: name,
        agent,
        state: "ok",
        path: destination.target,
        recordedHash: record.hash,
        bundledHash: bundledFacts?.hash,
        bundledPath: bundledFacts === undefined ? undefined : path.join(sourceDir, name),
      };
      // A copy-mode destination that is actually a symlink is not the copy
      // the record describes; the library replaces it with a real folder
      // without touching the symlink's target. Mirrors the `skills list`
      // state.
      const content = lstatSafe(destination.content);
      if (content === undefined || (record.mode === "copy" && content.isSymbolicLink())) {
        entry.state = "missing";
        entries.push(entry);
        continue;
      }
      // The content hash decides before the link state: a modified or
      // divergent copy is never an update target, whatever the link looks
      // like. Repairing a link would hand the library the shared folder,
      // and the library rewrites it (seams#sn2t) — the edits would be lost
      // while the same run listed the folder for manual reconciliation.
      entry.installedHash = skillFolderHash(destination.content);
      const contentState = classifyRecord(entry.installedHash, record, bundledFacts);
      if (contentState === "modified" || contentState === "divergent") {
        entry.state = contentState;
        entries.push(entry);
        continue;
      }
      // A symlink-mode agent additionally needs its link. A missing link
      // over an intact folder is repairable. A real folder at the link path
      // is the agent's copy, not a link: it is kept when it differs from
      // the record (the library would replace it with a symlink and lose
      // the changes, as the install layer's classifyLink already knows),
      // and is a lossless conversion target when it is byte-identical.
      if (record.mode === "symlink" && destination.link !== undefined) {
        const link = lstatSafe(destination.link);
        if (link === undefined) {
          entry.state = "missing";
          entry.path = destination.link;
          entries.push(entry);
          continue;
        }
        if (!link.isSymbolicLink()) {
          const linkHash = skillFolderHash(destination.link);
          entry.installedHash = linkHash;
          entry.path = destination.link;
          const linkState = classifyRecord(linkHash, record, bundledFacts);
          if (linkState === "modified" || linkState === "divergent") {
            entry.state = linkState;
            entries.push(entry);
            continue;
          }
          // Byte-identical content in the wrong shape: the recorded symlink
          // is missing and update converts the folder back into the link.
          entry.state = "missing";
          entries.push(entry);
          continue;
        }
      }
      entry.state = contentState;
      entries.push(entry);
    }
  }

  // Untracked: a seams-named directory in a considered agent's skills dir at
  // a path the metadata does not track. Tracked paths come from every
  // recorded agent, not just the selected ones, so filtering agents never
  // turns a tracked copy into a false untracked finding.
  // Tracked real paths across every recorded skill and agent: a location
  // seams' metadata covers never appears as untracked, whatever the
  // SKILL.md frontmatter inside it claims its name is (the library's listing
  // names skills by frontmatter, the directory scan by folder name).
  const trackedRealPaths = new Set<string>();
  for (const [name, record] of Object.entries(meta?.skills ?? {})) {
    for (const agent of record.agents) {
      if (!isSupportedAgent(agent)) continue;
      const destination = await skillDestination(cwd, options.scope, record.mode, agent, name);
      trackedRealPaths.add(realpathSafe(destination.content));
      if (destination.link !== undefined) trackedRealPaths.add(realpathSafe(destination.link));
    }
  }

  // One physical location yields one entry per agent: dedupe by
  // (agent, path) in real-path form, so the library's listing (which names
  // skills by their SKILL.md frontmatter and returns real paths) can only
  // add locations the scan did not see, never a second name for the same
  // directory.
  const seenUntracked = new Set<string>();
  const addUntracked = (agent: AgentId, name: string, at: string): void => {
    const real = realpathSafe(at);
    const key = `${agent}\0${real}`;
    if (seenUntracked.has(key)) return;
    if (trackedRealPaths.has(real)) return;
    seenUntracked.add(key);
    const bundledFacts = bundled.get(name);
    entries.push({
      skill: name,
      agent,
      state: "untracked",
      path: at,
      installedHash: hashSafe(at),
      bundledHash: bundledFacts?.hash,
      bundledPath: bundledFacts === undefined ? undefined : path.join(sourceDir, name),
    });
  };

  // The directory scan is the authority: it sees every seams-named entry,
  // including ones the library's listing skips.
  for (const agent of agents) {
    const dir = await agentSkillsDir(cwd, options.scope, agent);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (isSeamsNamedEntry(entry)) addUntracked(agent, entry.name, path.join(dir, entry.name));
    }
  }
  // The library's listing cross-checks the scan and may add entries the scan
  // cannot reach (it lists strays with no `source` field; seams#sn2t).
  const listed = await lib.listSkills({ cwd, scope: options.scope, agents });
  for (const skill of listed.skills) {
    if (!skill.name.startsWith("seams-")) continue;
    for (const agent of skill.agents) {
      if (!isSupportedAgent(agent) || !agents.includes(agent)) continue;
      if (skill.path === undefined) continue;
      addUntracked(agent, skill.name, skill.path);
    }
  }

  entries.sort((a, b) => (a.skill === b.skill ? a.agent.localeCompare(b.agent) : a.skill.localeCompare(b.skill)));
  return {
    cwd,
    scope: options.scope,
    agents,
    sourceDir,
    metaPath: seamsSkillsMetaPath(cwd, options.scope),
    meta,
    source,
    bundled,
    entries,
  };
}

/** `skills check`: classify every installed copy in one scope. Read-only. */
export interface CheckReport {
  scope: Scope;
  /** The agents considered. */
  agents: AgentId[];
  /** The bundled skills directory compared against. */
  source: string;
  /** Where the seams skills metadata lives for this scope. */
  metaPath: string;
  entries: CheckEntry[];
}

export async function checkSkills(options: CheckOptions): Promise<CheckReport> {
  const classification = await classifySkills(options);
  return {
    scope: classification.scope,
    agents: classification.agents,
    source: classification.sourceDir,
    metaPath: classification.metaPath,
    entries: classification.entries,
  };
}

/** Why update selected a copy: it is outdated or missing. */
export type UpdateReason = "outdated" | "missing";

/** One (skill, agent) copy update, planned (dry run) or executed. */
export interface UpdateTarget {
  skill: string;
  agent: AgentId;
  reason: UpdateReason;
  /** `planned` in a dry run; the outcome otherwise. */
  action: "planned" | "updated" | "skipped" | "failed";
  /** The destination path the update refers to. */
  path: string;
  /** The bundled copy the update installs from. */
  sourcePath: string;
  /** The library's diagnostic code, for failures. */
  code?: string;
  /** A skip reason or failure message. */
  detail?: string;
}

export interface UpdateOptions extends CheckOptions {
  dryRun?: boolean;
}

export interface UpdateReport {
  scope: Scope;
  agents: AgentId[];
  dryRun: boolean;
  /** The bundled skills directory updated from. */
  source: string;
  metaPath: string;
  /** The library's warnings during the update. */
  warnings: string[];
  /** The planned or executed updates. */
  targets: UpdateTarget[];
  /**
   * The copies update left alone, with the paths of both versions:
   * modified, untracked, and divergent copies, and missing ones the running
   * package cannot repair.
   */
  kept: CheckEntry[];
  /**
   * The classification update started from, as `skills check` reports it.
   * Copies that were not selected are unchanged.
   */
  entries: CheckEntry[];
  /** True when seams metadata was rewritten with the new hashes. */
  metaUpdated: boolean;
}

/**
 * `skills update`: bring `outdated` and `missing` copies up to date with the
 * skills bundled in the running package. Modified, untracked, and divergent
 * copies are left alone and listed for manual reconciliation. Nothing is
 * deleted. With `dryRun`, nothing is written at all.
 */
export async function updateSkills(options: UpdateOptions): Promise<UpdateReport> {
  const classification = await classifySkills(options);
  const { cwd, meta, bundled, source, entries } = classification;
  const dryRun = options.dryRun === true;
  const warnings: string[] = [];

  // Select the update candidates and mark everything else that is not ok for
  // manual reconciliation. A `missing` skill the running package no longer
  // bundles cannot be reinstalled; it is kept with a note, never guessed at.
  const targets: UpdateTarget[] = [];
  const kept: CheckEntry[] = [];
  for (const entry of entries) {
    const bundledFacts = bundled.get(entry.skill);
    if (entry.state === "outdated" || (entry.state === "missing" && bundledFacts !== undefined)) {
      targets.push({
        skill: entry.skill,
        agent: entry.agent,
        reason: entry.state,
        action: dryRun ? "planned" : "updated",
        path: entry.path,
        sourcePath: path.join(classification.sourceDir, entry.skill),
      });
      continue;
    }
    if (entry.state === "ok") continue;
    if (entry.state === "missing") {
      entry.note = "not bundled with the running package; cannot repair";
    }
    kept.push(entry);
  }

  const report: UpdateReport = {
    scope: classification.scope,
    agents: classification.agents,
    dryRun,
    source: classification.sourceDir,
    metaPath: classification.metaPath,
    warnings,
    targets,
    kept,
    entries,
    metaUpdated: false,
  };
  // A dry run is the preflight alone: no library call, no metadata write.
  if (dryRun) return report;

  const lib = await library();
  const now = new Date().toISOString();
  let metaDirty = false;

  // One library call per (agent, install mode); the metadata records one mode
  // per skill, so the groups can never mix modes.
  const groups = new Map<string, { agent: AgentId; mode: InstallMode; names: string[] }>();
  for (const target of targets) {
    const record = meta?.skills[target.skill];
    if (record === undefined) continue; // candidates are recorded skills
    const key = `${record.mode}\0${target.agent}`;
    const group = groups.get(key) ?? { agent: target.agent, mode: record.mode, names: [] };
    group.names.push(target.skill);
    groups.set(key, group);
  }

  const byAgentSkill = new Map(targets.map((target) => [`${target.skill}\0${target.agent}`, target]));
  for (const group of groups.values()) {
    const mark = (name: string, patch: Partial<UpdateTarget>): void => {
      const target = byAgentSkill.get(`${name}\0${group.agent}`);
      if (target !== undefined) Object.assign(target, patch);
    };
    let result;
    try {
      result = await lib.installSkills(source, {
        cwd,
        scope: classification.scope,
        mode: group.mode,
        agents: [group.agent],
        skills: group.names,
        telemetry: false,
        lockfile: true,
        duplicates: "error",
        symlinks: "reject",
        onWarning: (warning: { message?: string }) => {
          warnings.push(warning.message ?? JSON.stringify(warning));
        },
      });
    } catch (error) {
      // A whole-call error is thrown before any write: these destinations
      // stayed as they were. Report them failed and let the other groups run.
      const code = (error as { code?: string }).code;
      const message = error instanceof Error ? error.message : String(error);
      for (const name of group.names) mark(name, { action: "failed", code, detail: message });
      continue;
    }
    const reported = new Set<string>();
    for (const entry of result.installed ?? []) {
      if (entry.agent !== group.agent) continue;
      reported.add(entry.skill);
      const bundledFacts = bundled.get(entry.skill);
      mark(entry.skill, { action: "updated", path: entry.path });
      if (meta === undefined || bundledFacts === undefined) continue;
      if (upsertRecord(meta, entry.skill, bundledFacts, group.agent, group.mode, now)) {
        metaDirty = true;
      }
    }
    for (const entry of result.skipped ?? []) {
      if (entry.agent !== group.agent) continue;
      reported.add(entry.skill);
      mark(entry.skill, { action: "skipped", detail: entry.reason });
    }
    for (const entry of result.failed ?? []) {
      if (entry.agent !== group.agent) continue;
      reported.add(entry.skill);
      mark(entry.skill, { action: "failed", code: entry.code, detail: entry.message });
    }
    for (const name of group.names) {
      if (!reported.has(name)) {
        mark(name, {
          action: "failed",
          code: "SKILLS_INSTALL_UNREPORTED",
          detail: "The library reported no outcome for this target.",
        });
      }
    }
  }

  if (metaDirty && meta !== undefined) {
    meta.packageVersion = packageVersion();
    writeSkillsMeta(cwd, classification.scope, meta);
    report.metaUpdated = true;
  }
  return report;
}
