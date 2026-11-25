---
title: The seams brand
description: Read when changing how the seams site looks, or when making anything else that should look like seams.
---

# The seams brand

## Scope

The audience is anyone who changes the seams site or makes a new surface that should look like it, such as a diagram, a slide, or a social card.
This overview covers the visual identity: the idea behind it, the palette and what each color means, the type, the stitch motif and where it appears, the motion rules, and the cautions that keep the look from drifting.
It leaves page copy to the writing rules in `AGENTS.md`, the site's content to `README.md` and `docs/`, and the exact values to the sources named below.
The claims here are memory, not canon: verify them against `assets/css/home.css`, `assets/js/home-layout.js`, `assets/favicon.svg`, and `docmd.config.json`.

## The idea

seams is about joins: the places where one kind of project information meets another, and where one stage of work hands off to the next.
The brand takes that literally.
Everything is paper, ink, and thread.
A seam is a dashed line, a patch is a bordered square of fabric, and the one thing that needs a person is the color of a rust-red thread.

The site is a Persuade surface at the top, since the home page asks the reader to adopt the conventions, and a Read surface everywhere else, since the guide and the design documents are for reading.
The home page may be expressive.
The reading pages keep the same paper, ink, and type and drop the decoration.

## Palette

All color is defined once, as `--home-*` custom properties at the top of `assets/css/home.css`, in a light and a dark set. docmd's own variables (`--bg-color`, `--link-color`, and the rest) are pointed at those tokens, so the guide, the design pages, the search box, and the sidebar inherit the same palette without separate rules.
Every other rule in the file reads the tokens, so a new palette is a matter of replacing the two token blocks.

| Token                  | Light     | Dark      | Meaning                                               |
| :--------------------- | :-------- | :-------- | :---------------------------------------------------- |
| `--home-paper`         | `#fafaf9` | `#1a1516` | The canvas. A warm off-white, and a warm near-black.  |
| `--home-surface`       | `#ffffff` | `#241c1d` | Cards, the menubar, and the terminal body.            |
| `--home-ink`           | `#2a1a24` | `#ece5dc` | Text. A dark plum-brown, never pure black.            |
| `--home-muted`         | `#6d5e66` | `#a89b93` | Secondary text.                                       |
| `--home-border`        | `#e7ddd2` | `#372e2b` | Hairlines and quiet seams.                            |
| `--home-border-strong` | `#cfc0b1` | `#4e423d` | Borders that need to be seen, such as patches.        |
| `--home-accent`        | `#b7410e` | `#e5794e` | Rust. A decision only the operator can make.          |
| `--home-accent-strong` | `#8f300a` | `#f2946e` | Hover and pressed state of the accent.                |
| `--home-stitch`        | `#9ebc9f` | `#6f8a70` | Sage thread. Diagrams, patches, and quiet structure.  |
| `--home-plum`          | `#66225c` | `#c993b8` | The third fabric. Patches and informational callouts. |

The accent carries one meaning.
Rust marks what the operator owns: the call to action, the operator's steps on the stage thread, and the stitch under the wordmark.
It does not decorate.
A reader who sees rust should be right to think a person has to do something there.
Sage, plum, and rust together are the three fabrics of the quilt, and they appear as the tints of the path patches.

Dark mode is a re-lit version of the same palette, not an inversion.
The paper stays warm, the accent and plum lighten so they keep their contrast, and sage deepens.
Where a light color would turn muddy on dark paper, as with the mermaid diagrams, the dark set raises the tint and the stroke strength separately.

Callouts take their colors from the palette too: info is plum, tip and success are sage, and warning and danger are rust.
No page uses a callout yet, so those rules wait for the first one.

## Type

Three families, each with one job, loaded from Google Fonts at the top of `home.css`.

- **Fraunces** (500 and 600, with italic 500) sets every heading and the wordmark.
  It is a soft serif with a hand-cut feel, and it is the only voice that is allowed to have personality.
  Headings use weight 600 and a slight negative letter spacing of `-0.01em`.
  The wordmark runs at `clamp(4.2rem, 11vw, 7.5rem)` with `-0.03em`.
- **Inter** (400, 500, 600) sets the body, the buttons, and the interface.
- **JetBrains Mono** (400, 500) sets code, the install command, the tree, and the step numbers.

Small labels are sentence case in the interface, such as the section headings and the "Outcome" record labels.
The one exception is the who-labels on the stage thread, which are set in uppercase because they name roles rather than describe content.
The site does not use eyebrows or section kickers above its headings.

## The stitch

The stitch is the brand's one motif, and it is always the same drawing: a dashed line with round caps in the accent or the sage, where the dash is a little longer than the gap.
It appears in a small set of places, and each one means "a join":

