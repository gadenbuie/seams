# seams

seams is a set of conventions and agent skills for building software with coding agents. You and an
agent first agree on what to build. Agents then plan the work, carry it out, review it, and land it,
and they bring you the questions that need your decision.

## What seams does

A project that uses coding agents collects ideas, plans, notes, rules, and task records. Agents read
all of it, and they can't tell which parts you still stand behind. seams gives each kind of
statement a home and a clear limit on what it authorizes:

- **Canon** in `docs/design/` holds the vision, principles, and invariants you have accepted. Only
  you change it.
- **Memory** in `.agents/` and the work tracker holds proposals, plans, notes, and work items.
  Agents use it to continue each other's work, and it authorizes nothing on its own.
- **Code and tests** are the only evidence of what exists.

Work moves from an idea, to a proposal you accept, to units of work a planner writes, to agents that
carry out each unit. You confirm a short read-back of the plan instead of reading each unit. When
work lands, you get something to try.

## Start here

| I want to                                | Read                                                                                                                                |
| :--------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| Understand how seams works               | [The guide](docs/guide.md)                                                                                                          |
| See the rules seams keeps                | [Vision](docs/design/vision.md), [principles](docs/design/principles.md), [invariants](docs/design/invariants.md)                   |
| Set up seams in a project                | [The guide's setup section](docs/guide.md#setting-up-seams-in-a-project) and the [`seams-adopt`](skills/seams-adopt/SKILL.md) skill |
| See which skills exist and who runs them | [The guide's skills section](docs/guide.md#the-skills)                                                                              |
| Read what agents follow                  | [The skills](skills/)                                                                                                               |
| Know where the ideas come from           | [Supporting evidence](docs/supporting-evidence.md)                                                                                  |

## Installing the skills

Copy or link the whole `skills/` folder into your agent harness's skill directory. The skills refer
to each other's files, so install them together.

## This repository

seams uses its own conventions. Its canon is in [`docs/design/`](docs/design/README.md), its
proposals are in `.agents/proposals/`, and its work is tracked in kata. The [`AGENTS.md`](AGENTS.md)
file is the entry point for agents working on seams itself.

seams hasn't been validated by experiment. Its ideas come from older fields, and the
[supporting evidence](docs/supporting-evidence.md) says where each one comes from and where the
comparison to agent-assisted coding stops. Use the parts that fit your project.
