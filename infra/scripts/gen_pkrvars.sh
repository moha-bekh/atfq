#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ENV_FILE=${1:-"$SCRIPT_DIR/../.infra.env"}

source ${ENV_FILE}

cat <<EOF >$SCRIPT_DIR/../bootstrap/terraform.tfvars
profile = "$AWS_PROFILE"
region = "$AWS_REGION"
state_bucket_name = "$AWS_S3_STATE_BUCKET_NAME"
atfq_admin_role_name = "$AWS_ADMIN_ROLE_NAME"
github_repo = "$GITHUB_REPO"
EOF
