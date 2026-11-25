import { describe, expect, it } from 'vitest';
import { decryptPrivateKey, encryptPrivateKey, publicKeyFingerprint, signData, verifySignature } from '../key';
import vectors from './forge-vectors.json';

/**
 * forge-vectors.json was produced by the earlier node-forge implementation (a throwaway
 * key under a test-only master key). Everything already stored in a VeriDocs database was made
 * the same way, so these prove the built-in implementation reads it all unchanged.
 */
describe('compatibility with keys and signatures made by the node-forge version', () => {
  it('decrypts a private key it encrypted', () => {
    expect(decryptPrivateKey(vectors.encryptedPrivateKey, vectors.masterKey)).toBe(vectors.privateKey);
  });

  it('accepts its signatures, and they verify against its public key', () => {
    expect(verifySignature(vectors.data, vectors.signature, vectors.publicKey)).toBe(true);
  });

  it('produces byte-identical signatures with its keys (PKCS#1 v1.5 is deterministic)', () => {
    expect(signData(vectors.data, vectors.privateKey)).toBe(vectors.signature);
  });

  it('computes the same key fingerprint', () => {
    expect(publicKeyFingerprint(vectors.publicKey)).toBe(vectors.fingerprint);
  });

  it('writes encrypted keys it could have read', () => {
    const again = encryptPrivateKey(vectors.privateKey, vectors.masterKey);
    expect(decryptPrivateKey(again, vectors.masterKey)).toBe(vectors.privateKey);
  });
});

describe('hardening', () => {
  it('rejects a signature that is not canonical base64', () => {
    expect(verifySignature(vectors.data, `${vectors.signature}AA`, vectors.publicKey)).toBe(false);
    expect(verifySignature(vectors.data, '', vectors.publicKey)).toBe(false);
  });

  it('rejects a tampered encrypted key and a wrong master key', () => {
    const raw = Buffer.from(vectors.encryptedPrivateKey, 'base64');
    raw[raw.length - 1] ^= 1;
    expect(() => decryptPrivateKey(raw.toString('base64'), vectors.masterKey)).toThrow('Failed to decrypt');
    expect(() => decryptPrivateKey(vectors.encryptedPrivateKey, 'f'.repeat(64))).toThrow('Failed to decrypt');
  });
});
