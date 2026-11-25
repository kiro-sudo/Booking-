import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE_NAME,
  isAdminSetupRequired,
  verifyAdminSessionToken,
} from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value ?? null;

  const session = verifyAdminSessionToken(bearerToken || cookieToken);
  return NextResponse.json(
    {
      authenticated: Boolean(session),
      username: session?.username ?? null,
      setupRequired: isAdminSetupRequired(),
    },
    { status: 200, headers: { 'Cache-Control': 'no-store' } }
  );
}
