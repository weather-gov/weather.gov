---
name: Developer Onboarding
about: Onboarding steps for developers.
title: 'Developer Onboarding: GH_HANDLE'
labels: Eng
assignees: ''

---

# Developer Onboarding

- Onboardee: _GH handle of person being onboarded_
- Onboarder: _GH handle of onboard buddy_

## Installation

There are several tools we use locally that you will need to have.
- [ ] Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for local development.
- [ ] [Install the cf CLI v7](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html#pkg-mac) for the ability to deploy

## Access

### Steps for the onboardee
- [ ] Setup [commit signing in GitHub](https://github.com/weather-gov/wather.gov/blob/main/docs/dev/git-signing.md) and with git locally.
- [ ] [Create a cloud.gov account](https://cloud.gov/docs/getting-started/accounts/)
- [ ] Ensure you can login to your cloud.gov account via the CLI
```bash
cf login -a api.fr.cloud.gov  --sso
```
- [ ] Have an admin add you to cloud.gov org and set up your sandbox developer space. Ensure you can deploy to your sandbox space.
- [ ] If your GitHub account is associated with any non-government or personal work, create a new GitHub account. (NOAA policy)

### Steps for the onboarder
- [ ] Ask an admin to add the onboardee to our [GitHub organization](https://github.com/orgs/weather-gov).
- [ ] Add the onboardee to our [GitHub repository](https://github.com/weather-gov/weather.gov).
- [ ] Add the onboardee to our cloud.gov org
- [ ] Before you finalize the developer sandbox setup, [generate new metadata](../../docs/dev/authentication.md) for SAML communication
- [ ] Setup the developer sandbox space with [sandbox script](./scripts/create_cloudgov_env.md).
- [ ] Get the developer a NOAA account so they can access documents.

## Documents to Review

- [ ] [Developer documentation](https://github.com/weather-gov/weather.gov/blob/main/docs/dev/index.md)
- [ ] [Architecture Decision Records](https://github.com/weather-gov/weather.gov/tree/main/docs/architecture/decisions)
- [ ] [Contributing Policy](https://github.com/weather-gov/weather.gov/tree/main/CONTRIBUTING.md)
