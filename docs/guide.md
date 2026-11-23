# How seams works

The guide is written for operators, the people who decide what to build and work with coding agents.
It explains how seams sorts a project's information, how work moves from an idea to finished code,
and what you see along the way. The rules themselves are in the [design docs](design/README.md), and
the procedures that agents follow are in the [skills](../skills/).

## The problem seams addresses

A project that uses coding agents collects ideas, plans, notes, rules, task records, and summaries.
An agent reads all of it, and it can't tell which text you still stand behind. A plan you dropped
last month can steer today's work as easily as a rule you rely on. You can't read all of it either,
so you often find the misreading late, when you review code that went in the wrong direction.

seams handles the problem with these conventions:

- It gives each statement a type and a home, so agents can tell what binds them.
- It moves your effort to the start of the work, where you and an agent agree on what to build.
- It hands work between agents only through files and the tracker, so no agent depends on another
  agent's memory.

## How seams sorts information

### Canon, memory, and reality

Every statement in a project belongs to one of these groups:

- **Canon** is what you have accepted. It holds the project's vision, principles, and invariants,
  usually in `docs/design/`. Only you accept changes to canon.
- **Memory** is working material, e.g., proposals, plans, work items, notes, and findings. Agents
  need memory to continue each other's work, but memory never becomes canon just because it
  persists, is detailed, or is recent.
- **Reality** is the code, the tests, and the running system. Only reality shows what exists.

Drift is a change in the project's direction that you never accepted. It happens when memory starts
to act like canon. For example, an agent reads a detailed draft plan and builds it, because nothing
told it the plan was never accepted. The [invariants](design/invariants.md) prevent drift by giving
each kind of statement one home and a clear limit on what it authorizes.

### Authority and grounding

Agents need to know these properties of each statement:

- **Authority** is what the statement allows or requires. An invariant lets a reviewer reject a
  change that breaks it. An accepted proposal authorizes the work it describes. A note or a draft
  authorizes nothing.
- **Grounding** is how much the code and tests back the statement. A statement can be planned
  (nothing follows it yet), applied (some decisions or code follow it), or enforced (a test or a
  lint checks it).

Authority comes from the statement's type and home. Grounding changes as the project changes. A
principle you wrote on the first day is an aspiration. After a dozen decisions have followed it, the
same principle is much harder to set aside. An invariant that the code doesn't follow yet is marked
**Planned**, so agents treat it as a rule for new work and not as a description of the current code.

One way to raise grounding is to link each invariant to the files it governs. Each governed file
starts with a line that names its invariant, and a lint checks the links in both directions. An
agent that opens the file then finds the rule at the moment it needs it.

### Kinds of seams

A seam is a boundary in the project's information, and seams takes its name from them. It uses these
kinds of seams:

- **Authority seams** separate statements by type, i.e., what kind of claim each one makes.
- **Work seams** separate statements by scope, i.e., which unit of work each one belongs to.
- **Context seams** decide which statements a reader receives when it starts work, e.g., when a new
  agent session starts or a reviewer receives a change.

At a context seam, each reader gets the statements its role and task need, and nothing else. An
implementer gets its work item, the canon that governs it, and the code. It doesn't get draft
proposals. A reviewer gets the work item, the canon, and the change. It doesn't get the
implementer's notes, so its review stays independent.

## From an idea to finished work

Work moves through the stages in the table below. Most of your effort goes into the first two
stages. In the last two, agents do the work, and you confirm the plan, answer the questions only you
can answer, and decide when to merge.

| Stage      | Who              | What happens                                                                                                                | You run                    |
| :--------- | :--------------- | :-------------------------------------------------------------------------------------------------------------------------- | :------------------------- |
| 1. Idea    | You              | You say "we should do X".                                                                                                   |                            |
| 2. Propose | You and an agent | You decide together what X means. You accept, reject, defer, or withdraw the proposal.                                      | `/seams-propose <idea>`    |
| 3. Plan    | An agent         | The planner turns the accepted proposal into units of work in the tracker. You confirm its outline and read-back.           | `/seams-plan <proposal>`   |
| 4. Do      | Agents           | A router sends each unit to an agent, gets it reviewed, and lands it on an integration branch. You decide when to merge it. | `/seams-route <root item>` |

A small, clear change doesn't need stages 2 and 3. A direct request from you, e.g., "rename this
function" or "fix this failing test", authorizes that change, and an agent handles it with
`seams-work`. The work still gets a record in the tracker, and the agent asks you directly if it
meets a question canon doesn't answer.

### Stage 2: Propose

A proposal is a short document in `.agents/proposals/` that you write with an agent. It records the
question, the options you looked at, what you agreed, what you set aside, and what is still open.
Every proposal ends with one of these statuses:

- **Accepted** means the work is selected. The durable parts, e.g., new principles or invariants,
  move into canon, and the proposal becomes history.
- **Rejected** means you decided against it. If the reason applies beyond this proposal, it becomes
  a principle.
