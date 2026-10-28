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
