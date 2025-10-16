# Gitlab CI Configuration

## A few important notes for developers

Docker images containing 3rd party dendencies are built when code is committed to main. This is done to speed up the CI pipeline.

If you are updating dependencies, you will need to _manually_ run the pipeline from the GitLab pipelines page by clicking New Pipeline.

## General approach

With Gitlab, we use Docker in conjunction with the [Gitlab container registry](https://vlab.noaa.gov/gitlab-licensed/NWS/Systems/DIS/Weather.gov-2.0/container_registry) to run our tests.

Gitlab CI creates the Docker images for us. Generally, pushing direct images to the Gitlab container repository is discouraged, as we want to ensure images were generated from a known and fixed commit for reproducibility and security reasons.

NWS Vlab is still building out requisite Gitlab CI runner functionality (see limitations below), and in particular may need help tweaking Gitlab CI runner concurrency settings. Current Limitations as of December 2024:

- We only have one instance-level Gitlab CI runner (Kubernetes) shared across the organization. Fortunately, this runner is configured for concurrent pipeline jobs and is reasonably performant.
- [Distributed caches](https://docs.gitlab.com/runner/configuration/autoscale.html#distributed-runners-caching) for Gitlab runners is not enabled. (This feature will be implemented eventually but is not a high priority.)
- Docker-in-Docker requires TLS to be disabled. (This may change in the near future.)
- Gitlab container security scanning is present but functionality is minimal. (Amazon ECR may be an alternative in the future.)

## How to push and pull locally

If needed (this is discouraged), you can create a PAT (personal access token) under your GitLab user settings. You'll need the name and tag of the container you want to pull/push. Generally, the tag will be the branch name, with all non-permitted characters converted to dashes.

```
docker login registry.gitlab-licensed.vlab.noaa.gov -u <first.last> -p <your token>
docker pull registry.gitlab-licensed.vlab.noaa.gov/nws/systems/dis/weather.gov-2.0/weathergov-django/<container name>:<sluggified branch name>
```