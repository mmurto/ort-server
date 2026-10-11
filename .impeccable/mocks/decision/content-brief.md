# Shared sketch brief (ORT Server run page)

Write ONE self-contained HTML file: first viewport of a desktop web app, exactly 1440x900 (html,body fixed size, overflow hidden), inline <style>, no JavaScript, nothing fetched except Google Fonts. Under 200 lines. It is a working product screen (Operate mode): standard web controls (buttons, tabs, inputs, table with sortable headers, nav). The world only contributes type, palette, density and ONE signature move. Dense, tool-like density (13px table text is fine). No stat-card tile grids, no gradients, no glassmorphism, no emoji, no drop shadows unless the direction says so.

Product: ORT Server (Eclipse Apoapsis) runs the OSS Review Toolkit as a service. Hierarchy org > product > repository > run. A run has jobs in order: Analyzer, Advisor, Scanner, Evaluator, Reporter (ORT worker colours: analyzer rgb(0,175,170), advisor rgb(153,123,183), scanner rgb(209,78,96), evaluator rgb(51,153,204), reporter rgb(242,144,86)). Brand: ORT Server logo is a faceted crystal with an orbit ring (approximate it as a small mark built from 2-3 triangles in #DC6A2E/#B43038/#66A1D6 plus an ellipse ring — keep it under 24px); Apoapsis crimson #A72145.

Screen content (use exactly this realistic data):
- Breadcrumb: NIIS / X-Road / github.com/nordic-institute/misp2 / Run 12
- Run header: Run 12, revision develop @ 3f9c2e1, created by admin, 11 Oct 2026 16:51, duration 11m 35s, status FINISHED WITH ISSUES. Actions: Rerun, Download reports.
- Jobs: Analyzer 2m 04s ok; Advisor 0m 41s ok; Scanner 6m 52s ok; Evaluator 0m 18s finished with 14 rule violations; Reporter 1m 40s ok.
- Summary numbers: 412 packages (38 direct), 14 rule violations (3 errors, 9 warnings, 2 hints), 23 vulnerabilities (2 critical, 6 high, 11 medium, 4 low), 61 issues, 27 detected licenses.
- Left navigation of the run (sections): Overview; Compliance: Rule violations, Detected licenses, Detected snippets, Vulnerabilities; Components: Projects, Packages, Dependency graphs; Reports: SBOMs, Other; Technical: Issues, Logs, Configuration.
- A table "Rule violations" (or vulnerabilities, depending on direction) with these rows:
  ERROR  COPYLEFT_IN_SOURCE      Maven:org.mariadb.jdbc:mariadb-java-client:2.7.4   LGPL-2.1-or-later
  ERROR  VULNERABILITY_IN_PACKAGE Maven:org.apache.commons:commons-text:1.9          CVE-2022-42889 (CVSS 9.8)
  ERROR  UNHANDLED_LICENSE       NPM::left-pad:1.3.0                                   WTFPL
  WARN   MISSING_CONTRIBUTING     Maven:org.nordic-institute:misp2-web:2.6.1            -
  WARN   HIGH_SEVERITY_VULN       Maven:com.fasterxml.jackson.core:jackson-databind:2.13.2  CVE-2022-42003 (CVSS 7.5)
  WARN   DEPRECATED_LICENSE       Maven:javax.mail:mail:1.4.7                           GPL-2.0-with-classpath-exception
  HINT   COPYLEFT_LIMITED_IN_DEPS Maven:org.eclipse.jetty:jetty-server:9.4.48           EPL-2.0 OR Apache-2.0
- App-level header: product name "ORT Server", run ID lookup input, theme toggle, user avatar "AD".
