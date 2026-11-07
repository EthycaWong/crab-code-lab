import {accessLogin} from '../../lib/access-login.ts';
import {passwordStore} from '../../lib/access-store.ts';
export default function handler(request) {
  return accessLogin(request,{
    CRAB_PASSWORD_HASH:process.env.CRAB_PASSWORD_HASH,
    CRAB_SESSION_SECRET:process.env.CRAB_SESSION_SECRET,
  },passwordStore());
}
export const config = {
  path:['/auth/login','/auth/logout'],
  rateLimit:{windowLimit:20,windowSize:60,aggregateBy:['ip','domain'],action:'rate_limit'},
};
