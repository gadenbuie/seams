# Supporting evidence and intellectual lineage

This is the explanatory companion to [seams](../README.md), its [constitution](constitution.md), and
its [framework guide](framework.md). It is a reading guide, not a claim that the framework has been
validated as a complete method by a controlled experiment.

The framework is a **synthesis** of ideas from software architecture, organizational theory,
cognitive science, human factors, lean product development, and current agent-engineering practice.
Those traditions answer different questions. A source about human memory does not establish how a
language model behaves; a vendor case study does not establish a universal software process; a
modularity argument does not by itself tell us how to organize a work queue. The useful move is to
make each transfer explicit and test it in the project.

## 1. How to read the evidence

### Evidence labels

- **Research or primary source:** a paper, standard, or original theoretical/empirical account.
- **Established practice:** a documented method or convention with substantial practical adoption,
  but not necessarily comparative evidence for this exact use.
- **Practitioner report:** a case study, engineering post, discussion, or personal account. Useful
  for mechanisms, failure modes, and hypotheses; weak for general causal claims.
- **Synthesis:** an inference made by this framework from one or more of the above. It should be
  treated as a design hypothesis until the project observes its effects.

### The central distinction

The framework is not primarily a new file format. It is a way of making **authority, context,
coordination, and feedback** explicit. The filenames are replaceable; the distinctions are not.

- Vision expresses direction.
- Design records commitments.
- Work authorizes implementation.
- Code and tests establish reality.

The rest of this document explains where the pieces of that sentence come from, what they
contribute, and where the analogy can mislead.

## 2. Research vocabulary: a keyword map

Use these terms as search seeds when investigating a new rule or artifact. Combine a term from one
row with `software engineering`, `coordination`, `documentation`, `human factors`, or `AI agents` as
appropriate. The list is deliberately broader than the sources currently cited: it is a map for
future inquiry, not a claim that every term has already been incorporated.

