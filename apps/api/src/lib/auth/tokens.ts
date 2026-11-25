import { createHash, randomBytes } from 'crypto';

/** A random, URL-safe secret. Only its SHA-256 hash is ever stored. */
export function newSecret(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Prefixes make it obvious what kind of secret leaked, if one ever does. */
export const SESSION_PREFIX = 'vds_';
export const API_KEY_PREFIX = 'vd_live_';

export const SESSION_DAYS = 30;
export const EMAIL_VERIFY_HOURS = 48;
export const PASSWORD_RESET_MINUTES = 30;
