/**
 * Project root discovery and manifest loading.
 *
 * A project points the CLI at its documentation homes either through a tracked
 * manifest at `.agents/seams.json`, or through the conventional layout when the
 * manifest is absent.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";

export const MANIFEST_RELATIVE_PATH = path.join(".agents", "seams.json");

/** The manifest path as a repo-relative string with forward slashes. */
export const MANIFEST_REPO_PATH = MANIFEST_RELATIVE_PATH.split(path.sep).join("/");

export const SHARED_PATH_KEYS = ["design", "overviews", "proposals", "plans"] as const;

/** Every home the CLI can read, the shared documentation homes plus notes. */
export const PATH_KEYS = [...SHARED_PATH_KEYS, "notes"] as const;

export type PathKey = (typeof PATH_KEYS)[number];

export type ResolvedPaths = Record<PathKey, string>;

export interface ProjectManifest {
  $schema?: string;
  schemaVersion: number;
  seamsVersion: string;
  paths?: Partial<Record<PathKey, string>>;
  reconcile?: { lastReconciledRevision?: string | null };
}

export type PathSource = "manifest" | "conventional";

export interface Project {
  root: string;
  paths: ResolvedPaths;
  source: PathSource;
  manifest?: ProjectManifest;
}

/** A malformed or invalid manifest, listing every problem found. */
export class ManifestError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(
      `Invalid seams manifest (${MANIFEST_RELATIVE_PATH}):\n` +
        issues.map((issue) => `  - ${issue}`).join("\n"),
    );
    this.name = "ManifestError";
    this.issues = issues;
  }
}

