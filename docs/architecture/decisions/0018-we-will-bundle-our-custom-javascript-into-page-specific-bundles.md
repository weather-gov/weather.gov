# We will bundle our custom Javascript into page-specific bundles

Date: 2024-10-07

### Status

Accepted

### Context

The amount of custom frontend Javascript has continued to grow. We chose to keep our code components isolated to the degree practicable and use Drupal's native libraries functionality to import the components into the pages that needed them. The result has been that we only load the code necessary to render the page correctly. However, it has turned out that the total list of libraries necessary for a given page is constant, regardless of the content, with the sole exception that the point location page sometimes does not need the Leaflet and alert mapping components.

As a result, loading a single page also requires making multiple requests to fetch the necessary scripts for that page.

### Decision

Instead of serving multiple scripts, we will instead bundle them into page-based modules and serve only a single custom Javascript file per page. We will not create a single "app" bundle. We will build the bundles as part of our CI/CD process rather than commit the built files to the repo. Our tests will use the bundles rather than the individual files. Our bundles will be accompanied by sourcemaps.

### Consequences

#### Positive
- This will reduce the total number of HTTP requests required to load the page. Enabling tree-shaking and minification will allow us to further reduce the total amount of data that must be transferred.
- We will have the option in the future to build our scripts using npm modules.
- Pages will still only load the Javascript necessary to render properly, rather than all app code, some of which may be unnecessary.
- Building the bundles in CI/CD and replacing the entrypoint scripts will allow development environments to continue to function by loading all scripts individually, improving debugging.

#### Neutral
- Caching will not be impacted. The frontend Javascript caching strategies we currently use will continue to work the same way.

#### Negative
- Only having the bundles in cloud environments creates an additional discrepancy between local development and cloud environments that could result in unexpected behavior that is difficult to track down.
- It will become more difficult to ensure that the deployed code matches `main`. The deployed code will be bundled and minified.
