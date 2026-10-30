variable "region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region for this environment."
}

variable "env" {
  type        = string
  default     = "dev"
  description = "Environment name."
}

variable "database_engine_version" {
  type        = string
  default     = "17"
  description = "Postgres major version."
}

# based on cloud.gov `large-gp-psql-redundant` instance
variable "database_instance_class" {
  type        = string
  default     = "db.m5.large"
  description = "RDS instance class."
}

variable "database_allocated_storage" {
  type        = number
  default     = 20
  description = "Allocated storage in GB."
}

variable "database_name" {
  type        = string
  default     = "weathergov"
  description = "Database name."
}

variable "database_username" {
  type        = string
  default     = "weathergov"
  description = "Database username. The password is generated and rotated by AWS Secrets Manager."
}

variable "container_registry" {
  type        = string
  description = "ECR registry (required)"
}

variable "image_tag" {
  type        = string
  description = "Image tag SHA1 hash (required)"
}

variable "task_order" {
  type        = string
  description = "NOAA task order (required)"
}

variable "gitlab_repo" {
  type        = string
  description = "Gitlab repository URL (required)"
}

variable "tasks" {
  description = "ECR scheduled task definitions."

  type = map(object({
    cpu         = number
    memory      = number
    scheduler   = string # cron(minutes hours day-of-month month day-of-week year)
    environment = optional(map(string), {})
  }))

  default = {
    # Every 30m.
    ghwo = {
      cpu       = 1024
      memory    = 2048
      scheduler = "cron(*/30 * * * ? *)"
      environment = {
        TIMEOUT = "600" # 10m
      }
    }

    # Every 30m.
    gridcache = {
      cpu       = 1024
      memory    = 2048
      scheduler = "cron(*/30 * * * ? *)"
    }

    # Every 60m, offset :10.
    wpcprob = {
      cpu       = 1024
      memory    = 4096
      scheduler = "cron(10 * * * ? *)"
      environment = {
        WPCPROB_TIMEOUT = "1200" # 20m
      }
    }
  }
}

variable "services" {
  description = "ECR service definitions."

  type = map(object({
    cpu           = number
    memory        = number
    desired_count = optional(number, 0)
    environment   = optional(map(string), {})
    secrets       = optional(list(string), [])

    # special case alerts, since it's not weathergov-<env>-alerts but rather
    # weathergov-<env>-tasks-alerts.
    repository = optional(string)
  }))

  default = {
    alerts = {
      cpu        = 256
      memory     = 512
      repository = "tasks-alerts"
    }

    interop = {
      cpu    = 256
      memory = 512
    }

    django = {
      cpu     = 1024
      memory  = 4096
      secrets = ["DJANGO_SECRET_KEY"]
      environment = {
        DJANGO_SETTINGS_MODULE = "backend.config.settings.aws"
        NEC_ADDRESS            = "http://0.0.0.0" # stub for now
      }
    }
  }
}
