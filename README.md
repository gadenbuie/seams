# seams

**The documentation framework for coding agents and the humans steering them.**

seams separates direction, design commitments, selected work, exploration, rationale, and current reality. Those boundaries let people and coding agents stay where they do their best work, seeing what they need, in the detail the task demands.

- Vision expresses direction.
- Design records commitments.
- Work authorizes implementation.
- Code and tests establish reality.

The operator chooses outcomes and resolves consequential tradeoffs. Agents can explore, shape,
implement, review, and repair within explicit boundaries. Documentation supports those activities;
it does not replace judgment, tests, or review.

seams is a convention, not a mandatory folder hierarchy, Markdown work tracker, or autonomous agent
pipeline. Work must be tracked somewhere accessible to its participants; the tracker is replaceable.
Skills are optional workflows, not a second source of authority.

## Start here

| I want to... | Start with |
| --- | --- |
| Understand the non-negotiable rules | [Constitution](docs/constitution.md) |
| Adopt seams in a new or existing project | [Framework guide](docs/framework.md) · [`seam-adopt`](skills/seam-adopt/SKILL.md) |
| Explore a feature or shape selected work | [`seam-shape`](skills/seam-shape/SKILL.md) |
| Implement, resume, repair, or finish a task | [`seam-work`](skills/seam-work/SKILL.md) |
| Audit or reconcile the documentation system | [`seam-review`](skills/seam-review/SKILL.md) |
| Use kata as the work ledger | [`seam-track-kata`](skills/seam-track-kata/SKILL.md) |
| Understand the research and intellectual lineage | [Supporting evidence](docs/supporting-evidence.md) |

The constitution and framework guide define the convention. The evidence guide explains its lineage.
The skills provide focused procedures for particular requests; load only the one needed.

## The lifecycle

1. **Orient:** identify the actual request, the smallest sufficient reading set, and where work is
   tracked.
1. **Explore when necessary:** record evidence, options, tradeoffs, and unknowns without turning
   them into commitments.
1. **Select:** the operator chooses an outcome or change to implement.
1. **Shape proportionately:** resolve consequential uncertainty and establish acceptance. Routine
   mechanical changes and well-understood fixes need much less design.
1. **Deliver bounded work:** implement, verify, review, and record discoveries and handoffs.
1. **Reconcile:** update durable documents with the change and close the work record on evidence.

Exploration can produce decisions to stop or reshape an idea. A project plan can preserve future
possibilities without authorizing all of them. A design can be committed before implementation
without claiming that code exists.

## Repository map

```text
AGENTS.md                 Entry point for agents working on seams itself
README.md                 Overview and reading paths
docs/
  constitution.md         Small normative core
  framework.md            Artifacts, workflows, adoption, and templates
  supporting-evidence.md  Research lineage and transfer cautions
  adapters/
    kata.md               kata work-ledger conventions
    markdown.md           Optional Markdown work-record conventions
skills/
  seam-adopt/SKILL.md     Fresh adoption or documentation migration
  seam-shape/SKILL.md     Exploration and proportionate design shaping
  seam-work/SKILL.md      Implementation lifecycle and handoffs
  seam-review/SKILL.md    Documentation-system review and reconciliation
  seam-track-kata/SKILL.md Optional kata CLI adapter
.kata.toml                This repository's secret-free kata workspace binding
```

The source work for this repository is tracked in **kata**. Run `kata quickstart --format contract`
before changing it. No credentials belong in `.kata.toml`; local daemon configuration stays in the
ignored `.kata.local.toml`.

## Use the skills

Each `skills/seam-*/SKILL.md` follows the conventional skill layout and can be copied or linked into
a harness's skill directory. Installing a skill is an environment-specific operation, not part of
adopting the documentation convention.

Keep the skills with the `docs/` directory or adjust their relative links when distributing them. A
skill must never override the host project's own safety rules, governing contracts, or selected
work.

## Scope

seams does not claim that one set of filenames fits every project, that every task needs design, or
that longer autonomous runs are inherently better. Its measure is whether a newcomer can tell what
is possible, what is required, what is selected, and what exists—without asking the operator to
decode the repository.
