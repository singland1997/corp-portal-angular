import { spawnSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = process.argv[2];
if (!['dev', 'prod'].includes(target)) {
  throw new Error('Usage: npm run build:ci -- dev|prod');
}

const apiBaseUrl = process.env.API_BASE_URL?.trim() || '/api';
if (apiBaseUrl !== '/api') {
  const url = new URL(apiBaseUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error(
      'API_BASE_URL must be /api or an HTTPS URL without credentials/query/fragment.',
    );
  }
}

const configuration = target;
const settings = { name: target, production: target === 'prod', apiBaseUrl };
const generated = resolve(root, 'src/environments/environment.ci.ts');

try {
  writeFileSync(
    generated,
    `import { AppEnvironment } from './environment.model';\n` +
      `export const environment: AppEnvironment = ${JSON.stringify(settings, null, 2)};\n`,
  );
  const result = spawnSync(
    process.execPath,
    ['node_modules/@angular/cli/bin/ng.js', 'build', `--configuration=${configuration},ci`],
    { cwd: root, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(generated, { force: true });
}
