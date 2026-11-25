/**
 * Authority grouping: the groups the reference-reporting commands sort
 * documents into, and the rule that assigns each document its group.
 *
 * `impact` and `reconcile` both report which documents reference the changed
 * files, and both group those documents by authority. They share this module
 * so the two commands cannot disagree about a document's group, the way a
 * duplicated rule once let them.
 */
import type { DocumentReferences } from "./references.ts";

/** The authority groups, in report order. Navigation comes last. */
export const GROUP_ORDER = [
  "Canon",
  "Overviews",
  "Accepted proposals",
  "Other proposals",
  "Plans",
  "Navigation",
];

/** The authority group a document belongs to. */
export function groupOf(doc: DocumentReferences): string {
  // A home's index.md is a navigation page, not a document of its home's
  // type. It folds into the existing group of its home, except the canon
  // home's index, which is navigation rather than canon, so no existing
  // group fits and it takes the navigation group.
  if (doc.index === true && doc.type === "canon") return "Navigation";
  switch (doc.type) {
    case "canon":
      return "Canon";
    case "overview":
      return "Overviews";
    case "proposal":
      return doc.status === "accepted" ? "Accepted proposals" : "Other proposals";
    case "plan":
      return "Plans";
    case "note":
      // Notes never reach a reference report: findReferences excludes them
      // as local, lowest-weight context. This case keeps the switch exhaustive
      // rather than adding a maintenance group no report can reach.
      return "Notes";
  }
}
