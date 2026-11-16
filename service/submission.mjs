import {validateSketch,verifyTicket} from './compiler.mjs';

export function prepareSubmission(input, secret) {
  const data=validateSketch(input);
  const clean=(value,max)=>typeof value==='string'?value.replace(/[\r\n]/g,' ').trim().slice(0,max):'';
  const student=clean(data.student,100),email=clean(data.email,254),assignment=clean(data.assignment,150),name=clean(data.name,64);
  if(!student||!assignment||!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email))throw new Error('Enter your name, a valid email, and the assignment.');
  const verified=verifyTicket(data.ticket,data.code,data.board,secret);
  const notes=typeof data.notes==='string'?data.notes.slice(0,2000):'';
  const filename=(name.replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')||'crab_sketch')+'.cpp';
  const verification=verified?'Passed Arduino CLI verification for this exact source and board.':'Not verified. Compilation is optional; this version has no current successful verification.';
  return {verified,message:{
    replyTo:email,
    subject:`CRAB submission: ${assignment} — ${student}`,
    text:`Student: ${student}\nEmail: ${email}\nAssignment: ${assignment}\nBoard: ${data.board}\nSketch: ${name}\nVerification: ${verification}\n\n${notes}\n\nC++ source attached.`,
    attachments:[{filename,content:/#\s*include\s*[<"]Arduino\.h[>"]/.test(data.code)?data.code:'#include <Arduino.h>\n\n'+data.code,contentType:'text/x-c++'}],
  }};
}
