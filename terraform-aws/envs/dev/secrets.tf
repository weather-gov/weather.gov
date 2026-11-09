locals {
  # each secret must be populated out-of-band. example:
  #   aws secretsmanager put-secret-value \
  #     --secret-id weathergov-dev-DJANGO_SECRET_KEY \
  #     --secret-string "$(python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')"
  service_secrets = toset(flatten([for name, service in var.services : service.secrets]))
}

resource "aws_secretsmanager_secret" "service" {
  for_each    = local.service_secrets
  name        = "weathergov-${var.env}-${each.key}"
  description = "Terraform secret for ${each.key}"

  tags = {
    "noaa:subcomponent" = "applicationserver"
  }

  # don't silently destroy secrets if the current terraform config does not have it
  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_secretsmanager_secret" "valkey" {
  name        = "weathergov-${var.env}-valkey-password"
  description = "valkey password for weathergov-${var.env}"

  tags = {
    "noaa:subcomponent" = "cache"
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_secretsmanager_secret_version" "valkey" {
  secret_id                = aws_secretsmanager_secret.valkey.id
  secret_string_wo         = random_password.valkeyuser.result
  secret_string_wo_version = 1
}

# terraform must own this valkey password so that it can be shared amongst the
# valkey user (as a direct password reference) and ecs (via secrets manager). in
# the future, we will move to iam authentication.
resource "random_password" "valkeyuser" {
  length  = 32
  special = true
  # Exclude characters that could cause issues in connection strings
  override_special = "!#$%&*()-_=+[]{}<>:?"
}
