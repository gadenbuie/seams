/**
 * Output helpers shared by every command.
 *
 * JSON output (`--json`) is an object
 * `{ "schemaVersion": 1, "command": "<name>", ...payload }`.
 */
export interface JsonEnvelope {
  schemaVersion: 1;
  command: string;
  [key: string]: unknown;
}

export function jsonEnvelope(
  command: string,
  payload: Record<string, unknown> = {},
): JsonEnvelope {
  return { schemaVersion: 1, command, ...payload };
}

/** Write pretty JSON followed by a newline to stdout. */
export function printJson(value: unknown): void {
  process.stdout.write(JSON.stringify(value, null, 2) + "\n");
}

/** Write text followed by a newline to stdout. */
export function printText(text: string): void {
  process.stdout.write(text + "\n");
}
