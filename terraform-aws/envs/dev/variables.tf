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

variable "log_retention_days" {
  type        = number
  default     = 30
  description = "CloudWatch Logs retention for task log groups."
}