| Intellectual area                     | Keywords and phrases                                                                                                                   | Questions it can help answer                                                                                        |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------ |
| Bounded rationality                   | Herbert Simon; bounded rationality; satisficing; bounded search; information-processing limits                                         | Why should a worker receive a bounded decision space rather than an impossible global optimization problem?         |
| Near-decomposability                  | Simon; _The Architecture of Complexity_; nearly decomposable systems; hierarchy; stable intermediate forms                             | When can a part be understood and changed with only aggregate knowledge of other parts?                             |
| Modularity                            | David Parnas; information hiding; design decisions likely to change; module secrets; encapsulation; stable interfaces                  | Which decisions should be hidden behind a component or artifact boundary?                                           |
| Design for change                     | change cases; anticipated change; evolution; variability; design pressure; structural veto                                             | How can a future possibility evaluate today's boundaries without becoming a requirement?                            |
| Architecture description              | ISO/IEC/IEEE 42010; stakeholders; concerns; viewpoints; views; architecture rationale                                                  | Which reader and concern does a document serve? What belongs in a view rather than a single monolithic description? |
| Architecture evaluation               | ATAM; quality attributes; quality scenarios; utility tree; sensitivity points; tradeoff points; risks and non-risks                    | How do we turn qualities such as recoverability or modifiability into concrete scenarios and tradeoffs?             |
| Architecture knowledge                | architectural knowledge management; design rationale; decision log; ADR; MADR; rationale capture; supersession                         | Why was a consequential choice made, and what would justify revisiting it?                                          |
| Design-space reasoning                | QOC; Questions Options Criteria; IBIS; issue-based information system; argumentation; alternatives; tradeoffs                          | How do we preserve the reasoning around a choice without pretending the process was perfectly linear?               |
| Reflective practice                   | Donald Schön; reflection-in-action; reflection-on-action; reflective conversation with materials; back-talk                            | How should discovery during implementation change the next bounded move?                                            |
| Wicked problems                       | Rittel and Webber; problem framing; no definitive formulation; stakeholder perspectives; iterative framing                             | When is more specification the wrong response to an unresolved problem?                                             |
| Organizational information processing | Jay Galbraith; task uncertainty; information-processing demand and capacity; rules and programs; lateral relations; exception handling | Which decisions can be settled by rules, and which need feedback or operator judgment?                              |
| Coordination theory                   | Malone and Crowston; managing dependencies; shared resources; producer/consumer; task/subtask; simultaneity constraints                | What actually blocks a unit, and what coordination mechanism does that dependency need?                             |
| Communication and structure           | Conway's law; communication paths; socio-technical congruence; interface ownership                                                     | Do the artifact and code boundaries match the way work is actually coordinated?                                     |
| Distributed cognition                 | Edwin Hutchins; cognitive artifacts; external representations; representational state; coordination across people, tools, and time     | What work can the repository do so a worker need not hold the whole project in memory?                              |
| Boundary objects                      | Star and Griesemer; boundary objects; translation; interpretive flexibility; common identity; shared artifacts                         | Can different participants use the same artifact without requiring identical local interpretations?                 |
| Communities of practice               | Wenger; participation; reification; shared repertoire; negotiation of meaning                                                          | How do documents and practice correct one another instead of becoming dogma?                                        |
| Cognitive load                        | Sweller; working memory; intrinsic load; extraneous load; split attention; redundancy; progressive disclosure                          | Which reading and navigation demands are unnecessary for the task at hand?                                          |
| Recognition and recall                | Nielsen; recognition rather than recall; external memory; retrieval cues; information scent                                            | Can a worker find the next relevant artifact instead of remembering its location?                                   |
| Human factors and safety              | joint cognitive systems; Hollnagel; Woods; resilience engineering; graceful degradation; error tolerance; recovery; ETTO               | How does the system behave when a contribution is imperfect or a dependency fails?                                  |
| Lean product development              | set-based concurrent engineering; Ward; Liker; Sobek; alternatives; options thinking; last responsible moment                          | Which decisions should remain open while evidence is gathered, and when must they close?                            |
| Iterative planning                    | progressive elaboration; rolling-wave planning; near-term detail; planning horizon; feedback-driven planning                           | How much should be designed now, and what should remain a named possibility?                                        |
| Bounded shaping                       | Shape Up; appetite; boundaries; non-goals; fixed time variable scope; risk and rabbit holes                                            | What is the selected outcome, and what is explicitly outside it?                                                    |
| Flow and feedback                     | small batches; work in progress; continuous integration; short-lived branches; fast feedback; integration risk                         | How do we make defects visible before they spread across units?                                                     |
| Inspection and review                 | Fagan inspection; modern code review; independent review; exit criteria; defect classification; review evidence                        | What evidence distinguishes a completed change from a plausible summary?                                            |
| Documentation genres                  | Diátaxis; tutorials; how-to guides; reference; explanation; reader needs                                                               | Is this document meant to orient, instruct, specify, or explain?                                                    |
| Architecture templates                | arc42; constraints; context; building blocks; runtime; deployment; crosscutting concepts; quality requirements; risks                  | Which architecture concerns deserve a stable home, without adopting a heavyweight template wholesale?               |
| Agent orientation                     | AGENTS.md; repository instructions; progressive disclosure; context files; repository map; task routing                                | What should every agent know immediately, and what should be retrieved only when relevant?                          |
| Agent harnesses                       | long-running agents; context windows; handoffs; progress files; feature lists; checkpoints; session continuity                         | How can a fresh worker resume from artifacts rather than conversation memory?                                       |
| Specification-driven agents           | specification-driven development; executable specifications; acceptance criteria; contract tests; pre-approval                         | Which commitments must be settled before generation, and which can remain local choices?                            |
| Human–AI collaboration                | operator control; human oversight; mixed-initiative systems; calibrated trust; automation bias; human-on-the-loop                      | Which judgments should remain with the operator, and how is delegation made visible?                                |
| Error recovery                        | checkpointing; idempotence; compensating actions; revert; repair; replace; known-good state; resumability                              | What is the cheapest safe response when a worker produces a bad or incomplete result?                               |
| Knowledge maintenance                 | single source of truth; single home; stale documentation; documentation drift; supersession; archival; garbage collection              | How do we prevent history and status from competing with current commitments?                                       |

### Search combinations that are especially productive

- `information hiding + anticipated change + module boundaries`
- `quality attribute scenarios + architecture tradeoff analysis`
- `design rationale + architecture knowledge management + documentation overhead`
- `coordination theory + producer consumer dependencies + shared resources`
- `distributed cognition + coordinating representations + software development`
- `boundary objects + requirements specifications + architecture documentation`
- `cognitive load + split attention + progressive disclosure + technical documentation`
- `set-based design + last responsible moment + software architecture`
- `small batches + continuous integration + feedback + empirical software engineering`
- `AGENTS.md + progressive disclosure + repository instructions`
- `long-running coding agents + handoff artifacts + context windows`
- `specification-driven development + AI coding + acceptance criteria`

## 3. Software design: hide decisions, evaluate change, preserve rationale

### 3.1 Parnas: modules are organized around decisions likely to change

