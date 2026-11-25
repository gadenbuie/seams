# Maintain documentation

Use this procedure for user documentation and design overviews.
Find the project's documentation homes, assess their value, and maintain the parts affected by the work.
Follow the project's writing rules, and use `seams-orient` when writing for operator review.

Documentation guides readers to code and tests.
It never proves current behavior and never becomes canon by persisting.

## Discover and read

When the project has the seams CLI installed, its reading commands speed these steps up, and each step below names the command and the way without it.
The CLI only reads; it never decides what the work needs.

1. Read `AGENTS.md` for the project's documentation homes.
   Start with the design index and the index for design overviews, then read only documents whose descriptions match the task.
   With the CLI, `seams list` catalogs those homes from each document's frontmatter, with its type, title, and authority label; read the index files themselves either way.
1. Read the user documentation and design overviews affected by the unit.
   Reading an index is preparation, not a substitute for reading the relevant document.
   With the CLI, `seams find "<words>"` reports the section each match sits in, `seams read outline <document>` prints a document's headings with their line ranges, and `seams read <document> --section "<heading>"` reads one section.
   Copy the heading text exactly as the outline prints it.
   These replace opening the whole file only when the task needs a passage; read the whole document when the task needs the argument.
1. Follow the document's code references and tests when current behavior matters.
   Treat the code, tests, and runtime evidence as reality.
1. Report important contradictions between documentation and reality instead of silently choosing one.
   Keep the correction with the work.

Without the CLI, do all of this with ordinary file reads.
The commands change how fast you find a passage, not what you read or what you owe the reader.

## Notes are scratch, not documentation

Local working notes hold short-lived experiments, research, and background.
They are the lowest-weight project memory: they authorize nothing, they are uncommitted by default, and general documentation reads do not surface them.

`seams list` and `seams find` omit notes, so a documentation read never drags scratch material in.
Read notes only when the task calls for them, with `seams list --type notes`, `seams find "<words>" --type notes`, or `seams read` by path, and never present a note as a decision or as evidence that work is done.

When your work depends on information in a note, move that information into the shared artifact that owns it, in full: the proposal for an agreed direction, the work item for scope and evidence, the owning document for a lasting explanation.
The note may stay linked as optional background, but a link to an uncommitted note is never the only record of a decision, scope, acceptance criterion, or evidence.

## Create a design overview

Create an overview when a system or subsystem has connections, constraints, or reasoning that a reader can't recover cheaply from code and user documentation.
Don't create one for every file, feature, proposal, or unit of work.

Keep the collection flat.
Use a descriptive filename for a system or subsystem overview.
Most concepts and flows belong in the subsystem overview that owns them.
Use a standalone `concept_<topic-slug>.md` or `flow_<flow-slug>.md` only when the explanation crosses subsystem boundaries or several overviews need to link to it.
These prefixes identify special cases; they aren't required document types.

State the document's audience and scope directly.
Say what it explains, what it leaves to code, tests, user documentation, or work records, and which code or tests support its main claims.
Don't open with narration about the document itself.

Include only what helps a maintainer understand the current design:

- responsibility, important connections, and relevant runtime behavior;
- a short context or codemap in the index when it helps readers choose a document;
- exact file and symbol references that agents can verify;
- standing cautions and constraints that are easy to miss;
- a past decision or rejected alternative only when it explains the current design, with a link to the proposal or canon that holds the decision;
- deployment or terminology only when readers need it.

Keep interface details in code, quality requirements in canon or tests, and volatile risks, debt estimates, task status, and implementation history in work records.
Don't create a decision log.

## Maintain during work

1. Identify the documentation affected by the unit before changing behavior.
   Include its update in the same body of work.
   When the CLI is installed, `seams impact <path> [<path>...]` lists the documents that name or link to the paths the unit changes, and `seams impact --git-diff` asks the same about the working tree's uncommitted changes.
   Its results are candidates for review, not findings: read each document and judge whether it is stale.
   Without the CLI, search the documentation homes for the changed paths.
1. Draft documentation for a new feature after its behavior becomes stable, but finish it before the work closes.
   Update existing documentation as the behavior or structure it describes changes.
1. Fold lasting contracts, rationale, and active exceptions into the owning document.
   Update the current explanation instead of appending a narrative of the latest change.
1. Update a stale or incomplete document when the work reveals the problem.
   Don't leave the only correction in a plan or work item.
1. Give each rule, contract, and status one owning home.
   Let design overviews repeat enough context to explain connections, with links to the owning documents.
   Keep task status, temporary hypotheses, execution checklists, and implementation history in the tracker or working records.
1. Verify claims against the named code and tests.
   Correct or remove claims that can't be supported.
1. Keep each document's frontmatter current: `title` and a `description` that says when to read it in every document, and `status` and `created` in proposals and plans.
   The CLI catalogs documents from these fields, so a stale description or status misleads every reader that follows, human or agent.
   The status vocabularies live in `seams-propose` and `seams-plan`.

### Greenfield flow

In greenfield work, information usually flows from **proposal to plan to design overview**.
The proposal holds the selected direction, and the plan organizes execution.
As implementation makes the design real, move the lasting explanation into the owning overview.
The proposal and plan remain history; the overview describes the current system.

Don't copy a plan wholesale into an overview.
Include only what a maintainer needs after the work is done, and create an overview only when it meets the creation test above.

## Review

- Show documentation changes alongside the implementation.
  Call out new cautions, unexpected complexity, and places where the implementation departed from the previous description.
- Verify documentation claims, code references, and links before asking the operator to rely on them.
- Ask the operator to read the relevant documentation and try the software.
  Use corrections to improve the documentation, implementation, or canon as appropriate.
  Only the operator accepts canon changes.

## Reconcile and limit growth

- Check for stale, duplicated, contradictory, and unused documents.
  Verify current-state claims against code and tests.
- Check whether finished proposals and plans contain lasting explanations that belong in an owning overview.
  Move accepted explanations without moving task status or execution history.
- Mark superseded material as historical and keep it outside normal navigation.
  Don't let old plans compete with maintained overviews.
- Add navigation tooling only when the collection is too large for a simple index.
  Don't require a catalog script or a large frontmatter schema.