- **Under the wordmark.** A seven-unit dash and five-unit gap in the accent, as an inline SVG sized to exactly the width of the word.
  The path runs 216 units before the word and the box clips it, so fresh stitches enter from the left as the pattern slides right.
- **On the buttons.** Both hero buttons carry a seam inset from their edge, like stitching on a patch. `home-layout.js` injects the SVG.
  The install button has no border of its own; its seam is its edge.
- **Between sections.** Page-level borders are `1px dashed var(--home-border)` with 3.5rem of space on each side.
  The home page draws these in place of rules under headings.
- **On the stage thread.** The five hand-off stages hang on a dashed accent line.
  Below 60rem the thread runs down the side instead of across, and the stitches travel down it.
  Operator-owned steps draw their circle in the accent, and agent-driven steps draw it in the quiet border color.
- **On the patches.** Each path card carries an inset dashed border and sits a half degree off square, alternating directions.
  Hovering straightens the patch and lifts it.
- **In the favicon and the titlebar mark.** The lowercase Fraunces `s`, tilted a few degrees counter clockwise, on a dark square hemmed in a gradient stitch that runs from light to deep rust.
  The stitching stops short of the bottom right corner, like a seam left open to be finished.
  The titlebar copy of the mark reverses its palette in each theme, and `home-layout.js` inlines it.

If a new surface needs a divider, a frame, or a connector, use the stitch.
If it needs emphasis, use the accent, and only when a person has to act.

## Other surfaces

- **The repository tree** is drawn as a terminal window: a tinted title bar with three dots in rust, sage, and plum, a clean body, and a caption set between them that reads as a comment on the file.
  Dark mode keeps the same hierarchy one step deeper.
- **Mermaid diagrams** are recolored by CSS overrides on the rendered SVG, because the renderer paints its own rainbow by node.
  Nodes sit in a soft sage wash with sage strokes, and the edges run in a sage stitch color.
  The overrides use `!important` because the renderer's own scoped rules would otherwise win.
- **The canon table** disables docmd's row hover tint, since it reads as a record rather than a list of links.

## Motion

Motion is slow and mechanical, like a sewing machine, and it is never required to understand a page.

- The wordmark stitch runs once on load for about 5.4 seconds and then rests.
  Hovering the wordmark keeps it running, and moving off lets it finish the current stitch.
- Each stitch move holds for half of its slice and slides a full stitch over the other half, because a periodic pattern shifted by a whole period looks like it did not move at all.
  The animation length is eighteen whole periods, so the end state renders exactly like the start state.
- Button seams run only while the button is pressed.
- Every animation sits inside `@media (prefers-reduced-motion: no-preference)`, so a reader who asks for reduced motion gets a still page with the same layout.
- Keyboard focus is a two pixel accent outline with a three pixel offset on every link and button of the home page.

Do not add pulsing, glowing, bouncing, or looping decoration.
The only animation that repeats forever is the one the reader asks for by hovering.

## Layout

The home page scopes its layout rules under `body.no-sidebar`, which `home-layout.js` sets on load and on docmd's client-side navigation.
That script also hides the sidebar, the page header, the table of contents, and the breadcrumbs on the home page, because the menubar already carries the site name and the page has its own call to action.
At 60rem the hero grid and the stage thread reflow to one column, and at 40rem the quilt of paths and the buttons tighten.
The menubar sits on `--home-surface`, one step above the paper, in both themes.

Section headings are Fraunces at `clamp(1.55rem, 3vw, 2.1rem)` over a muted Inter paragraph at about 1rem, capped at 46rem wide so the line length stays readable.
The lede under the wordmark is capped at 40rem.

## Cautions

- **The accent is scarce on purpose.** Adding rust to make something look lively spends the signal that tells the reader where they are needed.
- **The tokens are the only place a color is chosen.** A hard-coded hex in a rule is a bug, because it will not follow the dark set or a future palette.
  Use the token, or `color-mix` of tokens.
- **Layout lives on the home page, theme lives everywhere.** The token blocks and heading rules apply to every page, while layout rules must stay scoped under `body.no-sidebar` or they will break the guide.
- **Do not borrow docmd's blues, greens, and reds.** Callouts, links, selection, and diagrams all read from the palette above.
- **Fraunces italic is loaded on purpose.** Removing it from the font request makes emphasis in headings fall back to a synthesized slant.
- **The favicon and the titlebar mark are one drawing in two files.** Change one and check the other.
- **Copy rules still apply.** Plain words, sentence case, and no dashes in the site's text come from `AGENTS.md`, not from this document.

## Verifying a change

Run `make docs-dev` and look at the home page and one reading page in both themes and at a narrow width.
Check that the accent appears only where a person has to act, that the stitch rests after the first load, and that a reduced motion setting stops every animation.
Then run `make check`.
