---
name: seam-shape
description: 'Explore a feature or technical question, plan a project, or shape selected design-sensitive work into verifiable implementation scope. Use for pre-design findings, options and tradeoffs, feature planning, architecture, interfaces, persistent data, safety, unclear bug diagnosis, or a decision discovered during implementation. Do not use to add ceremony to a clear mechanical change or to select product work without the operator.'
---

# Explore and shape with seams

Turn uncertainty into evidence and selected outcomes into bounded, testable work. Keep exploration
non-normative. Resolve only decisions that matter now; leave local reversible implementation choices
open.

Read the project's entry point first. Use its named tracker and adapter. The
[seams constitution](../../docs/constitution.md) defines authority; the
[framework guide](../../docs/framework.md) provides artifact and workflow details. Neither overrides
the host project's contracts.

## Choose the mode

| Request                                                         | Mode        | Output                                                                               |
| :-------------------------------------------------------------- | :---------- | :----------------------------------------------------------------------------------- |
| Explore a feature, technology, architecture, or unknown cause   | Exploration | Findings, evidence, options, tradeoffs, unknowns, and handoff                        |
| Plan a project or roadmap                                       | Direction   | Classified possibilities, constraints, dependencies, and explicit selection boundary |
| Plan or design a selected feature or other consequential change | Shaping     | Scoped work record, promoted commitments, acceptance, and verifiable units           |
| Prepare a ready unit for a worker                               | Task packet | Minimal reading, revision, write scope, checks, and handoff location                 |
| Fix a clear mechanical issue or well-understood local bug       | Not shaping | Refer to `seam-work`; retain tracking and verification                               |

A direct implementation request selects that scope. A roadmap, exploration, parent plan, or detailed
candidate does not silently select all of its contents. If implementation was not selected, do not
implement it under the cover of shaping.

## Exploration

1. Read the question, relevant code and documents, and any existing exploration. Do not load every
   project note by default.
1. Record the exploration in the chosen tracker or link a non-normative record from it. State the
   question, scope, evidence needed, and stopping condition.
1. Investigate with bounded reads, experiments, prototypes, or comparisons. Label observations,
   assumptions, and recommendations differently.
1. Maintain only useful findings:
   - verified facts and links to their evidence;
   - candidate approaches and tradeoffs;
   - unresolved questions and failed attempts worth preserving;
   - possible design implications, explicitly not commitments; and
   - the next useful question or decision.
1. Stop at the stated boundary. Report whether to continue exploration, shape a selected direction,
   record a decision to stop, or obtain operator adjudication.

Use this compact form when a separate record helps:

```markdown
# Exploring <question>

**Status:** exploring | concluded | superseded

## Question, scope, and stopping condition

## Findings and supporting evidence

## Assumptions and unknowns

## Candidate approaches and tradeoffs

## Possible design implications (not commitments)

## Handoff and next useful question
```

Closing exploration means the investigation is complete, not that its preferred option is selected.
Do not turn a prototype into production behavior without selection and normal verification.

## Project planning

1. Establish purpose, users, constraints, current reality, and known risks.
1. Separate committed constraints from candidate outcomes and open questions.
1. Describe dependencies and possible sequence at the level current evidence supports.
1. Record the selection boundary explicitly: the one outcome selected now, or that all candidates
   await operator selection.
1. Shape only selected or genuinely decision-critical near work. Do not generate a detailed backlog
   from every possibility.

Keep direction in vision, enforceable constraints in design, selected execution in the tracker, and
research in exploration or notes. A project plan is a view across these roles, not a new authority.

## Shape selected work

1. Identify the operator-selected objective and its value.
1. Read the narrowest governing contracts, relevant exploration, current code/tests, and an exemplar
   if one exists.
1. Define scope, non-goals, safety limits, and observable acceptance.
1. Resolve decisions affecting product behavior, persistent state, public or cross-component
   interfaces, safety, failure behavior, migration, and acceptance. Use exploration when evidence is
   cheaper than speculation.
1. Promote durable conclusions deliberately: edit the governing contract for enforceable rules, add
   a decision record only for significant rationale, and leave execution status in the work record.
1. Divide into coherent verifiable units with actual dependencies. Keep schema and wire-format
   transitions atomic when required. Verify one exemplar before repeated fan-out.
1. Record remaining unknowns and their owners. Do not hide them in an apparently complete plan.

Readiness means a fresh worker will not have to guess a consequential product, data, boundary,
safety, or acceptance decision. It does not mean every local detail is prescribed.

## Prepare a task packet

Give a bounded worker:

```markdown
## Objective and exclusions

## Governing documents and sections

## Input revision, files, fixtures, and exemplar

## Permitted writes and safety limits

## Expected artifacts and acceptance checks

## Work reference and handoff location
```

Point to source artifacts instead of copying their content. If the unit spans unrelated subsystems,
requires independent test groups, or cannot be reviewed coherently, reshape it.

## Handoff

Report:

- **Mode:** exploration, project planning, shaping, or task preparation;
- **Authority:** what is selected, committed, or still non-normative;
- **Artifacts:** records and durable documents read or changed;
- **Decisions:** resolved choices, evidence, and remaining operator questions; and
- **Next:** implementation reference, further exploration, or a stopping decision.

For kata operations, use `seam-track-kata`. For Markdown work records, use the project's chosen
[Markdown adapter](../../docs/adapters/markdown.md). Do not create a parallel status document.
