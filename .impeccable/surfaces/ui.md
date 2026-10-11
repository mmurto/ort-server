---
version: 1
slug: "ui"
primary_target: "ui"
related_targets: []
---

# Surface brief: ORT Server UI (whole app, first surface = run overview)

Scope: every route of the ORT Server web UI; the run overview proves the world first. Mode: Operate.
Audience: developers checking runs and OSPO/compliance reviewers triaging findings; long desk sessions in office light. Dense, tool-like.
Constraints: every current feature stays; one theme with light and dark; local runs stay CREATED, so run results need synthetic data to inspect.
Chosen sketch: .impeccable/mocks/decision/assigned.html

## Direction contract

THESIS: Every run is a mission with a flight plan, set like a standards manual. Refuses the shadcn admin template: no stat-card tiles, no card grids, no blue links.

OWN-WORLD: White work sheet on a #F3F3F1 ground, full-height ink rail (#16171B) for navigation, crimson #A72145 only for brand and the current position. ORT job colours (analyzer teal, advisor violet, scanner rose, evaluator blue, reporter orange) mark jobs. Hanken Grotesk with tabular figures, JetBrains Mono for coordinates. 1px hairlines, radius 2px max, no shadows, 8px grid. States are marks: resolved struck through.

STORY: The visitor sees at once whether the run passed, where in the pipeline something happened, and how many findings of what severity; then drills into a dense table and steps through findings with J/K.

FIRST VIEWPORT: Ink rail left (brand, scope sections, counts). Sheet: top bar with breadcrumb, run-ID lookup, mode toggle, avatar. Run title 28px with status mark and meta line; Rerun (ink) and Download reports right. Full-width flight plan: timed axis, job segments sized by duration, events below. Summary row of five figures divided by hairlines. Findings table below.

FORM: Mission Manual, candidate 6 of 7, seed key 51a50305. Signature: the flight plan, reused as a compact trajectory in run lists.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
