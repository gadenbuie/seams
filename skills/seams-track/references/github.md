# Tracker: GitHub issues

GitHub issues are usually public. The GitHub issue is the record of the selected outcome. During a
routed run, the units and their status live in a local Markdown copy that the router keeps, and the
GitHub issue does not carry unit status. Implementers and fixers never post to GitHub: no comments,
issues, labels, or edits. They work from the local copy and follow `markdown.md` for it.

- **Find:** `gh issue list --search "<terms>"` before creating anything.
- **Read (router):**
  `gh issue view <n> --json title,body,comments,state,labels,subIssues,blockedBy`. Plain
  `--comments` output drops the body when piped. Sub-issues or a task list in the root issue's body
  define the leaves. For a milestone, use `gh issue list --milestone <m>`.
- **Tier:** a label such as `tier:medium`, or a "Tier:" line in the body.
- **Progress, decisions, open questions, backlog items, cannot finish:** in the local copy, as
  `markdown.md` describes. A backlog item is an entry in its `Backlog` section linking the root
  issue.
- **Commit trailer:** `Refs: #<n>`. Not `Fixes`, which closes the issue on merge.

## Working alone (no router)

On a direct request from the operator, ask once whether they want a GitHub issue for the change. If
they do, create it with `gh issue create --body-file <path>`, and close it with a comment that names
the commit and the checks once the work is verified. If they don't, the commit message and the pull
request body are the work record: put the objective, the checks you ran, and any decisions there.

## Planning (seams-plan)

Ask the operator whether the units should exist on GitHub. If yes, create the root issue and one
sub-issue per leaf (`gh issue create`, then add each as a sub-issue of the root), with blockers
written in each body. If no, write the units into a local Markdown copy as `markdown.md` describes,
and link it from the root issue only if the operator agrees.

## Router only

- **Local copy:** write the root issue and its leaves into a local Markdown tracker (one file, or an
  index plus one file per unit) with tier, status, and branch lines per unit. It is the only status
  source for the run's units. Put it where the repository's instructions say. If they say nothing,
  ask the operator. With no guidance at all, keep it local and untracked, e.g., in an ignored
  scratch directory, and maintain it yourself. If the repository tracks it in git, it follows the
  "tracked in git" rules of `markdown.md`. Otherwise, workers list their updates in their reports
  and you apply them. Give workers its path in their prompts, and record the integration branch in
  it.
- **Posting to GitHub:** ask the operator once what, if anything, to post. Default to nothing. If
  they want updates, post only high-level status at major milestones, e.g., when the work starts,
  when it is ready for review, and the final outcome, using
  `gh issue comment <n> --body-file <path>`. Never post decision records, review findings, or worker
  notes unless the operator asks.
- **Dispatch and landed:** update `Status:` in the local copy. Assign, label, close, or check boxes
  on GitHub only if the operator said to.
- **Done:** when the operator asks you to finish the outcome, close the root issue with a comment
  that says what landed, the integration branch and head, and the checks that passed.