David Parnas's 1972 paper,
[On the Criteria to Be Used in Decomposing Systems into Modules](https://www.cs.lafayette.edu/~gexia/cs301/resources/parnas.html),
compares a decomposition based on processing steps with one based on information hiding. In the
latter, each module hides a design decision—such as a storage format or algorithm—behind an
interface that reveals as little as necessary. The paper's central recommendation is to begin with
difficult or change-prone design decisions and assign them to modules that hide them.

**What it contributes:** component boundaries should be justified by ownership and change pressure,
not by a convenient folder tree or a sequence of execution steps. A component contract should make
the hidden decisions and the stable interface visible enough for a worker to act locally.

**What it does not establish:** that every future feature deserves a module, an abstraction, or an
extension point. Anticipated change is a reason to inspect boundaries, not a reason to implement the
future. The framework's change-case rule is therefore deliberately weaker than speculative design:
preserve a low-cost freedom when evidence justifies it, and record what remains undecided.

### 3.2 Simon: bounded search and near-decomposability

Herbert Simon's work on bounded rationality replaces the assumption of unlimited optimization with
decision-making under limited information, time, and computation. The
[Stanford Encyclopedia of Philosophy](https://plato.stanford.edu/archives/spr2026/entries/bounded-rationality/)
describes satisficing as searching until an option meets a predefined aspiration level rather than
finding a globally optimal option. Simon's
[The Architecture of Complexity](https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/ArchitectureOfComplexity.HSimon1962.pdf)
then develops the idea of nearly decomposable systems: components can be approximately independent
in the short run while their long-run behavior depends on other components in aggregate.

**What it contributes:** a small worker does not need to solve the whole project. It needs a bounded
problem, explicit acceptance criteria, and interfaces that make the rest of the system available at
the right level of abstraction. Near-decomposability is a conditional property, not a synonym for
"split everything into small pieces": if interactions are dense, the unit is not actually
independent.

**Transfer caution:** Simon's formal and organizational claims are not measurements of LLM context
windows. The analogy motivates a design hypothesis—reduce unnecessary global context and make
interactions explicit—but the project must still measure whether that improves cost, correctness,
and recovery.

### 3.3 ATAM: evaluate architecture through quality scenarios

The Software Engineering Institute's
[Architecture Tradeoff Analysis Method collection](https://sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/)
describes an evaluation process that elicits business drivers and quality goals, refines them into
scenarios, analyzes architectural approaches, and identifies risks, sensitivity points, and tradeoff
points. ATAM explicitly considers interacting qualities such as modifiability, security,
performance, and availability rather than treating architecture as a list of technologies.

**What it contributes:** a change case should name the quality or boundary it exercises. "We might
add another provider" is vague; "a new provider must be added without changing the public read
contract" is an architectural scenario. The same approach applies to recovery, operability, and
panel legibility: state the stimulus, context, expected response, and evidence.

**Limit:** this framework borrows the scenario habit, not the full facilitated ATAM process. A small
project need not run a workshop or produce a utility tree for every decision. Use the lightest
scenario that exposes a real tradeoff.

### 3.4 ISO/IEC/IEEE 42010: describe concerns through viewpoints

The [ISO/IEC/IEEE 42010 conceptual model](http://www.iso-architecture.org/iso-42010/cm/index.html)
distinguishes stakeholders, concerns, architecture viewpoints, and views. A viewpoint supplies
conventions for constructing and interpreting a view that addresses particular concerns. The model
also includes architecture decisions and their relationship to concerns.

**What it contributes:** no single document has to serve every reader or concern equally well. A
vision speaks to direction, a design contract to enforceable system properties, a work record to
execution, and a decision record to rationale. This is a stronger foundation than "one document per
role": it starts with the question a reader needs answered.

**Limit:** the framework does not attempt standards compliance or a formal architecture-description
language. It borrows the separation of concerns and the idea that a view is purposeful.

### 3.5 arc42: a checklist of architecture concerns, not a mandate for volume

The [arc42 overview](https://arc42.org/overview/) organizes architecture documentation into twelve
tailorable sections: goals, constraints, context, solution strategy, building blocks, runtime,
deployment, crosscutting concepts, decisions, quality requirements, risks/technical debt, and
glossary. Its documentation guidance emphasizes adequacy and stakeholder need rather than filling
every section regardless of value.

**What it contributes:** the system contract should remember concerns that are easy to omit:
external constraints, runtime behavior, deployment, quality requirements, and operational risks. The
framework's component-contract prompts draw on the same checklist instinct.

**Limit:** adopting all twelve sections as mandatory files would recreate the performative structure
this framework is trying to avoid. Use arc42 as a coverage checklist; keep only the artifacts that
carry decisions or coordinate work.

### 3.6 Parnas and Clements: useful documentation need not pretend the process was linear

[A Rational Design Process: How and Why to Fake It](https://users.ece.utexas.edu/~perry/education/SE-Intro/fakeit.pdf)
argues that real design rarely proceeds perfectly from requirements to implementation, but that it
is still valuable to produce the documents an ideal rational process would have produced. Those
documents help initial developers, reviewers, and later maintainers understand requirements and
important design decisions.

**What it contributes:** a current contract can be written after discovery without falsely claiming
that the discovery never happened. Reconciliation is legitimate: update the durable contract to
describe the chosen present, while the work record preserves the actual path and the decision record
preserves consequential rationale.

**Limit:** "fake it" is not permission to fabricate evidence or claim that unimplemented behavior
exists. The framework separates intended commitments from verified reality precisely to avoid that
failure.

### 3.7 Design rationale and ADRs: preserve why, not just what

Michael Nygard's
[Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
popularized a lightweight record containing context, decision, status, and consequences. The
[ADR project](https://adr.github.io/) describes an ADR as a single architecturally significant
choice and its rationale, including tradeoffs and consequences.

The broader architecture-knowledge literature warns against treating this as free or automatic. A
[systematic review by Weinreich and Groher](https://se.jku.at/software-architecture-knowledge-management-approaches-and-their-support-for-knowledge-management-activities-a-systematic-literature-review/)
identified 56 approaches across 115 studies and found that using captured knowledge was better
supported than efficiently capturing, maintaining, sharing, and reusing it. An
[action-research study of ADRs in practice](https://link.springer.com/content/pdf/10.1007/978-3-031-70797-1_22)
reported improvements in cooperation and knowledge transfer, while also highlighting documentation
culture, prioritization, distributed-component, and storage-location challenges.

**What it contributes:** record a decision when its rationale is expensive to reconstruct or its
reversal conditions matter. Keep the current rule in the contract and the historical explanation in
the decision record. Do not backfill a large ADR museum just to make the repository look mature.

**Limit:** an ADR is not a second current specification. A superseded decision should remain legible
as history while the governing contract changes in the same work item.

### 3.8 QOC and IBIS: make the design space discussable

[Questions, Options, and Criteria](https://www.tandfonline.com/doi/full/10.1080/07370024.1991.9667168)
represents design rationale through questions, possible answers, and criteria for comparing them.
The authors explicitly describe it as a coproduct of design, intended to support reasoning,
redesign, reuse, and communication—not as a literal recording of every step in the design process.
[Argumentation-based design rationale](https://openaccess.city.ac.uk/id/eprint/223/2/Argumentation-based_Design_Rationale.pdf)
similarly traces IBIS, QOC, and related approaches to the need to explore ill-defined or wicked
problems through stakeholder argumentation.

**What it contributes:** when a decision is genuinely contested, capture the question, alternatives,
criteria, and reason for resolution. This is more useful than a long final answer with no visible
tradeoff. It also gives a later agent a way to revisit the decision without guessing which
assumptions were load-bearing.

**Limit:** a full argumentation graph is usually too heavy for routine implementation. Use the
lightweight decision-record template unless the complexity of the design space justifies more.

## 4. Organizations and work: coordinate dependencies under uncertainty

### 4.1 Galbraith: uncertainty changes the coordination mechanism

Jay Galbraith's
[Organization Design: An Information Processing View](https://dl.acm.org/doi/abs/10.1287/inte.4.3.28)
argues that greater task uncertainty increases the information that must be processed during task
execution. The paper discusses rules and programs for predictable situations, hierarchical exception
handling, and other ways of increasing information-processing capacity or reducing the need for it.

**What it contributes:** stable, repetitive decisions belong in concise rules and contracts. Novel
or ambiguous situations need feedback, local adjustment, or operator adjudication. A framework that
tries to pre-specify every future exception will overload both its documents and its operator.

**Design consequence:** the constitution is short; detailed design follows selection and risk; and
conflicts have an explicit escalation path. The system does not ask every worker to become a global
coordinator.

### 4.2 Malone and Crowston: coordination is managing dependencies

Malone and Crowston's
[The Interdisciplinary Study of Coordination](https://crowston.syr.edu/sites/default/files/acmcs94.pdf)
defines coordination as managing dependencies among activities. Their survey discusses shared
resources, producer/consumer relationships, simultaneity constraints, and task/subtask dependencies,
and compares mechanisms such as standardization, direct supervision, and mutual adjustment.

**What it contributes:** a dependency graph should represent real needs, not a ceremonial sequence.
Two units that write the same state have a shared-resource dependency even if their descriptions
look independent. A unit that consumes another unit's artifact has a producer/consumer dependency. A
unit that merely seems related does not necessarily need to wait.

**Design consequence:** task packets name inputs, outputs, write scope, and acceptance evidence.
Parallelism is justified by independence and isolation, not by the number of available agents.

### 4.3 Conway: communication structure leaves a mark on system structure

Mel Conway's [How Do Committees Invent?](https://www.melconway.com/Home/Committees_Paper.html)
argues that organizations designing systems are constrained to produce designs that copy their
communication structures. Conway's related
[explanation of the law](https://www.melconway.com/Home/Conways_Law.html) connects this to the need
for designers of interfacing modules to communicate.

**What it contributes:** artifact boundaries are also communication boundaries. If every worker must
ask the operator for missing context, the supposed modularity is not real. If a shared contract is
owned by nobody, the system will develop hidden coupling. The repository should make the necessary
communication paths cheap and visible.

**Limit:** Conway's observation is not a command to mirror an org chart in the filesystem. For an
operator-plus-agents system, the relevant communication structure may be the flow of artifacts,
reviews, and escalations rather than a conventional team hierarchy.

### 4.4 Shape Up: shape boundaries without pretending to know everything

Basecamp's [Shape Up: Set Boundaries](https://basecamp.com/shapeup/1.2-chapter-03) describes shaping
through appetite, a narrowed problem, and boundaries. It distinguishes fixed time from variable
scope and warns against broad "grab-bag" requests that conceal unresolved problems.

**What it contributes:** selected work needs an outcome, an appetite or bound, explicit non-goals,
and a solution shaped enough to expose important risks. A raw idea is not automatically a project.
The operator chooses what deserves attention; the shaping process makes the choice actionable.

**Limit:** the framework does not adopt Shape Up's timeboxes, betting process, or team structure.
The transferable idea is bounded commitment, not a particular product-management ritual.

### 4.5 Lean product development: preserve options while learning

Ward, Liker, Cristiano, and Sobek's
[The Second Toyota Paradox](https://sloanreview.mit.edu/article/the-second-toyota-paradox-how-delaying-decisions-can-make-better-cars-faster/)
describes set-based concurrent engineering: explore sets of alternatives, communicate constraints,
and narrow them through analysis and experiments rather than locking onto one point solution too
early. The Poppendiecks'
[discussion of predictability and options](http://www.poppendieck.com/pdfs/Predictability_Paradox.pdf)
describes delaying irreversible commitments until the last responsible moment—the point at which
failing to decide would eliminate an important alternative.

**What it contributes:** detail should follow evidence and selection. A spike can be a cheaper way
to close uncertainty than a more elaborate speculative design. Keeping an option open is active
learning, not indefinite procrastination.

**Limit:** deferring a decision is not always virtuous. If delay closes an important option or makes
an implementation unsafe, decide now. The framework's readiness test is meant to identify exactly
those consequential decisions.

### 4.6 Progressive elaboration: detail the near work, not the distant fantasy

Rolling-wave planning is commonly defined as detailing near-term work while keeping later work at a
broader level until information improves. This is an established project-management pattern rather
than a single software-engineering result; the useful keyword trail is **progressive elaboration**,
**rolling-wave planning**, and **planning horizon**.

**What it contributes:** a vision can hold a broad possibility while the selected work record holds
the next verifiable slice. The framework does not need to turn every future idea into a fully
specified backlog item.

**Limit:** "we will elaborate later" is not an excuse to leave the current unit ambiguous. The near
unit still needs acceptance criteria, ownership, and a decision path.

## 5. Cognition and ergonomics: make the environment do some of the work

### 5.1 Distributed cognition: artifacts participate in thinking

Edwin Hutchins's
[Distributed Cognition](https://arl.human.cornell.edu/linked%20docs/Hutchins_Distributed_Cognition.pdf)
describes cognitive processes distributed across members of a social group, across internal and
external material structure, and through time. His examples show how people and artifacts coordinate
representational states to accomplish work that no isolated individual performs alone.

**What it contributes:** a repository is not merely a storage bin. Its maps, contracts, fixtures,
checkpoints, and handoffs are part of the cognitive system. A fresh worker should be able to pick up
the representational state of the work rather than reconstruct it from a long conversation.

**Design consequence:** the work record records discoveries and next actions; the stable contract
holds current commitments; the code and tests hold observable reality. Each artifact has a different
role in propagating state through time.

**Limit:** an LLM is not a human navigator, and token context is not a direct equivalent of human
working memory. The transfer is functional—externalize and coordinate state—not a claim about
identical cognitive mechanisms.

### 5.2 Boundary objects: shared artifacts can support different local uses

Star and Griesemer's
[Institutional Ecology, 'Translations' and Boundary Objects](https://ics.uci.edu/~corps/phaseii/StarGriesemer-BoundaryObjects-SSS.pdf)
introduces boundary objects as artifacts adaptable to different viewpoints yet robust enough to
maintain a common identity across them. Their study concerns cooperation among heterogeneous actors,
not a requirement that everyone interpret every artifact identically.

**What it contributes:** a work record can serve the operator, a shaper, an implementer, and a
reviewer without forcing all of them to read it for the same purpose. The shared fields—scope,
contracts, evidence, decisions, and handoffs—provide common identity; each workflow can use a
different view of the same record.

**Limit:** flexibility is not ambiguity. If a reviewer cannot tell which acceptance criteria are
binding, the artifact is failing as a boundary object. Common identity must include authority and
ownership, not just a recognizable filename.

### 5.3 Cognitive load: remove unnecessary work around the work

John Sweller's
[Cognitive Load During Problem Solving](https://onlinelibrary.wiley.com/doi/10.1207/s15516709cog1202_4)
examines how demanding problem-solving strategies can consume cognitive processing capacity that
would otherwise support schema acquisition. Later cognitive-load work distinguishes intrinsic task
difficulty from extraneous load created by presentation and instructional design.

**What it contributes:** do not make a worker spend its limited attention reconstructing the
repository's filing system, reconciling duplicate specifications, or reading irrelevant feature
catalogs. Progressive disclosure, a short entry point, local contracts, and a canonical exemplar
reduce extraneous navigation and interpretation work.

**Limit:** this does not justify a universal token budget or a claim that shorter documents are
always better. A dense, relevant contract can be more economical than a short document that leaves
consequential decisions unresolved. Measure missing-context errors as well as reading volume.

### 5.4 Recognition rather than recall: route to information at the moment of need

The Nielsen Norman Group's
[recognition rather than recall](https://www.nngroup.com/articles/ten-Usability-heuristics/)
heuristic advises making elements, actions, and options visible or easily retrievable rather than
requiring people to remember information from one part of an interface to another.

**What it contributes:** `AGENTS.md` should be a map with task-based pointers, not a memory test.
Stable names and predictable directory conventions give a worker retrieval cues. A task packet
should point to the relevant sections instead of assuming the worker remembers the entire process.

**Limit:** recognition cues help only if the map is accurate and the destination is maintained. A
large index of stale links is worse than a small index of reliable ones.

### 5.5 Joint cognitive systems and resilience: design for imperfect performance

Hollnagel and Woods's
[Joint Cognitive Systems](https://www.routledge.com/Joint-Cognitive-Systems-Foundations-of-Cognitive-Systems-Engineering/Hollnagel-Woods/p/book/9780849328213)
frames human/machine work as meaningful behavior of a unified system rather than as a person simply
operating a tool. The resilience-engineering tradition, including
[Resilience Engineering: Concepts and Precepts](https://www.routledge.com/Resilience-Engineering-Concepts-and-Precepts/Hollnagel-Woods-Leveson/p/book/9780754649045),
studies how complex systems anticipate, respond to, monitor, and learn from changing conditions.

**What it contributes:** evaluate the operator–artifact–agent–tool system, not just the model's
output. Recovery, graceful degradation, known-good states, and feedback are design requirements. A
system that works only when every agent is correct is fragile by construction.

**Limit:** resilience language should not become a license for vague optimism. A recoverable unit
needs concrete checkpoints, bounded writes, executable checks, and a way to stop unsafe actions.

## 6. Feedback, inspection, and small batches

### 6.1 Fagan inspection: separate finding, fixing, and follow-up

Michael Fagan's
[Design and Code Inspections to Reduce Errors in Program Development](https://dl.acm.org/doi/10.1147/sj.153.0182)
reported quality and productivity improvements from systematic design and code inspections with
well-defined participant roles and categorized inspection data. The process description
distinguishes operations and objectives such as preparation, finding errors, reworking, and
follow-up.

**What it contributes:** review is stronger when it has a defined object, criteria, and follow-up.
The framework's independent-review and repair boundaries borrow this separation without requiring
Fagan's formal meeting structure.

**Limit:** historical inspection results are context-dependent. They do not prove that an LLM
reviewer will find the same defects as a trained human inspection team, or that more review roles
always improve outcomes.

### 6.2 Modern review and continuous feedback: evidence is contextual

A [survey of modern code review](https://dl.acm.org/doi/full/10.1145/3585004) and empirical studies
of review participation and software quality provide a more recent research trail. The
[2017 State of DevOps report](https://dora.dev/research/2017/2017-state-of-devops-report.pdf)
reports associations between delivery performance and practices including test automation,
continuous integration, short-lived branches, small batches, and feedback. These are not universal
causal guarantees, and the report's population and measures matter.

**What it contributes:** prefer small coherent changes, fast targeted checks, integration feedback,
and review of the actual diff. Treat a clean baseline and a demonstrated acceptance result as
separate pieces of evidence.

**Limit:** do not import a fixed pull-request line limit or branch lifetime as a universal law. The
framework sizes units by coherence, independence, risk, and reviewability; a schema transition may
need to remain atomic even when it is large.

## 7. Documentation form: reader need determines the artifact

### 7.1 Diátaxis: separate action, reference, and explanation

[Diátaxis](https://diataxis.fr/start-here/) distinguishes tutorials, how-to guides, reference, and
explanation. Tutorials and how-to guides support action; reference and explanation support knowing.
How-to and reference serve someone applying a craft at work; tutorials and explanation serve
learning and understanding.

**What it contributes:** the framework's documents deliberately have different jobs:

- `AGENTS.md` is orientation and routing;
- the framework guide is practical reference and how-to material;
- the constitution is a compact normative reference;
- this evidence volume is explanation;
- the `skills/seam-*/SKILL.md` files are task-oriented guides for focused lifecycle moments.

**Limit:** the framework's authority categories are not identical to Diátaxis's four genres. A
contract can contain explanatory sentences, and a work record can contain instructions. The
important test is whether the reader's immediate need and the statement's authority are clear.

### 7.2 Documentation maintenance is part of the design

The architecture-knowledge review cited above found that maintaining and sharing knowledge were less
well supported than using already-captured knowledge. The practical consequence is that a document
system needs a deletion and supersession path, not just a creation path.

**What it contributes:** stable documents are updated in place; completed work records remain
historical; decision records can be superseded; notes remain explicitly non-normative; and completed
work must not remain a competing current specification.

**Limit:** "single source of truth" does not mean one giant file. It means one authoritative home
for each kind of statement, with links and views for other readers.

## 8. Agent-specific practice: useful reports, weak general evidence

### 8.1 AGENTS.md and progressive disclosure

The [AGENTS.md convention](https://agents.md/) describes a predictable README-like location for
agent guidance. OpenAI's [Harness Engineering](https://openai.com/index/harness-engineering/)
describes a repository knowledge base with a short `AGENTS.md` acting primarily as a map to deeper
sources of truth. OpenAI's
[guidance on iterating development workflows](https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex)
lists repository goals, conventions, testing standards, relevant context files, project behaviors,
and scope boundaries as useful instruction content.

**What it contributes:** keep the always-loaded entry point short and operational. Put detailed
architecture, feature behavior, and lifecycle procedures behind pointers that are read when needed.

**Evidence status:** these are vendor/practitioner accounts and conventions, not controlled proof
that a particular file length or hierarchy improves all agents. They are nevertheless directly
relevant to the mechanics of current tools.

### 8.2 Empirical evaluations: context files are not automatically beneficial

The strongest caution against treating `AGENTS.md` as a universal improvement comes from recent
empirical work:

- Gloaguen and colleagues'
  [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://iclr.cc/virtual/2026/10021235)
  evaluates multiple coding agents and models on established SWE-bench tasks with generated context
  files and on a collection of issues from repositories with developer-provided files. The reported
  abstract finds no improvement in task success and an inference-cost increase of over 20%. It also
  reports broader exploration and instruction-following, and recommends minimal human-written
  requirements. The study's setting, tasks, agents, and context-file construction matter; it does
  not show that every useful project instruction is harmful.
- [Do Context Files Help Coding Agents? A Two-Agent Ablation Study on Real Repositories](https://arxiv.org/html/2607.27250)
  compares no context, always-on context, and selective context across two agents and 17 real tasks.
  It reports no measurable correctness improvement, with observed effects bounded to roughly 10–15
  percentage points, and attributes many failures to implementation skill rather than missing
  repository knowledge. The authors caution that this is a bounded null, not a powered claim of
  exact equivalence.
- [Agent READMEs: An Empirical Study of Context Files for Agentic Coding](https://dl.acm.org/doi/10.1145/3840295)
  analyzes 2,303 context files from 1,925 repositories. It characterizes them as evolving,
  frequently difficult-to-read artifacts, with substantial attention to testing and implementation
  details and less attention to some non-functional concerns. This is descriptive evidence about
  practice, not a causal evaluation of task success.

**What it contributes:** always-on context has a cost, and more instructions can create more work
without better outcomes. The framework's response is not "write a bigger `AGENTS.md`" or "put every
rule in the model's context." Keep the entry point focused on non-obvious operational requirements
and route to task-specific artifacts when they are needed. Evaluate whether the documents improve
the actual work system.

**Limit:** these studies do not validate this framework's authority model, task packets, or recovery
rules. They also do not imply that context should be eliminated: a missing constraint can be more
expensive than a concise instruction. The practical question is which information changes behavior
for the task at hand, at what cost, and with what evidence.

### 8.3 Anthropic: continuity artifacts for long-running agents

Anthropic's
[Effective Harnesses for Long-Running Agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents)
describes an initializer/coding-agent arrangement, a feature list, progress notes, git history,
incremental work, and testing to bridge multiple context windows. The article explicitly addresses
the problem of a fresh session lacking memory of earlier sessions.

**What it contributes:** durable artifacts can carry state across context boundaries; a worker
should leave a clean checkpoint and a useful next action; and completion claims need external
evidence.

**What this framework deliberately does not copy:** the goal of maximizing autonomous runtime or
expanding a high-level prompt into a large autonomous build. The operator-centered model instead
uses bounded selection, economical context, and recoverable units. Anthropic's report is evidence
about a particular harness and setting, not a controlled comparison of autonomy levels or a reason
to spend more tokens.

### 8.4 Specification-driven agentic development

The IEEE Computer Society's
[Specification-Driven Agentic Software](https://www.computer.org/publications/tech-news/research/specification-driven-agentic-software)
article argues that clear specifications can address context starvation and architectural drift in
AI-assisted development, and emphasizes human oversight and pre-approval rather than relying only on
post-generation review.

**What it contributes:** consequential behavior and acceptance criteria should be settled before a
worker is asked to generate code. This supports the framework's readiness test and its distinction
between design commitments and implementation freedom.

**Limit:** a detailed specification is not automatically correct, complete, or economical. The
framework therefore adds progressive commitment: specify the decisions that matter now, not every
possible future detail.

### 8.5 Practitioner discussions: recurring patterns and recurring warnings

The following Hacker News discussions are included as **anecdotal practitioner evidence**. They are
useful for discovering workflows and objections, not for estimating success rates:

- [A good AGENTS.md is a model upgrade; a bad one is worse than no docs](https://news.ycombinator.com/item?id=47938417)
  discusses keeping the entry point small and high-value.
- [AGENTS.md and progressive disclosure](https://news.ycombinator.com/item?id=49594260) discusses
  concise root guidance, task-linked documents, and skills loaded when relevant.
- [A tiny doc-driven spec for AI coding tools](https://news.ycombinator.com/item?id=46286705)
  describes one atomic task per session, explicit verification, and writing back changes.
- [Three Markdown files that make an agent stateful](https://news.ycombinator.com/item?id=47486287)
  includes both persistent-state proposals and warnings that agents do not reliably follow growing
  instruction files.
- [Do AGENTS.md files help coding agents?](https://news.ycombinator.com/item?id=48441589) includes
  reports favoring concrete commands and project-working context, alongside skepticism about broad
  generated context files.
- [Claude Code reads AGENTS.md](https://news.ycombinator.com/item?id=49760187) includes practitioner
  arguments for small, assessable tasks and explicit scope/verification boundaries.

**How to use them:** treat repeated themes as hypotheses to test—short maps, local context, small
units, explicit checks, and handoffs. Do not cite a comment thread as evidence that a workflow is
scientifically validated. Also note the counter-evidence: instructions can be ignored, generated
context can add noise, and excessive decomposition can cost more operator time than it saves.

### 8.6 Where exploration belongs

The design-rationale and set-based traditions in §3.8 and §4.5 explain why options, evidence, and
tradeoffs should remain available before a commitment is made. Rolling-wave planning in §4.6 adds a
timing distinction: early investigation need not become a fully specified future implementation.

seams therefore treats exploration as **non-normative evidence**, often linked to a tracked
investigation. Its observations, prototypes, and candidate approaches can inform design without
becoming design commitments. Promotion is an explicit act: constraints enter design, significant
rationale enters a decision record, and delivery scope enters the selected work record. This is a
synthesis of the cited traditions, not a claim that they prescribe one exploration-file format.

## 9. What is genuinely new in this synthesis

The individual ingredients are old. The synthesis is aimed at a particular socio-technical setting:

1. **Authority is explicit and scoped.** Possibility, commitment, selection, rationale, and reality
   do not compete in one document.
1. **The operator remains a decision participant.** The system is not designed around the assumption
   that the best outcome is the longest unattended run.
1. **Small agents are a design constraint.** The repository supplies local context and exemplars so
   limited workers can contribute without knowing everything.
1. **Imperfect output is expected.** Recovery is built into the artifact and verification model,
   rather than treated as an exceptional need for a smarter model.
1. **Workflows are composable.** Shaping, routing, implementation, review, and repair can be
   separate skills or combined by one person; shared artifact contracts let them interoperate.
1. **Documentation has a lifecycle.** Stable documents change in place, work records preserve
   temporary history in a replaceable tracker, decisions can be superseded, and completed work stops
   acting as a current specification.

These are design commitments and hypotheses, not a claim of empirical superiority. A project should
evaluate them with measures such as operator clarification time, missing-context defects, review
findings, rework and revert cost, token spend, time to resume interrupted work, and the frequency of
stale or contradictory documents.

## 10. A reading path for the operator

If you want to learn the lineage without reading everything:

1. **Start with modularity:** Parnas's
   [decomposition paper](https://www.cs.lafayette.edu/~gexia/cs301/resources/parnas.html). Ask: what
   decision should this boundary hide?
1. **Then read Simon:**
   [The Architecture of Complexity](https://faculty.sites.iastate.edu/tesfatsi/archive/tesfatsi/ArchitectureOfComplexity.HSimon1962.pdf).
   Ask: when is a part genuinely near-independent?
1. **Read Galbraith and Malone/Crowston together:**
   [uncertainty and information processing](https://dl.acm.org/doi/abs/10.1287/inte.4.3.28), then
   [coordination as dependency management](https://crowston.syr.edu/sites/default/files/acmcs94.pdf).
   Ask: which rules can be fixed, and which dependencies need feedback?
1. **Read Hutchins and Star/Griesemer:**
   [distributed cognition](https://arl.human.cornell.edu/linked%20docs/Hutchins_Distributed_Cognition.pdf)
   and [boundary objects](https://ics.uci.edu/~corps/phaseii/StarGriesemer-BoundaryObjects-SSS.pdf).
   Ask: what work can the shared artifact do across people, tools, and time?
1. **Read ATAM and Nygard:**
   [quality scenarios and tradeoffs](https://sei.cmu.edu/library/architecture-tradeoff-analysis-method-collection/),
   then
   [decision records](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).
   Ask: what quality is at stake, and why was this choice made?
1. **Read Diátaxis and arc42:** [reader needs](https://diataxis.fr/start-here/) and
   [architecture coverage](https://arc42.org/overview/). Ask: is this artifact useful to its reader,
   and what important concern is missing?
1. **Finish with current agent practice:**
   [OpenAI harness engineering](https://openai.com/index/harness-engineering/),
   [Anthropic's long-running-agent harness](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents),
   and the practitioner threads above. Ask: which mechanisms transfer, and which assumptions about
   autonomy or token expenditure do we reject?

The durable test is not whether the repository cites the right canon. It is whether the artifacts
help a human operator and a succession of imperfect workers make good decisions, find the right
context, verify reality, and recover without unnecessary heroics.
