---
name: seams-propose
description: "Work with the operator on a proposal: explore an idea or a question, record what you agree, what you set aside, and what is still open, and end with the operator accepting, rejecting, deferring, or withdrawing it. On acceptance, move the durable parts into canon (vision, principles, invariants) with the operator's approval. Run only when the operator asks for it, as /seams-propose <idea | question | existing proposal path> [notes]."
metadata:
  author: Garrick Aden-Buie (@gadenbuie)
  version: "2.0"
  invocation: operator
---

# Write a proposal with the operator

A proposal is how the operator and an agent decide what to build. It records the question, the
options you explored, what the operator agreed, what was set aside, and what is still open. While it
is a draft, it authorizes nothing. When the operator accepts it, the work it describes is selected,
and its durable parts move into canon.

Put the effort here. Later stages run without the operator only if the proposal and canon answer the
questions agents will meet. Aim for principles that answer whole kinds of questions, not a list of
one-off decisions.

## Files

- Proposals live in `.agents/proposals/`, unless the project's `AGENTS.md` names another folder.
- Name each one `NNNN-<kebab-cased-slug>.md`, where `NNNN` is the next unused number, e.g.,
  `0004-offline-sync.md`.
- Start from `assets/proposal.md`.
- Canon lives in `docs/design/` (`vision.md`, `principles.md`, `invariants.md`), unless `AGENTS.md`
  says otherwise.

## Start

1. Read the project's canon in full. It is short on purpose.
1. Search `.agents/proposals/` for a proposal on the same question. Continue an open draft instead
   of starting a new one. Read rejected and deferred proposals on the topic, so you don't propose
   what the operator already set aside.
1. Read the code and tests that the question touches, enough to say what exists today. Label what
   you verified and what you inferred.
1. Create the proposal with status `draft`, and fill in the question and the motivation.

## Explore with the operator

- Work at the operator's level of detail: what users will see, what the system will guarantee, and
  what it costs. Leave files and functions to the planner.
- Offer options with tradeoffs and a recommendation, and keep the recommendation separate from the
  options (`seams-orient`). Ask only what you cannot settle from canon or the code.
- Look for established ideas before inventing new ones. When a concept already has a name in another
  field, use plain words, name the source term, and use the source term itself when it gives agents
  a stronger signal.
- Keep the operator's pace. If they ask you to slow down, acknowledge their points and hold your own
  until they are ready.
- Update the proposal as you go, so it is always the current state of the discussion:
  - **Agreed:** only what the operator agreed to. Never record your own suggestion as agreed.
  - **Set aside:** what the operator rejected, with the reason.
  - **Open questions:** what is undecided, and what each option would mean.
- Write for the operator. Follow the project's writing rules if it has any.

## Prepare for a decision

Before asking the operator to accept, rework the proposal so it is easy to check:

1. **Sort each agreed point by where it belongs:**
   - a change to vision, principles, or invariants (canon);
   - work to build (the scope that `seams-plan` will turn into units);
   - background that stays in the proposal as history.
1. **Turn decisions into principles where you can.** If a rejected option or an agreed choice rests
   on a reason that applies beyond this proposal, write the reason as a principle.
1. **Write the canon changes out exactly,** as the text you would add or replace in each canon file.
1. **State what acceptance selects,** and what it does not select. Accepting a proposal selects the
   work it describes. It does not start that work.
1. **Resolve or list every open question.** A question left open must not hide a consequential
   decision that the planner would have to make.

Then send the proposal to the operator for review, using whatever review method the project uses.

## Close

The operator decides the status. Never set it yourself on your own judgment.

- **Accepted:** set `Status: accepted on <date>`. Apply the canon changes exactly as written in the
  proposal, and show the operator the diff. The proposal becomes history.
- **Rejected:** set `Status: rejected on <date>`, with the reason. If the reason applies beyond this
  proposal, propose it as a principle.
- **Deferred:** set `Status: deferred on <date>`, with what would bring it back.
- **Withdrawn:** set `Status: withdrawn on <date>`, with why it no longer applies.

After acceptance, the next step is `/seams-plan <proposal path>`. A small proposal whose work is a
single clear change can go straight to `seams-work`.

## Rules

- A draft proposal authorizes nothing. Do not implement any part of it.
- Never edit canon except to apply changes the operator accepted.
- One proposal per question. If the discussion splits into separate questions, start a second
  proposal and link them.
- Record decisions made in conversation in the proposal in full, never as a pointer to the
  conversation. The next agent will only have the file.
