# We will use the USWDS installation method, not a Drupal theme

Date: 2023-10-03

### Status

Accepted

### Context

There are already some existing USWDS Drupal themes:

- [U.S. Web Design System (USWDS)](https://www.drupal.org/project/uswds)
- [Base USWDS - United States Web Design System](https://www.drupal.org/project/uswds_base)
- [Gesso Drupal theme which pulls in USWDS](https://github.com/forumone/gesso-uswds)

These themes are not maintained by the US Web Design System. Therefore, they do not follow the same cadence of updates and maintenance. 

The U.S. Web Design System provides extensive support for theming via its [theme settings](https://designsystem.digital.gov/documentation/settings). You’ll update the _uswds-theme.scss file in uswds.paths.dist.theme so its @use directive includes a list of all the settings you’re customizing for your project.

### Decision

We will not use these themes. Instead we will 1) create a new theme specific to weather.gov 2.0 and 2) install USWDS as the recommended Node module. See documentation at https://designsystem.digital.gov/documentation/getting-started/developers/phase-two-compile/.

### Consequences

**Positive**
- We can avoid CSS bloat and spending time overriding existing styles.
- We can control twig templates and update their markup as needed.
- We can approach building components the way we would create Web Components or other Javascript component, setting up our code to easily scale for the future (for example, accepting parameters and assigning default attributes).
- We can implement updates as soon as they come from USWDS, not the contributor.

**Negative**
- We don't know how long it will take to get set up.

**Neutral**
- We will use **gulp** as the task runner to watch for style changes, recompile SCSS files, and transpile JS from es6 to es5. This has to be worked into our CI/CD pipeline. 
- We have to keep up with USWDS updates as part of our CI/CD checks.
