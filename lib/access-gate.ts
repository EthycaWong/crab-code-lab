import {hasAccess, type AccessEnv} from './access-session.ts';
import {accessScreen} from './access-screen.ts';

export async function accessGate(request: Request, env: AccessEnv, next: () => Promise<Response>, readRevision:()=>Promise<string> = async()=> 'initial'): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (['/crab.png','/favicon.svg','/fonts/plex-mono.ttf'].includes(path) || ['/auth/login','/auth/logout','/owner','/auth/change-password'].includes(path)) return next();
  const isApi = path.startsWith('/api/') || path.startsWith('/.netlify/');
  if (!env.CRAB_PASSWORD_HASH || !env.CRAB_SESSION_SECRET || env.CRAB_SESSION_SECRET.length < 32) {
    return isApi ? Response.json({error:'Workspace access is not configured.'},{status:503,headers:{'Cache-Control':'no-store'}}) : accessScreen(false,true);
  }
  let authenticated=await hasAccess(request, env.CRAB_SESSION_SECRET);
  if(authenticated){try{authenticated=await hasAccess(request,env.CRAB_SESSION_SECRET,Date.now(),await readRevision());}catch{return isApi?Response.json({error:'Access settings are temporarily unavailable.'},{status:503}):accessScreen(false,true);}}
  if (!authenticated) {
    return isApi || !['GET','HEAD'].includes(request.method) ? Response.json({error:'Enter the class password to open the workspace.'},{status:401,headers:{'Cache-Control':'no-store'}}) : accessScreen();
  }
  const response = await next();
  if (response.headers.get('Content-Type')?.includes('text/html')) {
    const headers = new Headers(response.headers);
    headers.set('Cache-Control','private, no-store'); headers.set('Vary','Cookie');
    return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
  }
  return response;
}
