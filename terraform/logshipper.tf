locals {
  logshipper_bucket = "${local.app_name}-logs-${var.env}"
}

module "logshipper" {
  source = "github.com/gsa-tts/terraform-cloudgov//logshipper?ref=v2.4.1"
  name   = "logshipper-${local.app_name}-${var.env}"

  # enable only for production
  count = (var.env == "prod" ? 1 : 0)

  cf_org_name       = local.cf_org_name
  cf_space          = module.app_space.space
  logshipper_memory = "512M"

  # we do NOT want to enable New Relic, otherwise we would double-log.
  # unfortunately the cloud.gov logic assumes that you want NR and, optionally,
  # a S3 bucket, while it is the other way around for us. so pass in a fake key
  # and unset the https proxy url, since that requires an egress proxy to
  # properly set up NR logging.
  new_relic_license_key = "NRAKTHISISAFAKEKEY"
  https_proxy_url       = ""

  service_bindings = {
    "${local.logshipper_bucket}" = ""
  }
  depends_on = [module.app_space, module.s3_logs]
}

module "s3_logs" {
  source = "github.com/gsa-tts/terraform-cloudgov//s3?ref=v2.4.1"

  # enable only for production
  count = (var.env == "prod" ? 1 : 0)

  cf_space_id  = module.app_space.space_id
  name         = local.logshipper_bucket
  s3_plan_name = "basic-sandbox"
  depends_on   = [module.app_space]
  tags         = ["logshipper-s3"]
}
