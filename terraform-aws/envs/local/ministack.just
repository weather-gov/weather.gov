# ministack is used to mirror our AWS NEC environment.
# please prefix commands with 'ministack-' for manual namespace separation.

# if we are in this directory, permit parent/root justfile access
set fallback := true

# Initializes the local stack, prepares the databases, and loads initial data.
# The first time you run this, make sure to first set up the local registry 
# with just ministack-registry-setup (after starting podman)
[group("ministack")]
ministack: ministack-images
    # Brings up the ministack container and applies the local Terraform bootstrap configuration.
    podman compose -f "{{ justfile_directory() }}/docker-compose.ministack.yml" up -d --wait ministack
    cd "{{ justfile_directory() }}/terraform-aws/bootstrap-local" && terraform init -backend=false && terraform apply -auto-approve
    # Bootstrap only the registries before starting ECS services.
    just ministack-terraform apply -auto-approve -target=aws_ecr_repository.ministack
    just ministack-push-all
    just ministack-terraform apply -auto-approve
    just ministack-migrate
    just ministack-load-spatial
    # After initial terraform bootstrapping, init the rest of our containers and services.
    podman compose -f "{{ justfile_directory() }}/docker-compose.ministack.yml" up -d

# Allow the MiniStack HTTP registry in the default rootless macOS Podman machine.
[group("ministack")]
[script]
ministack-registry-setup:
        podman machine ssh '
            set -eu
            dir="$HOME/.config/containers/registries.conf.d"
            config="$dir/weathergov-ministack.conf"
            mkdir -p "$dir"
            if [ -e "$config" ]; then
                if ! printf "[[registry]]\nlocation = \"localhost:4566\"\ninsecure = true\n" | cmp -s - "$config"; then
                    echo "Refusing to overwrite existing registry configuration: $config" >&2
                    exit 1
                fi
            else
                printf "[[registry]]\nlocation = \"localhost:4566\"\ninsecure = true\n" > "$config"
            fi
            systemctl --user restart podman.service
            echo "MiniStack HTTP registry configured for this Podman machine user."
        '

# Use symlinked dev resources with the ministack-only override file to spin up local environment.
[group("ministack")]
[script]
ministack-terraform *args="plan":
    set -eu
    cd "{{ justfile_directory() }}/terraform-aws/envs/local"
    export AWS_ENDPOINT_URL="http://localhost:4566"
    export AWS_ACCESS_KEY_ID="mock_key"
    export AWS_SECRET_ACCESS_KEY="mock_secret"
    unset AWS_PROFILE AWS_DEFAULT_PROFILE
    export TF_DATA_DIR="$PWD/.terraform"
    terraform init -reconfigure -input=false -backend-config=backend-ministack.hcl
    terraform {{ args }}

# Replace ministack default images for postgis support
[group("ministack")]
ministack-images:
    # we need to override the ministack images because ministack does not support
    # postgis. to do this, we use the MINISTACK_IMAGE_PREFIX and swap in postgis for
    # postgres. valkey is unchanged.
    podman pull --platform linux/amd64 postgis/postgis:17-3.5-alpine
    podman tag postgis/postgis:17-3.5-alpine weathergov-ministack/postgres:17-alpine
    podman pull valkey/valkey:9.0-alpine
    podman tag valkey/valkey:9.0-alpine weathergov-ministack/valkey/valkey:9.0-alpine

# Run django migrations
[group("ministack")]
ministack-migrate:
    env -u AWS_PROFILE \
      AWS_ENDPOINT_URL=http://localhost:4566 \
      AWS_ACCESS_KEY_ID=mock_key \
      AWS_SECRET_ACCESS_KEY=mock_secret \
      AWS_DEFAULT_REGION=us-east-1 \
      ./.gitlab/nec/scripts/django-migrations.sh

# Run spatial data migrations
[group("ministack")]
ministack-load-spatial:
    echo "ministack: loading spatial data is not implemented yet"

# Push all prod images to the ministack ECR repositories.
# Before you run this, make sure you've set Podman to use http for the local registry
# by running just ministack-registry-setup
[group("ministack")]
ministack-push-all: ministack-push-django ministack-push-interop ministack-push-alerts ministack-push-ghwo ministack-push-gridcache ministack-push-wpcprob

# Push the django prod image to the corresponding ministack ECR repository.
[group("ministack")]
ministack-push-django:
    podman build -f forecast/Dockerfile.prod -t localhost:4566/weathergov-dev-django:dev forecast/
    podman push localhost:4566/weathergov-dev-django:dev

