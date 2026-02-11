# cloud.gov environment needs

As of February 2026, our cloud.gov memory quota is set to 9G.

- Production
  - 1x django at 1G
  - 2x interop at 1G
  - Total: 3G
- Staging
  - 1x django at 1G
  - 1x interop at 1G
  - Total: 2G
- Test
  - 1x django at 1G
  - 1x interop at 1G
  - 1x proxy at 512M
  - Total: 2.5G

Total: 7.5G. Recall that we need some memory quota overhead to redeploy
instances. So if we wanted to redeploy an interop instance with 1G, we would
need at least 1G of memory available (since the instances would be swapped out).

Our current instance memory allocations are hardcoded by the terraform `tfvars`
files so reference these files when in doubt:

- `terraform/weathergov-prod.tfvars`
- `terraform/weathergov-staging.tfvars`
- `terraform/weathergov-test.tfvars`
