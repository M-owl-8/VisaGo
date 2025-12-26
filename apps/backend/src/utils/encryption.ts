import crypto from 'crypto';
import { getEnvConfig } from '../config/env';
import { logWarn } from '../middleware/logger';

const IV_LENGTH = 12; // GCM recommended

const getKey = (): Buffer | null => {
  const key = getEnvConfig().ENCRYPTION_KEY;
  if (!key) {
    return null;
  }
  // If key looks base64, decode; else use utf-8
  try {
    const maybeBase64 = Buffer.from(key, 'base64');
    if (maybeBase64.length === 32) return maybeBase64;
  } catch (_) {
    // noop
  }
  const buf = Buffer.from(key, 'utf-8');
  return buf.length >= 32 ? buf.slice(0, 32) : null;
};

export function encryptString(value: string): string {
  const key = getKey();
  if (!key) {
    logWarn('[Encryption] ENCRYPTION_KEY not set, storing value in plaintext');
    return value;
  }
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptString(value: string): string {
  const key = getKey();
  if (!key) {
    logWarn('[Encryption] ENCRYPTION_KEY not set, returning stored value as-is');
    return value;
  }
  const parts = value.split(':');
  if (parts.length !== 3) {
    return value;
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const encryptedText = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
  return decrypted.toString('utf8');
}

