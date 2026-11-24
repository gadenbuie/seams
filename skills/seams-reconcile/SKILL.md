---
name: seams-reconcile
description: "Find drift in a seams project and bring canon, memory, and code back in line: memory acting like canon, canon that the code contradicts, planned invariants that are now enforced, stale proposals and plans, stale or duplicated documentation, decision ledgers that should become principles, and questions that canon could have answered. Proposes canon changes for the operator to accept; never edits canon on its own. Run only when the operator asks for it, as /seams-reconcile [scope] [notes]."
metadata:
  author: Garrick Aden-Buie (@gadenbuie)
  version: "2.0"
  invocation: operator
---

# Reconcile canon, memory, and code

Drift is a change in a project's direction that the operator never accepted. It happens when memory
starts to act like canon, or when the code moves and canon doesn't. This skill finds drift and
proposes how to fix it. The operator accepts every change to canon.

This skill reviews the project's information. It does not certify that the software is correct, and
it does not select new work.

## Scope

Start from what the operator asked about, e.g., one feature, one folder, or the whole project. For a
whole project, work through the checks below in order and stop to report when the list of findings
is long enough to act on. Record the revision you reviewed.

Read `AGENTS.md` and the canon files named by the design index in full. Read design overviews, user
documentation, other memory, and code only as each check needs. Use
`<skills>/seams-work/references/documentation.md` for documentation checks.

## Checks

### Memory acting like canon

- Documents outside canon that read like rules, e.g., "must", "always", "never", or a spec written
  in the present tense. Report each one and ask whether it should become canon or be relabeled as
  memory. A design overview can explain a rule, but it must link to its owning canon or proposal.
- Draft proposals or old plans that agents are following as if they were accepted. Look for work
  items that cite a draft.
- `AGENTS.md` lines that restate or contradict canon instead of pointing to it.

### Canon and code

- Invariants that the code breaks. Cite the code and the invariant.
- Invariants marked **Planned** that the code now follows, or that a test or lint now enforces.
  Propose removing the marker.
- Canon that describes behavior the code doesn't have, or no longer has.
- Principles that recent decisions contradict without saying so.

### Documentation drift and growth

- Design overviews or user documentation that contradict the code and tests they name. Verify the
  claim and cite both sides.
- Documentation affected by landed work that wasn't updated, and corrections that exist only in a
  plan or work item.
- Lasting explanations in finished proposals or plans that belong in an owning design overview. In
  greenfield work, check the flow from proposal to plan to current-state overview.
- Overviews that contain task status, execution checklists, or implementation narratives instead of
  a current explanation.
- Duplicate, contradictory, or unused documents, and facts with more than one owning document.
- Navigation tooling or frontmatter that costs more to maintain than a simple index would.

### Stale memory

- Draft proposals with no activity, and proposals whose status doesn't match what happened, e.g.,
  work landed from a draft. Ask the operator for each one's status.
- Plans and notes about work that has finished, which a fresh agent might mistake for current plans.
  Mark them historical and keep them outside normal navigation after their lasting explanations
  reach the owning overview.
- More than one active status source for the same work.

### Decisions to compress

- Repeated decisions on work items or in proposals that follow the same reasoning. Propose the
  principle that would have made them.
- Questions that reached the operator during recent work, where canon could have given the answer.
  Propose the principle, non-goal, or invariant that would have answered each one. Leave one-off
  answers on their work items.

### What became real

- Summarize what landed since the last reconcile, at the operator's level, starting with what they
  can try and how.

## Report

Write the report for the operator (`seams-orient`). For each finding give:

- **What:** the drift, in one or two sentences.
- **Where:** the file and section, the work item, or the code.
- **Evidence:** what you read or ran that shows it.
- **Proposed fix:** the exact text to add, change, or remove in canon or documentation, or the
  status or label to change in working memory.

Group the proposed canon changes so the operator can accept or reject each one. If there are many,
put them in a proposal (`seams-propose`). Say "no findings" for any check that found nothing.

## Fixing

Fix only what the operator accepts, and only within the scope they gave.

- Apply accepted canon changes exactly as proposed.
- Correct accepted documentation changes in the owning user document or design overview, and verify
  the new claims against code and tests.
- Relabel or archive working memory instead of deleting it, unless the operator asks for deletion.
- Update links in the same change.
- Run the project's documentation checks and report what passed and what you could not run.
