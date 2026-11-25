import { NextRequest, NextResponse } from 'next/server';
import {
  buildSessionCookieHeader,
  checkLoginRateLimit,
  clearLoginFailures,
  getClientIp,
  isAdminSetupRequired,
  recordLoginFailure,
  signAdminSessionToken,
  verifyAdminCredentials,
} from '@/lib/admin-auth';

function isSameOriginRequest(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  if (!host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }

  if (isAdminSetupRequired()) {
    return NextResponse.json(
      { error: 'Initial admin setup required.', setupRequired: true },
      { status: 409 }
    );
  }

  const ip = getClientIp(req);
  const limit = checkLoginRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many failed login attempts. Please try again in ${limit.retryAfterSec} seconds.`,
        retryAfterSec: limit.retryAfterSec,
      },
      { status: 429 }
    );
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = (await req.json()) as { username?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (typeof body.username !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const valid = verifyAdminCredentials(body.username, body.password);
  if (!valid) {
    recordLoginFailure(ip);
    return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
  }

  clearLoginFailures(ip);
  const cleanUser = body.username.trim();
  const token = signAdminSessionToken(cleanUser);

  const res = NextResponse.json(
    { authenticated: true, username: cleanUser, token },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
  res.headers.set('Set-Cookie', buildSessionCookieHeader(token));
  return res;
}
