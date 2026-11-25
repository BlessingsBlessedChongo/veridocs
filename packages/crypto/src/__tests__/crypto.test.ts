import { describe, it, expect } from 'vitest';
import { hashBuffer, hashesMatch } from '../hash';
import { decryptPrivateKey, encryptPrivateKey, generateKeyPair, signData, verifySignature } from '../key';

describe('Hashing', () => {
  it('produces consistent SHA-256 hashes', () => {
    const data = Buffer.from('Hello, VeriDocs');
    const hash1 = hashBuffer(data);
    const hash2 = hashBuffer(data);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('produces different hashes for different data', () => {
    const hash1 = hashBuffer(Buffer.from('Document A'));
    const hash2 = hashBuffer(Buffer.from('Document B'));
    expect(hash1).not.toBe(hash2);
  });

  it('detects single-character changes', () => {
    const hash1 = hashBuffer(Buffer.from('Grade: B'));
    const hash2 = hashBuffer(Buffer.from('Grade: A'));
    expect(hash1).not.toBe(hash2);
  });

  it('compares hashes correctly', () => {
    const hash1 = hashBuffer(Buffer.from('test'));
    const hash2 = hashBuffer(Buffer.from('test'));
    const hash3 = hashBuffer(Buffer.from('different'));
    
    expect(hashesMatch(hash1, hash2)).toBe(true);
    expect(hashesMatch(hash1, hash3)).toBe(false);
  });
});

describe('Key Generation and Signing', () => {
  it('encrypts and decrypts private keys with a hexadecimal master key', () => {
    const masterKey = 'a'.repeat(64);
    const encrypted = encryptPrivateKey('private-key', masterKey);
    expect(decryptPrivateKey(encrypted, masterKey)).toBe('private-key');
  });

  it('generates valid RSA key pairs', () => {
    const { publicKey, privateKey } = generateKeyPair();
    expect(publicKey).toContain('BEGIN PUBLIC KEY');
    expect(privateKey).toContain('BEGIN PRIVATE KEY'); // PKCS#8; keys stored as PKCS#1 by older versions still load
  });

  it('signs and verifies data', () => {
    const { publicKey, privateKey } = generateKeyPair();
    const data = 'document-hash-abc123';
    const signature = signData(data, privateKey);
    
    expect(verifySignature(data, signature, publicKey)).toBe(true);
  });

  it('rejects tampered data', () => {
    const { publicKey, privateKey } = generateKeyPair();
    const data = 'original-hash';
    const signature = signData(data, privateKey);
    
    expect(verifySignature('tampered-hash', signature, publicKey)).toBe(false);
  });

  it('rejects signatures from wrong key', () => {
    const keyPair1 = generateKeyPair();
    const keyPair2 = generateKeyPair();
    const data = 'test-data';
    const signature = signData(data, keyPair1.privateKey);
    
    expect(verifySignature(data, signature, keyPair2.publicKey)).toBe(false);
  });
});