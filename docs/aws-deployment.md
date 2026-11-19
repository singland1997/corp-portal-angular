# AWS deployment

The frontend is a static Angular application on **private S3 + CloudFront**. GitHub Actions builds and publishes the browser files; Terraform manages the bucket, bucket policy, CloudFront distribution and SPA routing function. Docker, ECR, Nginx and a frontend Lambda are not needed for this deployment. Docker Compose remains available for local previews.

The backend belongs to a separate Lambda/API Gateway stack. This repository does not create Lambda functions, API routes or authentication services. The frontend calls APIs for authentication and business data. Only the backend local environment supplies test accounts and in-memory fixtures; dev/prod still require real identity and data providers.

## Files

| File                                      | Responsibility                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `.github/workflows/ci.yml`                | Pull requests and `main`: verify (format, tests, build) and Terraform    |
| `.github/workflows/deploy.yml`            | Deploy dev on `main`; plan/deploy dev or prod by hand                    |
| `scripts/ci/verify.sh`                    | `npm ci`, format check, deployment tests, unit tests, `build:ci <env>`   |
| `scripts/ci/terraform-validate.sh`        | Offline `terraform fmt`/`init -backend=false`/`validate`                 |
| `scripts/ci/deploy.sh`                    | Account check, Terraform plan/apply, `deploy:frontend`                   |
| `infra/terraform/storage.tf`              | Private, encrypted, versioned S3 bucket and access policy                |
| `infra/terraform/cdn.tf`                  | HTTPS CDN, OAC, cache policy and response headers                        |
| `infra/terraform/functions/spa-router.js` | Angular deep links; assets and API paths stay separate                   |
| `infra/terraform/environments/*.tfvars`   | Environment selection using the same infrastructure definition           |
| `scripts/build-ci.mjs`                    | Build with public API settings, hashed filenames and no source maps      |
| `scripts/deploy-frontend.mjs`             | Upload assets, publish index, invalidate CDN and check the deployed site |

The workflow files only call `scripts/ci/*.sh`, so the same steps can run from another CI (GitLab: a `.gitlab-ci.yml` that calls the scripts) or by hand on a trusted machine.

Terraform creates separate buckets and distributions for dev and prod, with state keys `corp-portal/dev/terraform.tfstate` and `corp-portal/prod/terraform.tfstate`. Each deploy run holds a concurrency lock per environment: Terraform's state lock covers infrastructure operations, not the subsequent S3 upload, so do not publish to one environment from two places at once.

## How deploys run

| Trigger                                       | What happens                                                      |
| --------------------------------------------- | ----------------------------------------------------------------- |
| Pull request, push to `main`                  | `ci`: verify + Terraform validation, no AWS credentials           |
| Push to `main`                                | `deploy`: deploy **dev** (skipped with a notice until configured) |
| Actions → deploy → Run workflow (env, action) | `plan` or `deploy` for **dev** or **prod**                        |

Production is never deployed automatically; someone runs it by hand. Pull requests never receive AWS credentials.

## One-time setup

