# Javascript bundling

We use esbuild to bundle our custom Javascript into single files for each kind
of page. For example, a point location page would be served `point.js` which
has been bundled to include all of the code necessary to display that page
propertly. This allows us to minimize the number of network calls required to
load the page as well as giving us control over minification.

We use ESM modules for our custom code. This helps create clean scope boundaries
so we don't have to worry about polluting the global scope. It also helps us
manage import order, since esbuild can just figure it out for us.

## Drupal libraries

We define what Javascript to deploy in the Drupal theme's libraries file at
`web/themes/new_weather_theme/new_weather_theme.libraries.yml`. For custom code,
there should be one entry per page type. The same code may be bundled in multiple
page types, but we only want to deliver a single bundled file per page type.

> [!CAUTION]  
> If there are any changes in any of the files that get bundled into a page's
> library, the version **_MUST_** be updated. If the version is not updated,
> users may use an older, cached version of the library.

## Development

Currently, we are not using the bundler to import npm modules, only local
modules or wholly-contained ESM modules from CDNs. As a result, we do not need
to run the bundler in order for our scripts to work. In development, we do not
run the bundler so we can get more useful stack traces and debugging.

## Testing and deployment

For testing and deployment, we use esbuild to bundle each of the page scripts.
The entrypoint scripts are replaced by their bundles. This reduces the number of
network calls necessary to load the scripts and reduces the data transfer
requirements. We use the bundles for testing in CI/CD to better reflect our
deployed environment.

For a deployment, we bundle the scripts before deploying them. As a result, the
entrypoint scripts we ship to the cloud are single self-contained files.
