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
      "noaa:programoffice"   = "nws-mst"
      "noaa:lineoffice"      = "nws"
      "noaa:fismaid"         = "noaa8501"
      "noaa:taskorderid"     = var.task_order
      "noaa:environment"     = var.env
      "noaa:projectid"       = "noaa8501"
      "noaa:applicationname" = "weathergov"
      "noaa:monitoring"      = false

      "nws:poc"      = "nco.ops@noaa.gov"
      "nws:csp"      = "aws"
      "nws:team"     = "nco.ops@noaa.gov"
      "nws:iac:type" = "terraform"
      "nws:iac:repo" = var.gitlab_repo
      "nws:enclave"  = "moderate"
      "nws:backups"  = "90day"
    }
  }
}
