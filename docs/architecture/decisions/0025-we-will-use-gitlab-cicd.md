# We will use Gitlab CI/CD for continuous integration during development

Date: 2025-10-01

### Status

Accepted

### Context

We need a platform to run our tests on and deploy changes to cloud.gov while
developing the application. This will allow us to continually test the
application for security issues, accessibility, and catch bugs. It will also
allow us to set up automation as part of the code review process.

There are several options for continuous integration that are available without
procuring additional licenses, but Gitlab CI/CD is built right into our source
control management (SCM) system.

Supersedes [ADR 0010](0010-we-will-use-github-actions-for-continuous-integration-during-development.md).

### Decision

We will use Gitlab CI/CD to perform tests, run audits, perform cron tasks, and
deploy the application to cloud.gov.

### Consequences

- Gitlab CI/CD configuration is somewhat cumbersome compared to other options.
- Gitlab CI/CD is hosted within the vlab environment, alongside Gitlab SCM
- We are dependent on vlab for configuring and managing task runners
