'use strict';

const { Worker } = require('bullmq');
const { connection } = require('./queue');
const { transporter } = require('./email');

const worker = new Worker(
  'email',
  async (job) => {
    if (job.name === 'otp') {
      const { to, otp } = job.data;
      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com',
        to,
        subject: 'Your email verification code',
        text: `Your verification code is ${otp}. It expires in 10 minutes.`,
      });
      return;
    }
    throw new Error(`Unsupported email job: ${job.name}`);
  },
  {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    },
  }
);

worker.on('completed', (job) => console.log(`Email job ${job.id} completed`));
worker.on('failed', (job, error) => {
  console.error(`Email job ${job?.id ?? 'unknown'} failed:`, error.message);
});

module.exports = worker;
