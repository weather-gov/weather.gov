# Deploying

We usually deploy using the Github Actions provided. You can see more about how deploys with in each environment [here](../environments.md).

Deploys require a post-deploy step. This is automatically done in the Github Action, but if you are manually pushing with `cf` then it will need to be done with a task. Deploying just the weathergov app locally would look like: 

```bash
cf target -o nws-weathergov -s YOURSPACE
cf push weathergov-YOURSPACE -f manifests/manifest-YOURSPACE.yml
cf run-task weathergov --command "./scripts/post-deploy.sh" --name "weathergov-YOURSPACE-deploy" -k "2G" -m "256M"
```

You can rotate our deploy keys in Github at any time with the [rotation script](../../scripts/rotate-gh-deploy-keys.sh). 
