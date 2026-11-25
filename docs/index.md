---
title: "seams"
description: "A set of conventions and agent skills for building software with coding agents."
---

<div class="home">
<section class="home-hero">
<div class="home-hero-grid">
<div class="home-hero-text">
<h1 class="home-wordmark">seams<svg class="home-stitch" viewBox="0 0 220 12" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M-213 6 H 217" fill="none" stroke-linecap="round" stroke-width="3" stroke-dasharray="7 5"/></svg></h1>
<p class="home-lede">A set of conventions and agent skills for building software with coding agents. Each kind of project information gets a home, and any agent that opens the project can tell which statements bind it.</p>
<div class="home-actions">
<a class="home-button-primary" href="guide.md">Read the guide</a>
<button class="home-install" type="button" data-copy="npx @grrrck/seams init" aria-label="Copy the install command: npx @grrrck/seams init"><code>npx @grrrck/seams init</code><span class="home-install-hint" data-idle="copy" data-copied="copied">copy</span></button>
</div>
<div class="home-ext-row">
<a class="home-ext" href="https://github.com/gadenbuie/seams" target="_blank" rel="noopener noreferrer" aria-label="seams on GitHub, opens in a new tab" title="GitHub"><svg class="home-ext-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a>
<a class="home-ext" href="https://www.npmjs.com/package/@grrrck/seams" target="_blank" rel="noopener noreferrer" aria-label="seams on npm, opens in a new tab" title="npm"><svg class="home-ext-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true" focusable="false"><path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"/></svg></a>
</div>
<p class="home-notline">Not an application, not an agent harness, not a work tracker. You keep your coding agent, your tracker, and your review tools.</p>
</div>
<figure class="home-tree">
<p class="home-tree-title"><code>your-project/ after seams-adopt</code></p>
<div class="home-tree-body">
<p class="home-tree-line"><i>your-project/</i></p>
<p class="home-tree-line"><span class="home-tree-branch">├─ </span><i>AGENTS.md</i><span class="home-tree-note">tells agents where the seams are</span></p>
<p class="home-tree-line home-tree-canon"><span class="home-tree-branch">├─ </span><i>docs/design/</i><span class="home-tree-note"><b>canon</b> · what binds the project</span></p>
<p class="home-tree-line"><span class="home-tree-branch">│&nbsp;&nbsp; ├─ </span>vision.md<span class="home-tree-note">what the project is for</span></p>
<p class="home-tree-line"><span class="home-tree-branch">│&nbsp;&nbsp; ├─ </span>principles.md<span class="home-tree-note">how to decide</span></p>
<p class="home-tree-line"><span class="home-tree-branch">│&nbsp;&nbsp; ├─ </span>invariants.md<span class="home-tree-note">rules that always hold</span></p>
<p class="home-tree-line"><span class="home-tree-branch">│&nbsp;&nbsp; └─ </span><i>overviews/</i><span class="home-tree-note">how the system works now</span></p>
<p class="home-tree-line"><span class="home-tree-branch">├─ </span><i>.agents/</i></p>
<p class="home-tree-line"><span class="home-tree-branch">│&nbsp;&nbsp; ├─ </span><i>proposals/</i><span class="home-tree-note">proposals for work</span></p>
<p class="home-tree-line"><span class="home-tree-branch">│&nbsp;&nbsp; └─ </span><i>plans/</i><span class="home-tree-note">implementation plans</span></p>
<p class="home-tree-line"><span class="home-tree-branch">└─ </span><i>...</i><span class="home-tree-note">code and tests: what exists</span></p>
</div>
<figcaption class="home-tree-caption">seams adds no service and no build step. It adds files like these, and rules about what an agent may do with each of them.</figcaption>
</figure>
</div>
</section>
<section class="home-section home-flow">
<div class="home-section-head">
<h2>Every hand-off leaves a record the next stage can read.</h2>
<p class="home-section-intro">A proposal carries your decisions into planning, and work items carry the plan into implementation. As agents build, they move the lasting explanation into a design overview, so a fresh session picks the work up from the repository instead of another agent&rsquo;s memory.</p>
</div>
<ol class="home-loop">
<li class="home-loop-step">
<span class="home-loop-num" aria-hidden="true">1</span>
<span class="home-loop-who">Operator + agent</span>
<span class="home-loop-what">Discuss an idea</span>
<span class="home-loop-how">Talk it through until you agree</span>
<span class="home-loop-record"><span class="home-loop-record-label">Outcome</span>A proposal</span>
</li>
<li class="home-loop-step">
<span class="home-loop-num" aria-hidden="true">2</span>
<span class="home-loop-who">Operator</span>
<span class="home-loop-what">Accept it</span>
<span class="home-loop-how">You decide what the proposal means</span>
<span class="home-loop-record"><span class="home-loop-record-label">Outcome</span>An accepted proposal</span>
</li>
<li class="home-loop-step">
<span class="home-loop-num" aria-hidden="true">3</span>
<span class="home-loop-who">Planner</span>
<span class="home-loop-what">Write the work items</span>
<span class="home-loop-how">Small units a fresh agent can run</span>
<span class="home-loop-record"><span class="home-loop-record-label">Outcome</span>The plan</span>
</li>
<li class="home-loop-step">
<span class="home-loop-num" aria-hidden="true">4</span>
<span class="home-loop-who">Agents</span>
<span class="home-loop-what">Build and review</span>
<span class="home-loop-how">Implement, check each other, land the work</span>
<span class="home-loop-record"><span class="home-loop-record-label">Outcome</span>Code, tests, and a design overview</span>
</li>
<li class="home-loop-step">
<span class="home-loop-num" aria-hidden="true">5</span>
<span class="home-loop-who">Operator</span>
<span class="home-loop-what">Try the software</span>
<span class="home-loop-how">Judge the result, correct course</span>
<span class="home-loop-record"><span class="home-loop-record-label">Outcome</span>Corrections or a new direction</span>
</li>
</ol>
<p class="home-loop-return"><svg viewBox="0 0 1100 36" preserveAspectRatio="none" aria-hidden="true"><path d="M1092 6 C 880 34, 220 34, 18 16" fill="none" stroke-width="2" stroke-dasharray="6 5" stroke-linecap="round"/><path d="M30 6 L 15 16 L 32 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Corrections or a new direction start the loop again.</span></p>
</section>
<section class="home-section home-model">
<div class="home-section-head">
<h2>Each kind of information carries its own permission.</h2>
<p class="home-section-intro">An agent can read an abandoned plan and an accepted rule without knowing which one should guide its work. The seams separate them.</p>
</div>
<table class="home-perm">
<thead>
<tr><th scope="col">Kind</th><th scope="col">Where it lives</th><th scope="col">What an agent may do</th></tr>
</thead>
<tbody>
<tr>
<th scope="row" class="home-perm-kind home-perm-canon">canon</th>
<td class="home-perm-where"><code>docs/design/</code></td>
<td>Follow it. Only you can accept a change to it.</td>
</tr>
<tr>
<th scope="row" class="home-perm-kind">memory</th>
<td class="home-perm-where"><code>.agents/</code> · <code>docs/design/overviews/</code> · your tracker</td>
<td>Use it for the work it describes. A proposal authorizes nothing until you accept it.</td>
</tr>
<tr>
<th scope="row" class="home-perm-kind">reality</th>
<td class="home-perm-where">your repository and running services</td>
<td>Use it as evidence of what is true today.</td>
</tr>
</tbody>
</table>
<p class="home-footnote">These names are not software components. A project can use different paths when its agent instructions name them. Memory has no single shape or home, and keeping it clear takes deliberate maintenance.</p>
</section>
<section class="home-section home-proof">
<div class="home-section-head">
<h2>This repository runs on seams.</h2>
</div>
<figure class="home-excerpt">
<p class="home-excerpt-path"><code>.agents/proposals/0001-unified-framework.md</code></p>
<div class="home-excerpt-body">
<pre class="home-excerpt-frontmatter"><code>title:   seams as a unified framework for operators and coding agents
status:  accepted
created: 2026-11-23
source:  a planning conversation between the operator and Claude</code></pre>
<div class="home-excerpt-more">
<div class="home-excerpt-doc" id="home-proposal-doc">
<h3>Summary</h3>
<p>seams will become the single framework that combines the current seams docs with the operator's planning and routing skills (<code>work-shaping</code>, <code>orient-me</code>, <code>kata-plan</code>, and <code>route-work</code>). The framework covers the steps from an idea to work that agents can carry out without the operator. Work tracking stays open, so a project can use kata or any other tracker.</p>
<p>The ideas below came out of one conversation. The operator agreed to most of them during the conversation, and the proposal lists the rest as open questions. Nothing in this proposal authorizes changes to the docs until the operator accepts it.</p>
<div class="home-excerpt-rest">
<h3>Motivation</h3>
<p>Coding agents and humans have different strengths and limits, and the current docs don't account for both. A human can only read a limited amount of text in one sitting. An agent reads everything, but it can't tell which sentences the operator considers important, so a small sentence in an old file can end up guiding its work. Agents also build a half-formed plan exactly as written, and they keep a ledger of every decision instead of turning decisions into reusable lessons. Over time, unaccepted plans and notes pile up, and the operator spends a lot of effort pulling the project back toward their intent.</p>
<p>Most harnesses and tools manage work items. Few of them help with the step before the work, where an operator and an agent decide what the work is. seams should focus on that step.</p>
<h3>Guiding principle</h3>
<p>The framework accounts for the strengths and limits of both parties. It meets humans where they are, lets them work in the way they work best, and accounts for their mistakes and limits.</p>
<p>The same holds for agents. Coding agents complement human abilities in many ways. They are also fairly simple systems working in well-defined environments, so their limits are predictable, and the framework's conventions should account for those limits.</p>
<h3>Ideas agreed in discussion</h3>
<h4>Kinds of seams</h4>
<p>A seam is a boundary in the project's information. The framework uses these kinds of seams:</p>
<ul>
<li><strong>Authority seams</strong> separate statements by type, i.e., what kind of claim a statement makes.</li>
<li><strong>Work seams</strong> separate statements by scope, i.e., which selected unit of work a statement belongs to.</li>
<li><strong>Context seams</strong> decide which typed and scoped statements a reader receives at a given boundary, e.g., when a new agent session starts. Each reader gets a projection of the project, meaning a subset of statements chosen for that reader's role and task.</li>
</ul>
<p>Agents have no sense of time, so the framework talks about context boundaries rather than points in time.</p>
<h4>Statement types, authority, and grounding</h4>
<p>Each statement in a project has a type, e.g., aim, candidate, finding, principle, invariant, open decision, selection, progress note, or observation of the code. Different readers should see different types. For example, an implementer should not see unselected candidates, and a reviewer should not see the implementer's progress notes.</p>
<p>Authority is the core term for the type of a statement, and it says what a statement allows or requires. For example, a reviewer can reject a change that breaks an invariant, while a candidate authorizes nothing. The framework keeps &ldquo;authority&rdquo; because the word gives agents a clear signal about what a statement permits.</p>
<p>Grounding is a second property of a statement, and it says how much the code and tests back the statement, i.e., planned, applied, or enforced. A principle that nobody has applied yet has less grounding than a principle that the code and tests now follow. A statement with less grounding is easier to set aside. Some principles are aspirational, i.e., how the operator wants to run the project, and others are learned from the work.</p>
<h4>Where docs live</h4>
<p>Canon lives in <code>docs/design/</code>, because canon is the shared record that humans read. Memory, e.g., plans, work records, and shaping plans, lives in <code>.agents/</code>, so the location of a file shows that it is not canon. Agents read both folders. Shaping plans live in <code>.agents/proposals/</code> while they are drafts, and their accepted parts move into <code>docs/design/</code>.</p>
<p>Canon uses these files:</p>
<ul>
<li><code>docs/design/README.md</code> is a short index for operators. It lists the canon files and what each one holds, and it stays as thin as possible.</li>
<li><code>docs/design/vision.md</code> holds aims and direction.</li>
<li><code>docs/design/principles.md</code> holds decision principles.</li>
<li><code>docs/design/invariants.md</code> holds invariants. If the file grows too large, the invariants can move into a <code>docs/design/invariants/</code> folder with one file per area.</li>
</ul>
<h4>Separate docs for operators and agents</h4>
<p>The framework addresses operators and agents separately. Operators get short docs written at their level of detail, and agents get the conventions they need to follow.</p>
<h4>Memory and canon</h4>
<p>Canon is the set of statements the operator has accepted, i.e., vision, invariants, principles, and current selections. Canon changes only when the operator accepts a change.</p>
<p>Memory is working material, e.g., planning notes, explored options, and drafts. Planning sessions need memory so that later sessions can continue the work. Memory never becomes canon just because it persists, because it is detailed, or because it is recent. Drift is a change to the project's direction that the operator never accepted.</p>
<h4>The process from idea to finished work</h4>
<p>The process moves through these stages:</p>
<ol>
<li>The operator says &ldquo;we should do X&rdquo;.</li>
<li>The operator and an agent plan what doing X means. The output is a shaping plan, and the operator accepts or rejects it. Acceptance is the selection of the work.</li>
<li>An agent shapes the selected work so that it can be implemented. Shaping splits the work into units and also adds specification.</li>
<li>A work tracker follows the work to completion, records what happened, and holds evidence that the work was done.</li>
</ol>
<p>The goal is that the operator is not needed in stages 3 and 4. Stage 2 has to produce enough canon, especially principles, that agents can settle most later questions on their own.</p>
<p>The process has no separate stage at the end for gathering feedback. In practice, the operator and agents reconcile what they learn during implementation, while they deal with the problems that come up. When a question from implementation is resolved, the answer is merged into canon in one of these ways:</p>
<ul>
<li>If the answer stands on its own, it reaches the main branch right away, even if the branch that raised the question is not finished.</li>
<li>If the answer is tied to the implementation, it reaches the main branch when the implementation is merged.</li>
</ul>
<p>seams owns stages 1 to 3 and the rules for what passes between stages. Stage 4, work tracking, is the one part the framework leaves open to the user. kata is one such tracker. It is the shared working surface for agents, and it is not the long-term shared record between the operator and agents.</p>
<h4>Tracker duties and skill invocation</h4>
<p>A work tracker only has to say where things live, e.g., how the tracker marks an open question on a work item. Skills decide when things happen and who does them. Model-invoked skills cover the limits of agents, because an agent loads them when it meets a situation. Human-invoked skills cover the intent of the operator, because the operator runs them when they know what they want to do.</p>
<ul>
<li><strong>Questions found during the work</strong> use a model-invoked skill. An agent that meets a consequential question checks canon first. If canon doesn't answer the question, the agent records it on the work item as an open decision and stops the affected path. The planner or the router then picks up the question.</li>
<li><strong>Reports of what became real</strong> can come automatically when routed work finishes, or the operator can ask for one when they want to catch up.</li>
<li><strong>Changes to canon</strong> always need the operator's acceptance.</li>
</ul>
<h4>Default execution skills</h4>
<p>The general patterns in work-shaping belong in seams. seams also ships route-work as the default way to run stages 3 and 4. A project can replace route-work with another way of running the work, as long as it follows the rules for what passes between stages.</p>
<h4>Shaping plans</h4>
<p>A shaping plan is a proposal, similar to a Python Enhancement Proposal (PEP). It has a status, and every shaping plan ends as accepted, rejected, deferred, or withdrawn. When a plan is accepted, its durable parts go into canon and are committed to the repository, and the plan itself becomes history. The proposal you are reading is the first shaping plan.</p>
<h4>Planning in layers</h4>
<p>Planning works best in several layers of increasing detail, a method known as stepwise refinement (Wirth, 1971). A first plan written with the operator is not ready to hand to implementers, because agents will build a half-formed plan exactly as written. Someone then breaks the plan down again, either by writing out the details or by having an agent split it into units and route them. This layer needs some flexibility, because some details only become clear once work starts.</p>
<p>The operator applies work-shaping both during planning and when the router dispatches work. The framework accepts this overlap, because the right layer depends on the work.</p>
<h4>Translation between levels of detail</h4>
<p>The planner works at the operator's level of detail and at the implementers' level, and it translates in both directions.</p>
<ul>
<li><strong>Downward</strong>, the planner turns accepted plans into units of work. A unit is ready when no consequential decision is left unbound, i.e., an implementer will not have to silently make a product, data, interface, safety, or acceptance decision.</li>
<li><strong>Read-back</strong> lets the operator check the downward translation. The planner writes, in the operator's terms, what the implementers will do, what they may not do, and when they will stop and ask. The operator checks the read-back instead of the detailed units. The read-back is an artifact on the plan, not a conversation between agents.</li>
<li><strong>Upward</strong>, the planner turns findings from the work into decisions the operator can make. Questions found during implementation are stored on the work item. The planner answers them from canon when it can and passes the rest to the operator.</li>
</ul>
<h4>Escalation and learning</h4>
<p>Some questions have to reach the operator, because nobody can predict every problem before implementation starts. For example, a change can break an unrelated test or an assumption elsewhere in the code. The framework should still keep avoidable escalations to a minimum.</p>
<p>After each escalation, the planner asks whether canon could have answered the question. If canon could have answered it, the answer becomes a principle, a non-goal, or a constraint in canon. If not, the answer stays as a finding on the work item.</p>
<h4>Principles over a ledger of decisions</h4>
<p>The framework records how decisions are made, not every decision. Where possible, a rejected option should become a reusable principle. Agents tend to keep a ledger of every decision, and a ledger leaves the operator to turn decisions into lessons by hand.</p>
<p>For the same reason, the framework drops architecture decision records (ADRs). Useful reasons become principles, and the history of a decision stays in its archived shaping plan.</p>
<h4>Decomposition and early feedback</h4>
<p>Systems built from small separate parts are cheaper to build and cheaper to change. With AI help, an operator can reach a finished product before they have had time to learn from building it, and changing direction is harder once the code exists.</p>
<p>Work should therefore first land the smallest interface that lets the operator use the core behavior, e.g., a command line tool before a web UI. Later interfaces, e.g., a web UI or an MCP server, are then built on that core. After work lands, the operator should get something to try, e.g., &ldquo;the command now does X, run it like this&rdquo;, rather than only a summary to read.</p>
<p>Small agents are one case of this broader point about decomposition, and the framework keeps small, bounded workers as a design goal.</p>
<h4>Invariants</h4>
<p>The framework uses &ldquo;invariant&rdquo; for a commitment the operator has accepted, whether or not the code follows it yet. A commitment that the code doesn't follow yet is marked as planned. Engineers already know the word, and colleagues of the operator already use it for binding project rules.</p>
<p>One way to enforce invariants is to link each invariant to the code files it governs. Each governed file starts with a header line that names its invariant, and a lint checks the links in both directions. seams should consider this approach.</p>
<h4>Stateless coordination</h4>
<p>Agents are stateless, so the framework must not depend on agents talking directly to each other. Communication happens in the open, through artifacts any agent can read. For example, one agent can answer a question left on a task, and a different agent can then use the answer. The research term for coordination through traces left in a shared environment is stigmergy.</p>
<h4>Building on existing ideas</h4>
<p>seams applies established ideas to agent-assisted coding and avoids partly reinventing them. Where a concept already exists, the framework names it and cites its source in the supporting evidence. The framework avoids military doctrine as a source when a reasonable alternative exists.</p>
<p>The framework prefers plain words and names the source term next to them, so readers can follow the connection. It uses the source term itself when the term gives agents a stronger signal, i.e., when the term makes an agent more likely to behave the way the operator wants.</p>
<h3>Set aside during discussion</h3>
<ul>
<li><strong>Architecture decision records.</strong> Principles and archived shaping plans replace them.</li>
<li><strong>Military doctrine,</strong> including commander's intent and the backbrief. The framework uses read-back from aviation and healthcare instead.</li>
<li><strong>Time as a kind of seam.</strong> Context seams replace it.</li>
<li><strong>Treating every escalation as a planning failure.</strong> Some escalations come from things nobody could know in advance.</li>
<li><strong>Treating small agents as a secondary benefit.</strong> The operator sees small agents as one case of decomposition, which is central to the framework.</li>
<li><strong>An automated test of the framework.</strong> Testing is not a priority for now.</li>
</ul>
<h3>Open questions</h3>
<p>None remain at acceptance.</p>
<h3>Changes queued by this proposal</h3>
<p>None of these changes is selected yet, and the operator will select each one.</p>
<p>Supporting evidence additions, with each citation checked first:</p>
<ul>
<li>origin of &ldquo;normative&rdquo; and &ldquo;informative&rdquo; in standards writing (W3C, IETF, RFC 2119)</li>
<li>proposal lifecycles such as PEPs and Rust RFCs</li>
<li>stepwise refinement (Wirth)</li>
<li>an expanded section on joint cognitive systems, including &ldquo;Ten Challenges for Making Automation a Team Player&rdquo; (Klein, Woods, and others, 2004)</li>
<li>&ldquo;Ironies of Automation&rdquo; (Bainbridge, 1983) and situation awareness (Endsley)</li>
<li>stigmergy and the stateless constraint in REST (Fielding)</li>
<li>read-back and closed-loop communication</li>
<li>design by contract (Meyer) as the source of &ldquo;invariant&rdquo;</li>
<li>walking skeleton and ports and adapters (Cockburn)</li>
<li>double-loop learning (Argyris and Sch&ouml;n)</li>
<li>mentioned but not yet discussed: speech act theory, Fitts lists, ratio decidendi, SBAR, and drift into failure (Dekker)</li>
</ul>
<p>Framework and constitution:</p>
<ul>
<li>add shaping plans, memory and canon, and the stages from idea to finished work</li>
<li>replace decision records with principles</li>
<li>adopt invariants, with a planned marker</li>
<li>add read-back and the upward path for questions</li>
<li>add the rule that the smallest usable interface lands first</li>
</ul>
<p>Skills:</p>
<ul>
<li>bring work-shaping, orient-me, kata-plan, and route-work into seams</li>
<li>keep kata as a separate tracker adapter</li>
</ul>
<h3>Outcome</h3>
<p>On 2026-11-23, the operator selected all of the queued changes by direct request and asked for the docs and skills to be rewritten to implement this proposal. The implementation differs from the text above in these ways, and the canon in <code>docs/design/</code> is the current statement of each:</p>
<ul>
<li><strong>Terms.</strong> &ldquo;Shaping plan&rdquo; became &ldquo;proposal&rdquo;. Stage 3 is called &ldquo;plan&rdquo;, and stage 4 is called &ldquo;do&rdquo;. The constitution and the framework guide were replaced by <code>docs/design/</code> and <code>docs/guide.md</code>.</li>
<li><strong>Skills.</strong> The skills are named <code>seams-adopt</code>, <code>seams-propose</code>, <code>seams-plan</code>, <code>seams-route</code>, <code>seams-reconcile</code>, <code>seams-work</code>, <code>seams-shape</code>, <code>seams-orient</code>, and <code>seams-track</code>. kata-plan became the tracker-neutral <code>seams-plan</code>, and the kata details moved to <code>seams-track</code>.</li>
<li><strong>Homes.</strong> Canon holds vision, principles, and invariants. Accepted proposals record selections, and work records live in the tracker, not in <code>.agents/</code>.</li>
</ul>
</div>
</div>
<div class="home-excerpt-actions">
<button class="home-excerpt-toggle" type="button" aria-expanded="false" aria-controls="home-proposal-doc">Read the proposal</button>
</div>
</div>
<div class="home-excerpt-hidebar">
<button class="home-excerpt-hide" type="button">Hide the full text</button>
</div>
</div>
<figcaption class="home-excerpt-caption">A real proposal from this repository, reproduced in full. The record shows when it was written, who agreed, and that nothing it describes happened until the operator accepted it.</figcaption>
</figure>
</section>
<section class="home-section home-start">
<div class="home-section-head">
<h2>Pick the path that matches your question.</h2>
</div>
<ul class="home-paths">
<li class="home-path"><span class="home-path-want">Understand how seams works</span><a class="home-path-link" href="guide.md">The guide</a></li>
<li class="home-path"><span class="home-path-want">Start a project with the CLI</span><a class="home-path-link" href="guide.md#setting-up-seams-in-a-project">Setup in the guide</a></li>
<li class="home-path"><span class="home-path-want">See which skills exist and who runs them</span><a class="home-path-link" href="guide.md#the-skills">The skills</a></li>
<li class="home-path"><span class="home-path-want">See the rules seams keeps</span><span class="home-path-links"><a class="home-path-link" href="design/vision.md">Vision</a><a class="home-path-link" href="design/principles.md">Principles</a><a class="home-path-link" href="design/invariants.md">Invariants</a></span></li>
<li class="home-path"><span class="home-path-want">Know where the ideas come from</span><a class="home-path-link" href="supporting-evidence.md">Supporting evidence</a></li>
</ul>
</section>
<section class="home-section home-install-strip">
<div class="home-install-text">
<h2>Start a project</h2>
<div class="home-install-prompt">
<p class="home-install-cmd">Run <code>npx @grrrck/seams init</code> to set up seams in this project.</p>
<button class="home-copy" type="button" data-copy="Run npx @grrrck/seams init to set up seams in this project." aria-label="Copy the prompt: Run npx @grrrck/seams init to set up seams in this project."><span class="home-install-hint" data-idle="copy" data-copied="copied">copy</span></button>
</div>
<p>Paste the prompt into any agent that can reach your project. It installs the skills for the harnesses it detects, then hands the rest to the <code>seams-adopt</code> skill, which reads your existing files and asks before moving or rewriting anything.</p>
<p class="home-install-note">The CLI is optional. Without it, copy or link the whole <code>skills/</code> folder into your agent&rsquo;s skill directory, because the skills refer to each other&rsquo;s files.</p>
</div>
</section>
</div>
