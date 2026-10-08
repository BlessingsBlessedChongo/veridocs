import forge from 'node-forge';

export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

function normalizeMasterKey(masterKey: string): string {
  const key = /^[0-9a-f]{64}$/i.test(masterKey) ? forge.util.hexToBytes(masterKey) : masterKey;
  if (key.length !== 32) throw new Error('MASTER_ENCRYPTION_KEY must be 32 bytes or 64 hexadecimal characters');
  return key;
}

/**
 * Generates an RSA-2048 key pair for document signing.
 * In production, private keys should be stored in an HSM.
 */
export function generateKeyPair(): KeyPair {
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 2048 });
  
  return {
    publicKey: forge.pki.publicKeyToPem(keypair.publicKey),
    privateKey: forge.pki.privateKeyToPem(keypair.privateKey),
  };
}

/**
 * Signs data with a private key using RSA-SHA256.
 */
export function signData(data: string, privateKeyPem: string): string {
  const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
  const md = forge.md.sha256.create();
  md.update(data, 'utf8');
  
  const signature = privateKey.sign(md);
  return forge.util.encode64(signature);
}

/**
 * Verifies a signature against data using a public key.
 */
export function verifySignature(
  data: string,
  signature: string,
  publicKeyPem: string
): boolean {
  try {
    const publicKey = forge.pki.publicKeyFromPem(publicKeyPem);
    const md = forge.md.sha256.create();
    md.update(data, 'utf8');
    
    const signatureBytes = forge.util.decode64(signature);
    return publicKey.verify(md.digest().bytes(), signatureBytes);
  } catch {
    return false;
  }
}

/**
 * Encrypts a private key using AES-256-GCM.
 * In production, use a dedicated KMS.
 */
export function encryptPrivateKey(
  privateKey: string,
  masterKey: string
): string {
  const iv = forge.random.getBytesSync(12);
  const cipher = forge.cipher.createCipher('AES-GCM', normalizeMasterKey(masterKey));
  cipher.start({ iv });
  cipher.update(forge.util.createBuffer(privateKey, 'utf8'));
  cipher.finish();
  
  const encrypted = cipher.output.getBytes();
  const tag = cipher.mode.tag.getBytes();
  
  return forge.util.encode64(iv + tag + encrypted);
}

/**
 * Decrypts a private key.
 */
export function decryptPrivateKey(
  encryptedKey: string,
  masterKey: string
): string {
  const decoded = forge.util.decode64(encryptedKey);
  const iv = decoded.slice(0, 12);
  const tag = decoded.slice(12, 28);
  const encrypted = decoded.slice(28);
  
  const decipher = forge.cipher.createDecipher('AES-GCM', normalizeMasterKey(masterKey));
  decipher.start({ iv, tag: forge.util.createBuffer(tag) });
  decipher.update(forge.util.createBuffer(encrypted));
  
  if (!decipher.finish()) {
    throw new Error('Failed to decrypt private key');
  }
  
  return decipher.output.toString();
}