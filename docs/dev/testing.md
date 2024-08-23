# Testing

Testing is vitally important. Tests are how we enshrine our expectations about
the behavior of our code and product in a way that we can then verify. There are
a whole bunch of different kinds of tests we can run, but these are the ones
we've chosen.

> [!NOTE]  
> Our decision to use a automated tools for testing and code quality is
> documented in
> [architectural decision record #9](../architecture/decisions/0009-we-will-use-a-content-management-system.md).

## PHP testing

### Unit tests

We use [PHPUnit](https://phpunit.de/) for unit testing utility classes and
custom block types. These particular classes are relatively isolated so don't
require extensive mocking.

For blocks in particular, there is a base test class that handles creating the
block under test and setting up the appropriate mocks that are
dependency-injected. It also provides a couple of helpful behaviors:

1. By default, it makes the `getLocation` method mockable. Calling
   `$this->onLocationRoute()` in a block test will configure the `getLocation`
   mock to return an appropriate location object with grid and point properties
   already set. Similarly, `$this->notOnLocationRoute()` will mock `getLocation`
   to return a location with the grid and point set to `false`.

2. Automatically adds a test that mocks all of the WeatherDataService methods to
   throw exceptions and tests that the block returns `["error" => true]` in
   those cases.
   > [!NOTE]  
   > If your block doesn't need this test, you can override it:
   >
   > ```php
   > public function testHandlesExceptions(): void
   > {
   >   $this->assertEquals(true, true);
   > }
   > ```

To run just these unit tests, run:

```shell
make unit-test
...or...
make u
```

### "API" end-to-end testing

Our Drupal services are largely concerned with fetching data from external
sources (such as the API or the database) and formatting it to our needs. Unit
testing them would require a lot of complex and fragile mocking. (We did this
initially and it was a nightmare to maintain). Instead, we have opted to test
our services against live data using our API proxy tool.

We essentially treat our blocks as API endpoints. We load a block, point it at
a particular location with known data, and then ensure the data comes back as
expected. This is much like end-to-end testing.

These tests are also implemented using [PHPUnit](https://phpunit.de/). They are
stored alongside our blocks code, since they are executing blocks. They should
extend the `EndToEndBase` class, which handles setting up autoloading and
creating all of the necessary services and mocks to run the tests.

It also provides an `onLocationRoute` helper method like the block unit test
base class. However, instead of mocking the base `getLocation` method, it
mocks the RouteMatchInterface object to identify the route as being at a given
location. This ensures more thorough testing.

To defeat caching, these tests are run in process isolation mode, meaning each
test runs in its own process. This results in somewhat slower tests, but it
also means we don't have to deal with trying to bypass caches in testing.

To run these tests locally, the Makefile command is:

```sh
make backend-test
...or...
make be
```

Note that backend tests include unit tests.

## End-to-end testing

We test the running product using [Cypress](https://www.cypress.io/) to load
specific URLs, possibly interact with the page, and then make assertions about
the state of the page These tests help us catch issues where a page's behavior
suddenly changes by accident.

To run end-to-end tests locally, the Makefile command is:

```sh
make ee
```

To run end-to-end tests locally using [Playwright](https://playwright.dev/), the
corresponding Makefile command is:

```sh
make eep
```

Note that you can set the environment variable `WX_NOW_TIMESTAMP` to any ISO8601
date to "freeze" time; the proxy and the Drupal application will then use that value
to mean "now". (An example: `WX_NOW_TIMESTAMP=2024-08-20T19:36:38Z make eep`)

## Accessibility testing

Automated accessibility testing can identify about half of all kinds of
accessibility bugs, so it is not a total solution. However, even a partial
automated solution is helpful! We also use [Playwright](https://playwright.dev/)
for accessibility testing, with the addition of the
[@axe-core/playwright](https://www.npmjs.com/package/@axe-core/playwright)
library. This library integrates [Axe core](https://github.com/dequelabs/axe-core)
to test the rendered page. We use the
[WCAG2AA](https://www.w3.org/WAI/WCAG2AA-Conformance) standard.

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
to test our PHP code styles. We have adopted the PSR12 standard style as our
style guide. We also prettier to format our code. This tool can automatically
format your code according to our style guide, though it cannot fix all errors.

To format the project's PHP code:

```sh
make php-format
```

To test your PHP code's style:

```sh
make php-lint
```

> [!NOTE]
> If you are using VS Code, you will need to update its prettier configuration
> in order for it to run on save for PHP files. You can add this to your global
> settings, or you can add it to your local settings in `.vscode/settings.json`.
> The local settings are the recommended approach.
>
> ```json
> {
>   "prettier.documentSelectors": [
>     "**/*.{js,html,css,scss,json,md,yaml,yml,php,test,theme,module}"
>   ]
> }
> ```

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
