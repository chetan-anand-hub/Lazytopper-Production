import * as fs from 'fs';
import * as path from 'path';

const KEY_ENV = process.env.PMEM_HMAC_KEY;
const KEY_FILE_ENV = process.env.PMEM_HMAC_KEY_FILE;
const KEY_ID_ENV = process.env.PMEM_HMAC_KEY_ID;

export class HmacKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HmacKeyError';
  }
}

function decodeKey(raw: string): Buffer {
  if (raw.startsWith('hex:')) {
    const hex = raw.slice(4);
    if (!/^[0-9a-fA-F]+$/.test(hex) || hex.length % 2 !== 0) {
      throw new HmacKeyError('HMAC key hex content is invalid');
    }
    return Buffer.from(hex, 'hex');
  }
  if (raw.startsWith('b64:')) {
    return Buffer.from(raw.slice(4), 'base64');
  }
  return Buffer.from(raw, 'utf8');
}

function validateKeyLength(buffer: Buffer): void {
  if (buffer.length < 32) {
    throw new HmacKeyError('HMAC key must be at least 32 bytes');
  }
}

export function loadHmacKeyOrNull(): { keyBytes: Buffer; keyId: string } | null {
  const hasEnv = typeof KEY_ENV === 'string' && KEY_ENV.trim().length > 0;
  const hasFile = typeof KEY_FILE_ENV === 'string' && KEY_FILE_ENV.trim().length > 0;
  if (!hasEnv && !hasFile) {
    return null;
  }
  if (hasEnv && hasFile) {
    throw new HmacKeyError('PMEM_HMAC_KEY and PMEM_HMAC_KEY_FILE cannot both be set');
  }
  const rawValue = hasEnv ? KEY_ENV!.trim() : fs.readFileSync(path.resolve(KEY_FILE_ENV!), 'utf8').trim();
  if (!rawValue) {
    throw new HmacKeyError('HMAC key payload is empty');
  }
  const buffer = decodeKey(rawValue);
  validateKeyLength(buffer);
  return {
    keyBytes: buffer,
    keyId: KEY_ID_ENV?.trim() || 'default'
  };
}
