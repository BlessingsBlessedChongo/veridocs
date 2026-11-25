import {
  createCipheriv, createDecipheriv, createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, sign, verify,
} from 'crypto';

/**
 * Keys, signatures and key encryption, on Node's built-in crypto (OpenSSL).
 *
 * Formats are unchanged from the earlier node-forge implementation, so existing keys,
 * signatures and encrypted private keys keep working (see __tests__/compat.test.ts):
 *   - signatures: RSASSA-PKCS1-v1_5 with SHA-256 over the UTF-8 text, base64
 *   - encrypted keys: base64(iv[12] || tag[16] || AES-256-GCM ciphertext)
 *   - fingerprints: SHA-256 of the SubjectPublicKeyInfo DER, first 16 bytes, colon hex
 */
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

const IV_LENGTH = 12;
const TAG_LENGTH = 16;

function masterKeyBytes(masterKey: string): Buffer {
  if (/^[0-9a-f]{64}$/i.test(masterKey)) return Buffer.from(masterKey, 'hex');
  const raw = Buffer.from(masterKey, 'latin1');
  if (raw.length !== 32) throw new Error('MASTER_ENCRYPTION_KEY must be 32 bytes or 64 hexadecimal characters');
  return raw;
}

/** A new RSA-2048 key pair (public: SPKI PEM, private: PKCS#8 PEM). In production, prefer an HSM or KMS. */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicExponent: 0x10001,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
}

/** Signs text with RSA-SHA256 (PKCS#1 v1.5); returns base64. */
export function signData(data: string, privateKeyPem: string): string {
  return sign('sha256', Buffer.from(data, 'utf8'), createPrivateKey(privateKeyPem)).toString('base64');
}

/** True only if the signature is a valid RSA-SHA256 signature of this text by this key. */
export function verifySignature(data: string, signature: string, publicKeyPem: string): boolean {
  try {
    const bytes = Buffer.from(signature, 'base64');
    if (bytes.length === 0 || bytes.toString('base64') !== signature.replace(/\s+/g, '')) return false; // canonical base64 only
    return verify('sha256', Buffer.from(data, 'utf8'), createPublicKey(publicKeyPem), bytes);
  } catch {
    return false;
  }
}

/** Encrypts a private key with AES-256-GCM under the master key. In production, use a KMS. */
export function encryptPrivateKey(privateKey: string, masterKey: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', masterKeyBytes(masterKey), iv, { authTagLength: TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(privateKey, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}

/** Decrypts a private key; throws if it was tampered with or the master key is wrong. */
export function decryptPrivateKey(encryptedKey: string, masterKey: string): string {
  const raw = Buffer.from(encryptedKey, 'base64');
  if (raw.length <= IV_LENGTH + TAG_LENGTH) throw new Error('Failed to decrypt private key');
  const decipher = createDecipheriv('aes-256-gcm', masterKeyBytes(masterKey), raw.subarray(0, IV_LENGTH), { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH));
  try {
    return Buffer.concat([decipher.update(raw.subarray(IV_LENGTH + TAG_LENGTH)), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('Failed to decrypt private key');
  }
}

/**
 * A short, stable fingerprint of a public key: SHA-256 of its DER encoding, shown as
 * colon-separated hex (first 16 bytes). People compare these to be sure which key signed.
 */
export function publicKeyFingerprint(publicKeyPem: string): string {
  const der = createPublicKey(publicKeyPem).export({ type: 'spki', format: 'der' });
  return createHash('sha256').update(der).digest('hex').slice(0, 32).match(/../g)!.join(':').toUpperCase();
}
