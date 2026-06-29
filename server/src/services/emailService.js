import nodemailer from 'nodemailer';

let transporter;

const getTransporter = () => {
  if (!transporter && process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const transport = getTransporter();
  if (!transport) {
    console.log('[Email skipped - no SMTP]', { to, subject });
    return;
  }
  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'Hospital <noreply@hospital.com>',
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  });
};

export const sendPasswordResetEmail = async (user, resetUrl) => {
  await sendEmail({
    to: user.email,
    subject: 'Password Reset - Hospital Management',
    html: `
      <h2>Password Reset</h2>
      <p>Hi ${user.firstName},</p>
      <p>Click the link below to reset your password (valid for 1 hour):</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });
};

