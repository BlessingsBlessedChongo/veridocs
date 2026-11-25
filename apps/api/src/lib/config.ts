/** Settings that must exist; a missing one fails loudly once, with a clear message. */

export function masterKey(): string {
  const key = process.env.MASTER_ENCRYPTION_KEY;
  if (!key || !/^[0-9a-f]{64}$/i.test(key)) throw new Error('MASTER_ENCRYPTION_KEY must be set to 64 hexadecimal characters (openssl rand -hex 32)');
  return key;
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function verificationUrl(documentId: string): string {
  return `${appBaseUrl()}/verify/${documentId}`;
}
