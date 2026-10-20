---
description: 'JavaScript bundling conventions: page-specific bundles with esbuild'
applyTo: 'forecast/frontend/**/*.js'
---
# JavaScript Bundling Conventions

- JavaScript is bundled into page-specific bundles using esbuild. Do not create a single global app bundle. See ADR `docs/architecture/decisions/0018-we-will-bundle-our-custom-javascript-into-page-specific-bundles.md`.
- Use ESM modules for all custom code. Do not use `console.*` (ESLint enforces `no-console`).
- Each page type has one entrypoint named `*.html.js` under `forecast/frontend/assets/js/` (for example, `point.html.js`, `state/alerts.html.js`). It only imports the sub-components that page needs.
- Templates load entrypoints with `<script type="module" src="{% static 'js/<name>.html.js' %}"></script>`.
- The bundler is not run in development; modules load individually for easier debugging. CI bundles every `*.html.js` file in place for testing and deployment.
- Cache busting is handled by Django's `ManifestStaticFilesStorage` (hashed filenames). There is no library version to bump.
- Web component tests live in `forecast/frontend/tests/` and run with `just test-web-components`.
- See `docs/dev/javascript-bundling.md` for background. Ignore its "Drupal libraries" section, which predates the move to Django.
