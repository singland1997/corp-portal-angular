#!/usr/bin/env bash
# Offline Terraform checks (no backend, no AWS credentials).
set -euo pipefail
cd "$(dirname "$0")/../.."
terraform version
terraform -chdir=infra/terraform fmt -check -recursive
terraform -chdir=infra/terraform init -backend=false -input=false -lockfile=readonly
terraform -chdir=infra/terraform validate
