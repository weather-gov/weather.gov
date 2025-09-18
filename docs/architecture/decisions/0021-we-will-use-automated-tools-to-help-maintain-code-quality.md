# We will use automated tools to help maintain code quality

Date: 2025-09-18

### Status

Accepted

### Context

Maintainable code should be consistent, readable, functionally correct, and tested. Automated tools can help tremendously with all of these maintainability concerns.

Supersedes [ADR 0019](0019-we-will-use-automated-tools-to-help-maintain-code-quality.md).

### Decision

We will use the following tools:

- **ruff** for Python style checking and formatting
- **djlint** for Django template style checking and formatting
- **eslint** for Javascript style checking
- **prettier** to automatically fix Javascript and SCSS code style issues. This tool will run on developer machines. It can be automated, but creates diverging git trees that can be a hassle for developers to manage.
- **scsslint** for Sass style checking, using its default style guide
- **Playwright** for end-to-end/browser testing and automated accessibility testng against the WCAG2AA standard

We will maintain our own `ruff` and `eslint` rules. Before turning a rule off, we will take the following steps:

1. Read the rule's help page to understand why it exists.
2. If the rule does not make sense for a particular use case, we will turn it off at the end of the flag lined and include a comment about why it is turned off.

   > Ruff:
   >
   > ```
   > code code code # noqa: <rule>` – eg, to turn off rule ruff F841, `# noqa: F841
   > ```
   >
   > eslint:
   >
   > ```
   > code code code // eslint-disable-line [rule-name]
   > ```

3. If a team member disagrees with the rule entirely, they will add it to ruff's ignore list or remove it from eslint's rule list and submit a merge request for discussion.
   > The ruff ignore list is in `pyproject.toml` The eslint rules are in `eslint.config.js`.

### Consequences

- We will have easier visibility into the quality of our code, and will have tools we can use to hold ourselves to a high standard.
- Developers may need a bit more time since they will need to format their code. This cost should decrease over time as everyone gets more familiar with the expected code styles.
- Code we write will be internally consistent and conform to well-known, widely-adopted code style standards.
- Our code will be easier for future teammates to pick up and start working with.
- Handoff between developers or teams will be lower risk since the inheriting team will receive well-formatted code along with automated tools to help enforce continued good development practices.
- This ADR does not completely address security testing.
