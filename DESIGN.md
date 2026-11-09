---
name: Resume Intelligence
description: Evidence-first resume screening for HR review, laid out as a public count.
colors:
  paper: "#fafbfc"
  sheet: "#ffffff"
  rule: "#dfe5ee"
  rule-strong: "#c3ccda"
  ink: "#152033"
  ink-2: "#3f4b5f"
  ink-3: "#5c6880"
  shell: "#1c2940"
  shell-ink: "#d6dfec"
  shell-ink-dim: "#9fb0c8"
  violet: "#5a3a9a"
  violet-soft: "#efe9f9"
  violet-ink: "#3f2672"
  direct: "#1d6b47"
  direct-soft: "#e5f3ec"
  related: "#8a5800"
  related-soft: "#fbf1dc"
  uncertain: "#a0322d"
  uncertain-soft: "#fbe9e7"
  none: "#6b778c"
typography:
  display:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  headline:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  table:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.4
  stamp:
    fontFamily: "Public Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 800
    lineHeight: 1.4
    letterSpacing: "0.06em"
rounded:
  hairline: "4px"
  chip: "6px"
  control: "8px"
  card: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
  button-review:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "40px"
  button-review-hover:
    backgroundColor: "{colors.violet-ink}"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.paper}"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "36px"
  card:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.card}"
    padding: "20px"
  state-mark-direct:
    backgroundColor: "{colors.direct-soft}"
    textColor: "{colors.direct}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  state-mark-related:
    backgroundColor: "{colors.related-soft}"
    textColor: "{colors.related}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  state-mark-not-evidenced:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.none}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  state-mark-uncertain:
    backgroundColor: "{colors.uncertain-soft}"
    textColor: "{colors.uncertain}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  review-mark-human:
    backgroundColor: "{colors.violet-soft}"
    textColor: "{colors.violet-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    padding: "2px 6px"
  stamp-fail:
    textColor: "{colors.uncertain}"
    typography: "{typography.stamp}"
    rounded: "{rounded.chip}"
    padding: "1px 6px"
  stamp-review:
    textColor: "{colors.related}"
    typography: "{typography.stamp}"
    rounded: "{rounded.chip}"
    padding: "1px 6px"
  nav-rail:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-ink-dim}"
    width: "248px"
  nav-item:
    textColor: "{colors.shell-ink-dim}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
---

# Design System: Resume Intelligence

## Overview

**Creative North Star: "The Counting Hall"**

Screening is presented as a public count, not a leaderboard. Every record is accounted for the way ballots are in a counting hall: a strip at the top of every screen states how many records were expected, scored, held for review and failed, and that count must reconcile. White result sheets sit on ruled form stock, a slate rail frames the hall, and one indelible violet ink is reserved for what a person has verified.

The system is dense, calm and typographic. Chrome is minimal so type, rules and tabular numerals carry structure; a role's result sheet reads like a round-wise result form, criteria as rounds and the total last. Machine assessment and human review are visibly separate layers: the reviewer never edits the machine's marks, and states are stamped and recorded, never hidden. It is a light theme by scene: HR reviewers at a desk under office light, reading tables for long stretches.

It refuses the grey SaaS dashboard with score donuts and gradient KPI tiles.

**Key Characteristics:**
- Ruled 24px slate-blue form stock behind white sheets
- Slate shell rail; ink-navy text on paper
- Violet only for human marks, focus and selection
- Round seal marks: shape plus word, colour only reinforces
- One fixed 0–100 score scale with 35/55/75 ticks on every bar
- Public Sans with tabular numerals throughout counts and scores
- Soft radius tokens (chip 6, control 8, card 12), never pills

## Colors

A cool slate-and-ink neutral system with one reserved human ink (violet) and a three-hue evidence vocabulary (green, amber, red) that always travels with a shape and a word.

### Primary
- **Indelible Violet** (violet): the reviewer's ink. The review submit button, the human review mark, global focus outlines, `accent-color` on native controls, and focused-input borders.
- **Violet Wash** (violet-soft): background of human review marks and text selection.
- **Deep Violet Ink** (violet-ink): text on violet wash; review history status changes; hover of the review button.

### Secondary
- **Counting-Hall Slate** (shell): the navigation rail, the mobile bar, the primary (non-review) action button, methodology step numbers.
- **Rail Chalk** (shell-ink) and **Dim Rail Chalk** (shell-ink-dim): active-adjacent and resting text on the slate rail.

