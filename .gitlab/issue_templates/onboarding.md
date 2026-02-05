# Onboarding

- Onboardee: _Gitlab handle of person being onboarded_
- Onboarder: _Gitlab handle of onboarding buddy_

## Access

### Steps for the onboardee

- [ ] Read [welcome to weather.gov!](https://docs.google.com/document/d/1JIagnghg3xYNm4zdr_BtxWOwmifUaxjSCeybsaoqExE/edit?tab=t.0#heading=h.2hifh0miaj5c)
- [ ] Setup NOAA email (to start this process, please contact Shad Keene)
- [ ] Complete NOAA security compliance training
  Note: this will be emailed to your NOAA email address once you've updated your password
- [ ] (optional) Schedule an onboarding session with the PM

#### For Developers

Onboarder: remove this section if not applicable.

- [ ] Setup [commit signing in git](https://github.com/weather-gov/weather.gov/blob/main/docs/dev/git-signing.md)
- [ ] Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) for local development.
- [ ] [Install the cf CLI v7](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html#pkg-mac)
- [ ] If you do not already have one, [create a cloud.gov account](https://cloud.gov/docs/getting-started/accounts/)
- [ ] Ensure you can login to your cloud.gov account via the CLI
```bash
cf login -a api.fr.cloud.gov  --sso
```
- [ ] Review the following documents:
  - [ ] [Developer documentation](https://github.com/weather-gov/weather.gov/blob/main/docs/dev/index.md)
  - [ ] [Architecture Decision Records](https://github.com/weather-gov/weather.gov/tree/main/docs/architecture/decisions)
  - [ ] [Contributing Policy](https://github.com/weather-gov/weather.gov/tree/main/CONTRIBUTING.md)

### Steps for the onboarder

- [ ] Ask an admin to invite the onboardee to our Gitlab repository
- [ ] Add the onboardee to our [contributors list](https://github.com/weather-gov/weather.gov/blob/main/package.json#L6)

#### For Developers

Onboarder: remove this section if not applicable.

- [ ] Add the onboardee to the NWS cloud.gov organization
