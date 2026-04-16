data "archive_file" "app_src" {
  type        = "zip"
  source_dir  = "${path.module}/../forecast"
  output_path = "${path.module}/dist/app_src.zip"
  excludes = [
    ".git*",
    "node_modules/*",
    "tmp/**/*",
    "terraform/*",
    "log/*",
    "doc/*",
    "credentials.json",
    ".ruff_cache/*",
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

  path              = data.archive_file.app_src.output_path
  source_code_hash  = data.archive_file.app_src.output_base64sha256
  buildpacks        = ["https://github.com/cloudfoundry/apt-buildpack.git", "python_buildpack"]
  strategy          = "rolling"
  routes            = (var.custom_domain_name == null ? [{ route = "${local.host_name}.${local.domain}" }] : [{ route = "${local.host_name}.app.cloud.gov" }, { route = "${local.domain}" }])
  enable_ssh        = true
  instances         = var.web_instances
  memory            = var.web_memory
  disk_quota        = var.web_disk_quota
  health_check_type = "port"

  environment = {
    NEW_RELIC_LICENSE_KEY  = local.newrelic_license
    NEW_RELIC_APP_NAME     = "weathergov-${var.env}"
    INTEROP_URL            = "https://api-${local.app_name}-${var.env}.apps.internal:61443"
    PYTHONUNBUFFERED       = "yup"
    DJANGO_SETTINGS_MODULE = "backend.config.settings.production"
    DJANGO_BASE_URL        = coalesce(var.custom_domain_name, "app.cloud.gov")
    DJANGO_LOG_LEVEL       = "INFO"
    DJANGO_LOG_FORMAT      = "console"
    DISABLE_COLLECTSTATIC  = 1
    CLOUDGOV_SPACE         = var.cf_space_name
    AWS_USE_FIPS_ENDPOINT  = 1 # required for "s3-fips.us-gov-*.amazonaws.com"
    GIT_SHA_HASH           = var.git_sha_hash
    REQUESTS_CA_BUNDLE     = "/etc/ssl/certs/ca-certificates.crt" # use cloud.gov ssl certificates for internal routing
    WEB_INSTANCES          = var.web_instances
    WEB_DB_MAX_CONNECTIONS = var.web_db_max_connections
    WEB_GEVENT_WORKERS     = var.web_gevent_workers
  }

  service_bindings = (var.env == "prod" ? local.prod_service_bindings : local.base_service_bindings)

  depends_on = [
    cloudfoundry_service_instance.credentials,
    module.s3,
    module.app_space,
    module.database
  ]
}
