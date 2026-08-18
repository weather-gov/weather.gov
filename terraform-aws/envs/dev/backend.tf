terraform {
  backend "s3" {
    bucket       = "weathergov-tfstate-dev-mst-adhoc-nec"
    key          = "envs/dev/terraform.tfstate"
    region       = "us-east-1"
    encrypt      = true
    use_lockfile = true
  }
}
