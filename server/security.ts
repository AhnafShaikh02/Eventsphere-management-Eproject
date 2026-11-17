import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const PII_PREFIX = 'enc:v1:';
const RAW_SECRET =
  process.env.DATA_ENCRYPTION_KEY ||
  process.env.JWT_SECRET ||
  'eventsphere-dev-jwt-secret-change-in-prod';

const DERIVED_KEY = crypto.scryptSync(RAW_SECRET, 'eventsphere-pii-v1-salt', 32);

export function encryptPii(plaintext?: string | null): string | undefined {
  if (!plaintext || !plaintext.trim()) return undefined;
  const trimmed = plaintext.trim();
  if (trimmed.startsWith(PII_PREFIX)) return trimmed;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', DERIVED_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PII_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptPii(ciphertext?: string | null): string | undefined {
  if (!ciphertext) return undefined;
  if (!ciphertext.startsWith(PII_PREFIX)) return ciphertext;

  const rest = ciphertext.slice(PII_PREFIX.length);
  const parts = rest.split(':');
  if (parts.length !== 3) return undefined;

  try {
    const [ivHex, tagHex, dataHex] = parts;
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      DERIVED_KEY,
      Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  } catch {
    return undefined;
  }
}

export function generateSixDigitOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashOtp(email: string, otp: string): string {
  const normalized = `${email.trim().toLowerCase()}:${otp.trim()}`;
  return crypto.createHmac('sha256', DERIVED_KEY).update(normalized).digest('hex');
}

export function hashResetSessionToken(rawToken: string): string {
  return crypto.createHmac('sha256', DERIVED_KEY).update(`reset-session:${rawToken.trim()}`).digest('hex');
}

export function verifyHashEqual(expectedHex: string, actualHex: string): boolean {
  if (!expectedHex || !actualHex || expectedHex.length !== actualHex.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(expectedHex, 'hex'), Buffer.from(actualHex, 'hex'));
  } catch {
    return false;
  }
}

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must include at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must include at least one lowercase letter.' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must include at least one number.' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Password must include at least one special character (e.g. !@#$%).' };
  }
  return { valid: true };
}

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  next();
}

interface RateBucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: { windowMs: number; max: number; keyPrefix: string }) {
  const buckets = new Map<string, RateBucket>();

  // Periodic cleanup of expired buckets to keep memory bounded under high concurrency
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets.entries()) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }, Math.max(options.windowMs, 30_000));
  timer.unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.EVENTSPHERE_DISABLE_RATE_LIMIT === 'true') {
      next();
      return;
    }
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${options.keyPrefix}:${clientIp}`;
    const now = Date.now();
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    existing.count += 1;
    if (existing.count > options.max) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      res.status(429).json({
        error: `Too many requests. Please wait ${retryAfterSec}s before retrying.`,
      });
      return;
    }

    next();
  };
}
