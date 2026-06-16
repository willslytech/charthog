import { NextRequest, NextResponse } from 'next/server';

function key(): string {
  const k = process.env.FINNHUB_API_KEY;
  if (!k) throw new Error('FINNHUB_API_KEY not set');
  return k;
}
const BASE = 'https://finnhub.io/api/v1';

function dateStr(offset = 0) {
  const d = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
  const cat = req.nextUrl.searchParams.get('cat') ?? 'general';

  try {
    if (cat === 'stocks' || cat === 'etf') {
      const tickers =
        cat === 'stocks'
          ? ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'META', 'TSLA']
          : ['SPY', 'QQQ', 'IWM', 'XLK', 'GLD'];

      const from = dateStr(7);
      const to   = dateStr(0);

      const batches = await Promise.all(
        tickers.map(sym =>
          fetch(
            `${BASE}/company-news?symbol=${sym}&from=${from}&to=${to}&token=${key()}`,
            { next: { revalidate: 300 } }
          )
            .then(r => (r.ok ? r.json() : []))
            .then((arr: Record<string, unknown>[]) =>
              (Array.isArray(arr) ? arr.slice(0, 6) : []).map(a => ({ ...a, _sym: sym }))
            )
            .catch(() => [])
        )
      );

      const all = (batches.flat() as Record<string, unknown>[]).sort(
        (a, b) => (b.datetime as number) - (a.datetime as number)
      );
      return NextResponse.json(all.slice(0, 60));
    }

    // general | crypto | merger | forex
    const finnCat = cat === 'beat' ? 'merger' : cat;
    const res = await fetch(`${BASE}/news?category=${finnCat}&token=${key()}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return NextResponse.json([]);
    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data.slice(0, 80) : []);
  } catch {
    return NextResponse.json([]);
  }
}