- **Deferred** means not now. The proposal stays in memory and authorizes nothing.
- **Withdrawn** means the proposal is no longer relevant.

The later stages can run without you only if the proposal and canon answer the questions agents will
meet. Principles do most of this work, because a principle can answer a question nobody thought of
when it was written.

### Stage 3: Plan

The planner breaks the accepted proposal into units of work, in layers of increasing detail, a
method known as stepwise refinement. Each unit goes into the tracker with its scope, what it must
prove, and what it depends on. A unit is ready only when no consequential decision is left for the
implementer to make silently. A consequential decision is one about product behavior, persistent
data, public interfaces, safety, or acceptance.

You don't need to read the units. Before creating them, the planner shows you a short outline and a
**read-back**. A read-back says, in your terms, what the implementers will build, what they may not
do, and when they will stop and ask. You confirm the read-back, or correct it, before any unit is
created. The practice of restating an instruction before acting on it is called read-back, or
closed-loop communication, in aviation and team research.

The plan sequences the work so that you can use something early. The first unit to land is usually
the smallest interface that exercises the core behavior, e.g., a command line tool, and later units
build a web UI or other interfaces on top of it. If you want to change direction after trying it,
little has been built yet.

### Stage 4: Do

A router sends each ready unit to an agent of a suitable size, each in its own branch and worktree.
Each unit is reviewed independently and landed one at a time. The tracker holds the state of every
unit, so a fresh router can resume a run that another router started.

When work lands, you get something to try, e.g., "the command now does X, run it like this", and not
only a summary to read.

## Questions during the work

An agent that meets a consequential question first checks canon. If canon answers it, the agent
follows canon. If not, the agent records the question on the work item and stops the affected part
of the work. The planner or the router picks the question up and either answers it from canon or
passes it to you as a decision you can make, with the options and a recommendation.

Some questions have to reach you, because nobody can foresee every problem. For example, a change
can break an unrelated test, or the code can turn out to rely on an assumption nobody wrote down.
Other questions are avoidable, because canon held the answer or should have held it. After you
answer a question, the agent asks whether canon could have answered it. If it could have, the agent
proposes the principle, non-goal, or invariant that would have answered it. The aim is that fewer
avoidable questions reach you over time.

Every answer is recorded on the work item. A one-off answer stays there. An answer that changes
canon becomes a proposed canon change, and after you accept it, it reaches canon in one of these
ways:

- If the change stands on its own, it is merged right away, even if the work that raised it is still
  in progress.
- If the change is tied to the implementation, it is merged when that implementation is merged.

## How agents coordinate

Agents don't remember earlier sessions, and they don't talk to each other directly in seams. They
coordinate through the traces they leave in shared places: the tracker, the repository, and commits.
One agent can leave a question on a work item, a second agent can answer it, and a third agent can
use the answer. The research term for this kind of coordination is stigmergy.

The tracker is the agents' working surface. It isn't the long-term record you share with agents,
which is canon. Any tracker works if agents can read and write it from the command line. The
`seams-track` skill has notes for kata, GitHub issues, Markdown files, and other trackers.

## Setting up seams in a project

The `seams-adopt` skill sets up a new project or moves an existing one to seams. A project that uses
seams usually has this layout:

```text
AGENTS.md            where things live, which tracker to use, how to run checks
docs/design/         canon: README.md, vision.md, principles.md, invariants.md
.agents/proposals/   proposals
.agents/plans/       working notes and plans, e.g., notes for a proposal in progress
<tracker>            work items, e.g., kata, GitHub issues, or Markdown files
```

Start small. A new project needs a short `AGENTS.md`, a few lines of vision, and a tracker. Add
principles and invariants when real decisions produce them.

### The skills

Install the skills together, because some of them refer to each other's files.

You run these skills yourself:

| Skill             | Use it to                                                                            |
| :---------------- | :----------------------------------------------------------------------------------- |
| `seams-adopt`     | Set up seams in a project, or move an existing project to it.                        |
| `seams-propose`   | Write a proposal with an agent, and move its accepted parts into canon.              |
| `seams-plan`      | Turn an accepted proposal into units of work in the tracker, with a read-back.       |
| `seams-route`     | Send planned units to agents, review them, and land them.                            |
| `seams-reconcile` | Find drift between canon, memory, and code, and turn past decisions into principles. |

Agents load these skills on their own when a situation calls for them:

| Skill          | Agents use it to                                                       |
| :------------- | :--------------------------------------------------------------------- |
| `seams-work`   | Carry out one unit of work and record questions on the work item.      |
| `seams-shape`  | Split, sequence, and hand out work.                                    |
| `seams-orient` | Explain something to you or ask you a question you can answer quickly. |
| `seams-track`  | Read and write the project's tracker.                                  |

## Where the ideas come from

Each idea in seams comes from an older field, e.g., software architecture, human factors,
organization theory, or lean product development. The [supporting evidence](supporting-evidence.md)
names the source of each idea and says where the comparison to agent-assisted coding stops.
