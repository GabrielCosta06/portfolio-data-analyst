# Portfolio design and interaction QA

final result: passed

Scope: the new portfolio, Commercial Intelligence (analysis, quality, engineering), and the independent Brazil/CO₂ case. The Power BI Desktop visual layout is a separately named limitation below.

## Visual evidence

- Source direction: `docs/design/portfolio-concept.png`, 1536 × 1024 generated concept board.
- Implemented full-page capture: OS temporary directory `gabriel-portfolio-qa/home-en-desktop.png`, CSS viewport 1440 × 1000, deviceScaleFactor 1.
- Actual first viewport: `gabriel-portfolio-qa/preview-viewport.png`, 1440 × 1000.
- Combined comparison input: `gabriel-portfolio-qa/design-comparison.png`. The original concept and actual full page were displayed together, scaled to 768px width each with aspect ratios preserved. The concept is a compressed page board, not a literal browser screenshot; the actual page uses readable web spacing and includes the additional public case.
- Native mobile captures: `home-mobile.png`, `analysis-mobile.png`, `quality-mobile.png`, `engineering-mobile.png`, `public-mobile.png`, 390px CSS width. Tablet overflow checks: 768 × 1024. All captures use scale factor 1.
- Focused, actually inspected surfaces: actual 1280 × 800 `assets/walkthrough-poster.png` for hero typography, equal primary actions, chart axes and icons; `analysis-desktop.png` for dashboard controls, tables and scenario; `engineering-desktop.png` for run evidence, captions, video controls and technical reading. Full-page screenshots were inspected as well as the first viewport.
- Capture method: Playwright Chromium; the Browser plugin/skill was unavailable. The site was served at `http://127.0.0.1:8080/`. No OS screenshots were used as web UI evidence.

Browser evidence is intentionally outside committed source. CI uploads the same named browser captures as `browser-evidence`; `scripts/browser_check.py` regenerates them.

## Five design surfaces

1. **Typography:** self-hosted Instrument Serif display type and DM Sans body/controls retain the editorial serif/sans relationship. The concept's heavier serif is intentionally interpreted with Instrument Serif for the built site; no claim of pixel-identical glyphs. Both Portuguese and English headings fit. Small chart axes use a mobile-specific viewBox.
2. **Spacing and layout:** open two-column hero; editorial project rail beside a framed analytical preview; a horizontal evidence sequence; a compact about/CV area. Mobile stacks the hero and project, places the evidence flow in two columns, and confines wide data tables to horizontal scroll containers.
3. **Colors/tokens:** paper, pine, sage and ochre follow the concept's palette. Surfaces use thin borders, restrained corners and no decorative shadow stack. Both hero actions deliberately use identical primary styling to satisfy the user's explicit equal-audience correction.
4. **Asset quality:** charts are real SVG data visualizations, not images of invented statistics. Icons are the licensed Bootstrap Icons source, with a valid external SVG sprite. Fonts and icons are local. The walkthrough is an actual browser recording with an actual screenshot poster and two caption tracks.
5. **Copy/content:** actual generated counts, dates, revenue trajectory and contact links replace all illustrative concept values. Synthetic scope and analytical assumptions are visible. The public study identifies a separate versioned source. No invented employer impact or fake operational monitoring is displayed.

## Comparison history and fixes

- **P1, featured preview:** an overly broad anchor-SVG rule shrank the chart to icon size. Fixed by scoping icon dimensions and explicitly sizing chart SVGs. Subsequent screenshot and browser assertion prove a full-width preview.
- **P2, preview footer height:** an SVG inside a non-anchor text link used the browser's default dimensions. Explicit icon dimensions removed the empty vertical space; later full-page captures show the corrected frame.
- **P2, locale controls:** native select parsing discarded nested span translations. Translation attributes moved to the option itself. Browser verification asserts `All months` and language persistence after navigation.
- **P2, mobile chart readability:** desktop chart coordinates made mobile text too small. Mobile-specific chart dimensions and fewer public-chart year labels now preserve readable axes. Captures and overflow checks were repeated at 390px and 768px.
- **P1, icon sprite:** duplicate XML attributes caused missing icons without a JavaScript console error. The sprite was repaired, XML parsing was added to artifact validation, and the actual post-fix first-viewport screenshot shows the rendered arrows.
- **P2, recording first frame:** a data-loading frame was unsuitable as a poster. The recording now waits for data before its opening hold and writes an actual interface screenshot as the poster. Caption intervals were aligned to the recording; playback is verified.

No actionable P0/P1/P2 issue remains within the new web surfaces. Above-the-fold copy contains only the agreed message, two equal paths, supplied skills, and a real synthetic-data preview. Intentional deviations from the compact board are documented above; this is verification of the implemented design direction and product requirements, not a pixel-equivalence claim.

## Functional evidence

`scripts/browser_check.py` passes on Chromium with no application console errors before the deliberately injected network failure. It verifies:

- Two equal home entry paths, both chart previews, keyboard skip link, PT/EN preference across navigation.
- KPI values against the published manifest, exact filtered totals, distinct order IDs, CSV contents and share/reload persistence.
- Scenario arithmetic and reset; all three injected quality faults with traceable rejection reasons.
- Snapshot ID, two-run history, browser SHA-256 verification, real video playback and PT/EN caption tracks.
- All local links, CV formats, source/evidence links and downloads; clear failed-load feedback and successful retry.
- Homepage, all three commercial panels and public study at mobile/tablet sizes without document overflow.
- Public annual values, total/per-capita switch, indexed base year, tabular values and bilingual conclusions.

Fourteen Python tests pass. Deterministic artifact checks pass. The Power BI builder validates unique model names and 15 bound report references; its ZIP uses fixed dates, normalized text, and explicit archive platform/permissions for Windows/Linux reproducibility.

## Material limits

Power BI's separate companion opened, refreshed M and executed reconciled DAX. Its Desktop visual inspection remains pending: locked-session/blank OS captures were rejected. This limitation is stated in the product and `evidence/powerbi-validation.json`. It does not affect the browser portfolio's passed visual/interaction review.

Firefox, Safari, assistive-technology screen readers and production-load behavior were not exercised. Keyboard, semantics, focus and reduced-motion behavior were considered; no claim of complete accessibility conformance is made.
