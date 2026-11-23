# Invariants

An invariant is a rule that must hold. Every project that uses seams keeps the invariants below. A
reviewer can reject a change, a plan, or a proposal that breaks one of them.

A project adds its own invariants in its own canon. An invariant that the code doesn't follow yet is
marked **Planned**. A planned invariant binds new work, but it isn't yet true of the existing code.

## 1. Each statement lives in the home that matches its type

The type of a statement decides where it lives and what it authorizes. Code and tests aren't
statements in this sense, but the table includes them because they are the only evidence of what
exists.

| Type                 | Home                                   | What it authorizes                                                               |
| :------------------- | :------------------------------------- | :------------------------------------------------------------------------------- |
| Vision               | `docs/design/vision.md`                | Nothing directly. It guides which work to propose.                               |
| Principle            | `docs/design/principles.md`            | Choosing between options that would all work.                                    |
| Invariant            | `docs/design/invariants.md`            | Rejecting any change that breaks it.                                             |
| Draft proposal       | `.agents/proposals/`                   | Nothing. It informs discussion.                                                  |
| Accepted proposal    | `.agents/proposals/`                   | The work it describes. Its durable parts move into canon.                        |
| Work item            | The project's tracker                  | Changes within its scope. It holds progress, questions, decisions, and evidence. |
| Plan, note, finding  | `.agents/` or the tracker              | Nothing. It informs the work it is linked to.                                    |
| Code, tests, runtime | The repository and its running systems | Nothing. They show what exists.                                                  |

Vision, principles, and invariants together are **canon**. Everything else in the table except code,
tests, and runtime evidence is **memory**. A project may use other file names if its agent entry
point, e.g., `AGENTS.md`, says where each type lives.

## 2. Only the operator changes canon

Agents propose changes to canon in a proposal or on a work item. The operator accepts or rejects
each change. An agent never edits canon on its own judgment.

## 3. Memory never becomes canon just because it persists, is detailed, or is recent

A plan, note, or finding has no more authority after many sessions than it had when it was written.
A proposal moves its durable parts into canon only when the operator accepts it.

## 4. Only an accepted proposal or a direct request from the operator authorizes work

Ideas, candidates, draft proposals, roadmap items, and parent work items don't authorize the work
they mention. A direct request from the operator to make a change authorizes that change, and it
still needs a work record.

## 5. Each piece of work has one record in one tracker

The record holds the objective, the acceptance criteria, the progress, the questions and their
answers, and the evidence that the work was done. Other documents link to the record, and they don't
copy its status.

## 6. A unit of work is ready only when no consequential decision is left unbound

A consequential decision is one about product behavior, persistent data, public or shared
interfaces, safety, or acceptance. If an implementer would have to make one of these decisions
silently, the unit goes back to planning.

## 7. An agent records an unanswered consequential question and stops

An agent that meets a consequential question first checks canon. If canon doesn't answer the
question, the agent records it on the work item and stops the part of the work that depends on the
answer. The agent doesn't choose an answer silently.

## 8. Agents coordinate only through artifacts that any agent can read

Agents share work through the tracker, repository files, and commits. They don't depend on talking
to each other directly, and they don't depend on memory of an earlier session. A decision made in a
conversation is recorded in full on the work item or the proposal, not as a pointer to the
conversation.

## 9. Only code, tests, and runtime evidence establish what exists

Tracker status, summaries, checklists, and design documents don't show that something works. A claim
that work is done cites the commands, tests, or checks that show it.
