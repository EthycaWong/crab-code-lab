import type {AccessEnv} from './access-session.ts';
export type PasswordRecord = {hash:string;revision:string;changedAt:string};
export type PasswordStore = {getPassword:()=>Promise<PasswordRecord|null>;setPassword:(record:PasswordRecord)=>Promise<void>};
export async function readPasswordRecord(env:AccessEnv, store?:PasswordStore):Promise<PasswordRecord> {
  const value = store ? await store.getPassword() : null;
  if (value) {
    if (typeof value.hash!=='string'||typeof value.revision!=='string'||!/^scrypt:[a-f0-9]{32}:[a-f0-9]{64}$/.test(value.hash)) throw new Error('Invalid password settings.');
    return value;
  }
  if (!env.CRAB_PASSWORD_HASH) throw new Error('Password is not configured.');
  return {hash:env.CRAB_PASSWORD_HASH,revision:'initial',changedAt:''};
}
