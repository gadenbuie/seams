# Tracker: markdown file or folder

Use this only when the operator chose Markdown files as the tracker.
The project's `AGENTS.md` names the file or folder, e.g., `.agents/work/`.
In a folder, name each record `{iso-date}_{kebab-cased-slug}.md`, one record per outcome, and keep an index with order, dependencies, and status.
Search the folder before creating a record.

- **Read:** a single file has one task per heading or checklist item; its body is the scope and acceptance criteria.
  A folder has an index (order, dependencies, status) and one file per task.
- **Tier, status, branch:** a line under the task heading, e.g. `Tier: medium · Status: in progress · Branch: task/3-parser`.
- **Progress and decisions:** a `Notes` list under your task (or in your task file), appended with dated entries.
  Record a decision as the question, the options, the choice and the reasoning.
- **Open question:** a note under your task headed `Question for the operator`, with the question, the options, your recommendation, and what is blocked.
  Set the task's status line to `Status: needs operator`.
- **Backlog item:** an entry in a `Backlog` section (single file) or a new file marked backlog (folder), linking the root.
- **Commit trailer:** `Refs: <file>#<task id or heading>`.
- **Cannot finish:** a note under your task saying where you stopped and what remains.

**If the tracker is tracked in git:** edit it in your worktree, only under your own task heading or in your own task file, and commit it with your work.
Notes reach the integration branch when the task lands.
The landing agent resolves conflicts in it; two tasks recording different decisions for the same thing is reported to the router, not resolved.

**If the tracker is outside git:** do not edit it.
List the exact updates (where, what text) in your report; the router applies them.

**Working alone (no router):** on a direct request, create a compact record (objective, expected behavior, checks) if none exists, keep its notes as above, and set `Status: done` with the commit and the commands you ran once the work is verified.

**Planning (seams-plan):** write one heading or file per unit, with a `Tier:`, `Status: ready`, `Parent:`, and `Blocked by: <unit> because <reason>` line, and the body from the plan templates.
In a folder, add each unit to the index in order.

Router only:

- **Dispatch / landed:** change the task's `Status:` line (and a folder's index) on the integration branch, or in place for a tracker outside git.
- **Workers' notes before landing:** read them in the worker's worktree.
- **Integration branch:** record it at the top of the file or index.
- **Done:** set `Status: done` on a unit after it lands, with the merge commit.
  Close the root the same way only when the operator asks you to finish the outcome.
  When the tracker is a plan document from `seams-plan`, also set its frontmatter `status` to `done` once every unit is done.
  Set it to `abandoned` instead when the operator dropped the work or the plan was replaced, and say why in the plan body.
