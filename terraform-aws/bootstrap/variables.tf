variable "region" {
  type        = string
  default     = "us-east-1"
  description = "AWS region for the state bucket."
}

variable "bucket_name" {
  type        = string
  default     = "weathergov-tfstate-dev-mst-adhoc-nec"
  description = "S3 bucket name for Terraform state."
}
