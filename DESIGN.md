---
name: ORT Server
description: A dense review tool for OSS Review Toolkit runs, set as white work sheets beside an ink navigation rail.
colors:
  ground: "#f3f3f1"
  sheet: "#ffffff"
  ink: "#16171b"
  muted-text: "#62646b"
  hover-tint: "#ededea"
  hairline: "#e4e4e0"
  field-stroke: "#cfcfc9"
  brand-crimson: "#a72145"
  rail: "#16171b"
  rail-text: "#b6b8bf"
  rail-muted: "#80838c"
  rail-active: "#24262c"
  rail-hairline: "#2a2c32"
  ok: "#067647"
  ok-soft: "#dcfae6"
  warn: "#b54708"
  warn-soft: "#fef0c7"
  err: "#c4321f"
  err-soft: "#fee4e2"
  sev-critical: "#8f1d2c"
  sev-high: "#d4421e"
  sev-medium: "#d99a06"
  sev-low: "#8a8d94"
  job-analyzer: "rgb(0, 175, 170)"
  job-advisor: "rgb(153, 123, 183)"
  job-scanner: "rgb(209, 78, 96)"
  job-evaluator: "rgb(51, 153, 204)"
  job-reporter: "rgb(242, 144, 86)"
  job-notifier: "#80838c"
  dark-ground: "#0b0c0e"
  dark-sheet: "#17181d"
  dark-ink: "#e9e9e6"
  dark-muted-text: "#9c9ea5"
  dark-hairline: "#2d2f36"
  dark-brand-crimson: "#e0577b"
  dark-rail: "#0a0a0c"
  dark-ok: "#47cd89"
  dark-warn: "#f5b041"
  dark-err: "#f0644f"
typography:
  headline:
    fontFamily: "'Hanken Grotesk Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: "2rem"
    letterSpacing: "-0.015em"
  figure:
    fontFamily: "'Hanken Grotesk Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 500
    lineHeight: "2.5rem"
    letterSpacing: "-0.015em"
    fontFeature: "tnum"
  title:
    fontFamily: "'Hanken Grotesk Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: "1.25rem"
  body:
    fontFamily: "'Hanken Grotesk Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: "1.25rem"
    fontFeature: "tnum"
  label:
    fontFamily: "'Hanken Grotesk Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: "1rem"
    letterSpacing: "0.06em"
  mark:
    fontFamily: "'Hanken Grotesk Variable', ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: "1rem"
    letterSpacing: "0.06em"
  identifier:
    fontFamily: "'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: "1rem"
rounded:
  xs: "1px"
  sm: "2px"
spacing:
  hairline: "1px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "32px"
  button-outline:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0 14px"
    height: "32px"
  button-outline-hover:
    backgroundColor: "{colors.hover-tint}"
  button-ghost-hover:
    backgroundColor: "{colors.hover-tint}"
    textColor: "{colors.ink}"
  button-destructive:
    backgroundColor: "{colors.err}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.sm}"
    height: "32px"
  input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "4px 10px"
    height: "32px"
  status-mark-finished:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ok}"
    typography: "{typography.mark}"
    rounded: "{rounded.xs}"
    padding: "0 6px"
    height: "20px"
  status-mark-finished-with-issues:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.xs}"
    height: "20px"
  status-mark-failed:
    backgroundColor: "{colors.err-soft}"
    textColor: "{colors.err}"
    rounded: "{rounded.xs}"
    height: "20px"
  status-mark-running:
    backgroundColor: "{colors.brand-crimson}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.xs}"
    height: "20px"
  status-mark-created:
    backgroundColor: "{colors.hover-tint}"
    textColor: "{colors.muted-text}"
    rounded: "{rounded.xs}"
    height: "20px"
  rail-item:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-text}"
    typography: "{typography.body}"
    padding: "0 20px"
    height: "32px"
  rail-item-active:
    backgroundColor: "{colors.rail-active}"
    textColor: "{colors.sheet}"
  tab:
    textColor: "{colors.muted-text}"
    height: "36px"
  tab-active:
    textColor: "{colors.ink}"
  filter-chip:
    textColor: "{colors.muted-text}"
    typography: "{typography.body}"
    rounded: "{rounded.xs}"
    padding: "0 6px"
    height: "24px"
  filter-chip-pressed:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.ink}"
  table-head:
    textColor: "{colors.muted-text}"
    typography: "{typography.label}"
    padding: "0 12px"
    height: "32px"
