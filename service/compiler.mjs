import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
export const boards={uno:'arduino:avr:uno',nano:'arduino:avr:nano:cpu=atmega328',mega:'arduino:avr:mega:cpu=atmega2560'};
export function validateSketch(data){
 if(!data||typeof data.code!=='string'||!data.code.trim())throw new Error('Write some code before compiling.');
 if(Buffer.byteLength(data.code)>48000)throw new Error('Keep sketches under 48 KB.');
 if(!Object.hasOwn(boards,data.board))throw new Error('Select a supported Arduino board.');
 return data;
}
export function sourceHash(code,board){return createHash('sha256').update(board+'\0'+code).digest('hex');}
export function issueTicket(code,board,secret){const body=Buffer.from(JSON.stringify({hash:sourceHash(code,board),expires:Date.now()+30*60*1000})).toString('base64url');return body+'.'+createHmac('sha256',secret).update(body).digest('base64url');}
export function verifyTicket(ticket,code,board,secret){try{const [body,sig]=ticket.split('.');const expected=createHmac('sha256',secret).update(body).digest();const actual=Buffer.from(sig,'base64url');if(actual.length!==expected.length||!timingSafeEqual(expected,actual))return false;const payload=JSON.parse(Buffer.from(body,'base64url'));return payload.expires>Date.now()&&payload.hash===sourceHash(code,board);}catch{return false}}
export async function compileSketch(data,{cli=process.env.ARDUINO_CLI||'arduino-cli',timeout=45000}={}){
 validateSketch(data);const root=await mkdtemp(join(process.env.COMPILE_TMPDIR||tmpdir(),'crab-'));const sketchDir=join(root,'Sketch'),buildDir=join(root,'build');const started=Date.now();
 try{
  await mkdir(sketchDir);await writeFile(join(sketchDir,'Sketch.ino'),'// Arduino build entry. Student C++ is in sketch.cpp.\n');
  await writeFile(join(sketchDir,'sketch.cpp'),'#include <Arduino.h>\n#line 1 "sketch.cpp"\n'+data.code);
  const result=await new Promise((resolve,reject)=>{
   const args=['compile','--fqbn',boards[data.board],'--warnings','more','--build-path',buildDir,sketchDir];
   if(process.env.ARDUINO_CONFIG_FILE)args.push('--config-file',process.env.ARDUINO_CONFIG_FILE);
   const child=spawn(cli,args,{shell:false,detached:process.platform!=='win32',env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,LANG:'C.UTF-8',CRAB_SANDBOX_ROOT:root}});
   let output='',timedOut=false;const kill=()=>{try{if(process.platform!=='win32')process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL')}catch{child.kill('SIGKILL')}};const timer=setTimeout(()=>{timedOut=true;kill()},timeout);
   const collect=chunk=>{output+=chunk.toString();if(output.length>128000)kill()};child.stdout.on('data',collect);child.stderr.on('data',collect);
   child.on('error',err=>{clearTimeout(timer);reject(new Error(err.code==='ENOENT'?'Arduino CLI is not installed on the compiler server.':err.message))});
   child.on('close',code=>{clearTimeout(timer);resolve({success:code===0&&!timedOut,output:timedOut?'Compilation timed out. Simplify your sketch and try again.':output.slice(0,128000)})});
  });
  result.output=result.output.replaceAll(root+'/', '').replaceAll(process.env.HOME||'__NO_HOME__','[compiler]').replace(/\x1b\[[0-9;]*m/g,'').trim();
  const diagnostics=[];for(const match of result.output.matchAll(/(?:sketch\.cpp):(\d+):(\d+):\s*(fatal error|error|warning):\s*(.+)/g))diagnostics.push({line:+match[1],column:+match[2],severity:match[3]==='warning'?'warning':'error',message:match[4]});
  return {...result,diagnostics,flash:Number(result.output.match(/Sketch uses\s+(\d+)\s+bytes/)?.[1])||undefined,ram:Number(result.output.match(/Global variables use\s+(\d+)\s+bytes/)?.[1])||undefined,duration:Date.now()-started};
 }finally{await rm(root,{recursive:true,force:true})}
}
