import { NextRequest, NextResponse } from 'next/server';
import { checkLookupRateLimit, getClientIp } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limit = checkLookupRateLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, retryAfterSec: limit.retryAfterSec },
      { status: 429 }
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
