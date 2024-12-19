# Gitlab CI Configuration

## General approach

With Gitlab, we have an opportunity to re-use our existing Docker infrastructure for CI, especially in conjunction with the [Gitlab container registry](https://vlab.noaa.gov/gitlab-licensed/NWS/Systems/DIS/Weather.gov-2.0/container_registry). This simplifies our Gitlab CI configuration since we can build and test in CI exactly the same way as we do locally. (This approach differs from Github Actions because Actions sometimes uses alternative approaches to install the required environment, such as installing `php` via `shivammathur/setup-php@v2`.) Some changes to keep in mind:

- We want Gitlab CI to create the Docker images for us. Generally, pushing direct images to the Gitlab container repository is discouraged, as we want to ensure images were generated from a known and fixed commit for reproducibility and security reasons.
- We may want to default to pulling from the Gitlab container repository instead of building locally (this will save time.) Of course, you can always build locally.
- NWS Vlab is still building out requisite Gitlab CI runner functionality (see limitations below), and in particular may need help tweaking Gitlab CI runner concurrency settings.

### Current Limitations as of December 2024

- We only have one instance-level Gitlab CI runner (Kubernetes) shared across the organization. Fortunately, this runner is configured for concurrent pipeline jobs and is reasonably performant.
- [Distributed caches](https://docs.gitlab.com/runner/configuration/autoscale.html#distributed-runners-caching) for Gitlab runners is not enabled. (This feature will be implemented eventually but is not a high priority.)
- Docker-in-Docker requires TLS to be disabled. (This may change in the near future.)
- Gitlab container security scanning is present but functionality is minimal. (Amazon ECR may be an alternative in the future.)

## Versioning

Still a work in progress. Currently images are manually created. The plan is roughly:

- Every push to `main` will generate new images and tag them as `latest`.
- If the Dockerfile or its dependencies (such as `package-lock.json`) are changed in a commit, then CI will build a new image and tag it with the git sha1 hash. (TBD: how to pull in that version for that pipeline)
- Some images, such as Playwright, will be periodically refreshed using Gitlab's [pipeline schedules](https://vlab.noaa.gov/gitlab-licensed/NWS/Systems/DIS/Weather.gov-2.0/-/pipeline_schedules).
