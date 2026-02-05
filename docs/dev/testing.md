# Testing

Testing is vitally important. Tests are how we enshrine our expectations about
the behavior of our code and product in a way that we can then verify. There are
a whole bunch of different kinds of tests we can run, but these are the ones
we've chosen.

> [!NOTE]  
> Our decision to use a automated tools for testing and code quality is
> documented in
> [architectural decision record #9](../architecture/decisions/0009-we-will-use-automated-tools-to-help-maintain-code-quality.md).

## Python/Django/Wagtail testing

> [!NOTE]  
> This section is being developed.

## End-to-end testing

We test the running product using [Playwright](https://playwright.dev/) to load
specific URLs, possibly interact with the page, and then make assertions about
the state of the page These tests help us catch issues where a page's behavior
suddenly changes by accident.

To run end-to-end tests locally, the Just command is:

```sh
just e2e
```

Note that you can set the environment variable `WX_NOW_TIMESTAMP` to any ISO8601
date to "freeze" time; the proxy and the Django application will then use that value
to mean "now". (An example: `WX_NOW_TIMESTAMP=2024-08-20T19:36:38Z just ee`)

Note also that if you intend on testing interactions that modify the CMS in some
way, it is suggested instead to use outside testing (see next section).

## ~~Outside testing~~

> [!NOTE]  
> Outside testing will be fundamentally different in Django.

~~We also have a separate test environment that is intended for potentially
destructive changes, such as adding users, uploading files and overwriting or
deleting content. This test environment is completely torn down once finished,
so we do not have to worry about adverse impact on our running developer
environments.~~

~~To run "outside" tests locally using [Playwright](https://playwright.dev/), the
corresponding Just command is:~~

```sh
just ot
```

~~You can run the setup script:

`./tests/playwright/outside/setup.sh`

(Located in `tests/playwright/outside/setup.sh`) where
one-time setup can happen before testing the outside environment. It is advised
to only use `drush` commands to manipulate data (rather than modifying database
or Drupal files directly) so that we guarantee CMS consistency, integrity, and
reproducibility.~~

~~To iteratively develop and run tests while the test environment is up (note
that, again, changes will be permanent until the test environment is restarted):~~

```sh
PW_TEST_HTML_REPORT_OPEN='never' npx playwright test outside/
```

## Accessibility testing

Automated accessibility testing can identify about half of all kinds of
accessibility bugs, so it is not a total solution. However, even a partial
automated solution is helpful! We also use [Playwright](https://playwright.dev/)
for accessibility testing, with the addition of the
[@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright)
library. This library integrates [Axe core](https://github.com/dequelabs/axe-core)
to test the rendered page. We use the
[WCAG2AA](https://www.w3.org/WAI/WCAG2AA-Conformance) standard.

To run accessibility tests locally, the Just command is:

```sh
just a11y
```

## Code quality

We use linters to enforce code style standards. These tools help keep our code
consistent so it's easier for the whole team to move around through it, and it
helps with onboarding new teammates.

You can run all of our linters and formatters at once with:

```sh
just lint
```

#### Python code quality

> [!NOTE]  
> This section is being developed.

#### Javascript code quality

We use [eslint](https://eslint.org/) to test our Javascript code styles. We use
the [Airbnb style guide](https://airbnb.io/javascript/) as our base. We also use
[prettier](https://prettier.io) as a formatter.

To format the project's Javascript code:

```sh
just format-js
```

To test your Javascript code's style:

```sh
just lint-js
```

#### Sass code quality

We use [stylelint](https://stylelint.io/) to test our Sass code styles. We use
its default configuration. We use [prettier](https://prettier.io) as a formatter
for our Sass code too.

To format the project's Sass code:

```sh
just format-style
```

To test your Sass code's style:

```sh
just lint-style
```
