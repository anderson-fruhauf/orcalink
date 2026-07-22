import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const raw = process.env['WHATSAPP_CREDENTIALS_ENCRYPTION_KEY'];
  if (!raw || raw.trim().length === 0) {
    throw new Error('WHATSAPP_CREDENTIALS_ENCRYPTION_KEY is not configured');
  }
  return scryptSync(raw.trim(), 'orcalink-whatsapp-salt', 32);
}

export function encryptJson(value: unknown): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = JSON.stringify(value);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptJson<T>(payload: string): T {
  const key = getEncryptionKey();
  const buffer = Buffer.from(payload, 'base64');
  const iv = buffer.subarray(0, IV_LENGTH);
  const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
  const encrypted = buffer.subarray(IV_LENGTH + 16);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf8');
  return JSON.parse(decrypted) as T;
}

export function isWhatsappCryptoConfigured(): boolean {
  const raw = process.env['WHATSAPP_CREDENTIALS_ENCRYPTION_KEY'];
  return Boolean(raw && raw.trim().length > 0);
}
