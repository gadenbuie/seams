# Vision

## Purpose

seams is a set of conventions and agent skills for people who build software with coding agents.
In seams, the person who decides what to build is called the operator. seams helps the operator and an agent agree on what to build.
Once they agree, agents plan and carry out the work with little further help from the operator.

## The problem

A project that uses coding agents collects many kinds of text, e.g., ideas, plans, notes, rules, task records, and summaries.
An agent reads all of it, and it can't tell which text the operator still stands behind.
An old plan or a stray note can then steer its work.
The operator can't read all of it, so they spend time finding and correcting what the agents misread.

Agents also build quickly.
A project can reach a finished product before the operator has used any part of it, and by then a change of direction means undoing a lot of work.

## Who seams is for

- **Operators** are one person or a small team who decide what to build and work with one or more coding agents.
- **Agents** are coding agents that plan, implement, review, and land work inside a repository.

## Outcomes

- The operator spends their time deciding what to build and accepting changes to canon.
  They don't need to supervise each task.
- An agent can tell which statements bind it, which statements only inform it, and which statements describe what exists.
- Agents can use written criteria from the operator to assess whether a feature fits, how valuable it is, and which parts deserve priority.
  They don't have to infer value from code or effort.
- The operator and fresh agents can read maintained design overviews to understand how the current system fits together without reconstructing the design from code or implementation history.
- An agent in a fresh session can continue the work from what earlier agents left in the repository and the tracker.
- Questions that need the operator reach them as decisions they can make.
  Questions that canon already answers don't reach them.
- The operator can try each piece of work as it lands, so they keep learning while agents build.

## Non-goals

- seams is not a work tracker.
  Each project chooses its own tracker.
- seams is not an autonomous pipeline, and it doesn't aim for the longest unattended run.
- seams doesn't require a project to use every file or every skill.
