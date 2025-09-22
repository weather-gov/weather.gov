# Terraform

We are using Terraform for cloud.gov deployment. The previous approach to deployment used shell scripts and was error prone and not easily modifiable for e.g., gradual updates to environment services.

Terraform has a [cloudfoundry](https://registry.terraform.io/providers/cloudfoundry/cloudfoundry/latest/docs) provider. This provider works well with cloud.gov environments, with the exception of service credential bindings (cloud.gov does not support the cloudfoundry v3 API for service credentials). We also utilize custom cloud.gov modules based on [`terraform-cloudgov`](github.com/gsa-tts/terraform-cloudgov).

## Structure

For maintaining Terraform state, we have set up a S3 bucket in the `weathergov-mgmt` space. This space is configured specifically for bootstrapping (more about this below). We also provide a `terraform.sh` wrapper script to help invoke terraform on cloud.gov resources.

As an example, to `apply` terraform changes to the `test` space, run:

    ./terraform.sh -e weathergov-test -c apply

This command will look for a `weathergov-test.tfvars` configuration. Every environment you deploy to will require a corresponding `tfvars` file that stores terraform variables (such as `rds_plan_name`). Variables have sensible defaults, but at a minimum you need:

- `cf_space_name`: the name of the space you wish to deploy within
- `env`: this should be an unique name and is used for identifying resources within the space, e.g., `api-weathergov-foo.app.cloud.gov`, `weathergov-s3-foo`, etc. If there is only one deployment per space,  this should be set to the same variable as `cf_space_name`.
- `space_developers`: a list containing these developers who should have access to these resources, including yourself.

You can also copy over or look at `sandbox-test.tfvars` as a minimum example. The `variables.tf` file has all of the different variables (and its defaults) that you can configure.

### Django/Wagtail

Configured via `app.tf`. The `forecast/` directory (excluding build artifacts) is zipped and uploaded as a cloudfoundry app to the configured space. Please do not change the `app.tf` file if you want to modify the parameters of the Django/Wagtail app; instead, override these variables in your `tfvars` configuration, such as `interop_url`, `web_instances` and `web_memory`.

### API interop layer

Configured via `api.tf`. Similarly to the app, the `api-interop-layer` directory (excluding build artifacts) is zipped and uploaded as a cloudfoundry app to the configured space. Currently, it is not recommended to set `api_interop_memory` below `256M` as this will likely cause OOM errors.

## cloud.gov specific configurations

In `main.tf` we have modules that are specific to cloud.gov itself. As mentioned before, these use the [`terraform-cloudgov`](github.com/gsa-tts/terraform-cloudgov) Github repository and are used to cleanly define an app space, database, domain, and s3 bucket within cloud.gov, rather than treating these as generic cloud foundry service instances.

We also configure credentials as a custom service instance per space. The terraform resource key `credentials` injects user-provided data (currently only `django_secret_key`) which can be bound to any service instance in that space (for instance, `app.tf` does this via `{ service_instance = "${var.env}-credentials" }`). In turn, the app can read this data via the standard `VCAP_SERVICES` environment variable under the `user_provided` key. This is exactly how we were doing it before for Drupal (user-provided services), just in a terraform way.

Eventually, we will use this same mechanism for credentials for SAML authentication flow.

## Bootstrapping

The `bootstrap/` directory is a minimal import of cloud.gov resources for the `weathergov-mgmt` space. In particular, a S3 bucket (imaginatively named `weathergov-terraform-state`) is used to, well, hold terraform state for all of the terraform deployments. Access to this S3 bucket is needed in order to sync terraform information across developers and automatic deployer users, so some form of bootstrapping is needed.

`imports.tf` has the ids of the various resources we need to bootstrap. Running `./apply.sh` in this directory will import these resources and allow us to use the S3 bucket for syncing terraform state.

Before running `./apply.sh`, you must add yourself to the `developer_import_map`. To figure out the GUID of your role requires some manual spelunking: see below.

## GUID discovery via cloud.gov

This is of use only for bootstrapping, but if you do need to find a GUID from within a cloud.gov environment, you will have to use the `cf curl` command for the appropriate resource. Some GUIDS can be retrieved via explicit flags, e.g.:

     cf org nws-weathergov --guid

But most `cf` invocations do not accept such flags. Obtaining GUIDs is therefore sometimes a manual process. For bootstrapping, to get your user role GUID, first get your user GUID using the `weather_mgmt` space GUID, which we already have in `imports.tf`:

    cf curl /v3/spaces/f8937e7b-2fa0-4e89-958b-452211a73aff/users | jq ".resources[] | select (.username==\"james.tranovich@noaa.gov\").guid"

Once you have your user GUID, then you will need to search `/v3/roles` for your user GUID and space GUID. This arcane command should do the trick:

     cf curl /v3/roles?user_guids=<your_user_guid_here>&space_guids=f8937e7b-2fa0-4e89-958b-452211a73aff | jq ".resources[] | select(.type==\"space_developer\").guid"

## Sandbox bot

The `sandbox-bot/` directory is used by the `terraform.sh` script wrapper to retrieve automatic deployment account credentials for CI/CD purposes. If a new environment (not staging or production) is created, the sandbox-bot terraform setup will also generate the deployment user itself. In either case, the `secrets.auto.tfvars` file will be auto-generated with the deployment credentials for the given space.
