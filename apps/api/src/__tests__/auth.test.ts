import { describe, expect, it } from 'vitest';
import { hashPassword, passwordProblem, verifyPassword } from '../lib/auth/password';
import { newSecret, sha256 } from '../lib/auth/tokens';

describe('password hashing', () => {
  it('accepts the right password and rejects others', async () => {
    const stored = await hashPassword('correct horse 9');
    expect(stored.startsWith('scrypt$16384$8$1$')).toBe(true);
    expect(await verifyPassword('correct horse 9', stored)).toBe(true);
    expect(await verifyPassword('correct horse 8', stored)).toBe(false);
  });

  it('salts every hash, so equal passwords never look the same', async () => {
    expect(await hashPassword('same password 1')).not.toBe(await hashPassword('same password 1'));
  });

  it('treats a missing or malformed hash as a wrong password', async () => {
    expect(await verifyPassword('anything 1', null)).toBe(false);
    expect(await verifyPassword('anything 1', 'md5$abc')).toBe(false);
  });

  it('treats differently composed Unicode as the same password', async () => {
    const stored = await hashPassword('Café secret 1'.normalize('NFC'));
    expect(await verifyPassword('Café secret 1'.normalize('NFD'), stored)).toBe(true);
  });
});

describe('password rules', () => {
  it('asks for length, letters and a number or symbol', () => {
    expect(passwordProblem('short1')).toMatch(/10 characters/);
    expect(passwordProblem('onlyletterslong')).toMatch(/number or symbol/);
    expect(passwordProblem('1234567890')).toMatch(/letters/);
    expect(passwordProblem('a good passphrase 7')).toBeNull();
  });

  it('refuses a password built from the email name', () => {
    expect(passwordProblem('chanda.mwale2026', 'chanda.mwale@unza.zm')).toMatch(/email/);
  });
});

describe('secrets', () => {
  it('are long, random and URL-safe; only their hash is stored', () => {
    const a = newSecret();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newSecret()).not.toBe(a);
    expect(sha256(a)).toHaveLength(64);
  });
});
