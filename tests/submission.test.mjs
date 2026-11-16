import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareSubmission} from '../service/submission.mjs';
import {issueTicket} from '../service/compiler.mjs';
import {createEmailDelivery,recipient} from '../service/email.mjs';
const secret='fixture-submission-verification-secret';
const submission={student:'Fixture Student',email:'student@example.com',assignment:'Robotics',name:'Servo work',board:'uno',code:'this is unfinished C++ and will not compile'};

test('unfinished code can be emailed without a compile ticket and is labeled unverified',async()=>{
 const prepared=prepareSubmission({...submission,verified:true},secret);
 assert.equal(prepared.verified,false);assert.match(prepared.message.text,/Verification: Not verified/);
 let payload;
 const send=createEmailDelivery({RESEND_API_KEY:'fixture-only'},async(url,options)=>{payload=JSON.parse(options.body);return Response.json({id:'fixture-id'});});
 await send(prepared.message);
 assert.deepEqual(payload.to,[recipient]);assert.equal(payload.attachments[0].filename,'Servo_work.cpp');
 assert.equal(Buffer.from(payload.attachments[0].content,'base64').toString(),'#include <Arduino.h>\n\n'+submission.code);
});
test('only a current ticket for the exact source is described as verified',()=>{
 const ticket=issueTicket(submission.code,submission.board,secret);
 assert.equal(prepareSubmission({...submission,ticket},secret).verified,true);
 assert.match(prepareSubmission({...submission,ticket},secret).message.text,/Passed Arduino CLI verification/);
 assert.equal(prepareSubmission({...submission,code:submission.code+' ',ticket},secret).verified,false);
 assert.equal(prepareSubmission({...submission,ticket:'forged'},secret).verified,false);
 assert.throws(()=>prepareSubmission({...submission,code:''},secret));
 assert.throws(()=>prepareSubmission({...submission,email:'invalid'},secret));
});
