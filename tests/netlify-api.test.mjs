import test from 'node:test';
import assert from 'node:assert/strict';
import {createCompilerHandler,config} from '../netlify/functions/compiler.mjs';
const handler=createCompilerHandler(async()=> 'initial');
import {createSession,SESSION_COOKIE} from '../lib/access-session.ts';
const sessionSecret='test-only-session-signing-secret-123456789';
const cookie=SESSION_COOKIE+'='+await createSession(sessionSecret,'https://crab.example');
function authRequest(url,options={}){const headers=new Headers(options.headers);headers.set('Cookie',cookie);return new Request(url,{...options,headers});}

function env(t, values) {
  values={CRAB_SESSION_SECRET:sessionSecret,...values};
  for (const key of ['COMPILER_URL', 'COMPILER_TOKEN','CRAB_SESSION_SECRET']) {
    const previous = process.env[key];
    if (values[key] === undefined) delete process.env[key]; else process.env[key] = values[key];
    t.after(() => { if (previous === undefined) delete process.env[key]; else process.env[key] = previous; });
  }
}

test('Netlify routes return an honest offline state before setup', async t => {
  env(t, {});
  assert.deepEqual(config.path, ['/api/status', '/api/compile', '/api/submit']);
  const status = await handler(authRequest('https://crab.example/api/status'), {ip:'192.0.2.1'});
  assert.equal(status.status, 200);
  assert.equal((await status.json()).compiler, false);
  const compile = await handler(authRequest('https://crab.example/api/compile', {method:'POST',body:'{}'}), {ip:'192.0.2.1'});
  assert.equal(compile.status, 503);
});

test('Netlify forwards the exact sketch with server-only credentials and trusted client IP', async t => {
  env(t, {COMPILER_URL:'https://compiler.example', COMPILER_TOKEN:'test-only-proxy-secret'});
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const source = JSON.stringify({board:'uno',code:'void setup() {}\nvoid loop() {}'});
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://compiler.example/compile');
    assert.equal(options.headers.Authorization, 'Bearer test-only-proxy-secret');
    assert.equal(options.headers['x-crab-client'], '192.0.2.7');
    assert.equal(options.body, source);
    return Response.json({success:true,diagnostics:[],output:'Compiled.'});
  };
  const result = await handler(authRequest('https://crab.example/api/compile', {method:'POST', headers:{Origin:'https://crab.example','cf-connecting-ip':'spoofed'}, body:source}), {ip:'192.0.2.7'});
  assert.equal(result.status, 200);
  const body = await result.text();
  assert.equal(JSON.parse(body).success, true);
  assert.equal(body.includes('test-only-proxy-secret'), false);
});

test('Netlify rejects cross-origin submissions before contacting the compiler', async t => {
  env(t, {COMPILER_URL:'https://compiler.example', COMPILER_TOKEN:'test-only-proxy-secret'});
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => { throw new Error('Must not contact compiler'); };
  const response = await handler(authRequest('https://crab.example/api/submit', {method:'POST',headers:{Origin:'https://other.example'},body:'{}'}), {ip:'192.0.2.1'});
  assert.equal(response.status, 403);
});

test('direct function invocation cannot bypass the password gate',async t=>{
 env(t,{COMPILER_URL:'https://compiler.example',COMPILER_TOKEN:'test-only-proxy-secret'});
 for(const path of ['/api/status','/api/compile','/api/submit','/.netlify/functions/compiler']){
  const response=await handler(new Request('https://crab.example'+path),{ip:'192.0.2.1'});
  assert.equal(response.status,401);
 }
});
