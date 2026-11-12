# ministack is used to mirror our AWS NEC environment.
# please prefix commands with 'ministack-' for manual namespace separation.

# if we are in this directory, permit parent/root justfile access
set fallback := true

# Initializes the local stack, prepares the databases, and loads initial data.
[group("ministack")]
ministack: ministack-images && ministack-push-all ministack-migrate ministack-load-spatial
    # Brings up the ministack container and applies the local Terraform bootstrap configuration.
    docker compose -f "{{ justfile_directory() }}/docker-compose.ministack.yml" up -d --wait ministack
    cd "{{ justfile_directory() }}/terraform-aws/bootstrap-local" && terraform init -backend=false && terraform apply -auto-approve
    sleep 5
    just ministack-terraform apply -auto-approve
    sleep 5
    # After initial terraform bootstrapping, init the rest of our containers and services.
    docker compose -f "{{ justfile_directory() }}/docker-compose.ministack.yml" up -d

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
    docker pull --platform linux/amd64 postgis/postgis:17-3.5-alpine
    docker tag postgis/postgis:17-3.5-alpine weathergov-ministack/postgres:17-alpine
    docker pull --platform linux/amd64 valkey/valkey:9.0-alpine
    docker tag valkey/valkey:9.0-alpine weathergov-ministack/valkey/valkey:9.0-alpine

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
[group("ministack")]
ministack-push-all: ministack-push-django ministack-push-interop ministack-push-alerts ministack-push-ghwo ministack-push-gridcache ministack-push-wpcprob

# Push the django prod image to the corresponding ministack ECR repository.
[group("ministack")]
ministack-push-django:
    docker build -f forecast/Dockerfile.prod -t localhost:4566/weathergov-dev-django:dev forecast/
    docker push localhost:4566/weathergov-dev-django:dev

# Push the interop prod image to the corresponding ministack ECR repository.
[group("ministack")]
ministack-push-interop:
    docker build -f api-interop-layer/Dockerfile.prod -t localhost:4566/weathergov-dev-interop:dev api-interop-layer/
    docker push localhost:4566/weathergov-dev-interop:dev

# Push the alerts task prod image to the corresponding ministack ECR repository.
[group("ministack")]
ministack-push-alerts:
    docker build -f tasks/Dockerfile.prod -t localhost:4566/weathergov-dev-tasks-alerts:dev --build-arg TASK=alerts tasks/
    docker push localhost:4566/weathergov-dev-tasks-alerts:dev

# Push the ghwo task prod image to the corresponding ministack ECR repository.
[group("ministack")]
ministack-push-ghwo:
    docker build -f tasks/Dockerfile.prod -t localhost:4566/weathergov-dev-tasks-ghwo:dev --build-arg TASK=ghwo tasks/
    docker push localhost:4566/weathergov-dev-tasks-ghwo:dev

# Push the gridcache task prod image to the corresponding ministack ECR repository.
[group("ministack")]
ministack-push-gridcache:
    docker build -f tasks/Dockerfile.prod -t localhost:4566/weathergov-dev-tasks-gridcache:dev --build-arg TASK=gridcache tasks/
    docker push localhost:4566/weathergov-dev-tasks-gridcache:dev

# Push the wpcprob task prod image to the corresponding ministack ECR repository.
[group("ministack")]
ministack-push-wpcprob:
    docker build -f tasks/Dockerfile.wpcprob.prod -t localhost:4566/weathergov-dev-tasks-wpcprob:dev tasks/
    docker push localhost:4566/weathergov-dev-tasks-wpcprob:dev

# Destroys all containers, databases, and volumes and starts over fresh and clean with ministack
[group("ministack")]
ministack-zap: ministack-down && ministack

alias ministack-cb := ministack-controlled-burn
# Removes ministack fully, including its Docker images and terraform state.
[group("ministack")]
ministack-controlled-burn: ministack-down && ministack
    docker compose -f "{{ justfile_directory() }}/docker-compose.ministack.yml" down --rmi all --remove-orphans
    # filter for postgres and valkey/valkey and our own prod ministack images
    docker images -q --filter 'reference=weathergov-ministack/*' --filter 'reference=weathergov-ministack/*/*' --filter 'reference=localhost:4566/*' | xargs -r docker rmi -f
    # Also go ahead and remove all the terraform state and cache and lock files, so it's truly a clean slate
    rm -rf "{{ justfile_directory() }}/terraform-aws/bootstrap-local/.terraform" "{{ justfile_directory() }}/terraform-aws/envs/local/.terraform"
    rm -f "{{ justfile_directory() }}/terraform-aws/bootstrap-local/terraform.tfstate" "{{ justfile_directory() }}/terraform-aws/bootstrap-local/terraform.tfstate.backup"
    rm -f "{{ justfile_directory() }}/terraform-aws/envs/local/.terraform.lock.hcl" "{{ justfile_directory() }}/terraform-aws/bootstrap-local/.terraform.lock.hcl"

# Shut down ministack cleanly.
[group("ministack")]
ministack-down:
    docker compose -f "{{ justfile_directory() }}/docker-compose.ministack.yml" down -v --remove-orphans
    # make sure we remove only ministack-related containers.
    docker ps -aq --filter label=ministack | xargs -r docker rm -f
    # ministack-data/ is written as root, so clear it from inside a container.
    # delete only the contents: the bind-mount points themselves can't be removed.
    docker compose -f "{{ justfile_directory() }}/docker-compose.ministack.yml" run --rm --no-deps --entrypoint sh ministack -c 'rm -rf /tmp/ministack-state/* /tmp/ministack-data/s3/* /tmp/ministack-data/rds/*'
