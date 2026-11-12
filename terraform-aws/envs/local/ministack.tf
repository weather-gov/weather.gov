# MiniStack-only additions to the linked dev configuration.
locals {
  # Public, disposable development credentials. Never use this password on AWS.
  ministack_db_password = "ministack-only-password"
}

resource "aws_secretsmanager_secret" "ministack_db" {
  name                    = "ministack/weathergov-${var.env}/database"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "ministack_db" {
  secret_id = aws_secretsmanager_secret.ministack_db.arn
  secret_string = jsonencode({
    username = var.database_username
    password = local.ministack_db_password
  })
}

# service secrets are populated out-of-band on AWS (see: secrets.tf).
# here, we stub them in since this is for local dev only.
resource "aws_secretsmanager_secret_version" "ministack_service" {
  for_each      = aws_secretsmanager_secret.service
  secret_id     = each.value.arn
  secret_string = "ministack-only-${lower(each.key)}"
}

# ECR repositories are created in another account. we add them here.
resource "aws_ecr_repository" "ministack" {
  for_each = toset([
    "weathergov-${var.env}-django",
    "weathergov-${var.env}-interop",
    "weathergov-${var.env}-tasks-alerts",
    "weathergov-${var.env}-tasks-ghwo",
    "weathergov-${var.env}-tasks-gridcache",
    "weathergov-${var.env}-tasks-wpcprob"
  ])
  name                 = each.value
  image_tag_mutability = "MUTABLE"
  force_delete         = true
}
