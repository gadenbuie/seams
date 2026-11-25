---
title: "seams"
description: "A set of conventions and agent skills for building software with coding agents."
---

<div class="home">
<section class="home-hero">
<div class="home-hero-grid">
<div class="home-hero-text">
<p class="home-eyebrow">Conventions and agent skills for coding agents</p>
<h1 class="home-wordmark">seams<svg class="home-stitch" viewBox="0 0 220 12" aria-hidden="true" focusable="false"><path d="M3 6 H 217" fill="none" stroke-linecap="round" stroke-width="3" stroke-dasharray="7 5"/></svg></h1>
<p class="home-lede">A working method for building software with coding agents. Each kind of project information gets a home, and any agent that opens the project can tell which statements bind it.</p>
<div class="home-actions">
<a class="home-button-primary" href="guide.md">Read the guide</a>
<button class="home-install" type="button" data-copy="npx @grrrck/seams init" aria-label="Copy the install command: npx @grrrck/seams init"><code>npx @grrrck/seams init</code><span class="home-install-hint" data-idle="copy" data-copied="copied">copy</span></button>
<a class="home-link-quiet" href="https://github.com/gadenbuie/seams">GitHub<span class="home-ext-mark" aria-hidden="true">&#8599;</span><span class="visually-hidden"> (opens in a new tab)</span></a>
</div>
<p class="home-notline">Not an application, not an agent harness, not a work tracker. You keep your coding agent, your tracker, and your review tools.</p>
</div>
<figure class="home-tree">
<p class="home-tree-title"><code>your-project/ after seams-adopt</code></p>
<div class="home-tree-body">
<p class="home-tree-line"><span>your-project/</span></p>
<p class="home-tree-line"><span>├─ <i>AGENTS.md</i></span><span class="home-tree-note">tells agents where the seams are</span></p>
<p class="home-tree-line home-tree-canon"><span>├─ <i>docs/design/</i></span><span class="home-tree-note"><b>canon</b> · what you accepted</span></p>
<p class="home-tree-line"><span>│&nbsp;&nbsp; ├─ vision.md</span></p>
<p class="home-tree-line"><span>│&nbsp;&nbsp; ├─ principles.md</span></p>
<p class="home-tree-line"><span>│&nbsp;&nbsp; └─ overviews/</span><span class="home-tree-note">how the system works now</span></p>
<p class="home-tree-line"><span>├─ <i>.agents/</i></span><span class="home-tree-note">proposals, plans, and notes</span></p>
<p class="home-tree-line"><span>└─ <i>src/</i></span><span class="home-tree-note">code and tests: what exists</span></p>
</div>
<figcaption class="home-tree-caption">seams adds no service and no build step. It adds files like these, and rules about what an agent may do with each of them.</figcaption>
</figure>
</div>
</section>
<section class="home-section home-flow">
<div class="home-section-head">
<p class="home-kicker">How work moves</p>
<h2>Every hand-off leaves a record the next stage can read.</h2>
<p class="home-section-intro">A proposal carries your decisions into planning, and work items carry the plan into implementation. As agents build, they move the lasting explanation into a design overview, so a fresh session picks the work up from the repository instead of another agent&rsquo;s memory.</p>
</div>
<ol class="home-loop">
<li class="home-loop-step">
<span class="home-loop-num" aria-hidden="true">1</span>
<span class="home-loop-who">Operator + agent</span>
<span class="home-loop-what">Discuss an idea</span>
<span class="home-loop-how">talk it through until you agree</span>
<span class="home-loop-record"><b>Leaves:</b> a proposal</span>
</li>
<li class="home-loop-step">
<span class="home-loop-num" aria-hidden="true">2</span>
<span class="home-loop-who">Operator</span>
<span class="home-loop-what">Accept it</span>
<span class="home-loop-how">you decide what the proposal means</span>
<span class="home-loop-record"><b>Leaves:</b> an accepted proposal</span>
</li>
<li class="home-loop-step">
<span class="home-loop-num" aria-hidden="true">3</span>
<span class="home-loop-who">Planner</span>
<span class="home-loop-what">Write the work items</span>
<span class="home-loop-how">small units a fresh agent can run</span>
<span class="home-loop-record"><b>Leaves:</b> the plan</span>
</li>
<li class="home-loop-step">
<span class="home-loop-num" aria-hidden="true">4</span>
<span class="home-loop-who">Agents</span>
<span class="home-loop-what">Build and review</span>
<span class="home-loop-how">implement, check each other, land the work</span>
<span class="home-loop-record"><b>Leaves:</b> code, tests, and a design overview</span>
</li>
<li class="home-loop-step">
<span class="home-loop-num" aria-hidden="true">5</span>
<span class="home-loop-who">Operator</span>
<span class="home-loop-what">Try the software</span>
<span class="home-loop-how">judge the result, correct course</span>
<span class="home-loop-record"><b>Leaves:</b> corrections or a new direction</span>
</li>
</ol>
<p class="home-loop-return"><svg width="150" height="26" viewBox="0 0 150 26" aria-hidden="true"><path d="M146 20 C 110 26, 45 24, 8 10" fill="none" stroke-width="2" stroke-dasharray="6 5" stroke-linecap="round"/><path d="M16 6 L 7 9.5 L 12 16" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Corrections or a new direction start the loop again.</p>
</section>
<section class="home-section home-model">
<div class="home-section-head">
<p class="home-kicker">What the conventions say</p>
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
<p class="home-kicker">The conventions in use</p>
<h2>This repository runs on seams.</h2>
</div>
<figure class="home-excerpt">
<p class="home-excerpt-path"><code>.agents/proposals/0001-unified-framework.md</code></p>
<div class="home-excerpt-body">
<pre class="home-excerpt-frontmatter"><code>title:   seams as a unified framework for operators and coding agents
status:  accepted
created: 2026-11-23
source:  a planning conversation between the operator and Claude</code></pre>
<blockquote class="home-excerpt-quote"><p>&ldquo;Nothing in this proposal authorizes changes to the docs until the operator accepts it.&rdquo;</p></blockquote>
</div>
<figcaption class="home-excerpt-caption">A real proposal from this repository. The record shows when it was written, who agreed, and that nothing it describes happened until the operator accepted it.</figcaption>
</figure>
</section>
<section class="home-section home-start">
<div class="home-section-head">
<p class="home-kicker">Start here</p>
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
<p>Ask your agent to run <code>npx @grrrck/seams init</code>. It installs the skills for the harnesses it detects, then hands the rest to the <code>seams-adopt</code> skill, which reads your existing files and asks before moving or rewriting anything.</p>
<p class="home-install-note">The CLI is optional. Without it, copy or link the whole <code>skills/</code> folder into your agent&rsquo;s skill directory, because the skills refer to each other&rsquo;s files.</p>
</div>
</section>
<section class="home-section home-meta">
<p>The canon for seams lives in <a href="design/index.md">docs/design/</a>, and the <a href="https://github.com/gadenbuie/seams/blob/main/AGENTS.md">AGENTS.md</a> file is the entry point for agents working on seams itself. Use the parts that fit your project.</p>
</section>
</div>
