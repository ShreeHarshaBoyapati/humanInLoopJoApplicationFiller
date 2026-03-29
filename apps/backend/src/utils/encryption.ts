import crypto from 'crypto';

// Use a fallback key for development but ensure it's overridden in prod
const ENCRYPTION_KEY = process.env.NODE_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'; // Must be 32 bytes (256 bits)
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
  // Remove any whitespace/newlines that may have been introduced during storage/transmission
  const cleanText = encryptedText.replace(/\s/g, '');
  const colonIndex = cleanText.indexOf(':');
  if (colonIndex === -1) {
    throw new Error('Invalid encrypted text format: missing delimiter');
  }
  const ivHex = cleanText.substring(0, colonIndex);
  const encryptedHex = cleanText.substring(colonIndex + 1);
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedTextBuffer = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedTextBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
