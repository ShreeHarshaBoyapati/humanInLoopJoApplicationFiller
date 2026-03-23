/**
 * Transit Encryption Utilities — @repo/utils/crypto
 *
 * Isomorphic AES-GCM encryption using the Web Crypto API.
 * Works in both Node.js 18+ (via native webcrypto) and Chrome Extension contexts.
 *
 * Purpose: Encrypt API keys in transit between the extension and backend.
 * The backend decrypts on receipt using the shared TRANSIT_SECRET key before
 * re-encrypting for at-rest storage.
 */

const ALGO = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM

/**
 * Derives a CryptoKey from a raw secret string using PBKDF2.
 */
async function deriveKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      // Fixed salt is acceptable here — transit encryption rotates per message via IV.
      salt: enc.encode('jfp-transit-salt'),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGO, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string for transit.
 * Returns a Base64-encoded string in the format: <iv_hex>:<ciphertext_hex>
 */
export async function transitEncrypt(plaintext: string, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const enc = new TextEncoder();

  const cipherBuffer = await crypto.subtle.encrypt({ name: ALGO, iv }, key, enc.encode(plaintext));

  const ivHex = Array.from(iv)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const cipherHex = Array.from(new Uint8Array(cipherBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `${ivHex}:${cipherHex}`;
}

/**
 * Decrypts a transit-encrypted string produced by transitEncrypt.
 */
export async function transitDecrypt(encrypted: string, secret: string): Promise<string> {
  const [ivHex, cipherHex] = encrypted.split(':');
  if (!ivHex || !cipherHex) {
    throw new Error('Invalid transit-encrypted format');
  }

  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));
  const cipherBuffer = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)));

  const key = await deriveKey(secret);
  const decryptedBuffer = await crypto.subtle.decrypt({ name: ALGO, iv }, key, cipherBuffer);

  return new TextDecoder().decode(decryptedBuffer);
}
