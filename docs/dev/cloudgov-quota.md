# cloud.gov environment needs

As of April 2026, our cloud.gov memory quota is set to 30G.

- Production
  - 4x django at 1G
  - 4x interop at 1G
  - Total: 8G
- Staging
  - 4x django at 3G
  - 2x interop at 2G
  - Total: 16G
- Test
  - 1x django at 1G
  - 1x interop at 1G
  - 1x proxy at 512M
  - Total: 2.5G

Total: 26.5G. Recall that we need some memory quota overhead to redeploy
instances. So if we wanted to redeploy an interop instance with 1G, we would
need at least 1G of memory available (since the instances would be swapped out).

Our current instance memory allocations are hardcoded by the terraform `tfvars`
files so reference these files when in doubt:

- `terraform/weathergov-prod.tfvars`
- `terraform/weathergov-staging.tfvars`
- `terraform/weathergov-test.tfvars`
