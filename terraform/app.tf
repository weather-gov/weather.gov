data "archive_file" "app_src" {
  type        = "zip"
  source_dir  = "${path.module}/../forecast"
  output_path = "${path.module}/dist/app_src.zip"
  excludes = [
    ".git*",
    "frontend/node_modules/",
    "frontend/public/",
    "node_modules/*",
    "tmp/**/*",
    "terraform/*",
    "log/*",
    "doc/*",
    "credentials.json",
    ".ruff_cache/*",
    "__pycache__/*",
    "dist/*",
    "spatial/management/commands/__cache"
  ]
}

locals {
  host_name = coalesce(var.host_name, "${local.app_name}-${var.env}")
  domain    = coalesce(var.custom_domain_name, "app.cloud.gov")
  base_service_bindings = [
    { service_instance = "${var.env}-credentials" },
    { service_instance = "${local.app_name}-s3-${var.env}" },
    { service_instance = "${local.app_name}-rds-${var.env}" },
  ]
  prod_service_bindings = concat(local.base_service_bindings, [{ service_instance = "logdrain" }])
}

resource "cloudfoundry_app" "app" {
  name       = "${local.app_name}-${var.env}"
  space_name = var.cf_space_name
  org_name   = local.cf_org_name
  count      = 1

  path             = data.archive_file.app_src.output_path
  source_code_hash = data.archive_file.app_src.output_base64sha256
  buildpacks       = ["https://github.com/cloudfoundry/apt-buildpack.git", "python_buildpack"]
  strategy         = "none"
  routes           = (var.custom_domain_name == null ?
    [{ route = "${local.host_name}.${local.domain}" }] :
    [{ route = "${local.host_name}.app.cloud.gov" }, { route = "${local.domain}" }])
  enable_ssh       = true

  environment = {
    NEW_RELIC_LICENSE_KEY  = local.newrelic_license
    NEW_RELIC_APP_NAME     = "weathergov-${var.env}"
    INTEROP_URL            = var.interop_url
    PYTHONUNBUFFERED       = "yup"
    DJANGO_SETTINGS_MODULE = "backend.config.settings.production"
    DJANGO_BASE_URL        = coalesce(var.custom_domain_name, "app.cloud.gov")
    DJANGO_LOG_LEVEL       = "INFO"
    DJANGO_LOG_FORMAT      = "console"
    DISABLE_COLLECTSTATIC  = 1
    CLOUDGOV_SPACE         = var.cf_space_name
    AWS_USE_FIPS_ENDPOINT  = 1 # required for "s3-fips.us-gov-*.amazonaws.com"
  }

  processes = [
    {
      type              = "web"
      instances         = var.web_instances
      memory            = var.web_memory
      disk_quota        = var.web_disk_quota
      health_check_type = "port"
      command           = "./run.sh"
      timeout           = 180
    }
  ]

  service_bindings = (var.env == "prod" ? local.prod_service_bindings : local.base_service_bindings)

  depends_on = [
    cloudfoundry_service_instance.credentials,
    module.s3,
    module.app_space,
    module.database
  ]
}

# workaround a bug in the cloud foundry provider where a second deploy happens a
# minute after the first, thereby clobbering the original deploy. the conditions
# for this bug seem to be:
# 1. the app takes a long time to setup (more than 5m),
# 2. `processes.instances` must be more than one, and
# 3. strategy must be "rolling".
#
# NB: the error given is: "timed out after waiting for async process". if you
# think you are hitting the one minute redeploy issue, you can query the app
# `created_at` timestamps:
#
# > cf curl "/v3/deployments?app_guids=$(cf app weathergov-test --guid)" | jq '.resources[].created_at'
# "2026-03-05T17:34:15Z"
# "2026-03-05T17:35:16Z"
#
# to get around this, we separate the push of the manifest and the code/env
# updates (by setting `strategy` to "none") from the actual restart command,
# which we do here. the triggers for a restart with an explicit rolling strategy
# depend on if either the app code or env variables have changed.
resource "null_resource" "rolling_restart" {
  triggers = {
    app_hash = data.archive_file.app_src.output_base64sha256
    env_hash = sha256(jsonencode(cloudfoundry_app.app[0].environment))
  }

  provisioner "local-exec" {
    command = "cf restart ${cloudfoundry_app.app[0].name} --strategy rolling"
  }

  depends_on = [cloudfoundry_app.app]
}
