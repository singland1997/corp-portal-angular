#!/usr/bin/env bash
# Plan or deploy the frontend stack for one environment, as the old Jenkinsfile did.
#   usage: deploy.sh plan|deploy dev|prod   (deploy expects verify.sh to have built dist/)
# Needs AWS credentials (OIDC role from CI) and:
#   AWS_ACCOUNT_ID, AWS_REGION, TF_STATE_BUCKET, TF_STATE_REGION; optional API_ROUTES (JSON, see README)
set -euo pipefail
cd "$(dirname "$0")/../.."
action="${1:?usage: deploy.sh plan|deploy dev|prod}"
target="${2:?usage: deploy.sh plan|deploy dev|prod}"
[[ "$action" == plan || "$action" == deploy ]] || { echo "action must be plan or deploy" >&2; exit 2; }
[[ "$target" == dev || "$target" == prod ]] || { echo "environment must be dev or prod" >&2; exit 2; }
[[ "${AWS_ACCOUNT_ID:-}" =~ ^[0-9]{12}$ ]] || { echo "Set AWS_ACCOUNT_ID to the expected 12-digit account." >&2; exit 2; }
[[ "${TF_STATE_BUCKET:-}" =~ ^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$ ]] || { echo "Set TF_STATE_BUCKET to an existing Terraform state bucket." >&2; exit 2; }
: "${AWS_REGION:?set AWS_REGION}" "${TF_STATE_REGION:?set TF_STATE_REGION}"

export TARGET_ENV="$target" APP_ENV="$target" AWS_PAGER="" AWS_DEFAULT_REGION="$AWS_REGION"
export TF_VAR_api_base_url="${API_BASE_URL:-/api}" TF_VAR_api_routes="${API_ROUTES:-[]}"
export TF_IN_AUTOMATION=true TF_INPUT=false TF_VAR_aws_region="$AWS_REGION" TF_VAR_aws_account_id="$AWS_ACCOUNT_ID"
plan_file=infra/terraform/deployment.tfplan
# Plans can contain sensitive infrastructure values: never keep or upload them.
trap 'rm -f "$plan_file"' EXIT

account="$(aws sts get-caller-identity --query Account --output text)"
if [[ "$account" != "$AWS_ACCOUNT_ID" ]]; then
  echo "AWS credentials target account $account, expected $AWS_ACCOUNT_ID." >&2
  exit 1
fi

terraform -chdir=infra/terraform init -reconfigure -input=false -lockfile=readonly \
  -backend-config="bucket=$TF_STATE_BUCKET" \
  -backend-config="key=corp-portal/$target/terraform.tfstate" \
  -backend-config="region=$TF_STATE_REGION"
terraform -chdir=infra/terraform plan -input=false -lock-timeout=5m \
  -var-file="environments/$target.tfvars" -out=deployment.tfplan

if [[ "$action" == deploy ]]; then
  terraform -chdir=infra/terraform apply -input=false -lock-timeout=5m deployment.tfplan
  npm run deploy:frontend
fi
