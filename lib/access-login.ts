import {scrypt, timingSafeEqual, randomBytes} from 'node:crypto';
import {promisify} from 'node:util';
import {createSession, sessionCookie, type AccessEnv} from './access-session.ts';
import {accessScreen} from './access-screen.ts';
import {readPasswordRecord,type PasswordStore} from './access-record.ts';
const derive = promisify(scrypt);
export async function passwordVerifier(password:string):Promise<string>{const salt=randomBytes(16).toString('hex');return 'scrypt:'+salt+':'+((await derive(password,salt,32)) as Buffer).toString('hex');}
export async function matchesPassword(password:string,verifier:string):Promise<boolean>{
 const [scheme,salt,hash]=verifier.split(':');
 if(scheme!=='scrypt'||!/^[a-f0-9]{32}$/.test(salt||'')||!/^[a-f0-9]{64}$/.test(hash||''))return false;
 return timingSafeEqual(await derive(password,salt,32) as Buffer,Buffer.from(hash,'hex'));
}

export async function accessLogin(request: Request, env: AccessEnv, store?:PasswordStore): Promise<Response> {
  const url = new URL(request.url);
  const json = (error:string,status:number) => Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
  if (request.method !== 'POST') return new Response('Method not allowed.',{status:405,headers:{Allow:'POST','Cache-Control':'no-store'}});
  if (request.headers.get('Origin') !== url.origin) return json('Use the CRAB access screen.',403);
  if (url.pathname === '/auth/logout') return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':sessionCookie('',0),'Cache-Control':'no-store'}});
  if (url.pathname !== '/auth/login') return json('Not found.',404);
  if (!env.CRAB_PASSWORD_HASH || !env.CRAB_SESSION_SECRET || env.CRAB_SESSION_SECRET.length < 32) return accessScreen(false,true);
  if (!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded')) return json('Use the password form.',415);
  const chunks: Uint8Array[] = []; let length = 0;
  if (request.body) {
    const reader = request.body.getReader();
    while (true) { const {done,value} = await reader.read(); if(done)break; length+=value.length; if(length>2048){await reader.cancel();return json('Request is too large.',413);} chunks.push(value); }
  }
  const body = new Uint8Array(length); let offset=0; for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
  const password = new URLSearchParams(new TextDecoder().decode(body)).get('password') || '';
  if (!password || password.length > 128) return accessScreen(true);
  try {
    const record=await readPasswordRecord(env,store);
    if (!await matchesPassword(password,record.hash)) return accessScreen(true);
    const session = await createSession(env.CRAB_SESSION_SECRET,url.origin,Date.now(),record.revision);
    return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':sessionCookie(session),'Cache-Control':'no-store'}});
  } catch { return accessScreen(false,true); }
}
