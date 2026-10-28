
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

variable "bucket_name" {
  type        = string
  default     = "weathergov-tfstate-dev-mst-adhoc-nec"
  description = "S3 bucket name for Terraform state."
}
