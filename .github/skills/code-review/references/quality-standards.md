# Quality Standards (QASP)

These are the project's quality standards derived from `docs/dev/qasp.md`.

## Test Coverage
- Code accepted into main must have at least 90% test coverage.
- All tests are reviewed for relevance and correctness.
- Tests run automatically before deployment.
- Test fixtures use simulated data, not production data.

## Code Style
- Code follows an industry-standard style guide.
- Code is well-structured for maintainability.
- Code includes comments explaining major functionality.
- Automated linting and static analysis produce no errors.

## Accessibility
- Automated accessibility scanning (WCAG 2.1 AA) produces zero errors.
- Permitted warnings are documented.
- User-visible text is marked for translation.

## Security
- Code is free of known vulnerabilities.
- Vulnerabilities are checked automatically on commit and on an ongoing basis.

## Documentation
- Documentation is up-to-date and accessible to the team.
- Process documentation is usable by new team members.
- Code documentation covers all major functionality.

## Traceability
- Code changes are traceable to stories via branch names, commit messages, or merge request references.