### Tertiary (evidence vocabulary)
- **Ledger Green** (direct) on **Green Wash** (direct-soft): Direct evidence; passed quality checks; successful upload confirmation.
- **Assay Amber** (related) on **Amber Wash** (related-soft): Related evidence; Needs-review stamps and flags; warning checks; highlighted cited passages in the extracted text; the experience-baseline notice.
- **Correction Red** (uncertain) on **Red Wash** (uncertain-soft): Uncertain evidence; Failed stamps; failed checks; error messages; an unreconciled count.
- **Unmarked Grey** (none): the Not-evidenced seal.

### Neutral
- **Form Paper** (paper): page ground, table headers, quote wells, history rows, hover rows.
- **Sheet White** (sheet): every card, table, input and form surface.
- **Ruling Blue** (rule): card borders, row dividers, bar tracks; at 45% it draws the ruled stock.
- **Strong Ruling** (rule-strong): input and secondary-button borders, link underlines at rest, scrollbar thumb, in-progress bar segments.
- **Ink Navy** (ink): primary text, scored bar fills, filled tool chips, link underline on hover.
- **Ink 2** (ink-2) and **Ink 3** (ink-3): secondary text and metadata, captions, rank numbers, column headers.

### Named Rules
**The Indelible Ink Rule.** Violet marks only what a person has done or is doing: human review marks (In review, Verified, Shortlisted, Not shortlisted), the review submit action, focus, and selection. Machine output is never violet.

**The Shape-Plus-Word Rule.** No state is carried by colour alone. Every evidence state is a round seal glyph distinguished by fill (solid, half, empty, dashed) plus its label; where the label is visually dropped it stays in the accessible name.

## Typography

