# Invariants

An invariant is a rule that must hold.
Every project that uses seams keeps the invariants below.
A reviewer can reject a change, a plan, or a proposal that breaks one of them.

A project adds its own invariants in its own canon.
An invariant that the code doesn't follow yet is marked **Planned**.
A planned invariant binds new work, but it isn't yet true of the existing code.

## 1. Each statement lives in the home that matches its type

The type of a statement decides where it lives and what weight it carries in a given context.
Authority is relative to the question.
Canon carries the most weight for intent and constraints.
Accepted proposals and work items carry more weight for implementers working within the selected scope.
Code, tests, and runtime evidence carry the most weight for what exists.
Code and tests aren't statements in this sense, but the list includes them because they establish reality.

- Vision
  - **Location:** `docs/design/vision.md`
  - **Weight and context:** Strong for product intent.
    It defines the system's overall shape, which features fit, and criteria for judging their value and priority.
    It guides shaping and assessment.
- Principle
  - **Location:** `docs/design/principles.md`
  - **Weight and context:** Strong for standing decisions.
    It records the operator's preferences for structure, tools, errors, compatibility, feature breadth, and similar choices from idea through implementation.
- Invariant
  - **Location:** `docs/design/invariants.md` or `docs/design/invariants/`
  - **Weight and context:** Binding at every stage.
    A reviewer can reject any change that breaks it.
- Design overview
  - **Location:** `docs/design/overviews/`
  - **Weight and context:** Descriptive weight for the current design.
    It helps maintainers and reviewers understand the system, but doesn't override reality or canon.
- User documentation
  - **Location:** The project's documentation locations
  - **Weight and context:** Descriptive weight for expected use.
    It guides users and reviewers, but doesn't establish current behavior by itself or change design intent.
- Draft proposal
  - **Location:** `.agents/proposals/`
  - **Weight and context:** Exploratory weight only.
    It informs discussion and has no accepted weight until the operator accepts it.
- Accepted proposal
  - **Location:** `.agents/proposals/`
  - **Weight and context:** Strong for the work it selects.
    It tells implementers the accepted scope and direction, but can't change canon or bind unrelated work.
    Its durable parts move into canon.
- Work item
  - **Location:** The project's tracker
  - **Weight and context:** Strong for one unit's execution.
    It holds scope, progress, questions, decisions, and evidence within the accepted direction and canon.
- Plan, note, finding
  - **Location:** `.agents/` or the tracker
  - **Weight and context:** Working weight for linked work.
    It provides analysis and context, but can't independently change accepted direction or scope.
- Code, tests, runtime
  - **Location:** The repository and its running systems
  - **Weight and context:** Decisive for what exists.
    Code and runtime show actual behavior, and tests show checked expectations.
    None shows the operator's intent by itself.

An accepted proposal or work item can't override canon, and current code can't redefine intent.
There is no single ranking that answers every question.

Vision, principles, and invariants together are **canon**. `docs/design/index.md` is navigation, not canon.
When `invariants.md` becomes an index to `invariants/`, each invariant lives in exactly one topic file.
Design overviews, user documentation, and the other statements in the list are **memory**.
Code, tests, and runtime evidence are **reality**.

A project may use other file names, including `memory/` or `architecture/` instead of `overviews/`, if its agent entry point, e.g., `AGENTS.md`, says where each type lives.
When repo-level `docs/` is unavailable, the default design root is `.agents/design/`, with the same canon files and `overviews/` folder.
An existing home for the same kind of documentation wins over the default.

## 2. Only the operator changes canon

Agents propose changes to canon in a proposal or on a work item.
The operator accepts or rejects each change.
An agent never edits canon on its own judgment.

## 3. Memory never becomes canon just because it persists, is detailed, or is recent

A plan, note, finding, design overview, or user documentation has no more authority after many sessions than it had when it was written.
A proposal moves its durable parts into canon only when the operator accepts it.
A design overview can explain an accepted rule or decision, but the overview links to its canon or proposal instead of claiming authority for itself.

## 4. Only an accepted proposal or a direct request from the operator authorizes work

Ideas, candidates, draft proposals, roadmap items, and parent work items don't authorize the work they mention.
A direct request from the operator to make a change authorizes that change, and it still needs a work record.

## 5. Each piece of work has one record in one tracker

The record holds the objective, the acceptance criteria, the progress, the questions and their answers, and the evidence that the work was done.
Other documents link to the record, and they don't copy its status.

## 6. A unit of work is ready only when no consequential decision is left unbound

A consequential decision is one about product behavior, persistent data, public or shared interfaces, safety, or acceptance.
If an implementer would have to make one of these decisions silently, the unit goes back to planning.

## 7. An agent records an unanswered consequential question and stops

When an agent encounters a consequential question, it first checks canon.
If canon doesn't answer the question, the agent records it on the work item and stops the part of the work that depends on the answer.
The agent doesn't choose an answer silently.

## 8. Agents coordinate only through artifacts that any agent can read

Agents share work through the tracker, repository files, and commits.
They don't depend on talking to each other directly, and they don't depend on memory of an earlier session.
A decision made in a conversation is recorded in full on the work item or the proposal, not as a pointer to the conversation.

## 9. Only code, tests, and runtime evidence establish what exists

Tracker status, summaries, checklists, design overviews, and user documentation don't show that something works.
A claim that work is done cites the commands, tests, or checks that show it.

## 10. A unit of work maintains the documentation its change affects

Implementers identify the user documentation and design overviews affected by their unit and update them in the same body of work.
Documentation for a new feature can be drafted after its behavior becomes stable, but it is complete before the work closes.
A change to existing behavior or system structure updates the documentation that already describes it.

Agents verify changed documentation against code and tests and include it in review.
Lasting explanations and cautions move into the owning document, while task status, execution checklists, and implementation history stay in working records.
Only code, tests, and runtime evidence establish what exists.
