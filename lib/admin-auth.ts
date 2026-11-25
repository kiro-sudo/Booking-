import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

interface StoredAdminCredential {
  username: string;
  passwordHash: string; // format: scrypt:<saltHex>:<hashHex>
  createdAt: string;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

const CRED_DIR = path.resolve(process.cwd(), '.next-data');
const CRED_FILE = path.resolve(CRED_DIR, 'admin-cred.json');

const globalState = globalThis as unknown as {
  __boatAdminSessionSecret?: string;
  __boatLoginRateMap?: Map<string, RateBucket>;
  __boatLookupRateMap?: Map<string, RateBucket>;
  __boatClaimedCred?: StoredAdminCredential | null;
};

function getSessionSecret(): string {
  const envSecret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }
  if (!globalState.__boatAdminSessionSecret) {
    globalState.__boatAdminSessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return globalState.__boatAdminSessionSecret;
}

function getLoginRateMap(): Map<string, RateBucket> {
  if (!globalState.__boatLoginRateMap) {
    globalState.__boatLoginRateMap = new Map<string, RateBucket>();
  }
  return globalState.__boatLoginRateMap;
}

function getLookupRateMap(): Map<string, RateBucket> {
  if (!globalState.__boatLookupRateMap) {
    globalState.__boatLookupRateMap = new Map<string, RateBucket>();
  }
  return globalState.__boatLookupRateMap;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPasswordHash(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hashHex] = parts;
  if (!salt || !hashHex) return false;
  const derived = crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(hashHex, 'hex');
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

function readClaimedCredential(): StoredAdminCredential | null {
  if (globalState.__boatClaimedCred) {
    return globalState.__boatClaimedCred;
  }
  try {
    if (fs.existsSync(CRED_FILE)) {
      const raw = fs.readFileSync(CRED_FILE, 'utf8');
      const parsed = JSON.parse(raw) as StoredAdminCredential;
      if (parsed?.username && parsed?.passwordHash) {
        globalState.__boatClaimedCred = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore read errors
  }
  return null;
}

export function hasEnvAdminConfigured(): boolean {
  const user = process.env.ADMIN_USERNAME?.trim();
  const pass = process.env.ADMIN_PASSWORD?.trim();
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  return Boolean(user && (pass || hash));
}

export function isAdminSetupRequired(): boolean {
  if (hasEnvAdminConfigured()) return false;
  return readClaimedCredential() === null;
}

export function claimInitialAdminCredential(username: string, password: string): { ok: boolean; error?: string } {
  if (!isAdminSetupRequired()) {
    return { ok: false, error: 'Admin account is already configured.' };
  }
  const cleanUser = username.trim();
  if (cleanUser.length < 3 || cleanUser.length > 64) {
    return { ok: false, error: 'Username must be between 3 and 64 characters.' };
  }
  if (password.length < 8 || password.length > 128) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }

  const record: StoredAdminCredential = {
    username: cleanUser,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };

  globalState.__boatClaimedCred = record;
  try {
    if (!fs.existsSync(CRED_DIR)) {
      fs.mkdirSync(CRED_DIR, { recursive: true });
    }
    fs.writeFileSync(CRED_FILE, JSON.stringify(record, null, 2), { mode: 0o600 });
  } catch {
    // In-memory store remains active if filesystem is read-only
  }

  return { ok: true };
}

export function verifyAdminCredentials(username: string, password: string): boolean {
  const cleanUser = username.trim();
  if (!cleanUser || !password) return false;

  // Environment configuration always takes precedence over claimed fallback
  if (hasEnvAdminConfigured()) {
    const envUser = process.env.ADMIN_USERNAME!.trim();
    const userMatch =
      cleanUser.length === envUser.length &&
      crypto.timingSafeEqual(Buffer.from(cleanUser), Buffer.from(envUser));
    if (!userMatch) return false;

    const envHash = process.env.ADMIN_PASSWORD_HASH?.trim();
    if (envHash) {
      return verifyPasswordHash(password, envHash);
    }

    const envPass = process.env.ADMIN_PASSWORD ?? '';
    const passBuf = Buffer.from(password);
    const expectedBuf = Buffer.from(envPass);
    if (passBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(passBuf, expectedBuf);
  }

  const claimed = readClaimedCredential();
  if (!claimed) return false;

  const userMatch =
    cleanUser.length === claimed.username.length &&
    crypto.timingSafeEqual(Buffer.from(cleanUser), Buffer.from(claimed.username));
  if (!userMatch) return false;

  return verifyPasswordHash(password, claimed.passwordHash);
}

export interface AdminSessionPayload {
  username: string;
  iat: number;
  exp: number;
}

const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

export function signAdminSessionToken(username: string): string {
  const now = Date.now();
  const payload: AdminSessionPayload = {
    username,
    iat: now,
    exp: now + SESSION_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): AdminSessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as AdminSessionPayload;
    if (!payload.username || !payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const map = getLoginRateMap();
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;

  const entry = map.get(ip);
  if (!entry || now > entry.resetAt) {
    return { allowed: true };
  }
  if (entry.count >= maxAttempts) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true };
}

export function recordLoginFailure(ip: string): void {
  const map = getLoginRateMap();
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const entry = map.get(ip);
  if (!entry || now > entry.resetAt) {
    map.set(ip, { count: 1, resetAt: now + windowMs });
  } else {
    entry.count += 1;
  }
}

export function clearLoginFailures(ip: string): void {
  getLoginRateMap().delete(ip);
}

export function checkLookupRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const map = getLookupRateMap();
  const now = Date.now();
  const windowMs = 5 * 60 * 1000;
  const maxAttempts = 12;

  const entry = map.get(ip);
  if (!entry || now > entry.resetAt) {
    map.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (entry.count >= maxAttempts) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }
  entry.count += 1;
  return { allowed: true };
}

export const ADMIN_COOKIE_NAME = 'boat_admin_session';

export function buildSessionCookieHeader(token: string, maxAgeSeconds = 60 * 60 * 8): string {
  return `${ADMIN_COOKIE_NAME}=${token}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=None; Partitioned`;
}

export function buildClearSessionCookieHeader(): string {
  return `${ADMIN_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`;
}
