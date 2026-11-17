import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const target = process.env.TARGET_ENV;
const account = process.env.AWS_ACCOUNT_ID;
if (!['dev', 'prod'].includes(target) || !/^\d{12}$/.test(account ?? '')) {
  throw new Error('TARGET_ENV (dev|prod) and AWS_ACCOUNT_ID are required.');
}

const build = resolve('dist/corp-portal-ui/browser');
const indexPath = resolve(build, 'index.html');
if (!existsSync(indexPath)) throw new Error('Build the app before deploying.');
const index = readFileSync(indexPath, 'utf8');
const entry = index.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
if (!entry) throw new Error('The build has no JavaScript entry point.');

const outputs = JSON.parse(
  execFileSync('terraform', ['-chdir=infra/terraform', 'output', '-json'], { encoding: 'utf8' }),
);
if (outputs.environment.value !== target || outputs.aws_account_id.value !== account) {
  throw new Error('Terraform outputs do not match the requested environment/account.');
}

function aws(args, capture = false) {
  return execFileSync('aws', args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    env: { ...process.env, AWS_PAGER: '' },
  });
}

const identity = JSON.parse(aws(['sts', 'get-caller-identity', '--output', 'json'], true));
if (identity.Account !== account) throw new Error('AWS credentials target a different account.');

const bucket = outputs.bucket_name.value;
const distribution = outputs.distribution_id.value;
const baseUrl = outputs.frontend_url.value;

// Keep old chunks so browsers with an older index can still lazy-load their routes.
// Upload assets first and publish index.html last. Never use sync --delete here.
aws([
  's3',
  'sync',
  build,
  `s3://${bucket}/`,
  '--exclude',
  'index.html',
  '--exclude',
  '*.map',
  '--cache-control',
  'public,max-age=3600',
  '--only-show-errors',
]);
aws([
  's3',
  'cp',
  indexPath,
  `s3://${bucket}/index.html`,
  '--content-type',
  'text/html; charset=utf-8',
  '--cache-control',
  'no-cache,no-store,must-revalidate',
  '--only-show-errors',
]);

const invalidation = JSON.parse(
  aws(
    [
      'cloudfront',
      'create-invalidation',
      '--distribution-id',
      distribution,
      '--paths',
      '/*',
      '--output',
      'json',
    ],
    true,
  ),
);
aws([
  'cloudfront',
  'wait',
  'invalidation-completed',
  '--distribution-id',
  distribution,
  '--id',
  invalidation.Invalidation.Id,
]);

const digest = (body) => createHash('sha256').update(body).digest('hex');
for (const path of ['/', '/login', '/corporate']) {
  const response = await fetch(new URL(path, baseUrl), { signal: AbortSignal.timeout(15000) });
  if (!response.ok || digest(await response.text()) !== digest(index)) {
    throw new Error(`Smoke check failed for ${path}: expected the deployed index.html.`);
  }
}
const script = await fetch(new URL(entry, baseUrl), { signal: AbortSignal.timeout(15000) });
if (!script.ok || !/javascript/.test(script.headers.get('content-type') ?? '')) {
  throw new Error('Smoke check failed: JavaScript asset did not return JavaScript.');
}
console.log(`Deployed and verified: ${baseUrl}`);
