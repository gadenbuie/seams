---
name: seams-work
description: "Carry out one unit of work in a seams project: a direct request from the operator, a planned unit, a bug fix, or a mechanical change. Covers reading the right canon, staying in scope, what to do when you meet a question the work item leaves open, partial hand-offs, and closing on evidence. Load when you start, resume, or finish implementation work in a repository that has docs/design/ or an AGENTS.md that mentions seams. If a router gave you a role file, follow the role file and use this skill for questions."
metadata:
  author: Garrick Aden-Buie (@gadenbuie)
  version: "2.0"
  invocation: agent
---

# Do one unit of work

You carry out one unit of work. Its work item says what to do and what proves it is done. The
project's canon says what must hold while you do it. You do not decide what to build, and you do not
change canon.

## Before you start

1. Read the project's `AGENTS.md` to find where canon lives, which tracker it uses, and how to run
   checks. Use `seams-track` for the tracker.

1. Find the work item. A direct request from the operator authorizes the change, and it still needs
   a record. Search the tracker, reuse an open item for the same outcome, or create a compact one
   with the objective, the expected behavior, and the checks. With no router, follow the "Working
   alone" section of the tracker's reference. With a router, follow your role file instead.

1. Read only what governs the unit:

   - the work item, its parent, and anything it links;
   - the invariants and principles that apply (usually `docs/design/invariants.md` and
     `principles.md`), including invariants marked **Planned**, which bind new work;
   - the code and tests you will touch, and an exemplar if the item names one.

   Do not read draft proposals, plans, or notes unless the item links them. They authorize nothing,
   and they can pull you off scope.

1. Confirm the current revision and worktree state. Preserve changes that are not yours.

1. Run the targeted checks before changing anything, so you can tell your breakage from existing
   breakage. Record a failing baseline on the item.

## Check that the unit is ready

A unit is ready only when no consequential decision is left for you to make silently. A
consequential decision is one about product behavior, persistent data, public or shared interfaces,
safety, or acceptance. If the item leaves one open, follow the next section before you build the
part that depends on it.

Local choices that are easy to reverse are yours. Make them, and record any that a reviewer would
ask about.

## When you meet a question

1. **Check canon first.** Look in the invariants, the principles, and the accepted proposal the item
   links. If canon answers the question, follow it and cite the section on the item.

1. **Decide whether it is yours.** If the choice is local, reversible, and inside the item's scope,
   make it and record the question, the choice, and the reason on the item.

1. **Otherwise, record it and stop that path.** Write the question on the work item as the
   `seams-track` reference for the tracker says, with:

   - the question, in terms of what the user would see or what the code would guarantee;
   - the options you see, and what each would cost;
   - your recommendation and why;
   - what is blocked until it is answered.

   Then stop the part of the work that depends on the answer. Continue any part that doesn't depend
   on it. If nothing can continue, leave a hand-off and stop.

1. **If the operator is in the conversation,** e.g., on a direct request, ask them directly
   (`seams-orient`) instead of waiting for a planner or router, and record the question and the
   answer on the work item.

Never choose a consequential answer silently. Never wait on a reply from another agent. The answer
comes back through the work item, possibly to a different agent.

If an answer you receive could have come from canon, say so in your report, and name the principle
or invariant that would have answered it. Do not edit canon yourself.

## Do the work

- Make the smallest coherent change that meets the acceptance criteria. Keep schema and wire format
  changes whole, in one unit.
- Prefer repair, replacement, or revert over adding a guard, timer, lock, queue, or flag. If the
  change seems to need one, record why on the item and ask before building it.
- Commit as you go, in small commits with the tracker's commit trailer.
- Record discoveries, decisions, and real dependencies on the item as they happen. Do not put
  progress or status into canon or into a separate status file.
- A real problem outside the unit's scope becomes a backlog item. It does not block this unit.

## Finish

1. Run the targeted checks and the repository's full checks. Report any check you could not run.
1. Read your own diff against the acceptance criteria.
1. Get an independent review appropriate to the risk, if the project asks for one.
1. If the change affects what a user sees, record how to try it: a command, a URL, or a few steps.
1. If you are working alone, close the item with evidence through the tracker: what changed, the
   commands you ran, and the commit. With a router, leave closing to the router. A summary or a
   checked box is not evidence.
1. If the work changed something canon describes, e.g., a planned invariant is now enforced by a
   test, list it as a suggested canon change in your report. The operator accepts canon changes.

## Stop before finishing

If you stop before the unit is done, leave a hand-off on the item:

- the branch, base, and head, and the state of the worktree;
- what changed and which checks passed;
- what remains or is unverified;
- the commands you ran, and any check you could not run;
- open questions and blockers;
- the next concrete action.

Leave the item open. A partial summary is not a completion claim.

## Resume

1. Read the item and its last hand-off.
1. Inspect the branch, the diff, and the worktree state.
1. Re-run the baseline if the state differs from the hand-off.
1. Continue with the smallest next step. Do not restart from scratch when a recoverable state
   exists.
