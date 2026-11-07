import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import nodemailer from 'nodemailer';
import {compileSketch,validateSketch,issueTicket,verifyTicket} from './compiler.mjs';
const secret=process.env.COMPILER_TOKEN;
if(!secret||secret.length<24)throw new Error('Set COMPILER_TOKEN to a random secret of at least 24 characters.');
const PORT=Number(process.env.PORT||process.env.COMPILER_PORT||4319),HOST=process.env.COMPILER_HOST||'127.0.0.1';
const recipient='ethan.wong38@gmail.com';
const emailConfigured=!!(process.env.SMTP_HOST&&process.env.SMTP_USER&&process.env.SMTP_PASS&&process.env.SMTP_FROM);
const transport=emailConfigured?nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_PORT==='465',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS},connectionTimeout:10000,socketTimeout:15000}):null;
let active=0;const limits=new Map();
function authorized(req){const actual=Buffer.from(req.headers.authorization||'');const expected=Buffer.from('Bearer '+secret);return actual.length===expected.length&&timingSafeEqual(actual,expected)}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
function rateLimit(req,path){const id=(req.headers['x-crab-client']||req.socket.remoteAddress)+path;const now=Date.now();let v=limits.get(id);if(!v||now-v.start>60000){v={start:now,count:0};limits.set(id,v)}v.count++;if(limits.size>2000)for(const [k,val]of limits)if(now-val.start>60000)limits.delete(k);return v.count<=(path==='/submit'?5:30)}
async function body(req){const chunks=[];let n=0;for await(const chunk of req){n+=chunk.length;if(n>100000)throw new Error('Request is too large.');chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString())}catch{throw new Error('Send valid JSON.')}}
const server=http.createServer(async(req,res)=>{
 const path=new URL(req.url,'http://localhost').pathname;
 if(req.method==='GET'&&path==='/health')return json(res,200,{ok:true});
 if(!authorized(req))return json(res,401,{error:'Compiler authentication required.'});
 if(req.method==='GET'&&path==='/status'){
  const cli=process.env.ARDUINO_CLI||'arduino-cli';const child=spawn(cli,['version'],{shell:false,stdio:'ignore',env:{PATH:process.env.PATH,HOME:process.env.HOME,LANG:'C.UTF-8'}});let answered=false;
  const done=ok=>{if(answered)return;answered=true;json(res,200,{compiler:ok,email:emailConfigured,recipient,message:ok?'Arduino CLI connected.':'Arduino CLI is unavailable.'})};const timer=setTimeout(()=>{child.kill();done(false)},4000);
  child.on('error',()=>{clearTimeout(timer);done(false)});child.on('close',code=>{clearTimeout(timer);done(code===0)});return;
 }
 if(req.method!=='POST'||!['/compile','/submit'].includes(path))return json(res,404,{error:'Not found.'});
 if(!rateLimit(req,path))return json(res,429,{error:'Too many requests. Wait a minute and try again.'});
 try{
  const data=validateSketch(await body(req));
  if(path==='/compile'){
   if(active>=Number(process.env.COMPILE_CONCURRENCY||2))return json(res,429,{error:'The compiler is busy with other students. Try again in a moment.'});
   active++;try{const result=await compileSketch(data);if(result.success)result.ticket=issueTicket(data.code,data.board,secret);return json(res,200,result);}finally{active--;}
  }
  if(!verifyTicket(data.ticket,data.code,data.board,secret))return json(res,409,{error:'Compile this version of the sketch again before submitting.'});
  if(!transport)return json(res,503,{error:'Direct email is not connected. Use the downloadable email option.'});
  const clean=(value,max)=>typeof value==='string'?value.replace(/[\r\n]/g,' ').trim().slice(0,max):'';
  const student=clean(data.student,100),email=clean(data.email,254),assignment=clean(data.assignment,150),name=clean(data.name,64);
  if(!student||!assignment||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))return json(res,400,{error:'Enter your name, a valid email, and the assignment.'});
  const notes=typeof data.notes==='string'?data.notes.slice(0,2000):'';
  const filename=(name.replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')||'crab_sketch')+'.cpp';
  await transport.sendMail({from:process.env.SMTP_FROM,to:recipient,replyTo:email,subject:`CRAB submission: ${assignment} — ${student}`,text:`Student: ${student}\nEmail: ${email}\nAssignment: ${assignment}\nBoard: ${data.board}\nSketch: ${name}\n\n${notes}\n\nVerified with Arduino CLI. C++ source attached.`,attachments:[{filename,content:/#\s*include\s*[<"]Arduino\.h[>"]/.test(data.code)?data.code:'#include <Arduino.h>\n\n'+data.code,contentType:'text/x-c++'}]});
  return json(res,200,{sent:true,recipient});
 }catch(err){console.error('Request failed:',err.message);json(res,err.message.includes('Arduino CLI')?503:400,{error:err.message.includes('Arduino CLI')?err.message:'The request could not be completed. Check your input and try again.'});}
});
server.requestTimeout=70000;server.headersTimeout=10000;server.listen(PORT,HOST,()=>console.log(`CRAB compiler service: http://${HOST}:${server.address().port} • email ${emailConfigured?'connected':'not configured'}`));
