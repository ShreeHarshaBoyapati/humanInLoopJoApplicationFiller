import crypto from 'crypto';

// Use a fallback key for development but ensure it's overridden in prod
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'; // Must be 32 bytes (256 bits)
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16; // For AES, this is always 16

if (Buffer.from(ENCRYPTION_KEY).length !== 32) {
  console.warn('WARNING: ENCRYPTION_KEY must be exactly 32 bytes long for aes-256-cbc.');
}

/**
 * Encrypts a plain text string securely using AES-256-CBC.
 */
export function encryptText(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypts a previously encrypted text string securely using AES-256-CBC.
 */
export function decryptText(encryptedText: string): string {
  const textParts = encryptedText.split(':');
  const ivHex = textParts.shift();
  if (!ivHex) {
    throw new Error('Invalid encrypted text format');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedTextBuffer = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedTextBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
