# Tracker: kata

[kata](https://www.katatracker.com/) is a local-first issue tracker for coding agents and the people steering them.
Add `--agent` to every kata command.
Refs are `<project>#<id>`, or a short id inside the bound project.
When a command's flags are unclear, run its `--help` rather than guessing.
Never run `kata delete` or `kata purge` unless the operator asks for that exact action.

## Workspace

The repository root holds a committed `.kata.toml` with the workspace binding. `.kata.local.toml` holds machine settings and is ignored.
Never put credentials in either file or in an issue.
When you run kata from another directory, pass `--workspace /path/to/repository`.
If kata reports that the project is not registered, tell the operator and do not run `kata init` on your own.

## Find, read, and record

- **Find:** `kata search "<distinctive words>" --agent`, then `kata show <ref> --agent`.
  Reuse an open look-alike.
- **Read:** `kata show <ref> --agent`.
  Structure decides kind: an epic has children and no parent, a container has both, a leaf has no children.
  Only leaves are worked.
  Parent links group work and do not gate readiness. `--blocked-by` and `--blocks` edges do.
- **Record:** comments, `kata comment <ref> -m "..." --agent` (`--body-file <path>` for long ones).
  When the authoritative scope or acceptance changes, edit the body with `kata edit <ref> --body-stdin --agent` instead of leaving a contradicting comment.
- **Open question:** a comment headed `Question for the operator`, with the question, the options, your recommendation, and what is blocked.
  Then set `work.attention needs-human` and a `work.attention_msg` that starts with `question:`.
- **Backlog item:** search first and reuse a look-alike.
  Otherwise create a new top-level issue labeled `backlog`, linked `--related` to the epic, not parented under it.
  This is the only kind of issue an implementer creates.
- **Commit trailer:** `Refs: <project>#<ref>`.
- **Tier:** a leaf may record it as `agent.profile` metadata.
  Use what the project records.

## Working signals

Every issue being worked carries a signal.
It is claimed, `work.attention` says whether it is moving, and `work.attention_msg` says why in one line.
Only the issue's owner writes its `work.*` keys, and everyone else reads them.
Never write `work.*` on a closed issue.
Ownership is per actor, not per teammate: a router and its subagents share one actor, so kata does not stop one from writing another's issue.
Keeping to this split is on you.

- `work.attention ok`: unblocked and moving.
- `work.attention stuck`: blocked. `work.attention_msg` says on what.
- `work.attention needs-human`: waiting on a decision or review. `work.attention_msg` says which.

Set the pair with `kata meta set <ref> work.attention <value> --agent` and `kata meta set <ref> work.attention_msg "<one line>" --agent`.
Change them the moment the state changes.
Before you stop for any reason, the issue is closed or the pair describes the hand-off.

### Implementers and fixers (the leaf)

- **Start:** `kata claim <ref> --agent`, then set `work.attention ok`, a `work.attention_msg` that says what you are doing, and `work.branch <task branch>`.
- **Blocked or waiting:** set `stuck` or `needs-human` with the message, then stop and report as `blocked` or `escalated`.
- **Done:** leave `work.attention ok`, set `work.attention_msg "returned: committed and reviewed, ready to land"`, then release the claim with `kata unassign <ref> --agent`, in that order.
  You may not write `work.*` after releasing.
  Leave the issue open, because the router closes it after landing.
- **Cannot finish:** comment where you stopped, set the pair, and run `kata label add <ref> needs-review --comment "<what remains>" --agent`.
- **Do not:** close or reopen any issue, claim or start other units (`kata next`, `kata ready`), create issues other than backlog items, `kata notify`, schedule or park, or touch daemon or project setup.
  Report what you want done instead.

### Working alone (no router)

On a direct request from the operator, with no router involved, you own the whole item.

- Search first. If no item exists, create one with a compact body (objective, expected behavior, checks), claim it, and set `work.attention ok` with a one-line message.
- Record progress, decisions, and questions on it as above.
  If the operator is in the conversation, ask them directly and record the question and the answer on the item.
- When the work is verified, close it as the router would close a landed leaf (see "Closing"), with the commit and the commands you ran.

### Router (the root item, and units you take over)

You own the signal on the root item for the whole run, and on any leaf you work yourself or take back from a worker that is gone.

- **Start of run:** claim the root item and set `work.attention ok`, `work.attention_msg "<phase: dispatching | collecting | landing | final review>"`, and `work.branch <integration branch>`.
  If an earlier router left the signal, take it over with a comment and fix it.
- **Each phase change:** update `work.attention_msg`, e.g., `landing 3 of 7`.
- **Waiting on the operator:** set `needs-human` with the question in `work.attention_msg`, and put the full question in a comment.
- **Blocked**, e.g., a red baseline or a failure you cannot route: set `stuck` with the reason.
- **Back to work:** set `ok` again as soon as you resume.
- **End of session:** if the root is not closed, the pair must describe the hand-off for the next router.
  Never leave `ok` on a run that has stopped.
- **Workers' signals:** read them with `kata show <ref>`.
  Do not write a worker's `work.*` while it is live.
- **On collecting a unit:** `kata claim <ref> --agent`, set `work.attention ok` and `work.attention_msg "landing"`, then close it after the lander merges.
  A unit a worker returned unowned with `ok` is yours to take over this way.
- **Answering a question on a leaf:** if the worker that asked is gone, claim the leaf, comment the answer, set `work.attention ok` with a one-line message, then release it with `kata unassign <ref> --agent` before re-dispatching, so the next worker can claim it.
- **Identity:** give each subagent its own `KATA_TEAMMATE=<name>` and `KATA_INBOX_USER=<actor>/<name>`, keeping the router's actor.
- **Waiting on workers:** `kata wait <refs> --until attention --any --timeout <seconds> --agent` returns when a worker goes `needs-human` or `stuck`, or closes.

## Planning (seams-plan)

- **Create:** one call per issue, from a body file, with a stable idempotency key: `kata create "<title>" --body-file <path> --parent <ref> --blocked-by <ref> --priority <0-4> --label <label> --meta agent.profile=<tier> --idempotency-key <stable-key> --agent`.
  If create refuses a look-alike, read it and reuse it.
  Use `--force-new` only if the work really differs.
- Leave every created issue unclaimed, with no `work.*` keys.
  The worker's claim is the first signal.
- **Blockers are semantic:** `--blocked-by` only when the work needs the other issue's code or decision landed, with the reason in the body.
  Never block just to force an order.
  Priority (0 to 4, 0 highest) orders ready work.
- **Children never block their parent,** and no issue is blocked by its own container.
  A downstream issue that needs a whole unit may be blocked by the container.
- `kata ready` lists containers and epics too, since parent links do not block.
  Routers never work them, so do not add blockers to hide them.
- **Re-planning an existing issue:** claim it, set `work.attention ok` with a one-line message, and set `needs-human` while waiting for the operator to confirm the outline.
  At hand-off, release it with `kata unassign <ref> --agent` so the router can claim it.
- **Retire** issues a re-plan replaces with `kata close <ref> --superseded-by <ref> -m "<why>" --agent`, or `--duplicate-of`, or `--wontfix` for dropped work.
  Never delete.

## Closing (router only)

- **Landed leaf:** `kata close <ref> --done -m "<what landed and how it was verified, 40 or more characters>" --commit <sha> --agent`.
  Do not write `work.*` after the close.
- **Container:** close once all its children have closed.
  A parent cannot close with open children.
- **Root item:** close with the final outcome (what landed, what was deferred, the integration branch and head) only if the operator asked you to finish it.
  Otherwise leave it open with `needs-human` and `work.attention_msg "ready for merge decision"`.
- **Retire:** `--duplicate-of <ref>` or `--superseded-by <ref>` for duplicate or superseded work, and `--wontfix` for dropped work, each with a message of 20 or more characters (60 or more for `--wontfix`).
- **Integration branch:** record it on the root item in a comment and in `work.branch`.

## Moving to or from kata

Move active work, not history.
For each active item, carry over the objective, acceptance, scope, dependencies, decisions, evidence, and the next action.
Record the old and new references until links are updated, choose one cutover point, and then keep one active status source.
Keep old records as read-only history.
