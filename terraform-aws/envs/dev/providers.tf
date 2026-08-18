terraform {
  required_version = "~> 1.12"

  # https://registry.terraform.io/providers/hashicorp/aws/latest/docs
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      "noaa:applicationname" = "weatherapi"
      "noaa:projectid"       = "noaa8501"
      "noaa:environment"     = var.env
    }
  }
}
