data "archive_file" "tasks_src" {
  type        = "zip"
  source_dir  = "${path.module}/../tasks"
  output_path = "${path.module}/dist/tasks_src.zip"
  excludes = [
    ".git*",
  ]
}

resource "cloudfoundry_app" "tasks" {
  name       = "tasks-${local.app_name}-${var.env}"
  space_name = var.cf_space_name
  org_name   = local.cf_org_name
  count      = (var.cf_space_name == "prod" ? 0 : 1)

  path              = data.archive_file.tasks_src.output_path
  source_code_hash  = data.archive_file.tasks_src.output_base64sha256
  buildpacks        = ["go_buildpack"]
  strategy          = "rolling"
  no_route          = true
  enable_ssh        = true
  instances         = 1
  memory            = var.tasks_memory
  disk_quota        = var.tasks_disk_quota
  health_check_type = "process"

  environment = {
    NEW_RELIC_LICENSE_KEY   = local.newrelic_license
    GOVERSION               = "1.26"
    GO_INSTALL_PACKAGE_SPEC = "./cmd/alerts ./cmd/ghwo"
    CLOUDGOV_SPACE          = var.cf_space_name
  }

  service_bindings = [
    { service_instance = "${local.app_name}-rds-${var.env}" },
  ]

  depends_on = [
    module.app_space,
    module.database,
  ]
}
