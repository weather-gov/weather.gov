# Accessing databases on cloud.gov

If you wish to access a database on cloud.gov, the process can be fairly tricky,
since all services are behind a VPC. To access databases directly, we will need
to setup a tunnel to interact with the database or "service" (in cloud.gov
parlance).

The easiest solution is to install the [`cf-service-connect` cloud foundry plugin](https://github.com/cloud-gov/cf-service-connect).

```bash
cf install-plugin <binary_url>
# will be of the format
# https://github.com/cloud-gov/cf-service-connect/releases/download/<version>/cf-service-connect_<os>-<arch>
# For non-M1 Macs, use `cf-service-connect_darwin_amd64`
# For M1 Macs, use `cf-service-connect_darwin_arm64`
# For Windows, use `cf-service-connect_windows_amd64`
```

Once you have this plugin installed, you can target the space (login if you have
not already, via `cf login -a api.fr.cloud.gov --sso`) and then automatically
set up a database connection:

```bash
cf target --space weathergov-staging
cf connect-to-service weathergov-staging weathergov-rds-staging
```

The `connect-to-service` command internally sets up a tunnel through the
`weathergov-staging` app to its database service, `weathergov-rds-staging` and
then opens up the appropriate database client (`mysql` or `psql`) to connect
with the appropriate credentials transparently to the user.

Alternatively, you can set up a tunnel manually, though it requires you to grab
the appropriate credentials from the app service (`cf env weathergov-staging`).
Once you have that information in hand, doing

```bash
cf ssh -N -L 3000:<database>.us-gov-west-1.rds.amazonaws.com:5432 weathergov-staging
```

will expose a local port that you can then connect to:

```bash
psql -h localhost -p 3000 --username=<username> <database-name>
```
