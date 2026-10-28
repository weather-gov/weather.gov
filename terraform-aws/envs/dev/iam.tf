data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test     = "ArnLike"
      variable = "aws:SourceArn"
      values   = ["arn:aws:ecs:${var.region}:${data.aws_caller_identity.current.account_id}:*"]
    }
  }
}

resource "aws_iam_role" "ecs_execution" {
  name        = "weathergov-${var.env}-ecs-execution"
  description = "ECS task execution role for weathergov-${var.env}"

  permissions_boundary = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:policy/weathergov-boundary"

  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json

  tags = {
    "noaa:subcomponent" = "applicationserver"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "ecs_execution_secrets" {
  statement {
    sid     = "ReadRdsManagedMasterSecret"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:rds!db-*",
    ]
  }

  statement {
    sid     = "ReadServiceSecrets"
    actions = ["secretsmanager:GetSecretValue"]
    resources = [
      "arn:aws:secretsmanager:${var.region}:${data.aws_caller_identity.current.account_id}:secret:weathergov-${var.env}-*",
    ]
  }

  statement {
    sid       = "DecryptViaSecretsManager"
    actions   = ["kms:Decrypt"]
    resources = ["arn:aws:kms:${var.region}:${data.aws_caller_identity.current.account_id}:key/*"]
  }
}

resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name   = "weathergov-${var.env}-ecs-execution-secrets"
  role   = aws_iam_role.ecs_execution.id
  policy = data.aws_iam_policy_document.ecs_execution_secrets.json
}
