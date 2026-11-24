---
title: Documentation as part of project memory
description: Read when working on design overviews, documentation maintenance, or how documentation joins a unit of work.
status: accepted
created: 2026-11-24
---

# Proposal: Documentation as part of project memory

- **Related:** [Canon, memory, and reality](../../docs/guide.md#canon-memory-and-reality),
  [invariant 1](../../docs/design/invariants.md#1-each-statement-lives-in-the-home-that-matches-its-type),
  and
  [supporting evidence for canon and memory](../../docs/supporting-evidence.md#2-canon-memory-and-drift)

## Summary

Documentation would become an intentional part of project memory and of each unit of work.
Maintained, current-state overviews would explain how the system fits together, between the accepted
direction in canon and the detailed history in plans and work items. Agents would have a defined way
to discover, verify, update, and present documentation for operator review.

The maintained documents are **design overviews** in `docs/design/overviews/`. Canon filenames stay
lowercase. When repo-level `docs/` is unavailable, the default design root is `.agents/design/`.

## Motivation

The current guide defines memory as proposals, plans, work items, notes, and findings. It doesn't
say where maintained descriptions of the current system belong, when agents should write them, or
how they should remain useful as the code changes. User documentation and maintainer documentation
can therefore become separate work that happens after implementation, if it happens at all.

The operator needs documentation during review. A clear description of the current system makes it
easier to see disagreements between the operator's intent and the software, awkward connections
between components, and warnings about design problems. Reading every code change is a slower way to
build the same understanding.

## Agreed

The agreed points come from the operator's review of the README, guide, and draft proposal.

- Documentation is part of the system's memory. Help text, function documentation, guides, articles,
  and vignettes help preserve what the system does across sessions and at a useful level of
  abstraction.
- Documentation belongs throughout the development process. Implementers share responsibility for
  maintaining it, rather than leaving it for a separate step after implementation.
- The right time to write documentation depends on the work. A new feature may need a stable
  implementation before its documentation is useful. A change to an existing feature should maintain
  the documentation that already describes it.
- A project benefits from maintained documents that explain how the system was built and how its
  pieces connect. These documents sit between the compressed direction in canon and the detail in an
  implementation plan.
- Updating these documents alongside implementation gives the operator an early review surface.
  Explanations, cautions, and warnings can draw the operator's attention to problems after the work
  is complete.
- The existing skills will own the documentation procedure. `seams-adopt` will seed the structure,
  `seams-work` will cover discovery and maintenance, `seams-route` will cover review, and
  `seams-reconcile` will check for drift and unnecessary growth. The project won't add a separate
  documentation or memory skill.
- The maintained documents are called **design overviews**, and their default home is
  `docs/design/overviews/`. A project may keep or choose a different home, e.g., `memory/` or
  `architecture/`, when that name fits its conventions and `AGENTS.md` records it.
- Most design overviews need no type prefix. A standalone cross-cutting concept or flow can use a
  `concept_` or `flow_` filename prefix in the same flat `overviews/` folder. These are optional
  labels for special cases, not required document types.
- Canon filenames remain lowercase: `vision.md`, `principles.md`, and `invariants.md`.
- When repo-level `docs/` is unavailable, `seams-adopt` uses `.agents/design/` as the design root,
  with the same canon files and `overviews/` folder. It must ensure the files are tracked and
  discoverable and record the location in `AGENTS.md`.

## Research findings

The research covered local projects the operator works on, public open-source repositories with
established documentation conventions, public documentation tooling, and arc42. The examples show
useful practices, but they don't establish that the same system will work in every seams project.

### Maintained overviews

- A narrow document for each subsystem gives readers a way to understand one area without loading
  the whole project's documentation.
- A title and a short description of when to read the document help agents select relevant material.
  An outline or index can reduce the amount of text an agent needs to load.
- A reader contract helps. A useful overview says who it is for, what it explains, and which details
  it leaves to code, tests, user documentation, or work records.
- Explanations of rejected alternatives and standing cautions preserve understanding that is hard to
  recover from code alone. A decision belongs in an overview only when it explains the current
  design, and the overview should link to the proposal or canon that holds the decision.
- Exact references to files and symbols give agents a way to verify documentation against the code.
- Separate homes for binding rules and descriptive documents help prevent descriptive text from
  silently becoming authoritative.

Alex Kladov's [ARCHITECTURE.md essay](https://matklad.github.io/2021/02/06/ARCHITECTURE.md.html)
supports a short architecture overview with a codemap, module relationships, boundaries, and
cross-cutting concerns. Its advice to revisit the document only a few times a year differs from the
operator's goal of maintaining documentation during the work, so the proposal doesn't adopt that
maintenance cadence.

### Ideas from arc42

[arc42](https://arc42.org/overview/) provides useful content ideas without becoming a required
template or a source of formal section names.

- Keep a short system context, solution strategy, and codemap in the overview index.
- Give each subsystem document a responsibility, its important connections, relevant runtime
  behavior, and standing cautions. Shrink interface detail to the connection and a code reference,
  because the code owns the contract.
- Use standalone flow documents only for interaction scenarios that cross subsystems and don't fit
  in one subsystem document.
- Explain cross-cutting concepts descriptively. Rules that reviewers must enforce belong in canon.
- Explain a past decision or rejected alternative inline only when it clarifies the current design.
  Link to the decision's proposal or canon instead of creating a decision-log section.
- Keep durable cautions and put volatile risks, debt estimates, and work status in the tracker.
- Leave goals and constraints in the README or canon, and quality requirements in canon or tests.
  Add deployment documentation or a glossary only when readers need them.

### Documentation-root compatibility

- [pkgdown](https://pkgdown.r-lib.org/reference/build_site.html) generates its site in `docs/` by
  default, but its `destination` setting can move the output. Setting `destination: reference` would
  produce a doubled `reference/reference/` path for function pages. The current
  [usethis setup](https://usethis.r-lib.org/reference/use_pkgdown.html) can avoid a committed output
  folder by building the site in GitHub Actions and deploying it to the `gh-pages` branch.
- [MkDocs](https://www.mkdocs.org/user-guide/configuration/) and
  [Docusaurus](https://docusaurus.io/docs/installation) use `docs/` for user documentation source by
  default.
  [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
  can also publish directly from `docs/`. A project must decide whether maintainer documentation
  belongs on its public site and configure the publishing boundary accordingly.

## Proposed information model

Memory can include temporary working records, maintained design overviews, and user documentation.
It doesn't have one clean shape or owner. A system remembers in many ways, so seams cannot say that
all memory happens in one place. Seams can recognize where memory is stored, assess its value, and
help the system maintain that memory as it evolves.

Maintaining memory takes intention and effort. Without that work, memory becomes muddy, unclear, or
confusing. These kinds of memory have different readers and lifetimes, but none becomes canon by
persisting.

Especially in greenfield work, information flows from **proposals to plans to design overviews**.
The proposal holds the selected direction, the plan organizes the selected work, and the overview
absorbs the lasting explanation as the implementation makes it true. The proposal and plan remain
history, while the overview describes the current system. Not every proposal or unit needs an
overview; create one only when its explanation would be hard to recover from code and user
documentation.

| Type               | Purpose                                                                                           | Typical home                                                       |
| :----------------- | :------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------- |
| Canon              | Records the direction and rules the operator accepted                                             | Named files in `docs/design/` and an optional `invariants/` folder |
| Working records    | Carry proposals, plans, questions, progress, and decisions for particular work                    | `.agents/proposals/`, `.agents/plans/`, and the tracker            |
| Design overviews   | Explain to maintainers how the current system fits together and why difficult parts work that way | `docs/design/overviews/`, with repo-local alternatives             |
| User documentation | Explains what the software does and how to use it                                                 | The project's existing documentation locations                     |
| Reality            | Shows what exists through code, tests, and runtime evidence                                       | The repository and running systems                                 |

A design overview would describe the current system and would be edited in place. It would not
record current task status, authorize work, or become a log of decisions. It could explain the
reason for an accepted decision, but it would link to the proposal or canon that holds the decision.

User documentation and design overviews serve different readers and shouldn't be forced into one
folder or format. The same maintenance rules apply to both: update the documentation affected by a
unit of work, verify its claims, and include it in review.

## Proposed documentation procedure

The existing skills will share one procedure for user documentation and design overviews. The common
writing and verification rules can live in a reference file in `seams-work`, so the other skills can
point to those rules instead of repeating them.

### Discover and read

- Start with the documentation index and read only documents whose descriptions match the task.
  Reading an index is preparation, not a substitute for reading the relevant document.
- Treat documentation as a guide to the code, not as evidence of current behavior. Follow its code
  references and tests when current behavior matters.
- Report important contradictions between documentation and code instead of silently choosing one.

### Seed

- Inventory existing documentation before creating a new structure. Keep useful names and locations
  where possible, and don't turn old descriptions into accepted rules.
- Create a design overview when a subsystem has connections, constraints, or reasoning that a reader
  can't recover cheaply from code and user documentation. Don't create one for every file or
  feature.
- State each document's audience and scope directly. Say what it explains, what it leaves out, and
  which code or tests support its main claims. Don't open with narration about the document itself.

### Maintain during work

- Include affected documentation in the unit of work when the change alters what users or
  maintainers need to know. A new feature can draft its documentation after the behavior becomes
  stable, within the same body of work. In greenfield work, move the lasting explanation from the
  proposal and plan into the owning overview as the system takes shape.
- Fold lasting contracts, rationale, and active exceptions into the owning overview when work ships.
  Update the existing section instead of appending a narrative of the latest change.
- Update the overview itself when work reveals that it is stale or incomplete. Don't leave the
  correction only in a plan or work item.
- Keep task status, temporary hypotheses, execution checklists, and implementation history in the
  tracker or working records. Keep durable explanations and cautions in documentation.
- Give each rule, contract, and status one owning home. Let design overviews repeat enough context
  to explain connections, with links to the owning documents. Verify claims against the named code
  and tests, and remove or correct claims that can't be supported.

### Review

- Show documentation changes alongside the implementation. Call out new cautions, unexpected
  complexity, and places where the implementation departed from the previous description.
- Have an agent verify documentation claims and links before asking the operator to rely on them.
- Ask the operator to read the relevant documentation and try the software. Use their corrections to
  improve the documentation, the implementation, or canon as appropriate.

### Reconcile and limit growth

- Check for stale, duplicated, contradictory, and unused documents during reconciliation.
- Mark superseded material as historical and keep it outside normal navigation. Don't let old plans
  compete with maintained overviews.
- Add navigation tooling only when the collection is too large for a simple index. Don't require a
  catalog script or a large frontmatter schema at adoption.

## Layout decisions

### Nested layout

The accepted name and location give canon and design overviews separate physical locations within
the same design area:

```text
docs/design/
  index.md
  vision.md
  principles.md
  invariants.md
  invariants/<topic>.md   # optional canon files when invariants are split by topic
  overviews/
    index.md
    <system-or-subsystem>.md
    concept_<topic-slug>.md   # optional standalone cross-cutting concept
    flow_<flow-slug>.md       # optional standalone cross-subsystem flow
```

The named root files and the optional `invariants/` folder would be canon. Everything under
`overviews/` would be memory. `index.md` would link to both areas without making independent rules.
When a project splits its invariants, `invariants.md` would become an index and each rule would live
in exactly one topic file.

Most concepts and flows belong in the subsystem overview that owns them. A standalone document is
useful when the explanation crosses subsystem boundaries or several overviews need to link to it.
Its `concept_` or `flow_` prefix makes that special case visible in directory listings and shell
patterns. The prefixes don't create required document types, and ordinary overviews remain
unprefixed in the same flat folder.

The nested layout preserves a physical authority boundary and keeps design overviews discoverable
beside canon. The current canon invariant would need to name the canon files and optional
`invariants/` folder instead of treating the whole `docs/design/` directory as canon.

Canon filenames remain lowercase: `vision.md`, `principles.md`, and `invariants.md`. This keeps the
documentation filenames consistent and avoids renaming files for capitalization alone. The nested
folders and index provide the authority boundary instead.

An existing documentation home still wins over this default. A project with useful maintained
documents in `memory-bank/`, `docs/design/`, or `docs/architecture/` can keep that home and record
it in `AGENTS.md`.

### Where should long-term documents live when `docs/` is incompatible?

Use `docs/design/` when it is compatible with the repository's conventions and `.agents/design/`
otherwise. Compatibility includes package build rules, generated documentation sites, ignore rules,
and the project's existing documentation locations. Working records stay in their existing homes,
and an existing home for durable documentation wins over a new default.

The adoption checks are:

1. Keep an existing home for the same kind of documentation when it is useful. Record that home in
   `AGENTS.md` instead of moving documents to a new default.
1. Use `docs/design/` when it can coexist with package builds and generated sites. Move generated
   output or exclude maintainer-only source files when the project's tools allow it.
1. Otherwise, use `.agents/design/` with the same canon files and `overviews/` folder. Ensure that
   Git tracks the directory and that agents can find it through `AGENTS.md`. Stop and ask the
   operator when ignore rules or local conventions would leave the documents untracked or hard to
   discover.

The public convention research favors tracked, visible `docs/`. The `.agents/design/` fallback is a
seams convention chosen for projects where that location is unavailable. The tracking and discovery
checks are required because it is less visible.

## Set aside

- **Add `seams-document`.** The operator chose to extend the existing skills instead of adding a
  focused documentation skill.
- **Add `seams-memory`.** The operator chose to keep memory procedures in their existing skills. A
  general memory skill would also overlap with `seams-propose`, `seams-track`, and
  `seams-reconcile`.
- **Uppercase canon filenames.** The operator chose lowercase `vision.md`, `principles.md`, and
  `invariants.md`. The nested folders provide the authority boundary.
- **Use `.agents/docs/` as the fallback.** The operator chose `.agents/design/` so the fallback
  points directly to the design root rather than adding another `design/` level.

## Accepted changes

### Canon

The exact text below implements the decisions above.

#### `docs/design/vision.md`

Add these outcomes:

> - Agents can use written criteria from the operator to assess whether a feature fits, how valuable
>   it is, and which parts deserve priority. They don't have to infer value from code or effort.
> - The operator and fresh agents can read maintained design overviews to understand how the current
>   system fits together without reconstructing that understanding from code or implementation
>   history.

#### `docs/design/principles.md`

Replace the introduction with:

> Principles record the operator's standing preferences for decisions along the path from an idea to
> implementation. They cover choices such as how code is structured, which tools to use, how errors
> behave, when compatibility matters, and whether to prefer feature breadth or depth. They let
> agents apply the operator's judgment when several options could work. Each principle says what to
> prefer and how to apply it. When a principle and an invariant disagree, the invariant wins.

Add this principle:

> ## Maintain documentation with the work
>
> Documentation helps fresh agents and the operator understand the current system at a level that
> code can't provide on its own. Implementers update the user documentation and design overviews
> affected by their work, because a separate documentation step loses the context that produced the
> change. A new feature can be documented after its behavior becomes stable, and an existing feature
> keeps its documentation current as it changes.
>
> Give each fact one owning document and update that document instead of appending implementation
> history. Agents verify documentation claims against code and tests. The operator reads the
> documentation to judge whether the resulting system matches their intent.

#### `docs/design/invariants.md`

Replace invariant 1 with:

> ## 1. Each statement lives in the home that matches its type
>
> The type of a statement decides where it lives and what weight it carries in a given context.
> Authority is relative to the question. Canon carries the most weight for intent and constraints.
> Accepted proposals and work items carry more weight for implementers working within the selected
> scope. Code, tests, and runtime evidence carry the most weight for what exists. Code and tests
> aren't statements in this sense, but the list includes them because they establish reality.
>
> - Vision
>   - **Location:** `docs/design/vision.md`
>   - **Weight and context:** Strong for product intent. It defines the system's overall shape,
>     which features fit, and criteria for assessing their value and priorities. It guides shaping
>     and assessment.
> - Principle
>   - **Location:** `docs/design/principles.md`
>   - **Weight and context:** Strong for standing decisions. It records the operator's preferences
>     for structure, tools, errors, compatibility, feature breadth, and similar choices from idea
>     through implementation.
> - Invariant
>   - **Location:** `docs/design/invariants.md` or `docs/design/invariants/`
>   - **Weight and context:** Binding at every stage. A reviewer can reject any change that breaks
>     it.
> - Design overview
>   - **Location:** `docs/design/overviews/`
>   - **Weight and context:** Descriptive weight for the current design. It helps maintainers and
>     reviewers understand the system, but doesn't override reality or canon.
> - User documentation
>   - **Location:** The project's documentation locations
>   - **Weight and context:** Descriptive weight for expected use. It guides users and reviewers,
>     but doesn't establish current behavior by itself or change design intent.
> - Draft proposal
>   - **Location:** `.agents/proposals/`
>   - **Weight and context:** Exploratory weight only. It informs discussion and has no accepted
>     weight until the operator accepts it.
> - Accepted proposal
>   - **Location:** `.agents/proposals/`
>   - **Weight and context:** Strong for the work it selects. It tells implementers the accepted
>     scope and direction, but can't change canon or bind unrelated work. Its durable parts move
>     into canon.
> - Work item
>   - **Location:** The project's tracker
>   - **Weight and context:** Strong for one unit's execution. It holds scope, progress, questions,
>     decisions, and evidence within the accepted direction and canon.
> - Plan, note, finding
>   - **Location:** `.agents/` or the tracker
>   - **Weight and context:** Working weight for linked work. It provides analysis and context, but
>     can't independently change accepted direction or scope.
> - Code, tests, runtime
>   - **Location:** The repository and its running systems
>   - **Weight and context:** Decisive for what exists. Code and runtime show actual behavior, and
>     tests show checked expectations. None shows the operator's intent by itself.
>
> An accepted proposal or work item can't override canon, and current code can't redefine intent.
> There is no single ranking that answers every question.
>
> Vision, principles, and invariants together are **canon**. `docs/design/index.md` is navigation,
> not canon. When `invariants.md` becomes an index to `invariants/`, each invariant lives in exactly
> one topic file. Design overviews, user documentation, and the other statements in the list are
> **memory**. Code, tests, and runtime evidence are **reality**.
>
> A project may use other file names, including `memory/` or `architecture/` instead of
> `overviews/`, if its agent entry point, e.g., `AGENTS.md`, says where each type lives. When
> repo-level `docs/` is unavailable, the default design root is `.agents/design/`, with the same
> canon files and `overviews/` folder. An existing home for the same kind of documentation wins over
> the default.

Replace invariant 3 with:

> ## 3. Memory never becomes canon just because it persists, is detailed, or is recent
>
> A plan, note, finding, design overview, or user documentation has no more authority after many
> sessions than it had when it was written. A proposal moves its durable parts into canon only when
> the operator accepts it. A design overview can explain an accepted rule or decision, but the
> overview links to its canon or proposal instead of claiming authority for itself.

During implementation review, the operator accepted this clarification to invariant 9:

> Tracker status, summaries, checklists, design overviews, and user documentation don't show that
> something works.

Add invariant 10:

> ## 10. A unit of work maintains the documentation its change affects
>
> Implementers identify the user documentation and design overviews affected by their unit and
> update them in the same body of work. Documentation for a new feature can be drafted after its
> behavior becomes stable, but it is complete before the work closes. A change to existing behavior
> or system structure updates the documentation that already describes it.
>
> Agents verify changed documentation against code and tests and include it in review. Lasting
> explanations and cautions move into the owning document, while task status, execution checklists,
> and implementation history stay in working records. Only code, tests, and runtime evidence
> establish what exists.

### Work selected

Acceptance selects these outcomes:

- Add the nested canon and flat design-overview layout, including optional topic files in
  `invariants/` and optional `concept_` and `flow_` prefixes, to the adoption conventions.
- Define the documentation-root compatibility checks and the `.agents/design/` fallback.
- Extend the existing skills and add a shared documentation reference to implement the procedure.
- Update the README, guide, and supporting evidence so they explain documentation as memory and
  review material.
- Add checks for skill structure, local links, and any documentation index conventions introduced by
  the proposal.

Acceptance would not select an npm package, a documentation site generator, a catalog script, or a
required set of documents for every project. Those additions need evidence from use or a separate
proposal.
