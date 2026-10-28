# Native Terraform overrides applied only in this local root.
# All other resource settings come from the linked dev configuration but
# MiniStack does not return the RDS-managed MasterUserSecret metadata.
resource "aws_db_instance" "main" {
  # Null removes the shared dev value (true); explicitly setting false still
  # conflicts with the password argument in the AWS provider schema.
  manage_master_user_password = null
  password                    = local.ministack_db_password
}

locals {
  task_db_secrets = [
    {
      name      = "DB_USERNAME"
      valueFrom = "${aws_secretsmanager_secret_version.ministack_db.secret_id}:username::"
    },
    {
      name      = "DB_PASSWORD"
      valueFrom = "${aws_secretsmanager_secret_version.ministack_db.secret_id}:password::"
    },
  ]
}

data "aws_iam_policy_document" "ecs_execution_secrets" {
  statement {
    sid       = "ReadMiniStackDatabaseSecret"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.ministack_db.arn]
  }
}
