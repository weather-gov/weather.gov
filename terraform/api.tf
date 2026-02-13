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

resource "cloudfoundry_app" "interop" {
  name       = "api-${local.app_name}-${var.env}"
  space_name = var.cf_space_name
  org_name   = local.cf_org_name

  path             = data.archive_file.api_src.output_path
  source_code_hash = data.archive_file.api_src.output_base64sha256
  buildpacks       = ["nodejs_buildpack"]
  strategy         = "rolling"
  routes           = (var.custom_domain_name == null ?
    [{ route = "api-${local.host_name}.${local.domain}" }]:
    [{ route = "api-${local.host_name}.app.cloud.gov" }])
  enable_ssh       = true

  environment = {
    NEW_RELIC_LICENSE_KEY  = local.newrelic_license
    API_INTEROP_PRODUCTION = true
    API_INTEROP_NAME       = var.env
    API_URL                = var.api_url
    NWSCONNECT_API_URL     = var.nwsconnect_api_url
    GHWO_URL               = var.ghwo_url
    API_KEY                = var.api_key
    OPTIMIZE_MEMORY        = true
    DISABLE_GRID_ANALYSIS  = true
  }

  processes = [
    {
      type              = "web"
      instances         = var.api_interop_instances
      memory            = var.api_interop_memory
      health_check_type = "process"
    }
  ]

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