---

# Design System: ORT Server

## Overview

**Creative North Star: "The Work Sheet"**

Every screen is a white work sheet laid on a pale ground, set beside a full-height ink rail that carries navigation. The sheet is printed matter more than an app surface: 1px hairlines separate everything, corners are near-square, nothing floats at rest, and numbers are set in tabular figures so columns of counts and durations line up. The tool is built for long desk sessions over large tables of findings, so density is high and ornament is absent; colour is reserved for meaning.

Colour has strict owners. Crimson belongs to the brand and to "where you are now". The five ORT job colours belong to jobs. Green, amber and red belong to run and job status. A separate severity ramp belongs to findings. Ecosystems get ink tones so they never borrow a meaning. Links are ink, not blue.

The system replaced the earlier shadcn look outright. It rejects the admin-template vocabulary of stat-card tiles, card grids and blue links: summary figures stand in a row divided by hairlines, and lists are tables, not cards.

**Key Characteristics:**
- White sheet on a warm pale ground; ink navigation rail in both modes.
- 1px hairlines and a heavier ink rule heading timelines and tables; 2px corners at most on working surfaces.
- Flat at rest; soft shadows only on floating layers (menus, popovers, dialogs, toasts).
- Hanken Grotesk with tabular figures throughout; JetBrains Mono for identifiers.
- Colour is semantic: crimson for position, job colours for jobs, status and severity ramps for state.
- States are printed marks: flat uppercase status marks, small severity squares, resolved findings struck through.

## Colors

A near-monochrome ink-and-paper palette, with a single crimson for position and several tightly scoped semantic families.

