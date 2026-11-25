import { logger } from './logger';

/**
 * Sends email through SMTP when SMTP_HOST is set. Without it (development), the message is
 * written to the API log instead, links included, so every flow can be followed locally.
 */
export interface Email {
  to: string;
  subject: string;
  /** Plain paragraphs; a line that is only a URL becomes the button. */
  lines: string[];
  action?: { label: string; url: string };
}

function escape(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function renderEmail(email: Email): { html: string; text: string } {
  const text = [...email.lines, ...(email.action ? ['', `${email.action.label}: ${email.action.url}`] : []), '', '— VeriDocs'].join('\n');
  const paragraphs = email.lines.map((line) => `<p style="margin:0 0 16px;line-height:1.6;color:#334155">${escape(line)}</p>`).join('');
  const button = email.action
    ? `<p style="margin:24px 0"><a href="${escape(email.action.url)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px">${escape(email.action.label)}</a></p>
       <p style="margin:0 0 16px;font-size:12px;color:#64748b">Or copy this link: <br><span style="word-break:break-all">${escape(email.action.url)}</span></p>`
    : '';
  const html = `<!doctype html><html><body style="margin:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px"><tr><td style="padding:32px">
  <p style="margin:0 0 24px;font-weight:700;font-size:18px;color:#0f172a">VeriDocs</p>
  <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a">${escape(email.subject)}</h1>
  ${paragraphs}${button}
  <p style="margin:24px 0 0;font-size:12px;color:#94a3b8">If you didn't expect this email, you can ignore it.</p>
  </td></tr></table></td></tr></table></body></html>`;
  return { html, text };
}

let transport: { sendMail: (options: Record<string, unknown>) => Promise<unknown> } | null = null;

async function smtp() {
  if (transport) return transport;
  const nodemailer = await import('nodemailer');
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transport;
}

export async function sendEmail(email: Email): Promise<void> {
  const { html, text } = renderEmail(email);
  if (!process.env.SMTP_HOST) {
    logger.info({ to: email.to, subject: email.subject, link: email.action?.url }, `Email (not sent, SMTP_HOST is empty):\n${text}`);
    return;
  }
  try {
    await (await smtp()).sendMail({ from: process.env.EMAIL_FROM || 'VeriDocs <no-reply@veridocs.app>', to: email.to, subject: email.subject, text, html });
  } catch (error) {
    // Email trouble must not break sign-up or invitations; the person can ask for the link again.
    logger.error({ err: error, to: email.to, subject: email.subject }, 'Email could not be sent');
  }
}

export function appUrl(path: string): string {
  return `${(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')}${path}`;
}
