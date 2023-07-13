# 3. We will use containers for development, testing, and production

Date: 2023-07-13

## Status

Proposed

## Context

We need to define our development, testing, and production environments. There
are many decisions to be made in this respect. One of them is how we'll run the
(eventual) CMS itself. There are two primary options:

- **on a server**

  Running on a server means maximum control and flexibility. However, it comes
  with a bunch of potential risks:

  - environments can easily diverge, such that a change that works in testing or
    development might fail in production
  - we are responsible for authorizing the entire system, down through at least
    the operating system
  - scaling up and down can be slower due to the time necessary to start a full
    server

- **in a container**

  Running in containers can help ensure our various environments are as close to
  identical as possible. Containers can also start and stop much more quickly.
  And containers adopt most of the operating system from its underlying runner,
  meaning if the runner is authorized, we only have to authorize our own
  application, not the entire operating system.

  Containers are not without risks, however:

  - they're a little more complex to set up initially, and longterm
    architectural maintenance may also be complicated by the use of containers
    (unsure)
  - they don't have persistent storage, so anything that needs to persist across
    redeployments (or even restarts) has to be stored elsewhere and linked into
    the container, resulting in additional infrastructure and complexity

## Decision

We have chosen to use containers across all environments. We believe the risks
created by using containers are outweighed by the risks they mitigate.

## Consequences

For CI/CD and hosting, we are limited to providers that support containers. In
2023, that is basically all of them, so not much of a consequence.

Our production architecture will be a bit more complex because a single server
must be replaced by a container, an orchestrator, and persistent storage, at the
minimum.
