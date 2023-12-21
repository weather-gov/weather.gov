# Environments

There are two tiers of environments - stable and unstable.

## Stable

### Staging

Staging is a "pre-production" environment for testing new functional changes or
bug fixes before they go into a more production-like environment. It is always
current with the latest changes approved for `main` on GitHub. This site is
available at [weathergov-staging.app.cloud.gov](https://weathergov-staging.app.cloud.gov).

Staging gets deploys on every push to main. These are done automatically through
the Github Action.

### Beta

Beta is a "production-like" environment that only gets deployed when we do
manual tagged, scheduled releases as a product team. This is what you see when
you visit [beta.weather.gov](https://beta.weather.gov).

## Unstable

### Local/Development

The local/development environment is the one in which the application runs on
your own computer. It is primarily used by the product development team to work
on adding new functionality or fixing bugs. The changes made in the
local/development environment must be reviewed by another team member before
they are pushed into a stable environment. This environment is not accessible
on the internet.

See [dev docs](dev/) for information on running the application locally. We use
docker with composer to manage the application locally.

### Developer Sandboxes/QA

Developer sandboxes are instances of weather.gov that are not necessarily
stable. They are used by the product development team to demonstrate changes
and to test them out in a more realistic setting than their own computers. They
can be useful when reviewing a change made in a local environment so others on
the team do not need to have their own local environment.

Each developer on the team has a sandbox dedicated to them, and they can make
deployments with the Github Action.