/** The directory that contains package.json, resolved from this module's location. */
export function packageRoot(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

/** Absolute path of the bundled manifest JSON Schema, v1. */
export function schemaFilePath(): string {
  return path.join(packageRoot(), "schemas", "v1", "seams.schema.json");
}

export function manifestPath(root: string): string {
  return path.join(root, MANIFEST_RELATIVE_PATH);
}

function ancestors(dir: string): string[] {
  const list: string[] = [];
  let current = path.resolve(dir);
  for (;;) {
    list.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return list;
}

/**
 * Walk up from `cwd` to the nearest directory holding `.agents/seams.json`.
 * When no manifest exists anywhere above, return the nearest directory holding
 * `.git`. When neither exists, return `cwd` itself.
 */
export function findRoot(cwd: string): string {
  const dirs = ancestors(cwd);
  const withManifest = dirs.find((dir) => existsSync(manifestPath(dir)));
  if (withManifest) return withManifest;
  const withGit = dirs.find((dir) => existsSync(path.join(dir, ".git")));
  if (withGit) return withGit;
  return path.resolve(cwd);
}

/**
 * Conventional homes relative to the root, with the `.agents/design` fallback.
 * The notes path is a candidate, never an assumed home: nothing creates the
 * directory, and discovery uses it only when it already exists.
 */
function conventionalPaths(root: string): Record<PathKey, string> {
  const useAgentsDesign =
    !existsSync(path.join(root, "docs", "design")) &&
    existsSync(path.join(root, ".agents", "design"));
  const design = useAgentsDesign ? path.join(".agents", "design") : path.join("docs", "design");
  return {
    design,
    overviews: path.join(design, "overviews"),
    proposals: path.join(".agents", "proposals"),
    plans: path.join(".agents", "plans"),
    notes: path.join("_dev", "notes"),
  };
}

function resolvePaths(root: string, relative: Record<PathKey, string>): ResolvedPaths {
  const resolved = {} as ResolvedPaths;
  for (const key of PATH_KEYS) {
    resolved[key] = path.resolve(root, relative[key]);
  }
  return resolved;
}

/**
 * Check one manifest path value against the rules the schema states: relative,
 * no `..` segment, not absolute, and resolvable inside `root`. Returns a
 * problem description, or undefined when the path is acceptable.
 */
function pathProblem(key: PathKey, value: unknown, root: string): string | undefined {
  if (typeof value !== "string") return undefined; // the schema reports the type problem
  if (value.length === 0) return `paths.${key} must not be an empty string`;
  if (value.startsWith("/") || /^[A-Za-z]:/.test(value)) {
    return `paths.${key} must be a relative path, got ${JSON.stringify(value)}`;
  }
  if (value.includes("\\")) {
    return `paths.${key} must use "/" separators, got ${JSON.stringify(value)}`;
  }
  const segments = value.split("/");
  if (segments.includes("")) {
    return `paths.${key} must not contain an empty segment, got ${JSON.stringify(value)}`;
  }
  if (segments.includes("..")) {
    return `paths.${key} must not contain a ".." segment, got ${JSON.stringify(value)}`;
  }
  const rel = path.relative(root, path.resolve(root, value));
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return `paths.${key} resolves outside the project root, got ${JSON.stringify(value)}`;
  }
  return undefined;
}

/**
 * Load a project's documentation homes from `root`.
 *
 * When `.agents/seams.json` exists it is validated with the bundled schema and
 * its `paths` entries override the conventional defaults per key. A malformed
 * or invalid manifest throws a `ManifestError` listing every problem.
 */
export function loadProject(root: string): Project {
  const resolvedRoot = path.resolve(root);
  const file = manifestPath(resolvedRoot);
  if (!existsSync(file)) {
    return {
      root: resolvedRoot,
      paths: resolvePaths(resolvedRoot, conventionalPaths(resolvedRoot)),
      source: "conventional",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new ManifestError([
      `not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    ]);
  }

  const issues = manifestIssues(parsed, resolvedRoot);
  if (issues.length > 0) throw new ManifestError(issues);

  const relative = {
    ...conventionalPaths(resolvedRoot),
    ...((parsed as ProjectManifest).paths ?? {}),
  };
  return {
    root: resolvedRoot,
    paths: resolvePaths(resolvedRoot, relative),
    source: "manifest",
    manifest: parsed as ProjectManifest,
  };
}

/** Validate `manifest` against the bundled schema, in plain words. */
function schemaIssues(manifest: unknown): string[] {
  const validate = new Ajv2020({ allErrors: true, strict: false }).compile(
    JSON.parse(readFileSync(schemaFilePath(), "utf8")),
  );
  if (validate(manifest)) return [];
  return (validate.errors ?? []).map((error) => {
    const where = error.instancePath ? `at '${error.instancePath}'` : "at the top level";
    if (error.keyword === "additionalProperties") {
      const params = (error.params ?? {}) as Record<string, unknown>;
      const key = params.additionalProperty ?? params.additionalProperties;
      return `${where}: unknown key '${key}'`;
    }
    // Path-shape problems are reported once, by pathProblem, in plainer words:
    // the schema's minLength and relativePath pattern reject exactly the shapes
    // pathProblem restates.
    if (
      (error.keyword === "pattern" || error.keyword === "minLength") &&
      error.instancePath.startsWith("/paths/")
    ) {
      return undefined;
    }
    return `${where} ${error.message ?? "is invalid"}`;
  }).filter((issue): issue is string => issue !== undefined);
}

/**
 * Every problem the bundled schema and the path rules find in `manifest`:
 * schema issues in plain words, then the path-shape problems `pathProblem`
 * restates. Shared by `loadProject` and the `manifest` check.
 */
export function manifestIssues(manifest: unknown, root: string): string[] {
  const issues = schemaIssues(manifest);
  const paths =
    manifest !== null && typeof manifest === "object"
      ? ((manifest as ProjectManifest).paths ?? {})
      : {};
  for (const key of PATH_KEYS) {
    const value = paths[key];
    if (value === undefined) continue;
    const problem = pathProblem(key, value, root);
    if (problem) issues.push(problem);
  }
  return issues;
}
