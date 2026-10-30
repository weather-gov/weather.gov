locals {
  # every ECR task or service requires the same database settings.
  task_db_environment = [
    { name = "DB_HOST", value = aws_db_instance.main.address },
    { name = "DB_PORT", value = tostring(aws_db_instance.main.port) },
    { name = "DB_NAME", value = aws_db_instance.main.db_name },
  ]

  task_db_secrets = [
    {
      name      = "DB_USERNAME"
      valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:username::"
    },
    {
      name      = "DB_PASSWORD"
      valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:password::"
    },
  ]
}

resource "aws_ecs_cluster" "main" {
  name = "weathergov-${var.env}"

  tags = {
    "noaa:subcomponent" = "applicationserver"
  }
}

// for each ECR scheduled task (ghwo, gridcache, wpcprob).
resource "aws_ecs_task_definition" "tasks" {
  for_each = var.tasks

  family                   = "weathergov-${var.env}-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"

  cpu    = each.value.cpu
  memory = each.value.memory

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${var.container_registry}/weathergov-${var.env}-tasks-${each.key}:${var.image_tag}"
      essential = true

      # NB: map iteration is lexically ordered so its the same order every time
      environment = concat(
        [for name, value in each.value.environment : { name = name, value = value }],
        local.task_db_environment,
      )

      secrets = local.task_db_secrets

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.workloads[each.key].name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = each.key
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

// for each ECR service (alerts, django, interop).
resource "aws_ecs_task_definition" "services" {
  for_each = var.services

  family                   = "weathergov-${var.env}-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"

  cpu    = each.value.cpu
  memory = each.value.memory

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${var.container_registry}/weathergov-${var.env}-${coalesce(each.value.repository, each.key)}:${var.image_tag}"
      essential = true

      # NB: map iteration is lexically ordered so its the same value every time
      environment = concat(
        [for name, value in each.value.environment : { name = name, value = value }],
        local.task_db_environment,
      )

      secrets = concat(
        local.task_db_secrets,
        # NB: map iteration is lexically ordered so its the same order every time
        [for name in each.value.secrets : {
          name      = name
          valueFrom = aws_secretsmanager_secret.service[name].arn
        }],
      )

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.workloads[each.key].name
          "awslogs-region"        = var.region
          "awslogs-stream-prefix" = each.key
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

resource "aws_ecs_service" "services" {
  for_each = var.services

  name            = "weathergov-${var.env}-${each.key}"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.services[each.key].arn
  desired_count   = each.value.desired_count
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = data.aws_subnets.private.ids
    security_groups  = [aws_security_group.tasks.id]
    assign_public_ip = false
  }

  tags = {
    "noaa:subcomponent" = "applicationserver"
  }
}

resource "aws_scheduler_schedule_group" "tasks" {
  name = "weathergov-${var.env}-tasks"

  tags = {
    "noaa:subcomponent" = "applicationserver"
  }
}

resource "aws_scheduler_schedule" "schedules" {
  for_each = var.tasks

  name       = "weathergov-${var.env}-${each.key}-ecs-scheduler"
  group_name = aws_scheduler_schedule_group.tasks.name

  flexible_time_window {
    mode = "OFF"
  }

  schedule_expression = each.value.scheduler

  target {
    arn      = aws_ecs_cluster.main.arn
    role_arn = aws_iam_role.ecs_scheduler.arn

    ecs_parameters {
      task_definition_arn = aws_ecs_task_definition.tasks[each.key].arn
      launch_type         = "FARGATE"

      # NB make sure this is the same as aws_ecs_service.services.network_configuration
      network_configuration {
        subnets          = data.aws_subnets.private.ids
        security_groups  = [aws_security_group.tasks.id]
        assign_public_ip = false
      }
    }
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
