# Mission Manual rollout guide

You are restyling part of the ORT Server web UI (`ui/`, React 19 + Tailwind v4 + Radix/shadcn-style components) to the new **Mission Manual** design. The foundation is already built; your job is to bring your assigned routes/components into it. Read this whole guide, then look at the reference implementations before editing.

## Hard rules

- **Every feature stays.** Do not remove controls, columns, filters, dialogs, links, permissions checks, tooltips, query params or behaviour. This is a visual redesign. Keep test ids, accessible names and visible strings that tests or e2e rely on unless you also update those tests (`ui/tests/`).
- Only edit files in your assigned scope (listed in your task). Shared files (`ui/src/components/ui/*`, `globals.css`, `page-header.tsx`, `statistics-card.tsx`, `flight-plan.tsx`, `app-rail.tsx`, `header.tsx`) are owned by the lead — do not edit them; if you need a change there, say so in your report.
- No new dependencies. Follow React Compiler notes in `ui/README.md` (components at module level, no `watch()` etc.).
- Keep the existing license headers. Match the surrounding code's comment density.
- Do not run `./gradlew`. Do not start dev servers (one already runs on http://localhost:5173 — you may NOT use a browser; verify with types/lint/tests).
- When done, run from `ui/`: `pnpm exec prettier --write <your files>`, `pnpm exec tsc --noEmit -p .`, `pnpm exec eslint src --max-warnings 0`, and `pnpm test --run` for tests related to your files (e.g. `pnpm test --run tests/unit/components/<name>`). Everything must pass. Do not commit; the lead commits.

## The world

White work sheet on a pale ground, an ink navigation rail (already built), 1px hairlines, radius 2px max, **no shadows, no gradients, no card grids**. Type: Hanken Grotesk (sans, tabular figures), JetBrains Mono for coordinates/hashes/purls/code. Crimson (`brand`) is reserved for the brand and the *current position* (selected/active/running) — never decoration. Hierarchy comes from type scale and weight, not boxes. Dense, tool-like.

### Tokens (Tailwind classes)
- Surfaces: `bg-background` (sheet, white), `bg-ground` (page ground), `bg-muted` (subtle fill, table header hover), `bg-accent` (hover).
- Text: `text-foreground`, `text-muted-foreground`. Borders: `border` (uses `--border` hairline), `border-input` (controls).
- Brand: `bg-brand`, `text-brand`, `ring-ring` (focus).
- State: `text-ok bg-ok-soft`, `text-warn bg-warn-soft`, `text-err bg-err-soft`, `bg-neutral-soft`, solid `bg-ok/bg-warn/bg-err` with `text-background`.
- Severities: `bg-sev-critical|high|medium|low`; rule/issue severities use `getRuleViolationSeverityBackgroundColor` etc. in `helpers/get-status-class.ts` (already remapped — keep using the helpers).
- Jobs: `bg-analyzer|advisor|scanner|evaluator|reporter` (ORT colours).
- Utilities: `label-caps` (11px uppercase tracked muted caption), `link` (entity links: ink, medium weight, underline on hover — use instead of blue links).
- Type scale (redefined): `text-xs` 12px, `text-sm` 13px, `text-base` 14px, `text-lg` 16px, `text-xl` 20px, `text-2xl` 28px, `text-3xl` 32px. Section titles: `text-[0.9375rem] font-semibold`. Body/meta: `text-[0.8125rem]`.
- **Never** use raw palette classes (`bg-blue-500`, `text-green-600`, `text-gray-500`, `bg-red-400`, `text-orange-500`...). Map to tokens above. Never `shadow-*`, `rounded-xl/2xl/full` on containers (avatars/switches/dots excepted), never gradient text.

### Layout building blocks (already exist — use them)
- `PageHeader` and `SheetSection` from `@/components/page-header`:
  ```tsx
  <div className='flex flex-col gap-8'>
    <PageHeader title='Secrets' description='…' actions={<Button>…</Button>} />
    <SheetSection title='Secrets' meta='12 in total' actions={…}>
      <DataTable … />
    </SheetSection>
  </div>
  ```
  `PageHeader` = h1 (28px) + optional adornment (favorite star) + description + right-aligned actions. `SheetSection` = h2 row (title, muted meta, actions) + content. Pages are full-width sheets; do not center content in `max-w-*` cards.
- `StatisticsCard` + `StatisticsRow` from `@/components/statistics-card`: summary figures divided by hairlines (no card). Wrap figures in `<StatisticsRow>` instead of `grid grid-cols-N gap-2`.
- `StatusMark` from `@/components/status-mark` for run/job statuses as text marks.
- `Card` still exists and is restyled flat (hairline border, radius 2px, no shadow). It is acceptable for **forms and detail panels** (e.g., a create form, a details block). It is **not** acceptable as a wrapper around a whole page, around tables, or as stat tiles. A page made of a single Card wrapping a DataTable must become `PageHeader` + `SheetSection` + `DataTable`. Never nest cards.
- Forms: put create/edit forms in a single column `max-w-2xl` (inside a flat `Card` is fine), labels above inputs, actions bottom-left with the primary `Button` first then `variant='outline'` Cancel.
- Buttons: primary = default (ink); secondary = `variant='outline'`; destructive = `variant='destructive'` or outline for less weight. Default size is already compact (h-8); use `size='sm'` sparingly. Put icons before labels (`<PlusIcon />Add product`), icons auto-size to 16px; in dense rows use `size-3.5`.
- Tables: `DataTable` and `ui/table.tsx` are restyled (uppercase small caps headers, hairline rows). In cells: names as `link`, coordinates/purls/hashes as `font-mono text-xs`, secondary lines `text-muted-foreground text-[0.8125rem]`, badges for severities via the helpers. Severity in tables can use a small square mark + uppercase word (see `RuleViolationsPreview` in the run overview) or the existing badges.
- Empty states: one plain sentence in `text-muted-foreground text-[0.8125rem]`, saying what is missing and the next action if any. No illustrations.
- Charts (recharts): use `var(--chart-1..5)`, job colours, or severity tokens; hairline grid `var(--border)`; axis text `var(--muted-foreground)` 11px.

## Reference implementations (read these first)
- Run overview: `ui/src/routes/organizations/$orgId/products/$productId/repositories/$repoId/runs/$runIndex/index.tsx`
- Run header: `.../runs/$runIndex/-components/run-details-bar.tsx`
- Organization overview: `ui/src/routes/organizations/$orgId/index.tsx`
- All organizations page: `ui/src/routes/organizations/index.tsx`
- Components: `ui/src/components/page-header.tsx`, `statistics-card.tsx`, `status-mark.tsx`, `ui/src/globals.css` (tokens).

## Report
Return a short list: files changed, anything you could not convert, any shared-file change you need, and test/lint/type results.
