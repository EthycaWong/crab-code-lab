import test from 'node:test';
import assert from 'node:assert/strict';
import {scryptSync,createHash} from 'node:crypto';
import {ownerSettings} from '../lib/access-owner.ts';
import {readPasswordRecord} from '../lib/access-record.ts';
import {accessGate} from '../lib/access-gate.ts';
import {accessLogin} from '../lib/access-login.ts';
import {createSession,hasAccess,SESSION_COOKIE,SESSION_SECONDS} from '../lib/access-session.ts';

const password='fixture-password-only';
const salt='0123456789abcdef0123456789abcdef';
const env={CRAB_PASSWORD_HASH:'scrypt:'+salt+':'+scryptSync(password,salt,32).toString('hex'),CRAB_SESSION_SECRET:'fixture-signing-key-with-more-than-32-characters'};
const origin='https://crab.example';
const login=(value,extra={})=>new Request(origin+'/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded',...extra},body:new URLSearchParams({password:value})});
const request=(token,url=origin+'/')=>new Request(url,{headers:{Cookie:SESSION_COOKIE+'='+token}});

test('the editor, its bundles, and every API route stay locked without a session',async()=>{
 let calls=0;const next=async()=>{calls++;return new Response('private workspace')};
 for(const path of ['/','/index.html','/assets/editor.js']){
  const response=await accessGate(new Request(origin+path),env,next);
  assert.equal(response.status,200);const html=await response.text();
  assert.match(html,/Class password/);assert.ok(!html.includes('private workspace'));assert.ok(!html.includes(env.CRAB_PASSWORD_HASH));
 }
 for(const path of ['/api/status','/api/compile','/api/submit','/.netlify/functions/compiler'])assert.equal((await accessGate(new Request(origin+path),env,next)).status,401);
 assert.equal(calls,0);
 assert.equal((await accessGate(new Request(origin),{},next)).status,503);
});

test('wrong passwords and cross-origin login never issue a session; correct password unlocks',async()=>{
 const wrong=await accessLogin(login('incorrect'),env);assert.equal(wrong.status,401);assert.equal(wrong.headers.get('Set-Cookie'),null);
 assert.match(await wrong.text(),/password didn’t match/);
 assert.equal((await accessLogin(login(password,{Origin:'https://other.example'}),env)).status,403);
 const correct=await accessLogin(login(password),env);assert.equal(correct.status,303);assert.equal(correct.headers.get('Location'),'/');
 const cookie=correct.headers.get('Set-Cookie');assert.match(cookie,/HttpOnly; Secure; SameSite=Strict/);
 const authenticated=new Request(origin,{headers:{Cookie:cookie.split(';')[0]}});
 assert.equal(await hasAccess(authenticated,env.CRAB_SESSION_SECRET),true);
 const response=await accessGate(authenticated,env,async()=>new Response('workspace',{headers:{'Content-Type':'text/html','Cache-Control':'public'}}));
 assert.equal(await response.text(),'workspace');assert.match(response.headers.get('Cache-Control'),/no-store/);
});

test('forged, expired, duplicate, and cross-site cookies are rejected',async()=>{
 const now=Date.now();const token=await createSession(env.CRAB_SESSION_SECRET,origin,now);
 assert.equal(await hasAccess(request(token),env.CRAB_SESSION_SECRET,now),true);
 assert.equal(await hasAccess(request(token),env.CRAB_SESSION_SECRET,now+SESSION_SECONDS*1000+1000),false);
 assert.equal(await hasAccess(request(token),env.CRAB_SESSION_SECRET+'changed',now),false);
 assert.equal(await hasAccess(request(token, 'https://preview.example/'),env.CRAB_SESSION_SECRET,now),false);
 const [payload,signature]=token.split('.');
 assert.equal(await hasAccess(request(payload+'.'+(signature[0]==='A'?'B':'A')+signature.slice(1)),env.CRAB_SESSION_SECRET,now),false);
 assert.equal(await hasAccess(new Request(origin,{headers:{Cookie:SESSION_COOKIE+'='+token+'; '+SESSION_COOKIE+'='+token}}),env.CRAB_SESSION_SECRET,now),false);
 assert.equal(await hasAccess(request('malformed'),env.CRAB_SESSION_SECRET),false);
});

test('logout clears the secure session and oversized login requests are rejected',async()=>{
 const logout=await accessLogin(new Request(origin+'/auth/logout',{method:'POST',headers:{Origin:origin}}),env);
 assert.equal(logout.status,303);assert.match(logout.headers.get('Set-Cookie'),/Max-Age=0/);
 assert.equal((await accessLogin(login('x'.repeat(3000)),env)).status,413);
});

test('only the owner can change the password; changes reject the old password and existing sessions',async()=>{
 const ownerKey='fixture-owner-key-not-a-live-credential';
 const ownerEnv={...env,CRAB_OWNER_KEY_HASH:createHash('sha256').update(ownerKey).digest('hex')};
 let record=null;
 const store={getPassword:async()=>record,setPassword:async value=>{record=value}};
 const change=(key,newPassword,confirmPassword=newPassword,site=origin)=>new Request(origin+'/auth/change-password',{method:'POST',headers:{Origin:site,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({ownerKey:key,newPassword,confirmPassword})});
 const oldToken=await createSession(env.CRAB_SESSION_SECRET,origin);
 assert.equal((await ownerSettings(change(password,'changed-class-password'),ownerEnv,store)).status,401);
 assert.equal(record,null);
 assert.equal((await ownerSettings(change(ownerKey,'changed-class-password','mismatch'),ownerEnv,store)).status,401);
 assert.equal((await ownerSettings(change(ownerKey,'changed-class-password','changed-class-password','https://other.example'),ownerEnv,store)).status,403);
 const updated=await ownerSettings(change(ownerKey,'changed-class-password'),ownerEnv,store);
 assert.equal(updated.status,200);assert.match(await updated.text(),/Password updated/);
 assert.ok(record.hash.startsWith('scrypt:'));assert.ok(!JSON.stringify(record).includes('changed-class-password'));
 assert.equal((await accessLogin(login(password),env,store)).status,401);
 const newLogin=await accessLogin(login('changed-class-password'),env,store);assert.equal(newLogin.status,303);
 const readRevision=async()=>(await readPasswordRecord(env,store)).revision;
 const oldApi=request(oldToken,origin+'/api/compile');
 assert.equal((await accessGate(oldApi,env,async()=>new Response('protected'),readRevision)).status,401);
 const authenticated=new Request(origin,{headers:{Cookie:newLogin.headers.get('Set-Cookie').split(';')[0]}});
 const workspace=await accessGate(authenticated,env,async()=>new Response('protected'),readRevision);
 assert.equal(await workspace.text(),'protected');
});

test('storage failures fail closed rather than accepting an old password',async()=>{
 const broken={getPassword:async()=>{throw new Error('storage unavailable')},setPassword:async()=>{}};
 assert.equal((await accessLogin(login(password),env,broken)).status,503);
 const token=await createSession(env.CRAB_SESSION_SECRET,origin);
 assert.equal((await accessGate(request(token),env,async()=>new Response('protected'),async()=>{throw new Error('storage unavailable')})).status,503);
});
