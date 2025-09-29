# Releases to beta.weather.gov

## How to release

Go to [Code > Tags > New Tag](https://vlab.noaa.gov/gitlab-licensed/NWS/Systems/DIS/Weather.gov-2.0/weathergov-django/-/tags/new) in GitLab.

You'll see 3 fields.

> Tag name:
> Create from: main
> Message:

The `Tag name` must start with `beta-v`, followed by the major, minor, and point versions. For example: `beta-v1.12.0`.

Leave `Create from` set to `main`.

The contents of the `Message` field can be any (short) text you like. It should not be left empty.

Click "Create tag".

A GitLab CI pipeline job will create the release. Immediately afterwards, another job will deploy the code. You can find the pipeline and watch progress from [the pipelines page](https://vlab.noaa.gov/gitlab-licensed/NWS/Systems/DIS/Weather.gov-2.0/weathergov-django/-/pipelines).

After the release is created, you may wish to edit the notes. To do that, go to [the releases page](https://vlab.noaa.gov/gitlab-licensed/NWS/Systems/DIS/Weather.gov-2.0/weathergov-django/-/releases).

## Release cheklist

As part of a release you may follow the following checklist: 

- [ ] Compare [staging](https://weathergov-staging.app.cloud.gov/) and [beta](https://beta.weather.gov/) for differences in configuration, content, and functionality
- [ ] Look at [commits to main](https://vlab.noaa.gov/gitlab-licensed/NWS/Systems/DIS/Weather.gov-2.0/weathergov-django/-/commits/main) and check what has been merged since the previous release
- [ ] Run through [the manual accessibility checklist](https://github.com/weather-gov/weather.gov/blob/main/docs/code-review-templates/code-review-web.md#accessibility) of what is on staging if anything functional or visual has been changed
- [ ] Check with other product owners about a release
