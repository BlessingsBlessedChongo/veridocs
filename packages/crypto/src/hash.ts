import { createHash } from 'crypto';
import { readFile } from 'fs/promises';

/**
 * Computes SHA-256 hash of a buffer.
 * Used to create a unique fingerprint of a document.
 */
export function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Computes SHA-256 hash of a file on disk.
 */
export async function hashFile(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return hashBuffer(buffer);
}

/**
 * Constant-time comparison to prevent timing attacks.
 */
export function hashesMatch(hash1: string, hash2: string): boolean {
  if (hash1.length !== hash2.length) return false;
  
  let result = 0;
  for (let i = 0; i < hash1.length; i++) {
    result |= hash1.charCodeAt(i) ^ hash2.charCodeAt(i);
  }
  return result === 0;
}