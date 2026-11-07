import {ownerSettings} from '../../lib/access-owner.ts';
import {passwordStore} from '../../lib/access-store.ts';
export default function handler(request){return ownerSettings(request,process.env,passwordStore());}
export const config={path:['/owner','/auth/change-password'],rateLimit:{windowLimit:10,windowSize:60,aggregateBy:['ip','domain'],action:'rate_limit'}};
