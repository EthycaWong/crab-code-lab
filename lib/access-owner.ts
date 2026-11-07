import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {accessScreen} from './access-screen.ts';
import {passwordVerifier} from './access-login.ts';
import type {PasswordStore} from './access-record.ts';
import type {AccessEnv} from './access-session.ts';
export async function ownerSettings(request:Request,env:AccessEnv,store:PasswordStore):Promise<Response>{
 const url=new URL(request.url);
 if(request.method==='GET'&&url.pathname==='/owner')return accessScreen(false,false,true);
 if(request.method!=='POST'||url.pathname!=='/auth/change-password')return new Response('Not found.',{status:404});
 if(request.headers.get('Origin')!==url.origin)return new Response('Use the owner page.',{status:403});
 if(!env.CRAB_OWNER_KEY_HASH||!/^[a-f0-9]{64}$/.test(env.CRAB_OWNER_KEY_HASH))return accessScreen(false,true,true);
 if(!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded'))return new Response('Use the owner form.',{status:415});
 const reader=request.body?.getReader();let raw='';let bytes=0;const decoder=new TextDecoder();
 if(reader)while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>4096){await reader.cancel();return new Response('Request is too large.',{status:413});}raw+=decoder.decode(value,{stream:true});}
 raw+=decoder.decode();const form=new URLSearchParams(raw);
 const ownerKey=form.get('ownerKey')||'',password=form.get('newPassword')||'',confirm=form.get('confirmPassword')||'';
 const actual=createHash('sha256').update(ownerKey).digest();
 if(!timingSafeEqual(actual,Buffer.from(env.CRAB_OWNER_KEY_HASH,'hex'))||password.length<4||password.length>128||password!==confirm)return accessScreen(true,false,true);
 try{
  await store.setPassword({hash:await passwordVerifier(password),revision:randomUUID(),changedAt:new Date().toISOString()});
  return accessScreen(false,false,true,true);
 }catch{return accessScreen(false,true,true);}
}
