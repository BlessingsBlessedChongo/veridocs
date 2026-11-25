import { NextRequest } from 'next/server';
import { prisma } from '@veridocs/database';
import { inviteMemberSchema, InstitutionRole } from '@veridocs/shared';
import { requireInstitutionRole, requirePerson } from '../../../../../../lib/auth/require-auth';
import { ConflictError } from '../../../../../../lib/errors';
import { limit, ok, readJson, route } from '../../../../../../lib/http';
import { createSupabaseAdminClient } from '../../../../../../lib/supabase/server';
import { authProvider } from '../../../../../../lib/auth/verify-session';
import { appUrl, sendEmail } from '../../../../../../lib/email';
import { logAudit } from '../../../../../../lib/audit';

type Ctx = { params: { institutionId: string } };

const ROLE_WORDS: Record<string, string> = {
  ADMIN: 'an administrator (manage members, keys and settings, and sign documents)',
  ISSUER: 'an issuer (sign and revoke documents)',
  AUDITOR: 'an auditor (read documents, verifications and the audit trail)',
  VIEWER: 'a viewer (read documents)',
};

export const POST = route<Ctx>(async (request: NextRequest, { params }) => {
  const user = await requirePerson(request);
  await requireInstitutionRole(user, params.institutionId, [InstitutionRole.ADMIN]);
  await limit(`invite:${params.institutionId}`, 50, '1h', 'Too many invitations in the last hour. Try again later.');
  const { email: rawEmail, role } = await readJson(request, inviteMemberSchema);
  const email = rawEmail.trim().toLowerCase();
  if (email === user.email.toLowerCase()) throw new ConflictError('You are already a member.');

  const institution = await prisma.institution.findUniqueOrThrow({ where: { id: params.institutionId } });
  let invited = await prisma.user.findUnique({ where: { email } });
  if (!invited) {
    if (authProvider() === 'supabase') {
      const result = await createSupabaseAdminClient().auth.admin.inviteUserByEmail(email, { redirectTo: appUrl('/dashboard') });
      if (result.error || !result.data.user) throw new ConflictError('This email address could not be invited.');
      invited = await prisma.user.create({ data: { id: result.data.user.id, email } });
    } else {
      // A placeholder they claim by signing up with this address (and confirming it).
      invited = await prisma.user.create({ data: { email } });
    }
  }

  const existing = await prisma.institutionMember.findUnique({ where: { userId_institutionId: { userId: invited.id, institutionId: params.institutionId } } });
  if (existing?.status === 'ACTIVE') throw new ConflictError(`${email} is already a member.`);
  const member = existing
    ? await prisma.institutionMember.update({ where: { id: existing.id }, data: { role, status: 'PENDING', invitedByUserId: user.id } })
    : await prisma.institutionMember.create({ data: { userId: invited.id, institutionId: params.institutionId, role, invitedByUserId: user.id, status: 'PENDING' } });

  const hasAccount = Boolean(invited.passwordHash) || authProvider() === 'supabase';
  await sendEmail({
    to: email,
    subject: `You're invited to ${institution.name} on VeriDocs`,
    lines: [
      `${user.email} invited you to join ${institution.name} as ${ROLE_WORDS[role]}.`,
      hasAccount ? 'Sign in to accept the invitation.' : `Create your VeriDocs account with this email address (${email}), confirm it, and the invitation will be waiting.`,
    ],
    action: hasAccount
      ? { label: 'Open the invitation', url: appUrl('/dashboard') }
      : { label: 'Create your account', url: appUrl(`/auth/signup?email=${encodeURIComponent(email)}`) },
  });
  await logAudit({ action: 'MEMBER_INVITED', entityType: 'InstitutionMember', entityId: member.id, actorUserId: user.id, institutionId: params.institutionId, metadata: { email, role } });
  return ok({ userId: invited.id, email, role, status: member.status }, 201);
});
