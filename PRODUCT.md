# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 19 + Vite, TanStack Router/Query/Table, Tailwind CSS v4, Radix primitives (shadcn-style components in `ui/src/components/ui`), lucide icons, Recharts, Sonner. API client generated from the core OpenAPI spec. The redesign keeps this stack; it may replace any component, token or layout.

## What it is

ORT Server (Eclipse Apoapsis) runs the OSS Review Toolkit as a service. It analyzes source repositories for their dependencies, scans for licenses and copyrights, checks advisories for vulnerabilities, evaluates policy rules, and produces reports (SBOMs such as SPDX and CycloneDX, notice files and others).

Hierarchy: organization → product → repository → run. A run moves through the jobs analyzer → advisor → scanner → evaluator → reporter (plus notifier). Results are browsed per run and aggregated upward per product and organization.

## Users and jobs

Two primary users, weighted equally:

- **Developers / repository owners** start runs for their repositories, check whether a run passed, and fix what it flags (vulnerable or disallowed dependencies, missing licenses).
- **Compliance / OSPO reviewers** go deep into run results: rule violations, detected licenses and snippets, vulnerabilities, issues, packages and dependency graphs; they triage findings and record resolutions, and compare across products and organizations.

A secondary user is the **platform admin**: organizations, users and roles, plugins and plugin templates, run administration, infrastructure services, secrets, branding and content.

Usage scene: a work tool used at a desk, often for long review sessions over large tables of findings; also quick check-ins on run status.

## Feature scope (must be preserved)

The redesign is a complete visual overhaul and may diverge freely from upstream, but everything currently possible in the UI must remain possible. This includes, at least: home with favorites and recently started runs; run lookup by ID; org/product/repository CRUD and overviews with aggregated statistics; vulnerabilities and package search across scopes; secrets, infrastructure services, users and roles at each level; create and rerun runs with full job configuration; run overview with job statuses, rule violations, detected licenses, snippets, vulnerabilities (with CVSS), projects, packages, dependency graphs, SBOM and other reports, issues, logs, configuration; resolutions; admin plugins/templates, users, runs, content management and branding; profile and token; light and dark mode.

## Brand

Keep the Eclipse Apoapsis / ORT Server identity:

- ORT Server logo (`website/static/img/ort-server-logo.svg`): a faceted crystal with an orbit ring, in warm orange, crimson and rose with cool blue facets (#E69D6C, #DC6A2E, #F2CDB6, #B43038, #C15762, #C773A2, #93BEE2, #66A1D6, #B9D5EC). The UI home icon and favicon use it.
- Project website primary color: crimson #A72145.
- ORT worker colors (from the ORT brand) identify jobs: analyzer rgb(0,175,170), advisor rgb(153,123,183), scanner rgb(209,78,96), evaluator rgb(51,153,204), reporter rgb(242,144,86).
- Admins can rebrand the product name, favicon, home icon and footer at runtime; the design must hold up with those customized.

## Themes

One designed theme with light and dark modes replaces the current theme switcher (default / shadcn / material-design).

## Constraints

- Local development has seed data only: runs stay in `CREATED`, so screens with real run results cannot be seen with real data locally.
- Accessibility: keyboard navigation and screen-reader labels already exist in components and must not regress; aim for WCAG 2.2 AA contrast in both modes.
- Copy and formats use the product's own terms. A visual direction may borrow a look, but the UI never names or mimics its source (no metaphor labels such as "flight plan", no mission-clock "T+" times, no skeuomorphic controls).
- The organization is chosen and shown in the rail's switcher; the breadcrumb starts at the product.
