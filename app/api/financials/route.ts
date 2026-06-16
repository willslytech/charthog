import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://finnhub.io/api/v1';

function key() {
  const k = process.env.FINNHUB_API_KEY;
  if (!k) throw new Error('FINNHUB_API_KEY not set');
  return k;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase();
  if (!symbol) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  try {
    const [profileRes, metricsRes, quoteRes] = await Promise.all([
      fetch(`${BASE}/stock/profile2?symbol=${symbol}&token=${key()}`, { next: { revalidate: 3600 } }),
      fetch(`${BASE}/stock/metric?symbol=${symbol}&metric=all&token=${key()}`, { next: { revalidate: 3600 } }),
      fetch(`${BASE}/quote?symbol=${symbol}&token=${key()}`, { next: { revalidate: 60 } }),
    ]);

    const [profile, metrics, quote] = await Promise.all([
      profileRes.ok ? profileRes.json() : {},
      metricsRes.ok ? metricsRes.json() : {},
      quoteRes.ok  ? quoteRes.json()  : {},
    ]);

    return NextResponse.json({ profile, metrics, quote });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
