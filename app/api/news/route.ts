import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const sym = req.nextUrl.searchParams.get('symbol');
  if (!sym) return NextResponse.json({ error: 'symbol required' }, { status: 400 });

  const to   = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt  = (d: Date) => d.toISOString().split('T')[0];

  const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(sym)}&from=${fmt(from)}&to=${fmt(to)}&token=${process.env.FINNHUB_API_KEY}`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return NextResponse.json({ error: `Finnhub ${res.status}` }, { status: res.status });

  const data = await res.json();
  return NextResponse.json(Array.isArray(data) ? data.slice(0, 20) : []);
}
