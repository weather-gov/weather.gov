resource "aws_cloudwatch_log_group" "workloads" {
  for_each = toset(concat(keys(var.tasks), keys(var.services)))

  name = "/ecs/weathergov-${var.env}-${each.key}"

  # we cannot change log retention (NEC forces an override.)
  retention_in_days = 365
  lifecycle {
    ignore_changes = [retention_in_days]
  }

  kms_key_id = aws_kms_key.logs.arn

  tags = {
    "noaa:subcomponent" = "applicationserver"
  }
}
