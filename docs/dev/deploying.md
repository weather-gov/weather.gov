# Deploying

_Note: to use any cf commands, you will need to have a version 7+_

We usually deploy using the Github Actions provided. You can see more about how deployments work within each environment [here](../environments.md). In order to deploy a sandbox/test environment use [this Github Action](https://github.com/weather-gov/weather.gov/actions/workflows/deploy-sandbox.yaml). The dropdown will allow you to specify which branch to deploy to which environment. 

<img width="1387" alt="Screenshot 2023-11-09 at 2 56 32 PM" src="https://github.com/weather-gov/weather.gov/assets/142825699/3067e8ff-a9e8-45f8-875c-134de07a746f">

You can also run this locally with: 

`gh workflow run deploy-sandbox.yaml -f branch=BRANCH environment=ENVIRONMENT`

Deploys require a post-deploy step. This is automatically done in the Github Action, but if you are manually pushing with `cf` then it will need to be done with a task. Deploying just the weathergov app locally would look like: 

```bash
cf target -o nws-weathergov -s YOURSPACE
cf push weathergov-YOURSPACE -f manifests/manifest-YOURSPACE.yml
cf run-task weathergov-YOURSPACE --command "./scripts/post-deploy.sh" --name "weathergov-YOURSPACE-deploy" -k "2G" -m "256M"
```

You can rotate our deploy keys in Github at any time with the [rotation script](../../scripts/rotate-gh-deploy-keys.sh). 
