# AWS deployment

The frontend is a static Angular application on **private S3 + CloudFront**. Jenkins builds and publishes the browser files; Terraform manages the bucket, bucket policy, CloudFront distribution and SPA routing function. Docker, ECR, Nginx and a frontend Lambda are not needed for this deployment. Docker Compose remains available for local previews.

The backend belongs to a separate Lambda/API Gateway stack. This repository does not create Lambda functions, API routes or authentication services. The frontend calls APIs for authentication and business data. Only the backend local environment supplies test accounts and in-memory fixtures; dev/prod still require real identity and data providers.

## Files

| File                                      | Responsibility                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `Jenkinsfile`                             | Verify, plan or deploy dev/prod                                          |
| `infra/terraform/storage.tf`              | Private, encrypted, versioned S3 bucket and access policy                |
| `infra/terraform/cdn.tf`                  | HTTPS CDN, OAC, cache policy and response headers                        |
| `infra/terraform/functions/spa-router.js` | Angular deep links; assets and API paths stay separate                   |
| `infra/terraform/environments/*.tfvars`   | Environment selection using the same infrastructure definition           |
| `scripts/build-ci.mjs`                    | Build with public API settings, hashed filenames and no source maps      |
| `scripts/deploy-frontend.mjs`             | Upload assets, publish index, invalidate CDN and check the deployed site |

Terraform creates separate buckets and distributions for dev and prod. Jenkins uses state keys `corp-portal/dev/terraform.tfstate` and `corp-portal/prod/terraform.tfstate`. Use a Multibranch Pipeline: the `environmentsByBranch` map selects `dev` for branch `dev` and `prod` for branch `prod`. Change this map in Jenkinsfile if your branch names differ. Unknown branches, PRs and tags are rejected; use a separate verification job for PRs. Do not let multiple independent jobs publish to the same environment concurrently: Terraform's state lock covers infrastructure operations, not the subsequent S3 upload.

## One-time Jenkins setup

1. Use a trusted Linux Jenkins agent with label `corp-portal-deploy`, Node.js 24, npm 11, Terraform 1.10+ (below 2.0), and AWS CLI v2. Commit `package-lock.json` and `infra/terraform/.terraform.lock.hcl`. The pipeline uses the provider lock file in read-only mode.
2. Connect the repository as a Multibranch Pipeline using `Jenkinsfile` and discover the `dev` and `prod` branches. Standard Pipeline, Git and Timestamper support is required. Only trusted branches/jobs should receive deployment credentials; pull requests from untrusted contributors must run on an agent without AWS privileges.
3. Give the deployment agent temporary AWS credentials through an IAM role, workload identity, or your Jenkins credential integration. The AWS CLI and Terraform use the same standard AWS credential chain. Do not put AWS keys in source, build arguments, Angular settings or parameter defaults.
4. Supply an existing **private, encrypted, versioned S3 state bucket**. The frontend Terraform root deliberately does not create its own state backend. Enable recovery/versioning and restrict access to your deployment role. If the state bucket uses a customer-managed KMS key, also grant the role the required KMS access.
5. Set the parameters below. Run `verify`, then `plan` to review the changes. Selecting `deploy` applies the generated plan and publishes the application; the pipeline does not add another approval dialog.

| Parameter         | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| `ACTION`          | `verify` (default), `plan`, or `deploy`                             |
| `AWS_ACCOUNT_ID`  | Your expected 12-digit deployment account; required for plan/deploy |
| `AWS_REGION`      | Frontend bucket region; default `ap-southeast-1`                    |
| `TF_STATE_BUCKET` | Existing state bucket name; required for plan/deploy                |
| `TF_STATE_REGION` | State bucket region; default `ap-southeast-1`                       |
| `API_BASE_URL`    | `/api` until a backend exists, then the public HTTPS API base URL   |

