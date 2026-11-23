---
name: seams-track
description: "Read and write the project's work tracker in a seams project: find or create a work item, record progress, decisions, and open questions, file backlog items, link commits, mark work stopped or done. Has notes for kata, GitHub issues, Markdown files, and any other tracker. Load whenever you need to touch the tracker and the project's AGENTS.md names which one it uses."
metadata:
  author: Garrick Aden-Buie (@gadenbuie)
  version: "2.0"
  invocation: agent
---

# Track work

The tracker is where agents coordinate. Every piece of work has one record in one tracker, and
agents leave everything the next agent needs on that record: progress, decisions, open questions,
and evidence. Agents never depend on talking to each other directly.

The tracker is memory, not canon. Nothing written on a work item changes the project's vision,
principles, or invariants. A work item authorizes changes within its own scope, and only when it
comes from an accepted proposal or a direct request from the operator.

## Pick the reference

Read the project's `AGENTS.md` (or equivalent) to find out which tracker it uses, then read only the
matching file:

| Tracker                             | Read                     |
| :---------------------------------- | :----------------------- |
| kata                                | `references/kata.md`     |
| GitHub issues                       | `references/github.md`   |
| Markdown file or folder             | `references/markdown.md` |
| Anything else, e.g., Linear or Jira | `references/other.md`    |

If the project names no tracker, ask the operator which one to use before you create anything.

## What every tracker must answer

Each reference answers these questions for its tracker. When you write a note for another tracker
(`other.md`), answer all of them.

- **Find:** how to search for existing work, so you reuse an item instead of creating a duplicate.
- **Read:** how to read an item, its parent, and its dependencies.
- **Record:** where progress and decisions go. Record a decision as the question, the options, the
  choice, and the reasoning, never as a pointer to a conversation.
- **Open question:** how to mark that an item has a question waiting for the operator, so the
  planner or router can find it.
- **Backlog item:** how to file a real problem that is outside the item's scope.
- **Commit trailer:** the line that links a commit to its item.
- **Stopped:** how to mark that work stopped before it was finished, and where the hand-off goes.
- **Done:** how an item closes, and what evidence the close records.
- **Planning:** how to create items with a parent, real dependencies, and a tier.
- **Working alone:** how an agent on a direct request, with no router, creates, updates, and closes
  its own item.

## Rules for every tracker

- Search before you create. Reuse an open item for the same outcome.
- Keep one status source. Do not mirror the item's status into a file or another tracker.
- Write so a fresh agent can continue from the item alone, without the conversation that created it.
- Before you stop for any reason, the item is either closed with evidence or carries a hand-off: the
  revision, what passed, what remains, and the next action.
- Close an item only on evidence, e.g., commands run, tests, a commit, or a review. A summary is not
  evidence.
- Never delete or purge tracker history unless the operator asks for that exact action.