# Push the interop prod image to the corresponding ministack ECR repository.
[group("ministack")]
ministack-push-interop:
    podman build -f api-interop-layer/Dockerfile.prod -t localhost:4566/weathergov-dev-interop:dev api-interop-layer/
    podman push localhost:4566/weathergov-dev-interop:dev

# Push the alerts task prod image to the corresponding ministack ECR repository.
[group("ministack")]
ministack-push-alerts:
    podman build -f tasks/Dockerfile.prod -t localhost:4566/weathergov-dev-tasks-alerts:dev --build-arg TASK=alerts tasks/
    podman push localhost:4566/weathergov-dev-tasks-alerts:dev

# Push the ghwo task prod image to the corresponding ministack ECR repository.
[group("ministack")]
ministack-push-ghwo:
    podman build -f tasks/Dockerfile.prod -t localhost:4566/weathergov-dev-tasks-ghwo:dev --build-arg TASK=ghwo tasks/
    podman push localhost:4566/weathergov-dev-tasks-ghwo:dev

# Push the gridcache task prod image to the corresponding ministack ECR repository.
[group("ministack")]
ministack-push-gridcache:
    podman build -f tasks/Dockerfile.prod -t localhost:4566/weathergov-dev-tasks-gridcache:dev --build-arg TASK=gridcache tasks/
    podman push localhost:4566/weathergov-dev-tasks-gridcache:dev

# Push the wpcprob task prod image to the corresponding ministack ECR repository.
[group("ministack")]
ministack-push-wpcprob:
    podman build -f tasks/Dockerfile.wpcprob.prod -t localhost:4566/weathergov-dev-tasks-wpcprob:dev tasks/
    podman push localhost:4566/weathergov-dev-tasks-wpcprob:dev

# Destroys all containers, databases, and volumes and starts over fresh and clean with ministack
[group("ministack")]
ministack-zap: ministack-down && ministack

alias ministack-cb := ministack-controlled-burn
# Removes ministack fully, including its images and terraform state.
[group("ministack")]
ministack-controlled-burn: ministack-down && ministack
    podman compose -f "{{ justfile_directory() }}/docker-compose.ministack.yml" down --rmi all --remove-orphans
    # filter for postgres and valkey/valkey and our own prod ministack images
    podman images -q --filter 'reference=weathergov-ministack/*' --filter 'reference=weathergov-ministack/*/*' --filter 'reference=localhost:4566/*' | xargs -r podman rmi -f
    # Also go ahead and remove all the terraform state and cache and lock files, so it's truly a clean slate
    rm -rf "{{ justfile_directory() }}/terraform-aws/bootstrap-local/.terraform" "{{ justfile_directory() }}/terraform-aws/envs/local/.terraform"
    rm -f "{{ justfile_directory() }}/terraform-aws/bootstrap-local/terraform.tfstate" "{{ justfile_directory() }}/terraform-aws/bootstrap-local/terraform.tfstate.backup"
    rm -f "{{ justfile_directory() }}/terraform-aws/envs/local/.terraform.lock.hcl" "{{ justfile_directory() }}/terraform-aws/bootstrap-local/.terraform.lock.hcl"

# Shut down ministack cleanly.
[group("ministack")]
ministack-down:
    podman compose -f "{{ justfile_directory() }}/docker-compose.ministack.dev.yml" down -v --remove-orphans
    podman compose -f "{{ justfile_directory() }}/docker-compose.ministack.yml" down -v --remove-orphans
    # make sure we remove only ministack-related containers.
    podman ps -aq --filter label=ministack | xargs -r podman rm -f
    # ministack-data/ is written as root, so clear it from inside a container.
    # delete only the contents: the bind-mount points themselves can't be removed.
    podman compose -f "{{ justfile_directory() }}/docker-compose.ministack.yml" run --rm --no-deps --entrypoint sh ministack -c 'rm -rf /tmp/ministack-state/* /tmp/ministack-data/s3/* /tmp/ministack-data/rds/*'

# Dump the service environment variables for local dev purposes
[group("ministack")]
ministack-env service:
    "{{ justfile_directory() }}"/terraform-aws/envs/local/scripts/ministack-env.sh {{service}}

# Start up the interop service in ministack for dev.
[group("ministack")]
ministack-dev-interop:
    just ministack-env interop >"{{ justfile_directory() }}/.env.interop.dev"
    podman compose -f "{{ justfile_directory() }}/docker-compose.ministack.dev.yml" up interop
