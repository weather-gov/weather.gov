# MiniStack local overlay

This is a local Terraform root, not a second copy of the application infrastructure.
The shared Terraform files and base variable values are relative symlinks to
[../dev](../dev/). Terraform follows them and then merges
[ministack_override.tf](ministack_override.tf) using its native override rules.
[ministack.tf](ministack.tf) contains only the local-only database secret (so far).

Uses `just ministack-terraform plan` or `just ministack-terraform apply` from the
repository root. `just ministack` uses this directory automatically. The
recipe uses plain Terraform with local endpoint and mock-credential environment
settings. It also passes [backend-ministack.hcl](backend-ministack.hcl) to enable
path-style S3 addressing, required by MiniStack's endpoint. **Do not use with real AWS credentials.**

The AWS dev root is unchanged and never loads these local files. Local backend
metadata is separate. 

## Keeping local and dev aligned

- Changes to existing linked dev files are immediately reflected here.
- When adding a dev Terraform file, add a relative symlink here as well.
- Do not link dev's backend cache, state files, or mock datasets.
- Editing a symlink edits the shared dev file. Put local-only changes in
  [ministack_override.tf](ministack_override.tf) instead.
- Override attributes replace matching attributes. Nested blocks replace all
  blocks of the same type; they do not deep-merge like Compose mappings. The local
  IAM override therefore replaces the shared policy's statement blocks.
- For local variable values, use `local.auto.tfvars` in this directory. Terraform
  automatically loads `*.auto.tfvars` files. Variable files do not override
  resource definitions; the native override file handles those.

The fixed local database password is public and disposable. It must never be used
in AWS. See the [MiniStack guide](../../../docs/dev/ministack.md) for setup.

The RDS override sets `manage_master_user_password` to `null` so the shared dev
value is omitted locally; setting it explicitly to `false` conflicts with the
provider's `password` argument.
