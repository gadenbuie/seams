# Proposal: seams as a unified framework for operators and coding agents

- **Status:** accepted on 2026-11-23
- **Created:** 2026-11-23
- **Source:** a planning conversation between the operator and Claude on 2026-11-23

## Summary

seams will become the single framework that combines the current seams docs with the operator's
planning and routing skills (work-shaping, orient-me, kata-plan, and route-work). The framework
covers the steps from an idea to work that agents can carry out without the operator. Work tracking
stays open, so a project can use kata or any other tracker.

The ideas below came out of one conversation. The operator agreed to most of them during the
conversation, and the proposal lists the rest as open questions. Nothing in this proposal authorizes
changes to the docs until the operator accepts it.

## Motivation

Coding agents and humans have different strengths and limits, and the current docs don't account for
both. A human can only read a limited amount of text in one sitting. An agent reads everything, but
it can't tell which sentences the operator considers important, so a small sentence in an old file
can end up guiding its work. Agents also build a half-formed plan exactly as written, and they keep
a ledger of every decision instead of turning decisions into reusable lessons. Over time, unaccepted
plans and notes pile up, and the operator spends a lot of effort pulling the project back toward
their intent.

Most harnesses and tools manage work items. Few of them help with the step before the work, where an
operator and an agent decide what the work is. seams should focus on that step.

## Guiding principle

The framework accounts for the strengths and limits of both parties. It meets humans where they are,
lets them work in the way they work best, and accounts for their mistakes and limits.

The same holds for agents. Coding agents complement human abilities in many ways. They are also
fairly simple systems working in well-defined environments, so their limits are predictable, and the
framework's conventions should account for those limits.

## Ideas agreed in discussion

### Kinds of seams

A seam is a boundary in the project's information. The framework uses these kinds of seams:

- **Authority seams** separate statements by type, i.e., what kind of claim a statement makes.
- **Work seams** separate statements by scope, i.e., which selected unit of work a statement belongs
  to.
- **Context seams** decide which typed and scoped statements a reader receives at a given boundary,
  e.g., when a new agent session starts. Each reader gets a projection of the project, meaning a
  subset of statements chosen for that reader's role and task.

Agents have no sense of time, so the framework talks about context boundaries rather than points in
time.

### Statement types, authority, and grounding

Each statement in a project has a type, e.g., aim, candidate, finding, principle, invariant, open
decision, selection, progress note, or observation of the code. Different readers should see
different types. For example, an implementer should not see unselected candidates, and a reviewer
should not see the implementer's progress notes.

Authority is the core term for the type of a statement, and it says what a statement allows or
requires. For example, a reviewer can reject a change that breaks an invariant, while a candidate
authorizes nothing. The framework keeps "authority" because the word gives agents a clear signal
about what a statement permits.

Grounding is a second property of a statement, and it says how much the code and tests back the
statement, i.e., planned, applied, or enforced. A principle that nobody has applied yet has less
grounding than a principle that the code and tests now follow. A statement with less grounding is
easier to set aside. Some principles are aspirational, i.e., how the operator wants to run the
project, and others are learned from the work.

### Where docs live

Canon lives in `docs/design/`, because canon is the shared record that humans read. Memory, e.g.,
plans, work records, and shaping plans, lives in `.agents/`, so the location of a file shows that it
is not canon. Agents read both folders. Shaping plans live in `.agents/proposals/` while they are
drafts, and their accepted parts move into `docs/design/`.

Canon uses these files:

- `docs/design/README.md` is a short index for operators. It lists the canon files and what each one
  holds, and it stays as thin as possible.
- `docs/design/vision.md` holds aims and direction.
- `docs/design/principles.md` holds decision principles.
- `docs/design/invariants.md` holds invariants. If the file grows too large, the invariants can move
  into a `docs/design/invariants/` folder with one file per area.

### Separate docs for operators and agents

The framework addresses operators and agents separately. Operators get short docs written at their
level of detail, and agents get the conventions they need to follow.

### Memory and canon

Canon is the set of statements the operator has accepted, i.e., vision, invariants, principles, and
current selections. Canon changes only when the operator accepts a change.

Memory is working material, e.g., planning notes, explored options, and drafts. Planning sessions
need memory so that later sessions can continue the work. Memory never becomes canon just because it
persists, because it is detailed, or because it is recent. Drift is a change to the project's
direction that the operator never accepted.

### The process from idea to finished work

The process moves through these stages:

