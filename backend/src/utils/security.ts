import crypto from 'crypto';

const SCRYPT_KEYLEN = 64;

export const hashPassword = (plain: string): string => {
  const normalized = plain.trim();
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(normalized, salt, SCRYPT_KEYLEN).toString('hex');
  return `scrypt$${salt}$${hash}`;
};

export const isPasswordHashed = (value?: string | null): boolean => {
  return typeof value === 'string' && value.startsWith('scrypt$');
};

export const verifyPassword = (plain: string, stored?: string | null): boolean => {
  if (!stored) return false;
  const normalized = plain.trim();
  if (!isPasswordHashed(stored)) {
    return stored === normalized;
  }
  const [, salt, expected] = stored.split('$');
  if (!salt || !expected) return false;
  const hash = crypto.scryptSync(normalized, salt, SCRYPT_KEYLEN).toString('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(hash, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
};