**Display Font:** Public Sans (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Public Sans
**Label/Mono Font:** none distinct; numerals use Public Sans tabular figures

**Character:** A single civic, government-form sans used at many weights. Weight and size carry hierarchy; numbers are always tabular so columns of counts and scores align.

### Hierarchy
- **Display** (700, 28px, tight leading, -0.015em): page titles only (Overview, a role's title, a candidate reference). Sign-in uses 26px.
- **Headline** (700, 20px, then 18px): methodology section heads at 20px; role panels, "Why this score" and empty states at 18px.
- **Title** (700, 16px; 600 at 15px for criterion names): card headings.
- **Body** (400, 15px, 1.5): page prose, capped near 3xl (48rem) in headers. Tables and dense lists run at 14px; supporting notes at 13px.
- **Label** (600, 12–13px): column headers, field labels, seal and review-mark text, band labels.
- **Stamp** (800, 11px, 0.06em, uppercase): only inside outlined stamps (Failed, Needs review).

### Named Rules
**The Tabular Count Rule.** Every count, rank, score, point value and month figure uses tabular numerals.

## Layout

The app is a two-zone frame: a sticky 248px slate rail at `lg` and up, and a ruled content field. On smaller screens the rail collapses to a slate top bar with a menu toggle that drops the rail open as a full-width block. The record-count strip spans the top of the content field on a white band with a ruled bottom border, and every page sits in a centred container up to 1400px, padded 20px (32px at `lg`), 32px from the top.

Pages are vertical stacks of sheets with 24–40px gaps. The overview pairs two role panels side by side at `xl`. The candidate view splits 1.25fr criteria to 1fr extracted text at `xl`, with the text panel sticky. Cards pad 16–20px; table cells pad 10–12px vertically.

The result sheet columns run in fixed order: rank, candidate, criterion rounds (one narrow column each, `lg` and up), total out of 100, experience, extraction and review. Below `lg` the round columns hide and a note says so; below `sm` the total moves under the candidate name. Rank never changes when a filter is applied.

## Elevation & Depth

Flat. Depth comes from tonal layering (white sheet on ruled paper) and 1px ruling-blue borders, not shadows. The only lift is the standalone sign-in card, which floats on plain paper with a soft ambient shadow. A selected role card doubles its bottom edge with a 1px ink line, a rule weight rather than a lift.

### Shadow Vocabulary
- **Sign-in lift** (`box-shadow: 0 1px 2px rgb(21 32 51 / 0.05), 0 8px 24px -12px rgb(21 32 51 / 0.12)`): the sign-in card only.
- **Selected underline** (`box-shadow: 0 1px 0 var(--color-ink)`): with an ink border on the active role card in the candidate view.

### Named Rules
**The Ruled Stock Rule.** The 24px ruled stock lives behind sheets, on the content field. It never appears inside a table, card or panel; sheets are always solid white.

## Shapes

Soft, nested rounding on three tokens: chips and seals at 6px, controls (buttons, inputs, selects, nav items, quote wells, notices) at 8px, cards, tables and panels at 12px. Highlighted source passages and the focus outline use a 4px hairline radius. Evidence glyphs are circles. Only the score bar and the record-count bar are fully rounded, as continuous tracks; no button, chip or tag is a pill. Stamps are upright outlined rectangles, never rotated.

## Components

### Buttons
- **Shape:** gently rounded (control, 8px), 36px tall in toolbars, 40px in forms.
- **Primary:** slate shell fill with white 14px semibold text; hover deepens to ink navy.
- **Review action:** violet fill with white text, hover to deep violet ink. Only for recording a human review.
- **Secondary:** white sheet with a strong-ruling border and ink text, optional 15px leading icon; hover to paper.
- **Text links:** ink, 1px underline in strong ruling offset 3px, darkening to ink on hover.
- **Disabled:** 60% opacity.

### Chips
- **Tool chips:** filled ink with white text for demonstrated use; strong-ruling outline with ink-2 text for listed-only; chip radius, 12.5px. A caption explains filled versus outlined.
- **Status filters (All records):** control-radius toggles; selected is ink fill with white text, unselected is a white sheet with a strong-ruling border.
- **Check and requirement badges:** chip-radius word badges on the matching wash (green, amber, red, or paper). "Ask the candidate" uses a dashed outline.

### Cards / Containers
- **Corner Style:** card (12px).
- **Background:** sheet white on ruled paper.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px ruling blue; a selected role card takes an ink border with a 1px ink underline; empty states use a dashed strong-ruling border.
- **Internal Padding:** 16px for toolbars and criterion cards, 20px for content sections.

### Inputs / Fields
- **Style:** white sheet, 1px strong-ruling border, control radius, 36–40px tall, 14px text; labels sit above in 12–13px semibold.
- **Focus:** the global 2px violet outline offset 2px; sign-in inputs swap to a violet border with a 25% violet ring.
- **Error:** a red-wash notice below the field, control radius, with `role="alert"`.

### Navigation
- **Style:** slate rail, brand mark and name at top, 14px medium items with 17px line icons, control-radius items.
- **States:** resting dim chalk; hover white at 6% white wash; active white text on a 12% white wash with `aria-current`.
- **Footer:** signed-in email and Sign out above a 10% white rule.
- **Mobile:** slate top bar with a menu toggle; the rail opens as a full-width block and closes on navigation.

### Evidence Seal (signature)
A 12px round glyph in a chip-radius word mark: Direct is a solid disc, Related a half-filled ring, Not evidenced an empty ring, Uncertain a dashed ring, each on its own wash. The bare variant drops the chip and keeps only the glyph (label in a screen-reader span and title) for dense result-sheet cells, with points beneath.

### Review Mark
Human statuses (In review, Verified, Shortlisted, Not shortlisted) show a solid 10px dot on violet wash with deep violet text. Machine-side statuses (Unreviewed, Needs review) show an empty ring in ink-3 with no fill.

### Stamp
An upright outlined record of a state that is never hidden: 1.5px border, chip radius, 11px extrabold uppercase. Red for Failed, amber for Needs review.

### Score Bar
Score in 15px bold tabular figures right-aligned in a fixed width, then a 96×8px ruling-blue track with an ink fill on one fixed 0–100 scale and white tick lines at 35, 55 and 75. An absent score reads "Not scored" rather than an empty bar.

### Record-Count Strip (signature)
On every app screen: "N of M expected records accounted for", a 10px segmented bar (scored in ink, needs review in amber, in progress in strong ruling with white diagonal hatching, failed in red) separated by white hairlines, and a legend of square swatches with labels and bold tabular counts. A mismatch adds a red "count does not reconcile" note.

### Evidence Quote
Verbatim quotes sit in paper wells at control radius with typographic quotation marks, followed by a 12px locator link that jumps to the passage in the extracted-text panel, where cited passages carry an amber wash.

## Do's and Don'ts

### Do:
- **Do** keep violet for human review marks, the review action, focus and selection only.
- **Do** pair every state with a shape and a word; keep the word in the accessible name when it is hidden.
- **Do** put the ruled 24px stock behind sheets and keep sheets solid white.
- **Do** use the chip (6px), control (8px) and card (12px) radius tokens, nested by size.
- **Do** set every count, rank, score and point in tabular numerals.
- **Do** order result sheets rank, candidate, rounds, total, experience, extraction/review, with the total after the rounds.
- **Do** draw every score bar on the same 0–100 scale with ticks at 35, 55 and 75.
- **Do** show failed and review-held records as stamps, listed and counted, never filtered out of the count.

### Don't:
- **Don't** use violet for machine output, decoration, charts or general emphasis.
- **Don't** convey any status by colour alone.
- **Don't** draw the ruled stock inside tables, cards or panels.
- **Don't** make buttons, chips or tags into full pills.
- **Don't** rotate stamps or seals.
- **Don't** lift sheets inside the app with ambient shadows; depth is white on ruled paper plus a 1px rule.
- **Don't** use score donuts, gauges or per-row rescaled bars.
