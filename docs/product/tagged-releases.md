# Releases to beta.weather.gov

## How to release

Go to https://github.com/weather-gov/weather.gov/releases/new. Type your release version name like so:

<img width="807" alt="Screenshot 2023-11-22 at 10 10 02 AM" src="https://github.com/weather-gov/weather.gov/assets/142825699/d280f961-3cd3-4e82-9297-3fd2b7288c50">

The only requirement is that it is prepended with `beta-`. We use semantic versioning as major.minor.patch, but anything will release if it has the right prefix. 

Click "create new tag" - it will take you to a place to write release notes. Name the release the same as the tag. Then release! You can watch the steps here: https://github.com/weather-gov/weather.gov/actions/workflows/deploy-beta.yaml

## Release cheklist

As part of a release you may follow the following checklist: 

- [ ] Compare [staging](https://weathergov-staging.app.cloud.gov/) and [beta](https://beta.weather.gov/) for differences in configuration, content, and functionality
- [ ] Look at [commits to main](https://github.com/weather-gov/weather.gov/commits/main) and check what has been merged since the previous release
- [ ] Write comprehensive release notes making sure to reference relevant pull requests
- [ ] Do an accessibility review of what is on staging if anything functional or visual has been changed
- [ ] Check with other product owners about a release
