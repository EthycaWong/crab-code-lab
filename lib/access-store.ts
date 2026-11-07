import {getStore} from '@netlify/blobs';
import type {PasswordRecord,PasswordStore} from './access-record.ts';
export function passwordStore():PasswordStore {
  const store=getStore({name:'crab-workspace-access',consistency:'strong'});
  return {
    getPassword:async()=>await store.get('class-password',{type:'json'}) as PasswordRecord|null,
    setPassword:async record=>{await store.setJSON('class-password',record);},
  };
}
