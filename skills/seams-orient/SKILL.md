---
name: seams-orient
description: "Principles for explaining something so the operator can act on it. Load before asking the operator for a decision, answer, approval, or choice; when writing a read-back of a plan or a report of landed work; when the operator lacks context, asks to be caught up, or asks for an explanation from first principles; and when work surfaces an issue the operator must decide. Also for design overviews and user documentation that explain how software works and why it is shaped that way."
metadata:
  author: Garrick Aden-Buie (@gadenbuie)
  version: "2.0"
  invocation: agent
---

# Orient the operator

Orienting a reader means starting from the human situation the software exists for, and building up to the mechanism from there.
The goal is that the reader can judge, decide, or act, not only follow along.
In seams, this is how information moves up from the work to the operator: a finding becomes a decision the operator can make.

These principles apply to a question you put to the operator, an answer to "explain this to me", a read-back, a report of landed work, and a design overview or user document written for later readers.

## Roles

- **Reader:** whoever you are explaining to.
  Often the operator.
  For documents, it is a future maintainer or contributor.
- **User:** the person the software is for, who is usually not in the conversation, e.g., an end user of an app, or a developer using a library, CLI, or API.

The reader decides on the user's behalf, so the two are often different people.
They can also be the same person, or there may be no user at all, e.g., a decision about the reader's own workflow.
Name the roles that apply, skip user framing when there is no user, and say whose experience you describe.

## Principles

### 1. Start from the reader's context, not yours

Assume the reader has not read the code, the review comment, or your reasoning.
They may arrive cold from a parallel session or a long gap.
Even when they took part in the earlier discussion, connect the dots for them instead of assuming they remember.
Do not use names you coined, and do not lean on files you read or options you already narrowed without restating them.
Use issue and pull request numbers for precision, but always describe what each one is.
A question that assumes context the reader lacks cannot be answered, so it is worse than no question.

Calibrate to what you can tell about the reader.
Skip what they plainly know, and put the depth where their question is.

### 2. Ground the mechanism in people

Before explaining how something works, explain who it works for.
Build the account in this order:

1. **What the user sees, tries to do, and expects.** A specific user in a specific situation doing a specific thing.
   When an agent, prompt, or tool is involved, add the model's perspective: what it sees, what it can do, and what it is told.
1. **What the developer intended.** What the code or design was meant to guarantee, and why that was reasonable.
1. **How the mechanism fails them.** The basic mechanics, step by step, until the user's expectation and the actual behavior visibly diverge.
   Name the condition that triggers it.

A mechanism explained before its purpose is a list of facts.
A failure explained before the expectation has nothing to fail against.

### 3. Prefer a concrete scenario to an abstraction

Walk one realistic situation through in order rather than describing the general case.
Use the product's own words and the real names of things.
An analogy can introduce an idea, but it must not stand in for the real mechanism.

### 4. Know what the reader will do with it

An explanation exists to enable something: a decision, a review, a fix, or a change.
Identify that before writing, shape the account around it, and leave out the rest.
When there is a pending choice, end by returning to it, restated in the terms the explanation established, and cover each option in the same frame: what the user would see, what it does to the developer's intent, and what it costs.
"Live with it" is an option too, so say what it costs the user.

### 5. Lead with the point, then add layers

State the question or conclusion first.
Give the smallest complete account in a few sentences, then add detail as needed.
Each paragraph carries one idea, and a reader who stops early should still have a coherent picture.

### 6. Separate the recommendation from the choice

Give your recommendation and why, and make it easy to see where the facts end and your judgment begins.
Say how confident you are.
Say what you verified by reading or running the code, and what you inferred.
Keep options in their natural order, and state the recommendation separately rather than hiding it in a label or placing it first.

### 7. Say what is at stake

Say what is blocked while the reader decides, and whether the choice can be undone.

### 8. Record principles, not only decisions

In durable documents, record the principles the design relies on and the reasoning behind them, not just what was decided.
A decision without its reasoning cannot be revisited sensibly.
Write so a later reader could re-derive the decision and tell when the circumstances that justified it have changed.
Describe behavior in durable terms rather than "currently" or "new".

### 9. Keep language steady

Define a term the first time it appears, and keep its name fixed afterward.
Keep roles distinct, so "reader" and "user" are not swapped.
Do not pad, and do not add quizzes or "pause and think" prompts.

## Applying this to a question for the operator

1. **Ask only what you cannot decide alone.** Check canon first.
   Decide routine choices yourself and say what you chose in one line.
1. **Batch related questions,** and keep working on anything they don't block.
1. **Scale the briefing to the decision:** one sentence for a trivial yes or no, and the full grounding from principles 2, 4, 6, and 7 for a consequential one.
   Deliver it where the question already lives, e.g., on the work item or in the proposal.

## Applying this to a read-back

A read-back lets the operator check a plan without reading it.
Write it in the operator's terms, not in terms of files and units:

- **What will be built,** in the order the operator can try it, starting with the first usable interface.
- **What the implementers may not do,** e.g., change a public interface, touch persistent data, or add a dependency.
- **When they will stop and ask,** i.e., the decisions the plan left open on purpose.
- **What is not selected,** so the operator can see what the plan leaves out.

Keep it short enough to check in a few minutes.
If the read-back reveals a choice the operator hasn't made, ask it as a question instead of hiding it in the plan.

## Applying this to a report of landed work

Lead with what the operator can try: the commands or steps that show the new behavior.
Then say what landed, what was deferred, which decisions wait for the operator, and which principles or invariants would have answered the questions that reached the operator.
