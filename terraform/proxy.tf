data "archive_file" "api_proxy_src" {
  type        = "zip"
  source_dir  = "${path.module}/../api-proxy"
  output_path = "${path.module}/dist/api_proxy_src.zip"
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

resource "cloudfoundry_app" "api-proxy" {
  count = (var.enable_api_proxy == false ? 0 : 1)

  name             = "api-proxy-${local.app_name}-${var.env}"
  space_name       = var.cf_space_name
  org_name         = local.cf_org_name
  path             = data.archive_file.api_proxy_src.output_path
  source_code_hash = data.archive_file.api_proxy_src.output_base64sha256
  buildpacks       = ["nodejs_buildpack"]
  strategy         = "rolling"
  routes           = [{ route = "api-proxy-${local.host_name}.app.cloud.gov" }]
  enable_ssh       = true

  environment = {
    API_PROXY_PRODUCTION = true
    OPTIMIZE_MEMORY      = true
  }

  processes = [
    {
      type              = "web"
      instances         = 1
      memory            = var.api_proxy_memory
      health_check_type = "process"
    }
  ]

  depends_on = [
    module.app_space
  ]
}
