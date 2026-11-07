import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmailDelivery, recipient } from '../service/email.mjs';

const message = { to: 'untrusted@example.com', replyTo: 'student@example.com', subject: 'CRAB submission', text: 'Verified C++ attached.', attachments: [{ filename: 'Blink.cpp', content: '#include <Arduino.h>\nvoid setup() {}\nvoid loop() {}\n' }] };

test('Resend sends exact C++ attachment to the fixed teacher using HTTPS', async () => {
  let call;
  const deliver = createEmailDelivery({ RESEND_API_KEY: 'test-key-not-a-real-credential' }, async (url, options) => {
    call = { url, options };
    return Response.json({ id: 'mock-message-id' });
  });
  await deliver(message);
  assert.equal(call.url, 'https://api.resend.com/emails');
  assert.equal(call.options.headers.Authorization, 'Bearer test-key-not-a-real-credential');
  const payload = JSON.parse(call.options.body);
  assert.deepEqual(payload.to, [recipient]);
  assert.equal(payload.reply_to, message.replyTo);
  assert.equal(payload.from, 'CRAB Code Lab <onboarding@resend.dev>');
  assert.equal(payload.attachments[0].filename, 'Blink.cpp');
  assert.equal(Buffer.from(payload.attachments[0].content, 'base64').toString(), message.attachments[0].content);
});

test('missing credentials and provider failures never report email success', async () => {
  assert.equal(createEmailDelivery({}), null);
  const rejected = createEmailDelivery({ RESEND_API_KEY: 'test-key' }, async () => Response.json({ message: 'secret provider details' }, { status: 403 }));
  await assert.rejects(rejected(message), /Email provider rejected/);
  const unconfirmed = createEmailDelivery({ RESEND_API_KEY: 'test-key' }, async () => Response.json({}));
  await assert.rejects(unconfirmed(message), /did not confirm/);
});
