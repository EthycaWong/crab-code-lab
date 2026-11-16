// Black-box checks against a dedicated preview service. Does not send email.
import assert from 'node:assert/strict';
import {SERVO_SKETCH,LIBRARY_SMOKE} from './library-sketches.mjs';
const origin = process.env.TEST_COMPILER_URL || 'http://127.0.0.1:4319';
const token = process.env.COMPILER_TOKEN;
assert.ok(token, 'COMPILER_TOKEN is required');
const request = (path, data) => fetch(origin + path, {
  method: data ? 'POST' : 'GET',
  headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  ...(data ? { body: JSON.stringify(data) } : {}),
  signal: AbortSignal.timeout(55000),
});
const status = await (await request('/status')).json();
assert.equal(status.compiler, true, JSON.stringify(status));
const code = 'void setup() { pinMode(LED_BUILTIN, OUTPUT); }\nvoid loop() { digitalWrite(LED_BUILTIN, HIGH); delay(1000); }';
const valid = await (await request('/compile', { code, board: 'uno' })).json();
assert.equal(valid.success, true, JSON.stringify(valid));
assert.ok(valid.flash > 0);
assert.ok(valid.ticket);
console.log('Valid Uno sketch compiled with memory report and verification ticket.');
const invalid = await (await request('/compile', { code: code.replace('delay(1000)', 'madeUpFunction(1000)'), board: 'uno' })).json();
assert.equal(invalid.success, false);
assert.ok(invalid.diagnostics?.some(d => d.line === 2 && d.message.includes('madeUpFunction')), JSON.stringify(invalid));
console.log('Invalid C++ rejected with source diagnostics.');
for (const target of ['/app/service/server.mjs', '/proc/self/environ']) {
  const blocked = await (await request('/compile', { code: `#include "${target}"\n${code}`, board: 'uno' })).json();
  assert.equal(blocked.success, false);
  assert.match(blocked.output || '', /Permission denied|No such file/);
  assert.ok(!JSON.stringify(blocked).includes(token), 'Compiler token appeared in output');
}
console.log('Service source and process environment are inaccessible to student includes.');
for(const board of ['uno','nano','mega']){
 const result=await(await request('/compile',{code:SERVO_SKETCH,board})).json();
 assert.equal(result.success,true,JSON.stringify(result));
 console.log('Servo.h compiled for '+board+'.');
}
const libraries=await(await request('/compile',{code:LIBRARY_SMOKE,board:'uno'})).json();
assert.equal(libraries.success,true,JSON.stringify(libraries));
console.log('All bundled classroom library headers and representative APIs compiled together.');
