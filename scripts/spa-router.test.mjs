import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const source = readFileSync(
  new URL('../infra/terraform/functions/spa-router.js', import.meta.url),
  'utf8',
);
const handler = runInNewContext(`${source}\nhandler;`);

test('direct Angular routes return index without changing the query string', () => {
  for (const uri of [
    '/',
    '/login',
    '/forgot-password',
    '/corporate',
    '/corporate/123',
    '/api-docs',
  ]) {
    const request = { uri, method: 'GET', querystring: { returnUrl: { value: '/corporate' } } };
    const result = handler({ request });
    assert.equal(result.uri, '/index.html');
    assert.equal(result.querystring.returnUrl.value, '/corporate');
  }
});

test('asset requests, including missing assets, are never rewritten to HTML', () => {
  for (const uri of [
    '/main-12345678.js',
    '/missing.js',
    '/styles.css',
    '/favicon.ico',
    '/media/font.woff2',
    '/assets/config',
  ]) {
    assert.equal(handler({ request: { uri } }).uri, uri);
  }
});

test('unconfigured API requests return an uncached JSON error, not the app shell', () => {
  for (const uri of ['/api', '/api/', '/api/users', '/api/report.json']) {
    const result = handler({ request: { uri } });
    assert.equal(result.statusCode, 503);
    assert.equal(result.headers['content-type'].value, 'application/json');
    assert.equal(result.headers['cache-control'].value, 'no-store');
    assert.ok(JSON.parse(result.body).message);
  }
});
