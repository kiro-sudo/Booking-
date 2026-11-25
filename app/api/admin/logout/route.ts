import { NextResponse } from 'next/server';
import { buildClearSessionCookieHeader } from '@/lib/admin-auth';

export async function POST() {
  const res = NextResponse.json({ authenticated: false }, { status: 200 });
  res.headers.set('Set-Cookie', buildClearSessionCookieHeader());
  return res;
}
