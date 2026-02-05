# Quick start guide

Assuming your environment is `test`,

- Edit `weathergov-test.tfvars`
  - For instance, you might want to increase API interop memory limits: `api_interop_memory = "2048M"`
  - See `variables.tf` for a full list of variables that you can override
- Run `./terraform.sh -e weathergov-test -c apply`
  - Note that this will also deploy the current repository contents, including any changes you have made in `forecast` and `api-interop-layer`

For technical details, including how to bootstrap Terraform, please see [the Terraform dev docs](../docs/dev/terraform.md).
