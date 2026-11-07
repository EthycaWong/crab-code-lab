import {spawn} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
if(!existsSync('.dev.vars'))writeFileSync('.dev.vars',`COMPILER_URL=http://127.0.0.1:4319\nCOMPILER_TOKEN=${randomBytes(32).toString('hex')}\n`,{mode:0o600});
const env={...process.env};for(const line of readFileSync('.dev.vars','utf8').split('\n')){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m)env[m[1]]=m[2].replace(/^['"]|['"]$/g,'')}
const compiler=spawn(process.execPath,['service/server.mjs'],{stdio:'inherit',env});
const site=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1'],{stdio:'inherit',env});
let stopping=false;function stop(){if(stopping)return;stopping=true;compiler.kill('SIGTERM');site.kill('SIGTERM');setTimeout(()=>process.exit(),1000).unref()}
process.on('SIGINT',stop);process.on('SIGTERM',stop);compiler.on('exit',code=>{if(code)stop()});site.on('exit',stop);
console.log('CRAB Code Lab: open the Local URL printed below. Press Ctrl+C to stop.');
