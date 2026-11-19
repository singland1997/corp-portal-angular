#!/usr/bin/env bash
# Install, check, test and build the frontend for one environment (dev|prod).
# Used by GitHub Actions and, later, GitLab CI. Local: bash scripts/ci/verify.sh dev
set -euo pipefail
cd "$(dirname "$0")/../.."
target="${1:?usage: verify.sh dev|prod}"

node --version
npm ci --no-audit --no-fund
npm run format:check
npm run test:deployment
npm test -- --watch=false
# API_BASE_URL comes from the environment (defaults to /api in build-ci.mjs).
npm run build:ci -- "$target"