1. **OIDC provider:** in each AWS account, add the GitHub OIDC identity provider `token.actions.githubusercontent.com` (audience `sts.amazonaws.com`).
2. **Deployment role per environment** that trusts that provider only for this repository and branch, for example:
   ```json
   {
     "Effect": "Allow",
     "Principal": {
       "Federated": "arn:aws:iam::<account>:oidc-provider/token.actions.githubusercontent.com"
     },
     "Action": "sts:AssumeRoleWithWebIdentity",
     "Condition": {
       "StringEquals": {
         "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
         "token.actions.githubusercontent.com:sub": "repo:singland1997/corp-portal-angular:ref:refs/heads/main"
       }
     }
   }
   ```
   Give it the permissions in [IAM scope](#iam-scope). No AWS keys are stored in GitHub.
3. **State bucket:** an existing **private, encrypted, versioned S3 bucket**. The frontend Terraform root deliberately does not create its own state backend. Restrict access to the deployment roles; if it uses a customer-managed KMS key, grant the roles the required KMS access.
4. **Repository variables** (Settings → Secrets and variables → Actions → Variables). They are prefixed with the environment because GitHub Environments are not available for private repositories on GitHub Free; a missing value never falls back to the other environment:

| Variable                         | Value                                                             |
| -------------------------------- | ----------------------------------------------------------------- |
| `DEV_AWS_ROLE_ARN` / `PROD_…`    | Deployment role ARN; without it the deploy job does nothing       |
| `DEV_AWS_ACCOUNT_ID` / `PROD_…`  | Expected 12-digit account                                         |
| `DEV_AWS_REGION` / `PROD_…`      | Frontend bucket region; default `ap-southeast-1`                  |
| `DEV_TF_STATE_BUCKET` / `PROD_…` | Existing state bucket name                                        |
| `DEV_TF_STATE_REGION` / `PROD_…` | State bucket region; default `ap-southeast-1`                     |
| `DEV_API_BASE_URL` / `PROD_…`    | `/api` until a backend exists, then the public HTTPS API base URL |

5. Run **deploy** by hand with `action = plan` for dev, review the plan in the log, then `deploy`.

On GitHub Pro/Team (or after moving to GitLab), switch to per-environment variables with a required reviewer on `prod`, and restrict the prod role's `sub` to that environment (`repo:<owner>/<repo>:environment:prod`).

`verify` runs formatting checks, deployment routing tests, Angular tests and a build without AWS credentials; Terraform validation runs offline. `plan` also reads AWS state and previews infrastructure changes. `deploy` additionally applies the plan, uploads the frontend, waits for CDN invalidation, and checks `/`, `/login`, `/corporate` and the entry JavaScript asset. Successful HTTP checks verify deployment/routing, not real backend authentication.

### IAM scope

Have the AWS administrator scope the deployment role to the selected environment/account:

- State bucket: `s3:ListBucket` scoped to the state prefix; `s3:GetObject` and `s3:PutObject` on the state object; `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` on its `.tflock` object. Terraform uses S3 native locking (`use_lockfile`), not a DynamoDB lock table.
- Infrastructure: the S3 bucket configuration/policy/tagging and CloudFront distribution, OAC, cache policy, response headers policy and function permissions needed by these resources, including read and update operations. Some CloudFront create/list actions require `Resource: "*"`; scope supported actions by ARN and tags. This is an operation inventory, not a ready-made IAM policy.
- Publishing: `s3:ListBucket`, `s3:GetObject` and `s3:PutObject` on the frontend bucket; `cloudfront:CreateInvalidation` and `cloudfront:GetInvalidation` on its distribution. The upload does not delete objects.

For separate AWS accounts, configure each role and state bucket access accordingly. `AWS_ACCOUNT_ID` is checked by `deploy.sh` (against `aws sts get-caller-identity`) and by Terraform's provider allowlist. Deployment also checks Terraform outputs against the requested environment/account before uploading.

`APP_ENV` and `TARGET_ENV` come from the environment chosen for the run. Account, region, API URL, state and role must still match that environment; choosing an environment does not provision or change those values.

## Environment settings and the future API

Application environments are `local`, `dev`, and `prod`, with `src/environments/environment.local.ts`, `environment.dev.ts`, and `environment.prod.ts`. `npm start` and unit tests use `local` with source maps. Both hosted configurations (`dev` and `prod`) are optimized, hashed builds without source maps. CI/Terraform deploy only `dev` and `prod`; `local` has no AWS stack. `build:ci` generates a temporary `environment.ci.ts`, combines the chosen Angular configuration with `ci`, and removes the file afterwards. Source maps are disabled and output hashes enabled for both hosted environments. API configuration is public and included in the built JavaScript; it never contains credentials.

Example local CI-equivalent build in PowerShell:

```powershell
$env:API_BASE_URL = 'https://your-api-id.execute-api.ap-southeast-1.amazonaws.com'
npm run build:ci -- dev
```

When the Lambda backend exists, set `API_BASE_URL` to the agreed HTTPS API Gateway base URL (including the stage/base path if needed), rebuild, and implement the feature data-access calls. The backend must configure CORS for the frontend's exact HTTPS origin and implement authentication, authorization and tenant scoping. Cookie-based cross-origin sessions also need an explicit credentials/CORS design.

The default `/api` is reserved. CloudFront currently returns an uncached JSON 503 for `/api` and `/api/*`; those requests never receive the Angular HTML. To use a same-origin API later, add a dedicated API Gateway origin and `/api` plus `/api/*` behaviors with caching disabled, appropriate forwarding/methods, and no SPA rewrite function. Do not blanket-convert S3/API 403/404 responses into HTTP 200 HTML.

## URLs, caching and rollback

The initial URL uses CloudFront's AWS-provided HTTPS domain. Terraform outputs `frontend_url`, `bucket_name`, and `distribution_id`. A custom domain is a later configuration step: add the CloudFront alias, an ACM certificate in `us-east-1`, and DNS records. The current Terraform does not provision DNS or certificates.

CloudFront authenticates to the S3 REST origin using OAC. S3 website hosting and public bucket access stay disabled. Extensionless Angular routes are rewritten to `/index.html`; requests for missing `.js`, `.css`, fonts and images retain their original error response. `index.html` has `no-cache,no-store,must-revalidate`; the cache policy has a minimum TTL of zero so it respects that header. Assets have a one-hour cache lifetime and a full invalidation runs after publishing.

The deploy uploads assets first, then index, and keeps previous chunks. This supports users with a previously loaded page and allows re-publishing an older build. To roll back, open a PR that reverts the bad change and merge it to `main` (dev redeploys automatically; then run **deploy** for prod). The deployment roles trust only `refs/heads/main`, so running the workflow from another branch or tag is refused by AWS by design. In an emergency, someone with the role's credentials can check the earlier commit out on a trusted machine and run `bash scripts/ci/verify.sh <env>` then `bash scripts/ci/deploy.sh deploy <env>`. This re-publishes the frontend and re-applies that commit's infrastructure definition. Check that the build contains the intended environment/API settings. Decide an asset/version retention period before adding any cleanup job.

The bucket cannot be force-destroyed while it contains objects. Infrastructure/state files and generated plans are not deployment assets; only `dist/corp-portal-ui/browser` is uploaded. `deploy.sh` deletes the plan file when it exits and never uploads it.

## Local Terraform checks

```sh
bash scripts/ci/terraform-validate.sh
npm run test:deployment
```

When intentionally upgrading the provider, run `terraform init -backend=false -upgrade`, review the plan, refresh lock checksums for the CI and developer platforms with `terraform providers lock -platform=linux_amd64 -platform=windows_amd64`, and commit the lock file. Normal CI runs never upgrade it automatically.

References: [AWS S3 origin access control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html), [CloudFront URL rewrites](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example_cloudfront_functions_url_rewrite_single_page_apps_section.html), [Terraform S3 backend and state locking](https://developer.hashicorp.com/terraform/language/backend/s3), [GitHub Actions OIDC with AWS](https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services).
