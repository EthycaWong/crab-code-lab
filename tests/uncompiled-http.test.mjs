import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';

test('HTTP submissions email unfinished C++ even when Arduino CLI is unavailable',async t=>{
 const sockets=new Set();let captured='';
 const smtp=net.createServer(socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.write('220 fixture.local SMTP\r\n');
  let buffer='',inData=false;
  socket.on('data',chunk=>{
   buffer+=chunk.toString();
   while(buffer.includes('\r\n')){
    const at=buffer.indexOf('\r\n'),line=buffer.slice(0,at);buffer=buffer.slice(at+2);
    if(inData){if(line==='.'){inData=false;socket.write('250 message captured locally\r\n');}else captured+=line+'\r\n';continue;}
    if(/^EHLO|^HELO/.test(line))socket.write('250-fixture.local\r\n250 AUTH PLAIN\r\n');
    else if(/^AUTH/.test(line))socket.write('235 authenticated\r\n');
    else if(line==='DATA'){inData=true;socket.write('354 send data\r\n');}
    else if(line==='QUIT')socket.end('221 goodbye\r\n');else socket.write('250 OK\r\n');
   }
  });
 });
 t.after(()=>{for(const socket of sockets)socket.destroy();smtp.close();});
 smtp.listen(0,'127.0.0.1');await once(smtp,'listening');
 const secret='fixture-http-compiler-secret-1234567890';
 const env={...process.env,PORT:'0',COMPILER_HOST:'127.0.0.1',COMPILER_TOKEN:secret,ARDUINO_CLI:'nonexistent-cli-for-submit-test',SMTP_HOST:'127.0.0.1',SMTP_PORT:String(smtp.address().port),SMTP_USER:'fixture',SMTP_PASS:'fixture',SMTP_FROM:'CRAB <fixture@example.com>'};
 delete env.RESEND_API_KEY;
 const service=spawn(process.execPath,['service/server.mjs'],{env,stdio:['ignore','pipe','pipe']});t.after(()=>service.kill());
 const origin=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(new Error('Service did not start')),5000);
  service.once('error',error=>{clearTimeout(timer);reject(error);});
  service.stdout.on('data',chunk=>{const url=chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/)?.[0];if(url){clearTimeout(timer);resolve(url);}});
 });
 const response=await fetch(origin+'/submit',{method:'POST',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({code:'unfinished invalid C++',board:'uno',student:'Fixture Student',email:'student@example.com',assignment:'Fixture test',name:'Unfinished'})});
 assert.equal(response.status,200,await response.clone().text());
 assert.deepEqual(await response.json(),{sent:true,recipient:'ethan.wong38@gmail.com',verified:false});
 assert.match(captured,/Not verified/);assert.match(captured,/Unfinished\.cpp/);assert.match(captured,/To: ethan\.wong38@gmail\.com/);
});
