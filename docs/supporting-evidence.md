# Supporting evidence

seams applies older ideas to agent-assisted coding. Each idea has a named source, a statement of
what seams takes from it, and a description of where the comparison stops. The sources do not show
that seams has been tested as a whole method.

## How to read the sources

The sources come from fields that answer different questions. A study of human memory doesn't show
how a language model behaves, and a vendor's report about one harness doesn't establish a general
method. Each section therefore says what seams takes from a source and where the comparison to
agent-assisted coding stops.

Each source is one of these kinds:

- **Research** is a paper, standard, or book that develops a theory or reports a study.
- **Established practice** is a documented method with wide use, which may not have been compared
  with alternatives for this use.
- **Practitioner report** is a case study, an engineering post, or a discussion. It is useful for
  finding mechanisms and failure modes, and weak evidence for general claims.
- **Synthesis** is an inference seams makes from the sources above. Treat it as a hypothesis until a
  project observes its effects.

## 1. Sorting statements by type

seams gives every statement a type, a home, and a context where its weight applies. The idea comes
from standards writing and from architecture description. A separate invariant says which statements
authorize work.

**Normative and informative text.** The W3C
[QA Framework: Specification Guidelines](https://www.w3.org/TR/qaframe-spec/) (2005) asks
specification writers to make clear which content is normative, i.e., binding, and which is
informative, i.e., explanatory, e.g., by labeling each section. It also recommends the requirement
keywords from [RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) (MUST, SHOULD, MAY), and
[RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) clarifies that the keywords carry that meaning
only in capitals. seams takes the split between binding and explanatory text, and it ties the split
to a statement's home, so an agent can tell a statement's type from where it lives. The comparison
stops at enforcement. A standards body has editors and a formal process, and seams has an operator
who accepts changes.

**Views for different readers.** The
[ISO/IEC/IEEE 42010 conceptual model](http://www.iso-architecture.org/iso-42010/cm/index.html)
separates stakeholders, their concerns, and the views that address those concerns. No single
document has to serve every reader. seams takes this idea for its context seams, where each reader
receives the statements its role needs. seams doesn't aim for conformance with the standard.

**Documents shaped by reader need.** [Diátaxis](https://diataxis.fr/start-here/) separates
tutorials, how-to guides, reference, and explanation, because each serves a different reader need.
seams uses a similar split. The guide explains, canon is reference, and the skills are procedures
for agents. The seams types are about authority, not genre, so a canon file can contain a sentence
of explanation.

**Coverage checklists.** [arc42](https://arc42.org/overview/) lists architecture concerns that are
easy to forget, e.g., system context, building blocks, runtime behavior, cross-cutting concepts,
deployment, and quality requirements. It asks writers to fill only the sections that help their
readers. seams uses these content ideas in design overviews, without adopting arc42's formal section
names. Binding rules belong in canon or tests. Making all twelve sections mandatory would add the
kind of empty structure seams tries to avoid.

## 2. Canon, memory, and drift

seams separates canon, which the operator has accepted, from memory, which includes working records
and maintained documentation. The split comes from the study of how project knowledge decays.

**Knowledge is easier to use than to maintain.** A
[systematic review by Weinreich and Groher](https://se.jku.at/software-architecture-knowledge-management-approaches-and-their-support-for-knowledge-management-activities-a-systematic-literature-review/)
(2016) found 56 approaches to architecture knowledge in 115 studies. Using captured knowledge was
better supported than capturing, sharing, reusing, and above all maintaining it. seams therefore
gives each fact one owning document, updates documentation with the work, and provides a reconcile
step. Memory has no single home or owner, and keeping it clear takes deliberate effort. The source
supports the maintenance problem, not the claim that this particular procedure solves it.

**Decision records.** Michael Nygard's
[Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
(2011) popularized the architecture decision record (ADR), a short record of one decision with its
context and consequences. The [ADR project](https://adr.github.io/) collects the practice. An
[action research study by Ahmeti and colleagues](https://doi.org/10.1007/978-3-031-70797-1_22)
(2024) found that ADRs helped with documentation culture, knowledge transfer, and prioritization,
and that where the records were stored strongly affected how useful people found them. seams keeps
the goal of recording reasons and drops the separate record. Reasons that apply widely become
principles, and the history of a single decision stays in its proposal. Someone has to turn a
growing list of decisions into lessons, and in an agent project that person is the operator.
Dropping the separate record is a synthesis, and no source above tested it.

**Writing the documents after the fact.** Parnas and Clements, in
[A Rational Design Process: How and Why to Fake It](https://users.ece.utexas.edu/~perry/education/SE-Intro/fakeit.pdf)
(1986), argue that real design never follows a clean sequence, and that a project should still
produce the documents a clean process would have produced. seams applies this to canon and design
overviews. Canon describes the accepted present, and an overview describes the current system. The
path that led there stays in proposals and work items. Especially in greenfield work, lasting
explanations move from proposals to plans to overviews as agents implement the design. This flow
doesn't permit claims that something exists when it doesn't.

**Current-state overviews.** Alex Kladov's
[ARCHITECTURE.md essay](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html) (2021) describes
a short, maintained architecture overview with a codemap, module relationships, boundaries, and
cross-cutting concerns. seams takes the current-state overview and navigation ideas. It doesn't
adopt the essay's suggestion to revisit the document only a few times a year, because seams asks
agents to update affected documentation with each unit of work. This is a practitioner report, not
evidence that either cadence works better for coding agents.

**Drift.** Sidney Dekker's
[Drift into Failure](https://www.routledge.com/Drift-into-Failure/Dekker/p/book/9781409422211)
(2011) describes how complex systems move toward failure through many small steps, each of which
looked reasonable at the time. seams uses "drift" for a narrower thing: a change in a project's
direction that the operator never accepted. Dekker writes about safety in organizations, and his
analysis doesn't transfer directly to a code repository.

## 3. Proposals and selection

In seams, the operator selects work by accepting a proposal. Ideas, drafts, and plans authorize
nothing.

**Proposal lifecycles.** Python's [PEP 1](https://peps.python.org/pep-0001/) defines a proposal
document with a status, including Draft, Accepted, Rejected, Deferred, Withdrawn, and Final. The
[Rust RFC process](https://github.com/rust-lang/rfcs) ends each discussion with a decision to merge,
close, or postpone, and it notes that an accepted RFC doesn't guarantee that the feature ships.
seams takes the proposal document, the explicit status, and the rule that rejected proposals stay on
record with their reasons. Both processes serve large communities with many reviewers, and seams
usually has one operator, so seams keeps the statuses and leaves out the review machinery.

**Shaping.** Basecamp's [Shape Up](https://basecamp.com/shapeup/1.2-chapter-03) shapes work by
setting an appetite, narrowing the problem, and drawing boundaries before anyone builds it, and it
warns against broad requests that hide unsolved problems. seams takes the habit of settling the
boundaries and the risky parts before work starts. It doesn't adopt Shape Up's fixed cycles or its
betting process.

**Keeping options open.** Ward, Liker, Cristiano, and Sobek's
[The Second Toyota Paradox](https://sloanreview.mit.edu/article/the-second-toyota-paradox-how-delaying-decisions-can-make-better-cars-faster/)
(1995) describes set-based engineering, where teams explore several designs and narrow them as
evidence arrives. Mary Poppendieck's
[Lean Development and the Predictability Paradox](http://web.archive.org/web/20241127193744/http://www.poppendieck.com/pdfs/Predictability_Paradox.pdf)
(2003) describes the last responsible moment, i.e., the point after which not deciding removes an
important option. seams takes the idea that detail should follow selection and risk. Delay isn't a
virtue in itself, and when a decision is consequential for the work at hand, seams settles it before
the work starts.

**Progressive elaboration.** Rolling-wave planning, also called progressive elaboration, is an
established project management practice that details near-term work and keeps later work coarse
until more is known. seams plans later waves as a title and a planning unit for the same reason.

**Discussing a design space.** MacLean, Young, Bellotti, and Moran's
[Questions, Options, and Criteria](https://doi.org/10.1207/s15327051hci0603%264_2) (1991) records
design reasoning as questions, the options for each, and the criteria for choosing. A proposal's
sections for agreed points, set-aside options, and open questions follow the same pattern. A full
argument map is too heavy for most proposals.

## 4. Planning in layers and translation

The planner in seams turns an accepted proposal into units of work, and it writes a read-back so the
operator can check the plan without reading it.

**Stepwise refinement.** Niklaus Wirth's
[Program Development by Stepwise Refinement](https://doi.org/10.1145/362575.362577) (1971) develops
a program by refining a coarse description in small steps, each of which keeps the program correct.
seams applies the idea to plans. Each layer adds detail, and each layer must keep the decisions the
operator made. Wirth wrote about programs, and the comparison to planning with agents is a
synthesis.

**Invariants.** Bertrand Meyer's [Applying "Design by Contract"](https://doi.org/10.1109/2.161279)
(1992) describes software elements with preconditions, postconditions, and class invariants, i.e.,
conditions that must always hold. seams uses "invariant" for a project rule that a reviewer can
reject a change for breaking. Engineers know the word, so it gives agents a strong signal. seams
invariants are usually checked by review and lints, not by the runtime checks Meyer describes.

**Read-back.** The FAA's
[Aeronautical Information Manual](https://www.faa.gov/air_traffic/publications/atpubs/aim_html/chap4_section_4.html)
asks pilots to read back key parts of a clearance, e.g., altitudes and runway assignments, so pilots
and controllers can catch a misunderstanding before anyone acts on it. Salas, Sims, and Burke's
[Is there a "Big Five" in Teamwork?](https://doi.org/10.1177/1046496405277134) (2005) names
closed-loop communication as one of the mechanisms that coordinates teams. A seams read-back is the
planner restating the plan in the operator's terms before work starts. In aviation, the read-back is
spoken and immediate. In seams, it is a written artifact on the plan, because agents keep no memory
between sessions.

**Specifications before code.** Ashif Anwar's
[Specs, Not Prompts](https://www.computer.org/publications/tech-news/research/specification-driven-agentic-software)
(IEEE Computer Society Tech News, 2026) names context starvation and silent architectural drift as
failure modes of agent coding, and argues for human approval of a specification before code is
generated. Anwar's article is a practitioner report. seams agrees that consequential decisions come
first, and it adds that only the decisions the current work needs should be settled.

## 5. Decomposition and early use

seams prefers small, separate parts and lands the smallest usable interface first.

**Information hiding.** David Parnas's
[On the Criteria to Be Used in Decomposing Systems into Modules](https://www.cs.lafayette.edu/~gexia/cs301/resources/parnas.html)
(1972) argues for dividing a system by the design decisions most likely to change, each hidden
behind a module's interface. seams uses this to justify boundaries by ownership and change, not by
folder layout. It doesn't mean every possible future feature deserves a module.

**Near-decomposability.** Herbert Simon's
[The Architecture of Complexity](https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/ArchitectureOfComplexity.HSimon1962.pdf)
(1962) describes nearly decomposable systems, whose parts act almost independently in the short run.
His work on bounded rationality, summarized in the
[Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/archives/spr2026/entries/bounded-rationality/),
treats decisions as searches for an option that is good enough under limited information. seams
takes the idea that a worker needs a bounded problem with clear interfaces, not the whole project.
Simon's claims are about organizations and complex systems, and they aren't measurements of model
context windows.

**Ports and adapters.** Alistair Cockburn's
[Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture) (2005) separates an
application's core from the interfaces that drive it, so users, tests, and scripts can drive it
equally. Cockburn's book *Crystal Clear* (2004) describes a walking skeleton, i.e., a tiny
implementation that connects the main parts of a system end to end. Eric Raymond's
[Rule of Separation](http://www.catb.org/esr/writings/taoup/html/ch01s06.html) in *The Art of Unix
Programming* (2003) tells Unix tool writers to separate interfaces from engines. seams combines
these into a sequencing rule. Land a small core interface the operator can use, e.g., a command line
tool, and build other interfaces on top of it later. Landing the core first is a synthesis, and the
sources above describe structure more than order.

**Quality scenarios.** The SEI's
[Architecture Tradeoff Analysis Method](https://sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/)
turns quality goals into concrete scenarios and looks for tradeoffs between them. seams borrows the
habit of writing a change case as a scenario, e.g., "a new provider can be added without changing
the public read interface". It doesn't adopt the full facilitated method.

## 6. Coordination through artifacts

seams agents coordinate only through files, commits, and the tracker.

**Uncertainty and coordination.** Jay Galbraith's
[Organization Design: An Information Processing View](https://doi.org/10.1287/inte.4.3.28) (1974)
argues that uncertain tasks need more information processing, and that predictable work can be
handled by rules while exceptions go up a hierarchy. seams keeps canon short and gives exceptions a
defined path. An agent records a question on the work item, and the planner or the operator answers
it.

**Dependencies.** Malone and Crowston's
[The Interdisciplinary Study of Coordination](https://crowston.syr.edu/sites/default/files/acmcs94.pdf)
(1994) defines coordination as managing dependencies, e.g., shared resources and producer and
consumer relationships. seams plans block a unit only on a real dependency, and they record the
reason. Two units that write the same file share a resource, even when their descriptions look
independent.

**Communication and structure.** Mel Conway's
[How Do Committees Invent?](https://www.melconway.com/Home/Committees_Paper.html) (1968) argues that
a system's structure copies the communication structure of the organization that built it. In seams,
the communication structure is the flow of artifacts between agents and the operator. If every agent
has to ask the operator for missing context, the apparent independence of the units isn't real.

**Stigmergy.** Pierre-Paul Grassé introduced the term
[stigmergy](https://doi.org/10.1007/BF02223791) (1959) to explain how termites coordinate nest
building through the structure they leave behind. Theraulaz and Bonabeau's
[A Brief History of Stigmergy](https://doi.org/10.1162/106454699568700) (1999) and Heylighen's
[Stigmergy as a universal coordination mechanism](https://doi.org/10.1016/j.cogsys.2015.12.002)
(2016) describe it more generally as indirect coordination, where the trace one action leaves
prompts the next action. seams agents work this way. One agent leaves a question on a work item, a
second answers it, and a third uses the answer. Insects follow simple fixed rules, and agents read
and write text, so the comparison is about the mechanism of coordination, not about the agents.

**Stateless requests.** Roy Fielding's
[dissertation](https://ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm) (2000) defines
REST's stateless constraint. Under this constraint, each request carries everything needed to
understand it, and the server keeps no session state between requests. Fielding names the costs,
i.e., repeated data and less server control. seams asks the same of a work item. A fresh agent must
be able to act on it without the conversation that created it, and the cost is that work items carry
more text.

**Distributed cognition and boundary objects.** Edwin Hutchins's
[Distributed Cognition](https://arl.human.cornell.edu/linked%20docs/Hutchins_Distributed_Cognition.pdf)
(2000) describes thinking that is spread across people, tools, and time. Star and Griesemer's
[Institutional Ecology, "Translations" and Boundary Objects](https://ics.uci.edu/~corps/phaseii/StarGriesemer-BoundaryObjects-SSS.pdf)
(1989) describes artifacts that different groups use for different purposes while keeping a common
identity. In seams, the repository and the tracker hold the state of the work, and a work item
serves the operator, the planner, the implementer, and the reviewer, each for a different purpose.
Hutchins studied people, and a model's context window isn't human working memory.

## 7. Operators and agents

seams tries to account for the strengths and limits of both the operator and the agents. Human
factors research has studied this question for decades.

**Function allocation.** Paul Fitts's 1951 report for the National Research Council listed what
humans do better than machines and what machines do better than humans. de Winter and Dodou's
[Why the Fitts list has persisted](https://doi.org/10.1007/s10111-011-0188-1) (2014) reviews the
criticism of such lists and argues that they remain a useful approximation. The principles in seams
start from a similar table for operators and agents. Later work in the field warns against assigning
each task to one party, and seams keeps the operator involved where judgment matters.

**Joint cognitive systems.** Hollnagel and Woods's
[Joint Cognitive Systems](https://www.routledge.com/Joint-Cognitive-Systems-Foundations-of-Cognitive-Systems-Engineering/Hollnagel-Woods/p/book/9780849328213)
(2005) treats people and machines working together as one system, and it judges the system, not the
machine alone. The resilience engineering tradition, e.g.,
[Resilience Engineering: Concepts and Precepts](https://www.routledge.com/Resilience-Engineering-Concepts-and-Precepts/Hollnagel-Woods-Leveson/p/book/9780754649045),
studies how such systems cope with surprises. Klein, Woods, Bradshaw, Hoffman, and Feltovich's
[Ten Challenges for Making Automation a "Team Player"](https://doi.org/10.1109/MIS.2004.74) (2004)
argues that people and automation working together need to be predictable to each other, need to be
able to direct each other, and need to keep common ground. In seams, canon is the common ground, and
the read-back makes the agents' plan predictable to the operator. Questions on work items let the
operator direct the work. seams expects imperfect work from agents, so it relies on small units,
review, and revert, not on agents being right.

**The ironies of automation.** Lisanne Bainbridge's
[Ironies of Automation](<https://doi.org/10.1016/0005-1098(83)90046-8>) (1983) observes that
automation leaves operators the tasks that designers couldn't automate, plus monitoring, while the
skills and knowledge the operators need decay from lack of practice. Mica Endsley's
[theory of situation awareness](https://doi.org/10.1518/001872095779049543) (1995) and Endsley and
Kiris's [study of the out-of-the-loop problem](https://doi.org/10.1518/001872095779064555) (1995)
show that operators of automation can lose the awareness they need to take over. seams faces the
same risk when agents build without the operator. Its responses are to keep the operator's effort on
proposals and canon, and to give the operator something to try as each piece lands. Bainbridge's and
Endsley's studies concern process control and aviation, and seams hasn't measured whether its
responses work.

**Cognitive load and recognition.** John Sweller's
[Cognitive Load During Problem Solving](https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1202_4)
(1988) shows how demanding presentation can use up the capacity needed for learning. The Nielsen
Norman Group's [usability heuristics](https://www.nngroup.com/articles/ten-Usability-heuristics/)
include recognition rather than recall. seams keeps the operator's documents short, and it routes
agents to the file they need instead of expecting them to remember where it is. A model is not a
human reader, so the transfer is about reducing needless reading, not about memory.

## 8. Learning from questions

seams asks, after each question reaches the operator, whether canon could have answered it.

**Double-loop learning.** Chris Argyris's
[Double Loop Learning in Organizations](https://hbr.org/1977/09/double-loop-learning-in-organizations)
(1977), and his book with Donald Schön, *Organizational Learning* (1978), distinguish fixing an
error within the existing rules from changing the rules that produced the error. In seams, answering
a question on a work item is the first kind, and adding a principle so the question doesn't come
back is the second kind. Argyris studied people in organizations, and seams applies the distinction
to a repository's canon.

## 9. Review and feedback

**Inspection.** Michael Fagan's
[Design and Code Inspections to Reduce Errors in Program Development](https://dl.acm.org/doi/10.1147/sj.153.0182)
(1976) reported gains from inspections with defined roles, criteria, and follow-up. Badampudi,
Unterkalmsteiner, and Britto's
[survey of modern code review](https://dl.acm.org/doi/full/10.1145/3585004) (2023) covers more
recent research. seams separates finding, fixing, and follow-up in the same way, and it reviews each
unit independently. Inspection and review studies don't show that a model reviewer finds what a
trained human team finds.

**Small batches.** The
[2017 State of DevOps Report](https://dora.dev/research/2017/2017-state-of-devops-report.pdf)
reports associations between delivery performance and practices such as test automation, continuous
integration, short-lived branches, and small batches. seams prefers small units and fast checks. The
report shows associations in its surveyed population, not universal causes, and seams sizes units by
coherence and risk, not by a fixed limit.

**Work-shaping patterns.** The patterns in the `seams-shape` skill come from established practice in
manufacturing, scheduling, and distributed systems. They include first-article inspection, the
critical path method, the theory of constraints, Little's law, work-in-progress limits, weighted
shortest job first, idempotent steps, and checkpoints. They were built for machines and people, and
using them to schedule agents is a synthesis.

## 10. Practice with coding agents

Evidence about coding agents is new, and most of it is weak for general claims.

**Entry points for agents.** The [AGENTS.md convention](https://agents.md/) gives agents a
predictable file to read. Ryan Lopopolo's
[Harness engineering](https://openai.com/index/harness-engineering/) (OpenAI, 2026) describes a
short AGENTS.md that works as a map to a structured `docs/` folder. OpenAI's cookbook entry
[Iterating development workflows with Codex](https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex)
lists goals, conventions, testing standards, context files, and scope boundaries as useful content.
The convention and the two OpenAI pages are practitioner sources.

**Context files in studies.** Gloaguen, Mündler, Mueller, Raychev, and Vechev's
[Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988) (an ICLR 2026 workshop paper) found that
generated and developer-written context files didn't generally improve task success and that they
raised inference cost. Khatri's
[Do Context Files Help Coding Agents?](https://arxiv.org/abs/2607.27250) (2026) compared two agents
on 17 tasks and found no measurable difference in correctness. The study bounded the effect at about
10 to 15 percentage points and traced most failures to implementation skill rather than missing
knowledge. Chatlatanagulchai and colleagues' [Agent READMEs](https://dl.acm.org/doi/10.1145/3840295)
(ACM TOSEM, 2026) studied 2,303 context files from 1,925 repositories and found them hard to read
and focused on testing and implementation details. seams takes from these studies that always-on
context has a cost. It keeps `AGENTS.md` short and routes agents to the files their task needs. The
studies don't test the seams authority model, and they don't show that context should be removed
entirely.

**Long-running agents.** Justin Young's
[Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents)
(Anthropic, 2025) describes a feature list, a progress file, git history, one feature at a time, and
end-to-end tests to carry work across sessions. seams takes the idea that artifacts carry state
across sessions. It doesn't aim for the longest unattended run, and the report describes one
harness, not a comparison of approaches.

**Practitioner discussions.** These Hacker News threads show recurring workflows and objections.
They are anecdotes.

- [A good AGENTS.md is a model upgrade. A bad one is worse than no docs at all](https://news.ycombinator.com/item?id=47938417)
  discusses keeping the entry point small.
- [Ask HN: How do you manage skills files?](https://news.ycombinator.com/item?id=49589914) includes
  advice to keep AGENTS.md lean and load skills when needed.
- [Show HN: Spec-AGENTS.md, a tiny doc-driven spec for AI coding tools](https://news.ycombinator.com/item?id=46286705)
  describes one task per session, a check for each task, and writing back what changed.
- [Show HN: Agent Kernel, three Markdown files that make any AI agent stateful](https://news.ycombinator.com/item?id=47486287)
  includes a warning that agents don't reliably follow growing instruction files.
- [Do agents.md files help coding agents?](https://news.ycombinator.com/item?id=48441589) includes
  reports that concrete commands help, and doubts about generated context files.
- [Claude Code now reads AGENTS.md if there is no Claude.md](https://news.ycombinator.com/item?id=49760187)
  includes an argument for small tasks that can be checked quickly.

## 11. What seams adds

seams combines older ideas for one setting, an operator working with coding agents:

- Each statement has a type and a home, and its weight depends on the question and reader. A
  separate rule limits which statements authorize work.
- Canon is small and changes only when the operator accepts a change. Working records and
  documentation are memory. Code, tests, and runtime evidence are reality.
- Design overviews and user documentation are maintained with the work, verified against reality,
  and used by the operator during review.
- The operator's effort goes into proposals and canon, and agents plan and carry out the work.
- The planner gives the operator a read-back and gives implementers units of work.
- Agents coordinate only through artifacts, so any agent can continue any other agent's work.
- Questions that reach the operator are used to improve canon.
- Work lands in small parts that the operator can try.

The combination is a set of hypotheses. A project can judge them by how often the operator has to
correct an agent, how many avoidable questions reach the operator, how much work is reverted or
redone, how long it takes to resume interrupted work, how much the agents spend, and how often canon
and the code disagree.
