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
