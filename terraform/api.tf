data "archive_file" "api_src" {
  type        = "zip"
  source_dir  = "${path.module}/../api-interop-layer"
  output_path = "${path.module}/dist/api_src.zip"
  excludes = [
    "newrelic_agent.log",
    ".git*",
    "node_modules/*",
    "tmp/**/*",
    "terraform/*",
    "log/*",
    "doc/*",
    "credentials-*.json"
  ]
}

module "route" {
  source = "github.com/gsa-tts/terraform-cloudgov//app_route?ref=v2.4.1"

  cf_org_name   = local.cf_org_name
  cf_space_name = var.cf_space_name
  domain        = "apps.internal"
  hostname      = "api-${local.app_name}-${var.env}"
  app_ids       = [cloudfoundry_app.interop.id]
}

resource "cloudfoundry_app" "interop" {
  name       = "api-${local.app_name}-${var.env}"
  space_name = var.cf_space_name
  org_name   = local.cf_org_name

  path              = data.archive_file.api_src.output_path
  source_code_hash  = data.archive_file.api_src.output_base64sha256
  buildpacks        = ["nodejs_buildpack"]
  strategy          = "rolling"
  enable_ssh        = true
  instances         = var.api_interop_instances
  memory            = var.api_interop_memory
  health_check_type = "process"

  environment = {
    NEW_RELIC_LICENSE_KEY  = local.newrelic_license
    API_INTEROP_PRODUCTION = true
    API_INTEROP_NAME       = var.env
    API_INTEROP_INSTANCES  = var.api_interop_instances
    API_DB_MAX_CONNECTIONS = var.api_db_max_connections
    API_URL                = var.api_url
    GHWO_URL               = var.ghwo_url
    API_KEY                = var.api_key
    OPTIMIZE_MEMORY        = true
    DISABLE_GRID_ANALYSIS  = true
    DISABLE_REDIS          = var.cf_space_name == "test" || var.cf_space_name == "loadtest"
    PROXY_STANDALONE       = var.cf_space_name == "test"
  }

  service_bindings = [
    { service_instance = "${local.app_name}-rds-${var.env}" },
    { service_instance = "${local.app_name}-redis-${var.env}" }
  ]

  depends_on = [
    cloudfoundry_service_instance.credentials,
    module.app_space,
    module.database
  ]
}
