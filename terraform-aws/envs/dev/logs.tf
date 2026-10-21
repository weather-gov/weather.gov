resource "aws_cloudwatch_log_group" "ghwo" {
  name = "/ecs/weathergov-${var.env}-ghwo"

  retention_in_days = var.log_retention_days

  tags = {
    "noaa:subcomponent" = "applicationserver"
  }
}
