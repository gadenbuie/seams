/**
 * The checks `seams check` runs, in report order. Each check is one file
 * beside this one; later units add their checks to this list.
 */
import { frontmatterCheck } from "./frontmatter.ts";
import { numberingCheck } from "./numbering.ts";
import { statusCheck } from "./status.ts";
import { manifestCheck } from "./manifest.ts";
import { linksCheck } from "./links.ts";
import { indexCoverageCheck } from "./indexCoverage.ts";
import { skillRefsCheck } from "./skillRefs.ts";
import type { Check } from "./types.ts";

export const checks: readonly Check[] = [
  frontmatterCheck,
  numberingCheck,
  statusCheck,
  manifestCheck,
  linksCheck,
  indexCoverageCheck,
  skillRefsCheck,
];
