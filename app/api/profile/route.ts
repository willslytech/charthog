import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sym = req.nextUrl.searchParams.get('symbol');
  if (!sym) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${process.env.FINNHUB_API_KEY}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) return NextResponse.json({ error: `Finnhub ${res.status}` }, { status: res.status });

  return NextResponse.json(await res.json());
}