### Primary
- **Ink** (#16171b): Text, the primary button fill, avatar fill, the ink rule over tables and the run timeline, and the rail background. Primary actions are ink, not a hue.
- **Brand Crimson** (#a72145; dark mode #e0577b): The brand and the current position only: the 2px bar on the active rail item, the active tab underline, the 2px inset bar on a selected table row, the running status mark, the live marker on an active run timeline, the loading bar, the focus ring, text caret and selection tint.

### Secondary
- **ORT Job Colours**: Analyzer teal (rgb 0,175,170), Advisor violet (rgb 153,123,183), Scanner rose (rgb 209,78,96), Evaluator blue (rgb 51,153,204), Reporter orange (rgb 242,144,86); Notifier takes rail grey (#80838c). They colour job segments on the run timeline, job-duration bars and job legends. They come from the ORT brand and are the same in both modes.

### Tertiary
- **Status family**: OK green (#067647 on #dcfae6), Warning amber (#b54708 on #fef0c7), Error red (#c4321f on #fee4e2). Text-and-tint pairs for status marks; solid fills for status segments in compact run strips. Destructive actions use Error red.
- **Severity ramp**: Critical oxblood (#8f1d2c), High vermilion (#d4421e), Medium ochre (#d99a06), Low grey (#8a8d94). Vulnerability ratings only, drawn as 8px squares and segmented bars. Rule-violation and issue severities reuse the status family (Error, Warning, and muted grey for Hint).

### Neutral
- **Ground** (#f3f3f1; dark #0b0c0e): The page behind the sheet; also secondary and muted surfaces and the pressed state of a filter chip.
- **Sheet** (#ffffff; dark #17181d): The work sheet, cards, inputs and popovers.
- **Muted Text** (#62646b; dark #9c9ea5): Secondary text, meta lines, captions, table heads, empty-cell dashes.
- **Hover Tint** (#ededea): Hover on buttons, ghost controls; the created-status tint.
- **Hairline** (#e4e4e0; dark #2d2f36): Every border and divider by default.
- **Field Stroke** (#cfcfc9): Input and outline-button borders, time-axis ticks, scrollbar thumbs.
- **Rail family**: Rail (#16171b; dark #0a0a0c), rail text (#b6b8bf), rail muted (#80838c) for section labels and counts, rail active (#24262c) for the hovered and current item, rail hairline (#2a2c32).

### Named Rules
**The One Crimson Rule.** Crimson marks the brand, the current position and the live state. It never fills a button, never colours a link, never decorates a heading.

**The Owned Colour Rule.** Every hue has one owner: job colours mark jobs, the status family marks status, the severity ramp marks severity. Ecosystems are set in ink tones (ink at 100/60/40/25%) so no meaningful colour is spent on them.

**The Ink Link Rule.** Entity links are ink at medium weight with no underline; a 1px underline at 45% ink arrives on hover, 3px below the baseline.

## Typography

**Display Font:** Hanken Grotesk Variable (with ui-sans-serif, system-ui)
**Body Font:** Hanken Grotesk Variable
**Label/Mono Font:** JetBrains Mono Variable (with ui-monospace, SFMono-Regular, Menlo)

**Character:** A plain, slightly technical grotesk set small and dense, with tabular figures switched on at the body so every count, duration and score aligns. Mono is reserved for things a user would copy: rule names, package identifiers, revisions, CVE IDs.

The type scale is compressed for density: `sm` is 13px and is the default body size; `base` is 14px (inputs); `2xl` is 28px.

### Hierarchy
- **Headline** (600, 1.75rem/2rem, -0.015em): The one page title on a sheet, such as "Run 2", followed by its status mark.
- **Figure** (500, 2rem/2.5rem, -0.015em, tabular): The large number in each summary figure.
- **Title** (600, 0.9375rem/1.25rem): Section headings on a sheet and card titles, with a muted 13px count beside them ("14 unresolved").
- **Body** (400, 0.8125rem/1.25rem): Default text, table cells, meta lines, descriptions (max 75ch).
- **Label** (500, 0.6875rem/1rem, 0.06em, uppercase, muted): Captions that name data or a control: table column heads, summary figure captions, the run timeline caption, rail section labels (10–11px), profile field terms.
- **Mark** (600, 0.6875rem/1rem, 0.04–0.06em, uppercase): Status marks, severity words and the resolved mark.
- **Identifier** (JetBrains Mono, 500, 0.75rem): Rule names, package IDs, CVE IDs, revisions; long package IDs truncate in the middle so name and version stay visible.

### Named Rules
**The Tabular Figures Rule.** Figures are tabular everywhere (set on the body). Counts sit right next to their labels, never inside pills.

**The Label Earns Its Caps Rule.** Uppercase small labels name a column, a figure, a field or a group. They are not decorative eyebrows above page headings.

## Layout

The frame is a fixed rail plus a sheet. The ink rail is 232px wide and full height (sticky on desktop; an off-canvas drawer below the `md` breakpoint, behind a 40% black scrim). The sheet sits 8px inside the viewport on desktop with a hairline border and 2px corners, on the ground colour; on phones it goes edge to edge. Inside the sheet a 48px sticky top bar (95% sheet with backdrop blur, hairline below) carries the breadcrumb, which starts at the product, the run-ID lookup, the mode toggle and the avatar. The organization is chosen in the rail's switcher, not the breadcrumb.

Content is capped at 1680px and padded 32px on desktop, 16px on phones, 24px from the top. Blocks on a sheet stack with 24px gaps; the run overview spaces major sections 32px apart and puts its two finding previews side by side from the `lg` breakpoint.

Spacing runs on a 4px base with 8px as the working step: 4, 8, 12, 16, 24, 32. Control heights are 24 (chips), 28 (small buttons), 32 (default buttons, inputs, rail items, table heads) and 36 (finding rows, tab lists).

Summary figures sit in a row of equal columns divided by vertical hairlines, the first flush with the sheet edge; below `md` they stack, divided by horizontal hairlines. Findings tables use CSS subgrid columns on desktop and fold each row into a wrapped line on phones. Narrow screens replace the run timeline's positioned labels with a list of jobs.

## Elevation & Depth

Working surfaces are flat. Depth comes from the ground/sheet contrast, the ink rail, and 1px hairlines; the `xs`, `sm` and default shadow tokens are set to none. Shadows exist only for layers that float above the sheet: dropdown menus and popovers use a soft ambient shadow, dialogs, sheets and toasts a slightly deeper one. Selection is drawn with an inset 2px crimson bar, not elevation.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 8px 24px -12px rgb(0 0 0 / 0.18)`): Popovers, dropdown menus, comboboxes.
- **Float High** (`box-shadow: 0 16px 40px -16px rgb(0 0 0 / 0.22)`): Dialogs, side sheets, toasts.
- **Selected Row** (`box-shadow: inset 2px 0 0 var(--brand)`): The selected row of a table or findings grid; this is a position mark, not elevation.

### Named Rules
**The Flat Sheet Rule.** Nothing on the sheet casts a shadow at rest or on hover. If it doesn't float over the sheet, it's flat.

## Shapes

Corners are near-square: 2px on buttons, inputs, cards, the sheet and the org switcher; 1px on status marks, badges and filter chips. Severity squares, legend swatches and timeline segments have square corners. The `xl` (3px) and `2xl` (4px) radius tokens are the ceiling; nothing on a working surface is pill-shaped. The only fully round shapes are native form affordances: radio buttons and the switch.

Borders are 1px hairlines. A heavier 1px ink rule (the foreground colour) heads the run timeline, the job-duration list and every findings table, marking where data starts. Grouped buttons share borders (negative 1px margin, squared inner corners).

## Components

### Buttons
Quiet and ink-led; the primary action is the darkest thing on the sheet.
- **Shape:** gently squared (2px); 32px high, 14px side padding (12px with an icon); 13px medium text; 16px icons.
- **Primary:** ink fill, white text; hover drops to 85% ink.
- **Outline:** sheet fill with a field-stroke border; hover fills with hover tint. Used for secondary actions such as "Download reports" and the run pager.
- **Ghost:** no fill until hover tint. Icon buttons are 32px square.
- **Destructive:** error-red fill.
- **Link:** ink text with a field-stroke underline that darkens to ink on hover.
- **States:** 150ms colour transitions, a 0.98 press scale, a 2px crimson focus outline offset 2px, 50% opacity when disabled.

### Chips
- **Style:** text-only filter chips (24px high, 1px corners, 13px muted text) separated by middots; each severity chip leads with its 8px colour square and ends with a tabular count. "All" carries the total.
- **State:** pressed chips get the ground fill, ink text and medium weight; pressing a lone selected chip returns to All.

### Status Marks
- **Status mark:** 20px high, 1px corners, 6px padding, 11px semibold uppercase with 0.06em tracking. Finished is green on green tint, finished with issues amber on amber tint, failed red on red tint, created muted on hover tint, running crimson with white text.
- **Severity mark:** an 8px square in the severity colour followed by the uppercase word.
- **Resolved:** the finding's text turns muted and is struck through; a green uppercase "Resolved" mark replaces the severity emphasis. Unresolved findings carry no mark.
- **Badge:** 20px, 1px corners, 11px semibold, 0.02em tracking; the destructive badge is red on red tint.

### Cards / Containers
- **Corner Style:** 2px.
- **Background:** sheet.
- **Shadow Strategy:** none (see Elevation).
- **Border:** 1px hairline.
- **Internal Padding:** 20px vertical and horizontal, 16px gaps; titles 15px semibold.
- Cards hold forms and grouped settings. Summary figures and finding lists are never boxed in cards.

### Inputs / Fields
- **Style:** 32px high, sheet fill, 1px field-stroke border, 2px corners, 10px side padding, crimson caret. Hover darkens the border toward muted text.
- **Focus:** border turns crimson with a 3px crimson ring at 15%.
- **Error / Disabled:** error-red border and red 15% ring; disabled at 50% opacity.

### Navigation
- **Rail:** always ink, in both modes. The brand lockup (24px icon, 15px semibold white name) heads it at 56px; the organization switcher follows (44px, rail-hairline border, a tiny uppercase "Organization" label over the name). A scope block names the current product, repository or run under a hairline, then section groups with 11px uppercase rail-muted labels.
- **Rail items:** 32px rows, 20px inset, 13px rail text, tabular counts in rail muted at the end. Hover and current both use rail active; the current item turns white, medium weight, with a 2px crimson bar on its left edge.
- **Tabs:** an underline tab list (36px, 20px gaps, hairline below); the active tab is ink with a 2px crimson underline.
- **Breadcrumb:** in the sheet's top bar; each level is a sibling switcher.
- **Mobile:** the rail becomes a drawer opened from a ghost menu button in the top bar and closes on navigation.

### Tables and the Findings Grid
- **Head:** under an ink rule; 32px (table) or 36px (findings grid) head row, uppercase muted labels, hairline below.
- **Rows:** 13px text, hairline dividers, hover at 60–70% ground; selected rows take the ground fill and the inset crimson bar. Findings rows are 36px and keyboard-steppable (J/K), with copy buttons that appear on hover or focus.
- **Empty cells:** a muted em dash.

### Run Timeline (signature)
The run's jobs on one time axis. An ink rule heads it with an uppercase caption ("Run timeline · 5 jobs") and, at the right, the elapsed time and run status in status colour. Each job is a 6px flat segment in its ORT colour, placed and sized by when it ran, drawing in from the left with an expo ease (700ms, staggered by position). Parallel jobs get extra lanes 8px apart over hairline tracks. Labels stand on 1px ink ticks above their segment; failed segments are hatched in error red at 135°. Muted time-axis ticks run below; findings hang under the job that produced them, alerting ones in error red with a red leader. While a run is active, a 2px crimson marker stands at the current position and pulses. Below `md` the timeline becomes a list of jobs with colour squares and durations.

A compact form appears in run lists: a 96px strip of 6px status-coloured segments, one per job.

### Summary Figures
A row of figures divided by hairlines: uppercase caption, the number at 32px with a muted "unresolved of N" note, a 4px segmented bar of the breakdown (1px gaps, most severe first, hairline colour when empty), and a 12px muted breakdown line joined by middots. No icons, no card.

## Interaction Patterns

### Details Panel
A findings list opens one item at a time in a details panel: beside the list from 1024px (the list keeps its main columns; long secondary columns step aside), as a full-height sheet below. A click on the row or Enter opens it, J and K move through the list with the panel following, Esc closes it. The open item lives in the URL (`marked`), so a copied link reopens it. The panel is flat sections under caps labels, never nested accordions.

### Selection and Bulk Actions
Lists that support bulk actions put a checkbox first. X toggles the selected row, shift-click selects a range, the header box selects the page. A sticky bar ("N selected · action · Clear") appears only while something is checked; bulk work runs item by item with visible progress and lists failures instead of hiding them.

### Command Palette and Shortcuts
Cmd/Ctrl+K or / opens one search field for organizations, products and repositories in scope, favorites, recent runs, runs by index or ID, and the actions of the current page. ? lists every shortcut. Shortcuts never fire while typing or while a dialog is open.

### Confirmation and Undo
Changes that take effect at once and are hard to take back (roles, superuser, plugin availability, template scope, deletes) ask in a dialog that names the thing and the change. Forms with unsaved changes ask before leaving. Settings save in place; nothing navigates away on success.

### States
Loading keeps the page frame and shows progress where the data goes. Errors show inline, with the message and "Try again", never a toast over a blank page. Empty says what is missing and the next step; filters that match nothing say so and offer "Clear filters".

### Runs
A repository opens on its runs. Rerun starts the same configuration after one confirmation (same commit or latest of the branch); changing the configuration is the secondary path. The run form lists its sections on the side, with each job's state and errors.

## Do's and Don'ts

### Do:
- **Do** set every page on a white sheet over the ground (#f3f3f1) with the ink rail beside it, in both light and dark mode.
- **Do** keep crimson to the brand, the current position (active rail item, active tab, selected row) and live state.
- **Do** colour jobs only with their ORT job colours, and use the status family and severity ramp only for status and severity.
- **Do** separate with 1px hairlines and head data blocks with an ink rule.
- **Do** keep corners at 2px (1px for marks and chips).
- **Do** set identifiers in JetBrains Mono and truncate long package IDs in the middle.
- **Do** strike through resolved findings and leave unresolved ones unmarked.
- **Do** use the product's own terms in labels: run, job, run timeline, rule violations, vulnerabilities.

### Don't:
- **Don't** put summary figures in stat-card tiles or lay content out as card grids.
- **Don't** colour links blue or underline them at rest.
- **Don't** add shadows to anything that sits on the sheet; shadows belong to menus, popovers, dialogs and toasts.
- **Don't** spend a job, status or severity colour on decoration or on ecosystems.
- **Don't** use pill shapes or rounded corners above 4px.
- **Don't** put uppercase eyebrow labels above page headings.
- **Don't** name or mimic a visual metaphor in copy (no mission or flight terms, no "T+" clocks, no skeuomorphic controls).
