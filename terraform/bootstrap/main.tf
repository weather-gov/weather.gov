terraform {
  required_version = "~> 1.10"
  required_providers {
    cloudfoundry = {
      source  = "cloudfoundry/cloudfoundry"
      version = "1.12.0"
    }
  }
}

# empty config will let terraform borrow cf-cli's auth
provider "cloudfoundry" {}

variable "terraform_users" {
  type        = set(string)
  description = "The list of developer emails and service account usernames who should be granted access to retrieve state bucket credentials"

  validation {
    condition     = length(var.terraform_users) > 0
    error_message = "terraform_users must include at least the current user calling apply.sh"
  }
}

variable "mgmt_space_name" {
  type        = string
  default     = "weathergov-mgmt"
  description = "The name of the mgmt space"
}

variable "create_bot_secrets_file" {
  type        = bool
  default     = false
  description = "Flag whether to create secrets.cicd.auto.tfvars file"
}

locals {
  org_name = "nws-weathergov"
  # s3_plan_name should be basic when holding production data, though basic-sandbox will make early iterations easier
  s3_plan_name = "basic-sandbox"
}

module "mgmt_space" {
  source = "github.com/gsa-tts/terraform-cloudgov//cg_space?ref=v2.4.1"

  cf_org_name   = local.org_name
  cf_space_name = var.mgmt_space_name
  developers    = var.terraform_users
}

module "s3" {
  source = "github.com/gsa-tts/terraform-cloudgov//s3?ref=v2.4.1"

  cf_space_id  = module.mgmt_space.space_id
  name         = "weathergov-terraform-state"
  s3_plan_name = local.s3_plan_name
  depends_on   = [module.mgmt_space]
}

data "cloudfoundry_service_plans" "cg_service_account" {
  name                  = "space-deployer"
  service_offering_name = "cloud-gov-service-account"
}

locals {
  sa_service_name    = "weathergov-cicd-deployer"
  sa_key_name        = "cicd-deployer-access-key"
  sa_bot_credentials = jsondecode(data.cloudfoundry_service_credential_binding.runner_sa_key.credential_bindings.0.credential_binding).credentials
  sa_cf_username     = nonsensitive(local.sa_bot_credentials.username)
  sa_cf_password     = local.sa_bot_credentials.password
}

resource "cloudfoundry_service_instance" "runner_service_account" {
  name         = local.sa_service_name
  type         = "managed"
  space        = module.mgmt_space.space_id
  service_plan = data.cloudfoundry_service_plans.cg_service_account.service_plans.0.id
  depends_on   = [module.mgmt_space]
}

resource "cloudfoundry_service_credential_binding" "runner_sa_key" {
  name             = local.sa_key_name
  service_instance = cloudfoundry_service_instance.runner_service_account.id
  type             = "key"
}

data "cloudfoundry_service_credential_binding" "runner_sa_key" {
  name             = local.sa_key_name
  service_instance = cloudfoundry_service_instance.runner_service_account.id
  depends_on       = [cloudfoundry_service_credential_binding.runner_sa_key]
}

data "cloudfoundry_org" "org" {
  name = local.org_name
}

data "cloudfoundry_user" "sa_user" {
  name = local.sa_cf_username
}

resource "cloudfoundry_org_role" "sa_org_manager" {
  user = data.cloudfoundry_user.sa_user.users.0.id
  type = "organization_manager"
  org  = data.cloudfoundry_org.org.id
}

locals {
  bucket_creds_key_name = "backend-state-bucket-creds"
}

resource "cloudfoundry_service_credential_binding" "bucket_creds" {
  name             = local.bucket_creds_key_name
  service_instance = module.s3.bucket_id
  type             = "key"
}

data "cloudfoundry_service_credential_binding" "bucket_creds" {
  name             = local.bucket_creds_key_name
  service_instance = module.s3.bucket_id
  depends_on       = [cloudfoundry_service_credential_binding.bucket_creds]
}

locals {
  import_map = {
    "module.mgmt_space.cloudfoundry_space.space"            = module.mgmt_space.space_id
    "module.s3.cloudfoundry_service_instance.bucket"        = module.s3.bucket_id
    "cloudfoundry_service_credential_binding.bucket_creds"  = cloudfoundry_service_credential_binding.bucket_creds.id
    "cloudfoundry_service_instance.runner_service_account"  = cloudfoundry_service_instance.runner_service_account.id
    "cloudfoundry_service_credential_binding.runner_sa_key" = cloudfoundry_service_credential_binding.runner_sa_key.id
    "cloudfoundry_org_role.sa_org_manager"                  = cloudfoundry_org_role.sa_org_manager.id
  }

  recreate_state_template = templatefile("${path.module}/templates/imports.tf.tftpl", {
    import_map    = local.import_map,
    developer_map = { for username, id in module.mgmt_space.developer_role_ids : username => id },
    manager_map   = { for username, id in module.mgmt_space.manager_role_ids : username => id }
  })
}

resource "local_file" "recreate_script" {
  content         = local.recreate_state_template
  filename        = "${path.module}/imports.tf"
  file_permission = "0644"
}

locals {
  bucket_creds   = jsondecode(data.cloudfoundry_service_credential_binding.bucket_creds.credential_bindings.0.credential_binding).credentials
  backend_config = templatefile("${path.module}/templates/backend_config.tftpl", { creds = local.bucket_creds })
}

resource "local_sensitive_file" "bucket_creds" {
  content         = local.backend_config
  filename        = "${path.module}/../secrets.backend.tfvars"
  file_permission = "0600"
}

resource "local_sensitive_file" "bot_secrets_file" {
  count           = (var.create_bot_secrets_file ? 1 : 0)
  filename        = "${path.module}/../secrets.cicd.auto.tfvars"
  file_permission = "0600"

  content = templatefile("${path.module}/templates/bot_secrets.tftpl", {
    service_name = local.sa_service_name,
    key_name     = local.sa_key_name,
    username     = local.sa_cf_username,
    password     = local.sa_cf_password
  })
}

output "mgmt_space_id" {
  value = module.mgmt_space.space_id
}

output "mgmt_org_id" {
  value = data.cloudfoundry_org.org.id
}
