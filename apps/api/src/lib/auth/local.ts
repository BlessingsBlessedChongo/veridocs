import { NextRequest } from 'next/server';
import { prisma, type AuthTokenType, type User } from '@veridocs/database';
import { appUrl, sendEmail } from '../email';
import { EMAIL_VERIFY_HOURS, newSecret, PASSWORD_RESET_MINUTES, SESSION_DAYS, SESSION_PREFIX, sha256 } from './tokens';

/** Built-in sign-in: sessions and the one-time links sent by email. */

export function clientInfo(request: NextRequest) {
  return {
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
    userAgent: request.headers.get('user-agent')?.slice(0, 300) || null,
  };
}

export async function createSession(user: User, request: NextRequest) {
  const token = SESSION_PREFIX + newSecret();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt, ...clientInfo(request) } });
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return { token, expiresAt, sessionId: session.id };
}

async function issueToken(userId: string, type: AuthTokenType, minutes: number) {
  // A new link replaces any unused one of the same kind.
  await prisma.authToken.updateMany({ where: { userId, type, usedAt: null }, data: { usedAt: new Date() } });
  const token = newSecret();
  await prisma.authToken.create({ data: { userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + minutes * 60_000) } });
  return token;
}

/** Uses a link once. Returns the person it belongs to, or null if it is unknown, used or expired. */
export async function consumeToken(token: string, type: AuthTokenType) {
  const record = await prisma.authToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!record || record.type !== type || record.usedAt || record.expiresAt < new Date()) return null;
  const used = await prisma.authToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  return used.count === 1 ? record.user : null; // two clicks at once: only the first wins
}

export async function sendVerificationEmail(user: Pick<User, 'id' | 'email' | 'fullName'>) {
  const token = await issueToken(user.id, 'EMAIL_VERIFY', EMAIL_VERIFY_HOURS * 60);
  await sendEmail({
    to: user.email,
    subject: 'Confirm your email address',
    lines: [`Hello${user.fullName ? ` ${user.fullName}` : ''},`, 'Confirm this is your email address to finish setting up your VeriDocs account. You need a confirmed address to sign documents.', `The link works for ${EMAIL_VERIFY_HOURS} hours.`],
    action: { label: 'Confirm email address', url: appUrl(`/auth/verify-email?token=${encodeURIComponent(token)}`) },
  });
}

export async function sendPasswordResetEmail(user: Pick<User, 'id' | 'email'>) {
  const token = await issueToken(user.id, 'PASSWORD_RESET', PASSWORD_RESET_MINUTES);
  await sendEmail({
    to: user.email,
    subject: 'Reset your password',
    lines: ['Someone asked to reset the password for this VeriDocs account.', `If it was you, choose a new password with the link below. It works for ${PASSWORD_RESET_MINUTES} minutes, once. Resetting signs you out everywhere.`],
    action: { label: 'Choose a new password', url: appUrl(`/auth/reset-password?token=${encodeURIComponent(token)}`) },
  });
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null, ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}) },
    data: { revokedAt: new Date() },
  });
}