`verify` runs formatting checks, deployment routing tests, Angular tests, a build, and Terraform validation without AWS credentials. `plan` also reads AWS state and previews infrastructure changes. `deploy` additionally applies the plan, uploads the frontend, waits for CDN invalidation, and checks `/`, `/login`, `/corporate` and the entry JavaScript asset. Successful HTTP checks verify deployment/routing, not real backend authentication.

### IAM scope

Have the AWS administrator scope the deployment role to the selected environment/account:

- State bucket: `s3:ListBucket` scoped to the state prefix; `s3:GetObject` and `s3:PutObject` on the state object; `s3:GetObject`, `s3:PutObject`, and `s3:DeleteObject` on its `.tflock` object. Terraform uses S3 native locking (`use_lockfile`), not a DynamoDB lock table.
- Infrastructure: the S3 bucket configuration/policy/tagging and CloudFront distribution, OAC, cache policy, response headers policy and function permissions needed by these resources, including read and update operations. Some CloudFront create/list actions require `Resource: "*"`; scope supported actions by ARN and tags. This is an operation inventory, not a ready-made IAM policy.
- Publishing: `s3:ListBucket`, `s3:GetObject` and `s3:PutObject` on the frontend bucket; `cloudfront:CreateInvalidation` and `cloudfront:GetInvalidation` on its distribution. The upload does not delete objects.

For separate AWS accounts, configure each job/agent role and state bucket access accordingly. `AWS_ACCOUNT_ID` is checked both by the pipeline and Terraform's provider allowlist. Deployment also checks Terraform outputs against the requested environment/account before uploading.

`APP_ENV` and `TARGET_ENV` are set by Jenkinsfile from `BRANCH_NAME`, not selected manually. Account, region, API URL, state and credentials must still match the environment branch; branch selection does not provision or change those values automatically.

## Environment settings and the future API

Application environments are `local`, `dev`, and `prod`, with `src/environments/environment.local.ts`, `environment.dev.ts`, and `environment.prod.ts`. `npm start` and unit tests use `local` with source maps. Both hosted configurations (`dev` and `prod`) are optimized, hashed builds without source maps. Jenkins/Terraform deploy only `dev` and `prod`; `local` has no AWS stack. CI generates a temporary `environment.ci.ts`, combines the chosen Angular configuration with `ci`, and removes the file afterwards. Source maps are disabled and output hashes enabled for both hosted environments. API configuration is public and included in the built JavaScript; it never contains credentials.

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

The pipeline uploads assets first, then index, and keeps previous chunks. This supports users with a previously loaded page and allows re-publishing an older build. Jenkins archives each build's browser output; to roll back, restore the selected artifact into `dist/corp-portal-ui/browser` in a trusted deployment workspace initialized with the correct Terraform backend, then run `npm run deploy:frontend` with the matching `TARGET_ENV` and `AWS_ACCOUNT_ID`. This re-publishes the frontend only; it does not roll back infrastructure. Check that the artifact contains the intended environment/API settings. Decide an asset/version retention period before adding any cleanup job.

The bucket cannot be force-destroyed while it contains objects. Infrastructure/state files and generated plans are not deployment assets; only `dist/corp-portal-ui/browser` is uploaded. Pipeline plan files are removed afterwards and not archived.

## Local Terraform checks

```sh
terraform -chdir=infra/terraform fmt -check -recursive
terraform -chdir=infra/terraform init -backend=false -lockfile=readonly
terraform -chdir=infra/terraform validate
npm run test:deployment
```

When intentionally upgrading the provider, run `terraform init -backend=false -upgrade`, review the plan, refresh lock checksums for your agent platforms with `terraform providers lock -platform=linux_amd64 -platform=windows_amd64`, and commit the lock file. Normal pipeline runs never upgrade it automatically.

References: [AWS S3 origin access control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html), [CloudFront URL rewrites](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example_cloudfront_functions_url_rewrite_single_page_apps_section.html), [Terraform S3 backend and state locking](https://developer.hashicorp.com/terraform/language/backend/s3), [Jenkins Declarative Pipeline](https://www.jenkins.io/doc/book/pipeline/syntax/).
