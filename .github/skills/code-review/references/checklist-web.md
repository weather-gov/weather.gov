# Code Review Checklist - Web/Code Changes

## The Basics
- Automated checks are passing.
- Code has been read and understood.
- Code has been run by the reviewer.
- Post-deploy steps (if any) are identified.
- (If applicable) The change is validated on the deployed environment.

## Documentation
- Changes to processes or conventions are documented in READMEs.
- New functions and methods have plain-language comments.
- New dependencies are documented in `docs/dev/dependencies.md`.

## Security
- Data from external sources is cleaned and clearly marked.
- Changes to permissions or workflow are audited.
- Changes to libraries are vetted for known vulnerabilities.
- Security false positives are documented in code and the merge request.

## Reliability
- Error handling exists for unusual or missing values.
- Interactions with external systems are wrapped in try/except (Python) or try/catch (JS).
- New functionality has unit or integration tests.
- Dependency changes are reflected in lock files (`package-lock.json`; `requirements*.txt` regenerated with `just uv` / `just uv-dev`).

## Infrastructure
- Changes are auditable and documented via a script.
- It is clear who can and should run the script.
- (If applicable) Diagrams are updated or added in PlantUML.
- (If applicable) Relevant SSPP controls are updated or have tickets to be updated.

## Accessibility
- New pages are added to the `pages` array in `tests/playwright/a11y.spec.js`.
- Meets WCAG 2.1 AA / Section 508:
  - Keyboard accessible; no keyboard traps.
  - All form inputs have explicit labels; form instructions are associated with inputs.
  - Images use `img` tags with appropriate `alt` attributes.
  - Multimedia has captioning and audio description.
  - Text has at least 4.5:1 contrast ratio with background.
  - Focus is always visible; tab order is logical.
  - Tables have proper headers and column attributes.
  - Headings are nested logically.
  - Page language is set.
  - Page is usable without CSS.
  - Links are unique and contextual.
  - Page titles are descriptive.

## Translations
- All new user-visible content is marked for translation and present in `forecast/locale/en/LC_MESSAGES/django.po` (or `djangojs.po` for JavaScript).

## Device/Browser Compatibility
- Renders correctly and interactions work in Firefox, Chrome/Edge, and Safari.
- Page is readable and usable at 480px (mobile), 640px (tablet), and 1024px (desktop).
