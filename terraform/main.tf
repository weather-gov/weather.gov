locals {
  cf_org_name       = "nws-weathergov"
  app_name          = "weathergov"
  space_deployers   = setunion([var.cf_user], var.space_deployers)
  credentials       = jsondecode(file("credentials-${var.env}.json"))
  django_secret_key = local.credentials.django_secret_key
}

# only needed if you do not want to destroy the space.
# `cf space foo --guid` to get the guid for space 'foo'.
# import {
#   to = module.app_space.cloudfoundry_space.space
#   id = "085f4c66-5129-4a34-9a4c-8bd22a5b850e"
# }

module "app_space" {
  source = "github.com/gsa-tts/terraform-cloudgov//cg_space?ref=v2.1.0"

  cf_org_name          = local.cf_org_name
  cf_space_name        = var.cf_space_name
  allow_ssh            = var.allow_space_ssh
  deployers            = local.space_deployers
  developers           = var.space_developers
  security_group_names = ["trusted_local_networks_egress", "public_networks_egress"]
}

module "database" {
  source = "github.com/gsa-tts/terraform-cloudgov//database?ref=v2.1.0"

  cf_space_id   = module.app_space.space_id
  name          = "${local.app_name}-rds-${var.env}"
  rds_plan_name = var.rds_plan_name
  # depends_on line is required only for initial creation and destruction. It can be commented out for updates if you see unwanted cascading effects
  # depends_on    = [module.app_space]
}

module "s3" {
  source = "github.com/gsa-tts/terraform-cloudgov//s3?ref=v2.1.0"

  cf_space_id  = module.app_space.space_id
  name         = "${local.app_name}-s3-${var.env}"
  s3_plan_name = var.s3_plan_name
  # depends_on line is required only for initial creation and destruction. It can be commented out for updates if you see unwanted cascading effects
  # depends_on   = [module.app_space]
}

###########################################################################
# TODO: Uncomment when we are ready to move beta.weather.gov
# Before setting var.custom_domain_name, perform the following steps:
# 1) Domain must be manually created by an OrgManager:
#     cf create-domain var.cf_org_name var.domain_name
# 2) ACME challenge record must be created.
#     See https://cloud.gov/docs/services/external-domain-service/#how-to-create-an-instance-of-this-service
###########################################################################


# module "domain" {
#   count  = (var.custom_domain_name == null ? 0 : 1)
#   source = "github.com/gsa-tts/terraform-cloudgov//domain?ref=v2.1.0"

#   cf_org_name   = local.cf_org_name
#   cf_space      = module.app_space.space
#   cdn_plan_name = "domain"
#   domain_name   = var.custom_domain_name
#   host_name     = var.host_name
#   # depends_on line is required only for initial creation and destruction. It can be commented out for updates if you see unwanted cascading effects
#   # depends_on = [module.app_space]
# }

resource "cloudfoundry_service_instance" "credentials" {
  name  = "${var.env}-credentials"
  space = module.app_space.space_id
  type  = "user-provided"
  credentials = jsonencode({
    "django_secret_key" = local.django_secret_key
  })
  # depends_on line is needed only for initial creation and destruction. It should be commented out for updates to prevent unwanted cascading effects
  # depends_on = [module.app_space]
}
