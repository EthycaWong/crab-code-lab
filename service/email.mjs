import nodemailer from 'nodemailer';

export const recipient = 'ethan.wong38@gmail.com';

/** HTTPS delivery works on Render Free, which blocks standard SMTP ports. */
export function createEmailDelivery(env = process.env, request = fetch) {
  if (env.RESEND_API_KEY) {
    return async message => {
      const response = await request('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.EMAIL_FROM || 'CRAB Code Lab <onboarding@resend.dev>',
          to: [recipient],
          reply_to: message.replyTo,
          subject: message.subject,
          text: message.text,
          attachments: message.attachments.map(file => ({
            filename: file.filename,
            content: Buffer.from(file.content, 'utf8').toString('base64'),
          })),
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error('Email provider rejected the submission. Check the sender, account quota, and API key on the compiler host.');
      const result = await response.json();
      if (!result.id) throw new Error('Email provider did not confirm acceptance.');
    };
  }
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM) {
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST, port: Number(env.SMTP_PORT || 587), secure: env.SMTP_PORT === '465',
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }, connectionTimeout: 10000, socketTimeout: 15000,
    });
    return message => transport.sendMail({ ...message, from: env.SMTP_FROM, to: recipient });
  }
  return null;
}
