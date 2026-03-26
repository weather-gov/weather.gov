locals {
  cf_org_name       = "nws-weathergov"
  app_name          = "weathergov"
  space_deployers   = setunion([var.cf_user], var.space_deployers)
  credentials       = jsondecode(file("credentials-${var.env}.json"))
  django_secret_key = local.credentials.django_secret_key
  sp_public_key     = local.credentials.sp_public_key
  sp_private_key    = local.credentials.sp_private_key
  newrelic_license  = local.credentials.newrelic_license
}

module "app_space" {
  source = "github.com/gsa-tts/terraform-cloudgov//cg_space?ref=v2.4.1"

  cf_org_name          = local.cf_org_name
  cf_space_name        = var.cf_space_name
  allow_ssh            = var.allow_space_ssh
  deployers            = local.space_deployers
  developers           = var.space_developers
  security_group_names = ["trusted_local_networks_egress", "public_networks_egress"]
}

module "database" {
  source = "github.com/gsa-tts/terraform-cloudgov//database?ref=v2.4.1"

  cf_space_id   = module.app_space.space_id
  name          = "${local.app_name}-rds-${var.env}"
  rds_plan_name = var.rds_plan_name
  depends_on    = [module.app_space]
}

module "redis" {
  source = "github.com/gsa-tts/terraform-cloudgov//redis?ref=v2.4.1"

  cf_space_id     = module.app_space.space_id
  name            = "${local.app_name}-redis-${var.env}"
  redis_plan_name = var.redis_plan_name
  depends_on      = [module.app_space]
}

module "s3" {
  source = "github.com/gsa-tts/terraform-cloudgov//s3?ref=v2.4.1"

  cf_space_id  = module.app_space.space_id
  name         = "${local.app_name}-s3-${var.env}"
  s3_plan_name = var.s3_plan_name
  depends_on   = [module.app_space]
  json_params = jsonencode(
    {
      "object_ownership" : "BucketOwnerEnforced",
    }
  )
}

# this module has prerequisites before it can be utilized:
# 1. create domain manually: `cf create-domain nws-weathergov $var.custom_domain_name`
# 2. create an ACME challenge record
#    https://docs.cloud.gov/platform/services/external-domain-service/#how-to-create-an-instance-of-this-service
# module "domain" {
#   count  = (var.custom_domain_name == null ? 0 : 1)
#   source = "github.com/gsa-tts/terraform-cloudgov//domain?ref=v2.4.1"

#   name          = "weathergov-beta-domain"
#   cf_org_name   = local.cf_org_name
#   cf_space      = module.app_space.space
#   cdn_plan_name = "domain-with-cdn"
#   domain_name   = var.custom_domain_name
#   host_name     = var.host_name
#   depends_on    = [module.app_space]
# }

resource "cloudfoundry_service_instance" "credentials" {
  name  = "${var.env}-credentials"
  space = module.app_space.space_id
  type  = "user-provided"
  credentials = jsonencode({
    "django_secret_key" = local.django_secret_key
    "sp_public_key"     = local.sp_public_key
    "sp_private_key"    = local.sp_private_key
  })
  tags       = ["terraform-cloudgov-managed"]
  depends_on = [module.app_space]
}
