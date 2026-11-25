---
title: Principles
description: Read when deciding between options, so decisions follow the operator's standing preferences.
---

# Principles

Principles record the operator's standing preferences for decisions along the path from an idea to implementation.
They cover choices such as how code is structured, which tools to use, how errors behave, when compatibility matters, and whether to prefer feature breadth or depth.
They let agents apply the operator's judgment when several options could work.
Each principle says what to prefer and how to apply it.
When a principle and an invariant disagree, the invariant wins.

## Account for the strengths and limits of both parties

Every convention in seams should fit how operators and agents actually work, and it should account for the mistakes each party tends to make.

| Party    | Strengths                                                       | Limits                                                                                                                                             |
| :------- | :-------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------- |
| Operator | Intent, judgment, and knowing what the project is for           | Can read only a limited amount in one sitting. Can't cheaply check a detailed plan. Learns most by using the software.                             |
| Agent    | Reads everything, writes detail quickly, and follows procedures | Can't tell which text the operator stands behind. Builds software from a half-formed plan as written. Keeps no memory between sessions or workers. |

When you add or change a convention, name the limit it accounts for.
If a convention helps one party by adding work for the other, look for a version that helps both.
For example, a read-back saves the operator from reading a detailed plan, and it costs the planner one short summary.

## Give each reader only what its task needs

Each reader should receive the smallest set of statements its role and task need.
An implementer doesn't need unselected ideas, and a reviewer shouldn't read the implementer's notes, because the notes would weaken an independent review.
Point to files instead of copying them, so each fact keeps one home.

## Settle consequential decisions before the work, and leave the rest

Decide product behavior, persistent data, public or shared interfaces, safety, and acceptance before an implementer starts.
Leave choices that are local and easy to reverse to the implementer.
A mechanical change or a well-understood bug fix needs a work record and verification, and it doesn't need a proposal.
Add detail when work is selected and when its risk calls for it, not before.

## Record how decisions are made, not every decision

Turn decisions into principles that can answer future questions.
A list of past decisions can't answer a new question, and it leaves the operator to turn the list into lessons by hand.
When a proposal rejects an option, record the reason as a principle if the reason applies beyond that one proposal.
The history of a single decision stays in its proposal.

## Learn from avoidable questions

Some questions have to reach the operator, because nobody can predict every problem before work starts.
For example, a change can break an unrelated test or expose an assumption elsewhere in the code.
Other questions are avoidable, because canon already held the answer or should have held it.
After each question reaches the operator, ask whether canon could have answered it.
If canon could have answered it, propose the principle, non-goal, or invariant that would have answered it.
If canon couldn't have answered it, keep the answer on the work item and don't turn a single case into a rule.

## Build in small parts that the operator can use early

Systems made of small, separate parts are cheaper to build and cheaper to change.
Land the smallest interface that lets the operator use the core behavior first, e.g., a command line tool before a web UI.
Later interfaces, e.g., a web UI or an MCP server, are then built on that core.
When work lands, give the operator something to try, e.g., "the command now does X, run it like this", and not only a summary to read.
Size each unit of work so one agent can finish it in one session.

## Prefer repair, replacement, or revert over added layers

When something breaks, fix it where it breaks, replace the part, or revert it.
Don't add a guard, timer, lock, queue, or flag around a problem unless a requirement names the need for it.
When the same kind of problem keeps coming back, change the design so the whole kind of problem goes away.

## Build on established ideas

seams applies older ideas to agent-assisted coding, and it avoids reinventing them.
Use plain words alongside the established term so readers can find the source.
Use the established term itself when it makes an agent more likely to behave the way the operator wants.
The [supporting evidence](../supporting-evidence.md) cites the source of each idea.
Avoid military doctrine as a source when a reasonable alternative exists.

## Keep tools focused on information

Tools help people and agents find, read, and maintain project information without taking over the project's way of working.
A tool may report the source and authority of a statement, but it may not raise the statement's authority or treat retrieval as verification.

Prefer small commands with explicit inputs and bounded output.
An agent chooses what to look up and which documents to read.
Tools handle deterministic checks and leave judgments about intent, meaning, and current behavior to the operator and agents.

## Maintain documentation with the work

Documentation helps fresh agents and the operator understand the current system at a level that code can't provide on its own.
Implementers update the user documentation and design overviews affected by their work, because a separate documentation step loses the context that produced the change.
A new feature can be documented after its behavior becomes stable, and an existing feature keeps its documentation current as it changes.

Give each fact one owning document and update that document instead of appending implementation history.
Agents verify documentation claims against code and tests.
The operator reads the documentation to judge whether the resulting system matches their intent.

## Leave work tracking open

seams defines what a work tracker has to hold, and it leaves the choice of tracker to the project.
A tracker only has to say where things live, e.g., how it marks an open question on a work item.
The seams skills decide when things happen and who does them.