1. The operator says "we should do X".
1. The operator and an agent plan what doing X means. The output is a shaping plan, and the operator
   accepts or rejects it. Acceptance is the selection of the work.
1. An agent shapes the selected work so that it can be implemented. Shaping splits the work into
   units and also adds specification.
1. A work tracker follows the work to completion, records what happened, and holds evidence that the
   work was done.

The goal is that the operator is not needed in stages 3 and 4. Stage 2 has to produce enough canon,
especially principles, that agents can settle most later questions on their own.

The process has no separate stage at the end for gathering feedback. In practice, the operator and
agents reconcile what they learn during implementation, while they deal with the problems that come
up. When a question from implementation is resolved, the answer is merged into canon in one of these
ways:

- If the answer stands on its own, it reaches the main branch right away, even if the branch that
  raised the question is not finished.
- If the answer is tied to the implementation, it reaches the main branch when the implementation is
  merged.

seams owns stages 1 to 3 and the rules for what passes between stages. Stage 4, work tracking, is
the one part the framework leaves open to the user. kata is one such tracker. It is the shared
working surface for agents, and it is not the long-term shared record between the operator and
agents.

### Tracker duties and skill invocation

A work tracker only has to say where things live, e.g., how the tracker marks an open question on a
work item. Skills decide when things happen and who does them. Model-invoked skills cover the limits
of agents, because an agent loads them when it meets a situation. Human-invoked skills cover the
intent of the operator, because the operator runs them when they know what they want to do.

- **Questions found during the work** use a model-invoked skill. An agent that meets a consequential
  question checks canon first. If canon doesn't answer the question, the agent records it on the
  work item as an open decision and stops the affected path. The planner or the router then picks up
  the question.
- **Reports of what became real** can come automatically when routed work finishes, or the operator
  can ask for one when they want to catch up.
- **Changes to canon** always need the operator's acceptance.

### Default execution skills

The general patterns in work-shaping belong in seams. seams also ships route-work as the default way
to run stages 3 and 4. A project can replace route-work with another way of running the work, as
long as it follows the rules for what passes between stages.

### Shaping plans

A shaping plan is a proposal, similar to a Python Enhancement Proposal (PEP). It has a status, and
every shaping plan ends as accepted, rejected, deferred, or withdrawn. When a plan is accepted, its
durable parts go into canon and are committed to the repository, and the plan itself becomes
history. The proposal you are reading is the first shaping plan.

### Planning in layers

Planning works best in several layers of increasing detail, a method known as stepwise refinement
(Wirth, 1971). A first plan written with the operator is not ready to hand to implementers, because
agents will build a half-formed plan exactly as written. Someone then breaks the plan down again,
either by writing out the details or by having an agent split it into units and route them. This
layer needs some flexibility, because some details only become clear once work starts.

The operator applies work-shaping both during planning and when the router dispatches work. The
framework accepts this overlap, because the right layer depends on the work.

### Translation between levels of detail

The planner works at the operator's level of detail and at the implementers' level, and it
translates in both directions.

- **Downward**, the planner turns accepted plans into units of work. A unit is ready when no
  consequential decision is left unbound, i.e., an implementer will not have to silently make a
  product, data, interface, safety, or acceptance decision.
- **Read-back** lets the operator check the downward translation. The planner writes, in the
  operator's terms, what the implementers will do, what they may not do, and when they will stop and
  ask. The operator checks the read-back instead of the detailed units. The read-back is an artifact
  on the plan, not a conversation between agents.
- **Upward**, the planner turns findings from the work into decisions the operator can make.
  Questions found during implementation are stored on the work item. The planner answers them from
  canon when it can and passes the rest to the operator.

### Escalation and learning

Some questions have to reach the operator, because nobody can predict every problem before
implementation starts. For example, a change can break an unrelated test or an assumption elsewhere
in the code. The framework should still keep avoidable escalations to a minimum.

After each escalation, the planner asks whether canon could have answered the question. If canon
could have answered it, the answer becomes a principle, a non-goal, or a constraint in canon. If
not, the answer stays as a finding on the work item.

### Principles over a ledger of decisions

The framework records how decisions are made, not every decision. Where possible, a rejected option
should become a reusable principle. Agents tend to keep a ledger of every decision, and a ledger
leaves the operator to turn decisions into lessons by hand.

For the same reason, the framework drops architecture decision records (ADRs). Useful reasons become
principles, and the history of a decision stays in its archived shaping plan.

### Decomposition and early feedback

