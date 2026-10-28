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
