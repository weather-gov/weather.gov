---
description: 'CSS styling conventions: utility-first USWDS approach'
applyTo: '**/*.scss'
---
# CSS Conventions

- Prefer USWDS utility classes in templates over custom CSS. See ADR `docs/architecture/decisions/0007-we-will-use-utility-first-approach-to-css.md`.
- Configure theme-level customization (colors, typography, spacing) in `forecast/frontend/assets/sass/_uswds-theme.scss` rather than overriding USWDS with CSS.
- When component styles are needed, add a file in `forecast/frontend/assets/sass/components/` and register it in `styles.scss` with `@use "components/<name>";`.
- In component files, `@use "uswds-core" as *;` and use USWDS tokens and mixins (`color()`, `units()`, `at-media()`, `u-*`) instead of hard-coded values. Reuse USWDS components with `@extend .usa-*` where appropriate.
- Compile styles with `just css`. Format and lint with `just format-style` and `just lint-style` (Stylelint, `stylelint-config-standard-scss`).
