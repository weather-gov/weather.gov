#!/usr/bin/env bash
#
# runs django migrations. requires the appropriate NEC permissions.

set -euo pipefail

die() {
  echo "error: $*" >&2
  exit 1
}

# to invoke an ecs run-task, first we need the VPC, subnets, and security group.
# the filters mirror terraform (see: network.tf).

# grab VPC.
VPC_ID=$(aws ec2 describe-vpcs \
    --filters 'Name=tag:Name,Values=*-dev-vpc-*' \
    --query 'Vpcs[0].VpcId' \
    --output text)
[ "$VPC_ID" != "None" ] || die "could not find the VPC"

# grab subnets.
SUBNET_IDS=$(aws ec2 describe-subnets \
    --filters "Name=vpc-id,Values=${VPC_ID}" "Name=tag:Name,Values=*-private-subnet-*" \
    --query 'Subnets[].SubnetId' \
    --output text | tr '\t' ',')
[ -n "$SUBNET_IDS" ] || die "could not find subnets in ${VPC_ID}"

# grab security group for the ecs tasks.
SECURITY_GROUP=$(aws ec2 describe-security-groups \
    --filters "Name=vpc-id,Values=${VPC_ID}" "Name=group-name,Values=weathergov-dev-ecs-tasks" \
    --query 'SecurityGroups[0].GroupId' \
    --output text)
[ "$SECURITY_GROUP" != "None" ] || die "could not find the security group"

NETWORK_CONFIG="awsvpcConfiguration={subnets=[${SUBNET_IDS}],securityGroups=[${SECURITY_GROUP}],assignPublicIp=DISABLED}"
CONTAINER='{"containerOverrides": [{"name": "django", "command": ["python3", "manage.py", "migrate"]}]}'

# we want both the task arn and failure reason (if applicable).
RUN_OUTPUT=$(aws ecs run-task \
    --cluster "weathergov-dev" \
    --task-definition "weathergov-dev-django" \
    --launch-type "FARGATE" \
    --network-configuration "$NETWORK_CONFIG" \
    --overrides "$CONTAINER" \
    --query '[tasks[0].taskArn, failures[0].reason]' \
    --output text)
TASK_ARN=$(printf '%s' "$RUN_OUTPUT" | cut -f1)
FAILURE_REASON=$(printf '%s' "$RUN_OUTPUT" | cut -f2)
[ "$TASK_ARN" != "None" ] || die "ECS did not start task: ${FAILURE_REASON}"

TASK_ID="${TASK_ARN##*/}"
echo "migration task ${TASK_ID} started"

aws ecs wait tasks-stopped \
    --cluster "weathergov-dev" \
    --tasks "$TASK_ARN" \
    || die "task ${TASK_ID} did not stop within 10 minutes"
echo "migration task ${TASK_ID} stopped"

# disabled because we do not have perms for logs:FilterLogEvents
# echo "=== task output"
# aws logs tail /ecs/weathergov-dev-django \
#     --log-stream-names "django/django/${TASK_ID}"
# echo "=== end task output"

# now that the task has stopped, we need to check the container's exit code (if
# extant) to see if we actually succeeded or not. note that if the exit code is
# not present that means the container never ran. in that case, we need the
# stopped reason as well.
RESULT=$(aws ecs describe-tasks \
    --cluster "weathergov-dev" \
    --tasks "$TASK_ARN" \
    --query '[tasks[0].containers[0].exitCode, tasks[0].stoppedReason]' \
    --output text)
EXIT_CODE=$(printf '%s' "$RESULT" | cut -f1)
STOPPED_REASON=$(printf '%s' "$RESULT" | cut -f2)
[ "$EXIT_CODE" != "None" ] || die "container never started: ${STOPPED_REASON}"
[ "$EXIT_CODE" = "0" ] || die "migrate exited ${EXIT_CODE} (${STOPPED_REASON})"

echo "migration task completed successfully"
