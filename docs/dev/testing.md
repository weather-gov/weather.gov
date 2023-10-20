# Testing

Testing is vitally important. Tests are how we enshrine our expectations about
the behavior of our code and product in a way that we can then verify. There are
a whole bunch of different kinds of tests we can run, but these are the ones
we've chosen.

> [!NOTE]  
> Our decision to use a automated tools for testing and code quality is
> documented in
> [architectural decision record #9](../architecture/decisions/0009-we-will-use-a-content-management-system.md).

## PHP unit testing

For our Drupal modules, we test the PHP code with unit tests. These allow us to
test the code in isolation and independently. We use
[PHPUnit](https://phpunit.de/) for these tests, and we rely on PHPUnit's
built-in "[test doubles](https://docs.phpunit.de/en/9.6/test-doubles.html)"
feature to mock dependencies and Drupal's
[dependency
injection system](https://www.drupal.org/docs/drupal-apis/services-and-dependency-injection/services-and-dependency-injection-in-drupal-8)
to get our mocks into the code under test.

To run unit tests locally, the Makefile command is:

```sh
make u
```

## End-to-end testing

We test the running product using [Cypress](https://www.cypress.io/) to load
specific URLs, possibly interact with the page, and then make assertions about
the state of the page These tests help us catch issues where a page's behavior
suddenly changes by accident.

To run end-to-end tests locally, the Makefile command is:

```sh
make ee
```

## Accessibility testing

Automated accessibility testing can identify about half of all kinds of
accessibility bugs, so it is not a total solution. However, even a partial
automated solution is helpful! We also use [Cypress](https://www.cypress.io) for
accessibility testing, with the addition of the
[cypress-axe](https://www.npmjs.com/package/cypress-axe) library. This library
integrates [Axe core](https://github.com/dequelabs/axe-core) to test the
rendered page. We use the [WCAG2AA](https://www.w3.org/WAI/WCAG2AA-Conformance)
standard.

To run accessibility tests locally, the Makefile command is:

```sh
make a11y
```

## Code quality

We use linters to enforce code style standards. These tools help keep our code
consistent so it's easier for the whole team to move around through it, and it
helps with onboarding new teammates.

You can run all of our linters at once with:

```sh
make lint
```

In addition to linters, we use code formatters to help us write consistent code.
To run all of our code formatters at once, run:

```sh
make format
```

#### PHP code quality

We use [PHP_CodeSniffer (phpcs)](https://github.com/squizlabs/PHP_CodeSniffer)
to test our PHP code styles. We have adopted the Drupal standard style as our
style guide. We also use PHP_CodeSniffer's formatter tool, `phpcbf`, to help us
maintain consistent code. This tool can automatically format your code according
to our style guide, though it cannot fix all errors.

To format the project's PHP code:

```sh
make format
```

To test your PHP code's style:

```sh
make php-lint
```

#### Javascript code quality

We use [eslint](https://eslint.org/) to test our Javascript code styles. We use
the [Airbnb style guide](https://airbnb.io/javascript/) as our base, and we
add the [Cypress recommended rules](https://github.com/cypress-io/eslint-plugin-cypress)
for our tests. We also use [prettier](https://prettier.io) as a formatter.

To format the project's Javascript code:

```sh
make js-format
```

To test your Javascript code's style:

```sh
make js-lint
```

#### Sass code quality

We use [stylelint](https://stylelint.io/) to test our Sass code styles. We use
its default configuration. We use [prettier](https://prettier.io) as a formatter
for our Sass code too.

To format the project's Sass code:

```sh
make style-format
```

To test your Sass code's style:

```sh
make style-lint
```
