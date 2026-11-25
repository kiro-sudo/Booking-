import { NextRequest, NextResponse } from 'next/server';
import {
  buildSessionCookieHeader,
  claimInitialAdminCredential,
  isAdminSetupRequired,
  signAdminSessionToken,
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

  if (!isAdminSetupRequired()) {
    return NextResponse.json(
      { error: 'Admin account has already been configured.' },
      { status: 409 }
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

  const result = claimInitialAdminCredential(body.username, body.password);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const cleanUser = body.username.trim();
  const token = signAdminSessionToken(cleanUser);

  const res = NextResponse.json(
    { authenticated: true, username: cleanUser, token },
    { status: 201, headers: { 'Cache-Control': 'no-store' } }
  );
  res.headers.set('Set-Cookie', buildSessionCookieHeader(token));
  return res;
}
