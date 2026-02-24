terraform {
  required_version = "~> 1.10"
  required_providers {
    cloudfoundry = {
      source  = "cloudfoundry/cloudfoundry"
      version = "1.12.0"
    }
  }

  backend "s3" {
    encrypt      = true
    use_lockfile = true
    region       = "us-gov-west-1"
  }
}

provider "cloudfoundry" {
  api_url  = "https://api.fr.cloud.gov"
  user     = var.cf_user
  password = var.cf_password
}
