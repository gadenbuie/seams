/**
 * YAML frontmatter parsing for seams documents.
 *
 * A document's metadata lives in a leading `---` fenced YAML block. Parsing
 * never throws: a document with missing or malformed frontmatter reports its
 * problems and carries an empty data object, so one bad document never breaks a
 * catalog of many.
 */
import { parse as parseYaml } from "yaml";

/** The result of parsing one document's frontmatter. */
export interface Frontmatter {
  /** The frontmatter fields, or `{}` when absent or malformed. */
  data: Record<string, unknown>;
  /**
   * The 1-based line number where the document body starts. With no
   * frontmatter, the body starts at line 1.
   */
  bodyStartLine: number;
  /** Human-readable problems found while reading the frontmatter. */
  problems: string[];
}

const OPEN_DELIMITER = "---";
const CLOSE_DELIMITER = "---";

function isDelimiterLine(line: string, delimiter: string): boolean {
  return line.trimEnd() === delimiter;
}

/**
 * Parse a document's leading YAML frontmatter block.
 *
 * A valid block starts with a line that is exactly `---`, holds YAML, and ends
 * with another line that is exactly `---`. Everything after the closing
 * delimiter is the body, whose first line number is `bodyStartLine`.
 */
export function parseFrontmatter(text: string): Frontmatter {
  const lines = text.split(/\r?\n/);

  if (lines.length === 0 || !isDelimiterLine(lines[0], OPEN_DELIMITER)) {
    return { data: {}, bodyStartLine: 1, problems: ["missing frontmatter"] };
  }

  const closeIndex = lines.findIndex(
    (line, index) => index > 0 && isDelimiterLine(line, CLOSE_DELIMITER),
  );
  if (closeIndex === -1) {
    return {
      data: {},
      bodyStartLine: 1,
      problems: ["unterminated frontmatter: no closing '---' delimiter"],
    };
  }

  const yamlText = lines.slice(1, closeIndex).join("\n");

  let parsed: unknown;
  try {
    parsed = yamlText.trim().length === 0 ? {} : parseYaml(yamlText);
  } catch (error) {
    return {
      data: {},
      bodyStartLine: closeIndex + 2,
      problems: [
        `malformed frontmatter: ${
          error instanceof Error ? error.message.split("\n")[0] : String(error)
        }`,
      ],
    };
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      data: {},
      bodyStartLine: closeIndex + 2,
      problems: ["malformed frontmatter: not a YAML mapping of fields"],
    };
  }

  return {
    data: parsed as Record<string, unknown>,
    bodyStartLine: closeIndex + 2,
    problems: [],
  };
}
