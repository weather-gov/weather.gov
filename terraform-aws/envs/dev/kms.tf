resource "aws_kms_key" "logs" {
  description             = "CloudWatch Logs encryption for weathergov-${var.env}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = data.aws_iam_policy_document.logs_kms.json

  tags = {
    "noaa:subcomponent" = "applicationserver"
  }
}

data "aws_iam_policy_document" "logs_kms" {
  statement {
    sid    = "EnableIAMUserPermissions"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }

    actions   = ["kms:*"]
    resources = ["*"]
  }

  statement {
    sid    = "AllowCloudWatchLogs"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["logs.${var.region}.amazonaws.com"]
    }

    actions = [
      "kms:Encrypt*",
      "kms:Decrypt*",
      "kms:ReEncrypt*",
      "kms:GenerateDataKey*",
      "kms:Describe*",
    ]

    resources = ["*"]

    condition {
      test     = "ArnLike"
      variable = "kms:EncryptionContext:aws:logs:arn"
      values = [
        "arn:aws:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/ecs/weathergov-${var.env}-*",
      ]
    }
  }
}

resource "aws_kms_key" "cache" {
  description             = "Valkey encryption for weathergov-${var.env}"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = data.aws_iam_policy_document.cache_kms.json

  tags = {
    "noaa:subcomponent" = "cache"
  }
}

data "aws_iam_policy_document" "cache_kms" {
  statement {
    sid    = "EnableIAMUserPermissions"
    effect = "Allow"

    principals {
      type        = "AWS"
      identifiers = ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
    }

    actions   = ["kms:*"]
    resources = ["*"]
  }

  statement {
    sid    = "AllowValkey"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["elasticache.amazonaws.com"]
    }

    actions = [
      "kms:Encrypt*",
      "kms:Decrypt*",
      "kms:GenerateDataKey*",
      "kms:Describe*",
      "kms:CreateGrant",
    ]

    # no condition: since elasticache takes one grant per cache, the principal
    # is the only service that can use this valkey key. to examine:
    # `aws kms list-grants --key-id <id>`
    resources = ["*"]
  }
}
