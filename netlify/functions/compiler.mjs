import { compilerApi } from '../../lib/compiler-api.ts';
import { hasAccess } from '../../lib/access-session.ts';
import {passwordStore} from '../../lib/access-store.ts';
import {readPasswordRecord} from '../../lib/access-record.ts';

/** Netlify handles the public routes; the compiler token stays server-side. */
export function createCompilerHandler(readRevision=async()=>(await readPasswordRecord(process.env,passwordStore())).revision){return async function handler(request, context) {
  if (!await hasAccess(request, process.env.CRAB_SESSION_SECRET)) return Response.json({error:'Enter the class password to open the workspace.'},{status:401,headers:{'Cache-Control':'no-store'}});
  try{if(!await hasAccess(request,process.env.CRAB_SESSION_SECRET,Date.now(),await readRevision()))return Response.json({error:'The class password changed. Unlock the workspace again.'},{status:401,headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Workspace access is temporarily unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});}
  return compilerApi(request, {
    COMPILER_URL: process.env.COMPILER_URL,
    COMPILER_TOKEN: process.env.COMPILER_TOKEN,
  }, context.ip);
};}
export default createCompilerHandler();

export const config = {
  path: ['/api/status', '/api/compile', '/api/submit'],
};
