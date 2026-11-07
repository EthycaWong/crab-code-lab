import {accessGate} from '../../lib/access-gate.ts';
import {passwordStore} from '../../lib/access-store.ts';
import {readPasswordRecord} from '../../lib/access-record.ts';
declare const Netlify: {env:{get(name:string):string|undefined}};
export default function handler(request: Request, context:{next:()=>Promise<Response>}) {
  return accessGate(request,{
    CRAB_PASSWORD_HASH:Netlify.env.get('CRAB_PASSWORD_HASH'),
    CRAB_SESSION_SECRET:Netlify.env.get('CRAB_SESSION_SECRET'),
  },()=>context.next(),async()=>(await readPasswordRecord({CRAB_PASSWORD_HASH:Netlify.env.get('CRAB_PASSWORD_HASH')},passwordStore())).revision);
}
export const config = {path:'/*'};
