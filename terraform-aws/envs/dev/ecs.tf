resource "aws_ecs_cluster" "main" {
  name = "weathergov-${var.env}"

  tags = {
    "noaa:subcomponent" = "applicationserver"
  }
}

resource "aws_ecs_task_definition" "ghwo" {
  family                   = "weathergov-${var.env}-ghwo"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"

  # start on the smallest tier. TODO: make this configurable
  cpu    = 256
  memory = 1024

  container_definitions = jsonencode([
    {
      name      = "ghwo"
      image     = "${var.container_registry}/weathergov-${var.env}-tasks-ghwo:${var.image_tag}"
      essential = true

      environment = [
        { "name" : "TIMEOUT", "value" : "600" }, # 10m
        { "name" : "E_WORKER_NUM", "value" : "10" },
        { "name" : "T_WORKER_NUM", "value" : "6" },
        { "name" : "TL_WORKER_NUM", "value" : "6" },
        { "name" : "ERR_WORKER_NUM", "value" : "10" },
        { "name" : "DB_HOST", "value" : aws_db_instance.main.address },
        { "name" : "DB_PORT", "value" : tostring(aws_db_instance.main.port) },
        { "name" : "DB_NAME", "value" : aws_db_instance.main.db_name },
      ]

      secrets = [
        {
          name      = "DB_USERNAME"
          valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:username::"
        },
        {
          name      = "DB_PASSWORD"
          valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:password::"
        },
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.ghwo.name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = "ghwo"
        }
      }
    }
  ])

  execution_role_arn = aws_iam_role.ecs_execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  tags = {
    "noaa:subcomponent" = "applicationserver"
  }
}

resource "aws_security_group" "tasks" {
  name        = "weathergov-${var.env}-ecs-tasks"
  description = "Egress for weathergov-${var.env} ECS tasks"
  vpc_id      = data.aws_vpc.main.id

  tags = {
    "noaa:subcomponent" = "applicationserver"
  }
}

resource "aws_vpc_security_group_egress_rule" "tasks_all" {
  security_group_id = aws_security_group.tasks.id
  description       = "All outbound"
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"

  tags = {
    "noaa:subcomponent" = "applicationserver"
  }
}
