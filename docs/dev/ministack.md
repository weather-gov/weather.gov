# BLUF
In order to test our AWS and terraform set up locally, we are using [MiniStack](https://ministack.org/) to run AWS services locally.

## Initial Setup

To run locally, follow these steps:

Make sure you have terraform installed:

```bash
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

Also install the AWS-cli tool (if you don't have it yet):

```bash
brew install okta-aws-cli
```

We'll be using `terraform` commands locally - as the providers point AWS services to the `http://localhost:4566` endpoint. If you add a service (see [this list](https://ministack.org/docs/services/) for services MiniStack supports) be sure to add it to the `boostrap-local/providers` `provider "aws".endpoints {...}` list.

## Running locally

Run `just ministack-cb` to tear down all containers and remove spatial data and rebuild them with the MiniStack set up.

(You can also run `just ministack` to spin up your MiniStack docker container, run the terraform set up for AWS services, and do the rest of the init steps (starting the other containers, running migrations, load the spatial data, etc.) but doing a controlled burn allows you to start completely fresh to verify the containers are all building and interlinking correctly.)

You can verify MiniStack is running by navigating to [http://localhost:4566/\_ministack/health](http://localhost:4566/_ministack/health).

Other handy URLs:

- To view buckets: [http://localhost:4566](http://localhost:4566)
- To view what's in a bucket: `http://localhost:4566/{bucket_name}`

### Local Terraform overrides

`just ministack` calls `just ministack-terraform apply -auto-approve`. 

MiniStack starts its emulated RDS database in a Docker container. The
`DOCKER_NETWORK` setting in `docker-compose.ministack.yml` must match the network
created by the base Compose project (`weathergov-django_weather.gov`).

The local Terraform recipe uses plain `terraform` with the AWS endpoint set to
MiniStack and mock credentials. It passes a local backend config enabling
path-style S3 requests. Without that setting, the S3 backend uses a virtual-host
URL such as `bucket.localhost:4566`, which fails DNS resolution, although the request is
still aimed at the local MiniStack endpoint, not live AWS.

The recipe runs in [envs/local](../../terraform-aws/envs/local/README.md), which
uses symlinks to share the dev Terraform resources and variables. Only the
MiniStack-specific [secret](../../terraform-aws/envs/local/ministack.tf), [local.auto.tfvars](../../terraform-aws/envs/local/local.auto.tfvars), and
[Terraform overrides](../../terraform-aws/envs/local/ministack_override.tf) are
separate files. Nothing is copied or removed at runtime, and no second resource
configuration is maintained. Local backend metadata is separate; the state bucket
and key are shared with the existing local Terraform state.

The local override disables RDS-managed passwords because the running MiniStack
does not return `MasterUserSecret` for this `aws_db_instance`. It creates a
**public, disposable local-only password** and a matching Secrets Manager secret;
ECS still receives database credentials using secret references. The dev root
continues to use AWS-managed master passwords. Bootstrap-local only creates the
VPC, subnet, and state bucket; it does not create unrelated database credentials.

Use `just ministack-terraform plan` or `just ministack-terraform apply` to run only
the local Terraform step. Always use the recipe, not plain `terraform`, so the provider and S3 backend target MiniStack rather than AWS. Never load the local overrides in an AWS deployment.

Edits to an existing linked dev file automatically apply locally too. When adding
a new dev Terraform file, add a relative symlink in the local directory. Do not
edit a linked file to make a local-only change (as you're actually editing the dev file): edit the local override instead. A local auto-tfvars file overrides input values; Terraform resource and local changes belong in the override file.

#### If you run into trouble running locally

* Go to your docker desktop UI and stop all containers and remove them. Delete the images if you need to. (Or run the commands to remove the containers/images from your terminal, whatever floats your boat - I like the visual of seeing a completely empty docker desktop to confirm that everything's been deleted.)

* Make sure you don't have lingering terraform-lock files or anything hanging out in your `bootstrap-local` or `env/dev` directories. If so, go ahead and delete those too and try again.