Systems built from small separate parts are cheaper to build and cheaper to change. With AI help, an
operator can reach a finished product before they have had time to learn from building it, and
changing direction is harder once the code exists.

Work should therefore first land the smallest interface that lets the operator use the core
behavior, e.g., a command line tool before a web UI. Later interfaces, e.g., a web UI or an MCP
server, are then built on that core. After work lands, the operator should get something to try,
e.g., "the command now does X, run it like this", rather than only a summary to read.

Small agents are one case of this broader point about decomposition, and the framework keeps small,
bounded workers as a design goal.

### Invariants

The framework uses "invariant" for a commitment the operator has accepted, whether or not the code
follows it yet. A commitment that the code doesn't follow yet is marked as planned. Engineers
already know the word, and colleagues of the operator already use it for binding project rules.

One way to enforce invariants is to link each invariant to the code files it governs. Each governed
file starts with a header line that names its invariant, and a lint checks the links in both
directions. seams should consider this approach.

### Stateless coordination

Agents are stateless, so the framework must not depend on agents talking directly to each other.
Communication happens in the open, through artifacts any agent can read. For example, one agent can
answer a question left on a task, and a different agent can then use the answer. The research term
for coordination through traces left in a shared environment is stigmergy.

### Building on existing ideas

seams applies established ideas to agent-assisted coding and avoids partly reinventing them. Where a
concept already exists, the framework names it and cites its source in the supporting evidence. The
framework avoids military doctrine as a source when a reasonable alternative exists.

The framework prefers plain words and names the source term next to them, so readers can follow the
connection. It uses the source term itself when the term gives agents a stronger signal, i.e., when
the term makes an agent more likely to behave the way the operator wants.

## Set aside during discussion

- **Architecture decision records.** Principles and archived shaping plans replace them.
- **Military doctrine,** including commander's intent and the backbrief. The framework uses
  read-back from aviation and healthcare instead.
- **Time as a kind of seam.** Context seams replace it.
- **Treating every escalation as a planning failure.** Some escalations come from things nobody
  could know in advance.
- **Treating small agents as a secondary benefit.** The operator sees small agents as one case of
  decomposition, which is central to the framework.
- **An automated test of the framework.** Testing is not a priority for now.

## Open questions

None remain at acceptance.

## Changes queued by this proposal

None of these changes is selected yet, and the operator will select each one.

Supporting evidence additions, with each citation checked first:

- origin of "normative" and "informative" in standards writing (W3C, IETF, RFC 2119)
- proposal lifecycles such as PEPs and Rust RFCs
- stepwise refinement (Wirth)
- an expanded section on joint cognitive systems, including "Ten Challenges for Making Automation a
  Team Player" (Klein, Woods, and others, 2004)
- "Ironies of Automation" (Bainbridge, 1983) and situation awareness (Endsley)
- stigmergy and the stateless constraint in REST (Fielding)
- read-back and closed-loop communication
- design by contract (Meyer) as the source of "invariant"
- walking skeleton and ports and adapters (Cockburn)
- double-loop learning (Argyris and Schön)
- mentioned but not yet discussed: speech act theory, Fitts lists, ratio decidendi, SBAR, and drift
  into failure (Dekker)

Framework and constitution:

- add shaping plans, memory and canon, and the stages from idea to finished work
- replace decision records with principles
- adopt invariants, with a planned marker
- add read-back and the upward path for questions
- add the rule that the smallest usable interface lands first

Skills:

- bring work-shaping, orient-me, kata-plan, and route-work into seams
- keep kata as a separate tracker adapter

## Outcome

On 2026-11-23, the operator selected all of the queued changes by direct request and asked for the
docs and skills to be rewritten to implement this proposal. The implementation differs from the text
above in these ways, and the canon in `docs/design/` is the current statement of each:

- **Terms.** "Shaping plan" became "proposal". Stage 3 is called "plan", and stage 4 is called "do".
  The constitution and the framework guide were replaced by `docs/design/` and `docs/guide.md`.
- **Skills.** The skills are named `seams-adopt`, `seams-propose`, `seams-plan`, `seams-route`,
  `seams-reconcile`, `seams-work`, `seams-shape`, `seams-orient`, and `seams-track`. kata-plan
  became the tracker-neutral `seams-plan`, and the kata details moved to `seams-track`.
- **Homes.** Canon holds vision, principles, and invariants. Accepted proposals record selections,
  and work records live in the tracker, not in `.agents/`.
