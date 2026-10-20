# AGENTS.md

## Tools & commands

- Use `just` recipes for dev tasks; run `just` to list them.
- Everything runs in Docker; do not run linters, formatters, or tests directly on the host.
- Run `just lint` to format and lint everything.
- Run tests with `just test-django`, `just test-interop`, `just test-web-components`, `just test-e2e`, or `just test-a11y`.

## Workflow requirements

- Sign all commits (see `docs/dev/git-signing.md`).
- Tag, label, or otherwise mark AI-generated code changes.
- Disclose AI tool usage in merge requests: model names, versions, and environments.

## Project-specific context

- The project is hosted on GitLab, and CI runs on GitLab CI. Do not add GitHub Actions or rely on GitHub-specific features.
- `.github/` exists only for VS Code/Copilot instruction files, skills, and prompts.
