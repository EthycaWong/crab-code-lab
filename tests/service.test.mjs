import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';

test('hosting health check exposes no compiler status and keeps API authenticated', async t => {
  const secret = randomBytes(32).toString('hex');
  const service = spawn(process.execPath, ['service/server.mjs'], {
    env: { ...process.env, PORT: '0', COMPILER_HOST: '127.0.0.1', COMPILER_TOKEN: secret },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => service.kill());
  const origin = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Service did not start')), 5000);
    let errors = '';
    service.stderr.on('data', chunk => { errors += chunk.toString(); });
    service.once('error', error => { clearTimeout(timer); reject(error); });
    service.once('exit', code => { clearTimeout(timer); reject(new Error(`Service exited (${code}): ${errors}`)); });
    service.stdout.on('data', chunk => {
      const address = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];
      if (address) { clearTimeout(timer); resolve(address); }
    });
  });
  const health = await fetch(origin + '/health');
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true });
  for (const path of ['/status', '/compile', '/submit']) {
    assert.equal((await fetch(origin + path)).status, 401);
  }
  const status = await fetch(origin + '/status', { headers: { Authorization: 'Bearer ' + secret } });
  assert.equal(status.status, 200);
  assert.equal(typeof (await status.json()).compiler, 'boolean');
});
